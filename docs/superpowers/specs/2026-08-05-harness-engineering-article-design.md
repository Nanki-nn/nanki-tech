# Harness Engineering 文章接入设计

## 目标

将压缩包中的中文文章《Harness Engineering - 是什么、怎么设计、往哪走》发布到站点当前使用的中文博客，并确保正文、目录和四张配图在静态构建后可正常访问。

## 发布范围

- 源文件为 `/Users/bytedance/Downloads/Harness Engineering - 是什么、怎么设计、往哪走.zip`。
- 仅更新中文内容目录 `content_zh`，不在英文内容目录中重复发布中文原文。
- 文章路由使用 `/blog/harness-engineering`。
- 文章日期使用导入日期 `2026-08-05`。
- 博客列表元数据使用以下内容：
  - 标题：`Harness Engineering - 是什么、怎么设计、往哪走`
  - 副标题字段：`subtitle = "AI Agent Engineering"`
  - 标签：`AI Agent`、`Harness Engineering`、`Agent Infrastructure`
  - 摘要：`从 Agent = Model + Harness 出发，梳理工具、状态、上下文、Hooks、长程执行与多 Agent 编排的设计方法，并讨论 Harness 的演进方向。`

## 文件与资源

- 正文保存到 `content_zh/blog/harness-engineering.md`。
- 四张配图保存到 `public/blog-assets/harness-engineering/`，并按以下关系精确映射：
  - `图片和附件/image.png` → `image.png` → `/blog-assets/harness-engineering/image.png`
  - `图片和附件/image 1.png` → `image-1.png` → `/blog-assets/harness-engineering/image-1.png`
  - `图片和附件/image 2.png` → `image-2.png` → `/blog-assets/harness-engineering/image-2.png`
  - `图片和附件/image 3.png` → `image-3.png` → `/blog-assets/harness-engineering/image-3.png`
- 正文中的四处图片引用按各自源文件名改写为上述站内绝对路径；不根据正文出现顺序重新编号，也不保留压缩包导出时的 `图片和附件` 相对路径或 URL 编码文件名。
- 在 `content_zh/blog.toml` 顶部新增文章条目，使其成为当前中文博客列表中的最新文章。

## 内容整理边界

- 保留文章的论点、段落顺序、链接、引用和免责声明，不做事实扩写或编辑性重写。
- 清理由文档导出产生的无意义 Markdown 转义，例如标题和普通文本中的 `\-`、`\+`、`\.`。
- 将 `Plain Text` 代码块语言标记规范为 `text`，并修复会影响 Markdown 渲染的空格或标记问题。
- 保留正文一级标题，与站内既有文章格式一致。

## 验证

1. `content_zh/blog.toml` 能被正常解析，文章出现在中文博客列表首位。
2. `/blog/harness-engineering` 能在静态构建中生成。
3. 正文的四张图片均使用站内绝对路径，文件存在且可被构建产物引用。
4. 标题层级可生成目录，外部链接、引用、列表和代码块正常渲染。
5. 生产构建通过，且不修改或提交任务范围外的现有工作区改动。
