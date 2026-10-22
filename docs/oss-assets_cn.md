# 图片与静态资源（阿里云 OSS）

站点的图片、论文封面等二进制资源不放在仓库里，统一存放在阿里云 OSS，
由构建时注入的地址前缀拼成最终 URL。仓库里只保留**相对 key**。

## 1. 地址拼接规则

内容文件和代码里写的都是 key：

```markdown
![图片](/blog-assets/tool-calling/1.png)
```

渲染时由 `src/lib/assets.ts` 的 `assetUrl()` 拼成：

```
{NEXT_PUBLIC_OSS_BASE_URL}/{NEXT_PUBLIC_OSS_DIR_PREFIX}/blog-assets/tool-calling/1.png
```

默认值（不配置环境变量时）：

| 变量 | 默认值 |
| --- | --- |
| `NEXT_PUBLIC_OSS_BASE_URL` | `https://aisoftoj.oss-cn-beijing.aliyuncs.com` |
| `NEXT_PUBLIC_OSS_DIR_PREFIX` | `aisoftoj` |

因此换桶或换自定义域名时，只需要改环境变量并重新构建，**不用改内容**。
已经写成完整 URL（`https://…`）的图片会被原样保留，不会被二次拼接。

## 2. 本地与 CI 配置

复制 `.env.example` 为 `.env.local` 并填好上传凭据：

```bash
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
OSS_BUCKET_NAME=aisoftoj
OSS_BASE_URL=https://aisoftoj.oss-cn-beijing.aliyuncs.com
OSS_DIR_PREFIX=aisoftoj
```

*   `NEXT_PUBLIC_*` 会被打进前端产物，只能放地址，**不要放密钥**。
*   `OSS_ACCESS_KEY_*` 只在执行上传脚本时使用，建议用最小权限（仅该桶的 `PutObject` / `GetObject` / `PutObjectAcl`）账号。
*   `.env*` 已在 `.gitignore` 中，不会被提交。

> CI 构建静态站点时也需要设置 `NEXT_PUBLIC_OSS_BASE_URL` / `NEXT_PUBLIC_OSS_DIR_PREFIX`；
> 不设置则使用上表默认值。

## 3. 上传资源

```bash
npm run oss:sync            # 增量上传 public/ 下所有文件（跳过大小一致的）
npm run oss:sync -- --dry-run   # 只打印计划
npm run oss:sync -- --force     # 全部重传
npm run oss:sync -- --verify    # 上传后校验公网可访问
npm run oss:sync -- --dir public/blog-assets/tool-calling   # 只传某个子目录
npm run oss:verify          # 对已上传对象强制重传并校验
```

脚本行为：

*   OSS 上的 key 始终相对 `public/` 计算，`--dir` 只用于缩小上传范围。
    例如 `--dir public/papers` → `aisoftoj/papers/example.png`。
*   上传时写入 `Cache-Control: public, max-age=604800`（可用 `--cache-control` 覆盖）。
*   上传时设置对象 ACL 为 `public-read`（可用 `--acl` 覆盖），这样即使 Bucket 是私有的，
    单张图片也能被站点匿名读取。

## 4. 新增图片的流程

1.  把图片放进 `public/` 下对应目录（例如 `public/blog-assets/<文章名>/`）。
2.  在 Markdown 里用 `/blog-assets/<文章名>/xxx.png` 引用。
3.  执行 `npm run oss:sync` 上传。
4.  （可选）确认无误后把本地二进制文件从仓库移除：
    ```bash
    git rm -r public/blog-assets/<文章名>
    ```
    站点不依赖仓库里的副本，但建议上传并 `--verify` 通过后再删除。

## 5. 权限排查

如果图片 403：

*   确认对象 ACL 为 `public-read`（脚本默认会设置）。
*   如果 Bucket 开启了「阻止公共访问」或 ACL 限制，需要在控制台放行，或改用 CDN/自定义域名。
*   执行 `npm run oss:sync -- --force --verify` 可以一次性重设 ACL 并复验全部对象。
