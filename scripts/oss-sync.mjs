#!/usr/bin/env node
/**
 * 把本地静态资源同步到阿里云 OSS。
 *
 * 站点里只保存相对 key（如 /blog-assets/tool-calling/1.png），
 * 本脚本负责把 public/ 下的同名文件上传到
 *   oss://<bucket>/<dir prefix>/blog-assets/tool-calling/1.png
 * 渲染时由 src/lib/assets.ts 拼成 OSS 公网地址。
 *
 * 用法：
 *   node scripts/oss-sync.mjs                 # 增量上传 public/ 下所有文件
 *   node scripts/oss-sync.mjs --dry-run       # 只打印计划，不发请求
 *   node scripts/oss-sync.mjs --force         # 忽略远端已存在，全部重传
 *   node scripts/oss-sync.mjs --verify        # 上传后逐个校验公网可访问
 *   node scripts/oss-sync.mjs --dir public/blog-assets --prefix aisoftoj
 *
 * 需要的环境变量（可写在 .env.local / .env，或直接导出）：
 *   OSS_ENDPOINT           oss-cn-beijing.aliyuncs.com
 *   OSS_BUCKET_NAME        aisoftoj
 *   OSS_ACCESS_KEY_ID      <最小权限账号>
 *   OSS_ACCESS_KEY_SECRET  <最小权限账号>
 *   OSS_DIR_PREFIX         aisoftoj（可省略）
 *   OSS_BASE_URL           https://aisoftoj.oss-cn-beijing.aliyuncs.com（--verify 用）
 *
 * 为避免给站点引入额外依赖，这里直接用 OSS V2 签名调用 REST 接口。
 */

import { createHmac } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.bib': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const DEFAULT_CACHE_CONTROL = 'public, max-age=604800';

function parseArgs(argv) {
  const options = {
    root: 'public',
    dir: undefined,
    prefix: undefined,
    dryRun: false,
    force: false,
    verify: false,
    cacheControl: DEFAULT_CACHE_CONTROL,
    acl: 'public-read',
    concurrency: 4,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--verify') options.verify = true;
    else if (arg === '--root') options.root = argv[++index];
    else if (arg === '--dir') options.dir = argv[++index];
    else if (arg === '--prefix') options.prefix = argv[++index];
    else if (arg === '--cache-control') options.cacheControl = argv[++index];
    else if (arg === '--acl') options.acl = argv[++index];
    else if (arg === '--concurrency') options.concurrency = Number(argv[++index]) || 4;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`未知参数：${arg}`);
  }

  return options;
}

/** 极简 .env 解析，避免为上传脚本引入 dotenv。 */
async function loadEnvFiles() {
  for (const filename of ['.env.local', '.env']) {
    let raw;
    try {
      raw = await readFile(filename, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // 真实环境变量优先于文件里的值。
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function requireEnv(name) {
  const value = (process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请参考 .env.example 配置后重试。`);
  }
  return value;
}

function buildOssClient() {
  const endpoint = requireEnv('OSS_ENDPOINT').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const bucket = requireEnv('OSS_BUCKET_NAME');
  const accessKeyId = requireEnv('OSS_ACCESS_KEY_ID');
  const accessKeySecret = requireEnv('OSS_ACCESS_KEY_SECRET');
  const dirPrefix = (process.env.OSS_DIR_PREFIX ?? '').trim().replace(/^\/+|\/+$/g, '');
  const baseUrl = (process.env.OSS_BASE_URL ?? `https://${bucket}.${endpoint}`)
    .trim()
    .replace(/\/+$/, '');

  const sign = (verb, key, contentType, ossHeaders = {}) => {
    const date = new Date().toUTCString();
    const canonicalizedOSSHeaders = Object.entries(ossHeaders)
      .map(([name, value]) => [name.toLowerCase(), String(value)])
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([name, value]) => `${name}:${value}\n`)
      .join('');
    const canonicalizedResource = `/${bucket}/${key}`;
    const stringToSign = `${verb}\n\n${contentType}\n${date}\n${canonicalizedOSSHeaders}${canonicalizedResource}`;
    const signature = createHmac('sha1', accessKeySecret).update(stringToSign).digest('base64');
    return { date, authorization: `OSS ${accessKeyId}:${signature}` };
  };

  const objectUrl = (key) => {
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `https://${bucket}.${endpoint}/${encodedKey}`;
  };

  return { bucket, endpoint, dirPrefix, baseUrl, sign, objectUrl, accessKeyId };
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

async function remoteSize(client, key) {
  const { date, authorization } = client.sign('HEAD', key, '');
  const response = await fetch(client.objectUrl(key), {
    method: 'HEAD',
    headers: { Date: date, Authorization: authorization },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`HEAD ${key} 失败：${response.status} ${response.statusText}`);
  }
  return Number(response.headers.get('content-length') ?? 0);
}

async function putObject(client, key, filePath, { cacheControl, acl }) {
  const contentType = contentTypeFor(filePath);
  const body = await readFile(filePath);
  const ossHeaders = acl ? { 'x-oss-object-acl': acl } : {};
  const { date, authorization } = client.sign('PUT', key, contentType, ossHeaders);

  const response = await fetch(client.objectUrl(key), {
    method: 'PUT',
    headers: {
      Date: date,
      Authorization: authorization,
      'Content-Type': contentType,
      'Content-Length': String(body.length),
      'Cache-Control': cacheControl,
      ...ossHeaders,
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`PUT ${key} 失败：${response.status} ${response.statusText} ${detail.slice(0, 200)}`);
  }
}

async function verifyPublicUrl(url) {
  const response = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
  return response.status === 200 || response.status === 206;
}

async function runWithConcurrency(items, limit, worker) {
  const queue = [...items];
  const results = [];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      results.push(await worker(item));
    }
  });
  await Promise.all(runners);
  return results;
}

function printHelp() {
  console.log(`用法: node scripts/oss-sync.mjs [选项]

  --root <path>            资源根目录，OSS 上的 key 相对它计算，默认 public
  --dir <path>             只上传该子目录（必须位于 root 内），默认整个 root
  --prefix <path>          覆盖 OSS_DIR_PREFIX
  --acl <value>            对象 ACL，默认 public-read（站点需匿名读取）
  --dry-run                只打印计划，不发起写请求
  --force                  忽略远端已有对象，全部重传
  --verify                 上传后逐个 GET 校验公网可访问
  --cache-control <value>  设置 Cache-Control，默认 "${DEFAULT_CACHE_CONTROL}"
  --concurrency <n>        并发数，默认 4
  -h, --help               显示帮助`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  await loadEnvFiles();
  const client = buildOssClient();
  const prefix = (options.prefix ?? process.env.OSS_DIR_PREFIX ?? 'aisoftoj')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  // key 始终相对资源根目录（默认 public/）计算，--dir 只用来缩小上传范围，
  // 这样 `--dir public/papers` 得到的仍然是 papers/example.png，不会丢层级。
  const rootDir = path.resolve(options.root);
  const scanDir = path.resolve(options.dir ?? options.root);
  const rootStat = await stat(scanDir).catch(() => null);

  if (!rootStat?.isDirectory()) {
    throw new Error(`目录不存在：${scanDir}`);
  }

  if (!scanDir.startsWith(rootDir)) {
    throw new Error(`--dir（${scanDir}）必须位于 --root（${rootDir}）之内。`);
  }

  const files = await walkFiles(scanDir);
  if (files.length === 0) {
    console.log(`目录 ${path.relative(process.cwd(), scanDir) || '.'} 下没有文件，无需上传。`);
    return;
  }

  console.log(
    `目标：oss://${client.bucket}/${prefix ? `${prefix}/` : ''}  ←  ${path.relative(process.cwd(), scanDir) || '.'}（${files.length} 个文件，ACL=${options.acl}）`,
  );
  console.log(`访问前缀：${client.baseUrl}${prefix ? `/${prefix}` : ''}\n`);

  const uploaded = [];
  const skipped = [];
  const failed = [];

  await runWithConcurrency(files, options.concurrency, async (filePath) => {
    const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/');
    const key = prefix ? `${prefix}/${relativePath}` : relativePath;
    const publicUrl = `${client.baseUrl}${prefix ? `/${prefix}` : ''}/${relativePath}`;

    try {
      const fileStat = await stat(filePath);

      if (options.dryRun) {
        console.log(`[plan] ${relativePath} → ${publicUrl}`);
        uploaded.push({ relativePath, publicUrl, size: fileStat.size });
        return;
      }

      if (!options.force) {
        const existing = await remoteSize(client, key);
        if (existing === fileStat.size) {
          console.log(`[skip] ${relativePath}（远端已存在，大小一致）`);
          skipped.push({ relativePath, publicUrl });
          return;
        }
      }

      await putObject(client, key, filePath, {
        cacheControl: options.cacheControl,
        acl: options.acl,
      });
      console.log(`[put ] ${relativePath} → ${publicUrl}`);
      uploaded.push({ relativePath, publicUrl, size: fileStat.size });
    } catch (error) {
      console.error(`[fail] ${relativePath}: ${error.message}`);
      failed.push({ relativePath, error });
    }
  });

  console.log(
    `\n完成：上传 ${uploaded.length} 个，跳过 ${skipped.length} 个，失败 ${failed.length} 个。`,
  );

  if (options.verify && !options.dryRun && uploaded.length > 0) {
    console.log('\n校验公网可访问性…');
    const unreadable = [];

    await runWithConcurrency(uploaded, options.concurrency, async (item) => {
      const ok = await verifyPublicUrl(item.publicUrl);
      if (!ok) {
        unreadable.push(item.publicUrl);
        console.error(`[403/404] ${item.publicUrl}`);
      }
    });

    if (unreadable.length > 0) {
      console.error(
        `\n有 ${unreadable.length} 个对象无法匿名读取，请检查 Bucket 读写权限（应为公共读）。`,
      );
      process.exitCode = 1;
    } else {
      console.log('全部对象可匿名访问 ✅');
    }
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`\n同步失败：${error.message}`);
  process.exitCode = 1;
});
