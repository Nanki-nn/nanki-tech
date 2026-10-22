/**
 * 静态资源（图片、PDF 等）统一由阿里云 OSS 提供。
 *
 * 内容与代码里只保存相对 key（例如 `/blog-assets/tool-calling/1.png`），
 * 渲染时拼成 OSS 公网地址，换域名/换桶只需要改环境变量，不用动内容。
 *
 * 注意：Next.js 只会内联字面量形式的 `process.env.NEXT_PUBLIC_*`，
 * 所以这里必须逐个显式书写，不能写成动态下标访问。
 */

const DEFAULT_OSS_BASE_URL = 'https://aisoftoj.oss-cn-beijing.aliyuncs.com';
const DEFAULT_OSS_DIR_PREFIX = 'aisoftoj';

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const raw = (value ?? '').trim() || fallback;
  return raw.replace(/\/+$/, '');
}

function normalizePrefix(value: string | undefined, fallback: string): string {
  const raw = (value ?? '').trim();
  return (raw || fallback).replace(/^\/+/, '').replace(/\/+$/, '');
}

const OSS_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_OSS_BASE_URL, DEFAULT_OSS_BASE_URL);
const OSS_DIR_PREFIX = normalizePrefix(process.env.NEXT_PUBLIC_OSS_DIR_PREFIX, DEFAULT_OSS_DIR_PREFIX);

/** OSS 上的资源根地址，例如 https://aisoftoj.oss-cn-beijing.aliyuncs.com/aisoftoj */
export const OSS_ASSET_ORIGIN = OSS_DIR_PREFIX ? `${OSS_BASE_URL}/${OSS_DIR_PREFIX}` : OSS_BASE_URL;

const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

/**
 * 把内容里写的相对 key 解析成最终可访问的地址。
 *
 * - 已经是绝对地址（http/https/协议相对/data URI/页内锚点）时原样返回
 * - `/foo.png` 与 `foo.png` 都会解析成 `${OSS_ASSET_ORIGIN}/foo.png`
 * - 空值原样返回，避免渲染出无意义的地址
 */
export function assetUrl(key: string | undefined | null): string {
  if (!key) {
    return '';
  }

  const trimmed = key.trim();
  if (!trimmed) {
    return '';
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('#')) {
    return trimmed;
  }

  const relativeKey = trimmed.replace(/^\/+/, '');
  if (!relativeKey) {
    return trimmed;
  }

  return `${OSS_ASSET_ORIGIN}/${relativeKey}`;
}
