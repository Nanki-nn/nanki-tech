# nanki personal site

江楠 / nanki 的个人网站。当前站点基于 Next.js 静态导出，包含首页、博客列表、站内博客详情页和项目展示。

## 快速开始

```bash
npm install
npm run dev
```

启动后打开 Next.js 输出的本地地址。通常是 `http://localhost:3000`，如果 `3000` 被占用，会自动换到其他端口。

## 常用命令

```bash
npm run dev      # 本地开发
npm run build    # 生产构建，生成静态站点
npm run lint     # 代码检查，如果当前 Next.js 配置支持
```

项目在 `next.config.ts` 里配置了 `output: 'export'`，所以 `npm run build` 会生成静态产物到 `out/`。

## 内容维护入口

日常更新优先改 `content/` 和 `content_zh/`，一般不需要动 `src/`。

| 想改什么 | 文件 |
| --- | --- |
| 姓名、标题、社交链接、导航、语言切换 | `content/config.toml`、`content_zh/config.toml` |
| 首页个人介绍 | `content/bio.md`、`content_zh/bio.md` |
| Focus Areas 标签 | `content/about.toml`、`content_zh/about.toml` |
| 博客列表信息 | `content/blog.toml`、`content_zh/blog.toml` |
| 博客正文 | `content/blog/*.md`、`content_zh/blog/*.md` |
| 项目卡片 | `content/projects.toml`、`content_zh/projects.toml` |

当前约定：博客和项目内容可以保持中文；其他 UI 和个人介绍尽量使用英文。

## 更新个人信息

主要改 `content/config.toml` 和 `content_zh/config.toml`。

常用字段示例：

```toml
[site]
title = "nanki"

[author]
name = "nanki"
title = "AI Agent / Backend / System Architect"
institution = "Focused on AI agents, backend engineering, and system architecture."

[social]
github = "https://github.com/Nanki-nn"
yuque = "https://www.yuque.com/jiangnan-3o7ge"
csdn = "https://blog.csdn.net/Nanki_?spm=1000.2115.3001.5343"
```

中文模式的名字在 `content_zh/config.toml`，目前是 `江楠`；英文模式的名字在 `content/config.toml`，目前是 `nanki`。

## 新增博客

1. 在 `content/blog.toml` 里新增一条 `[[items]]`。
2. 如果希望中英切换后仍能看到这篇文章，也在 `content_zh/blog.toml` 里新增同样的一条。
3. 在 `content/blog/` 下创建 Markdown 正文。
4. 如有需要，在 `content_zh/blog/` 下创建对应 Markdown 正文。

示例：

```toml
[[items]]
title = "文章标题"
subtitle = "分类"
date = "2026-06-19"
content = "文章摘要，用于元信息和文章详情页头部。"
tags = ["AI Agent", "Backend"]
slug = "post-slug"
source = "blog/post-slug.md"
link = "/blog/post-slug"
```

然后创建：

```text
content/blog/post-slug.md
content_zh/blog/post-slug.md
```

访问路径会是：

```text
/blog/post-slug/
```

## 更新项目

主要改 `content/projects.toml` 和 `content_zh/projects.toml`。

示例：

```toml
[[items]]
title = "axon"
subtitle = "AI Agent backend project"
date = "2026-06-14"
content = "项目简介。"
tags = ["AI Agent", "Backend", "System"]
link = "https://github.com/Nanki-nn/axon"
```

项目卡片目前会展示：标题、副标题、日期、简介、标签和右侧链接。

## 页面和组件位置

只有需要改布局或交互时才动这些文件。

| 区域 | 文件 |
| --- | --- |
| 首页数据组装 | `src/app/page.tsx` |
| 首页整体布局 | `src/components/home/HomePageClient.tsx` |
| 左侧个人信息栏 | `src/components/home/Profile.tsx` |
| 顶部导航 | `src/components/layout/Navigation.tsx` |
| 通用卡片页 | `src/components/pages/CardPage.tsx` |
| 博客时间线 | `src/components/blog/BlogTimeline.tsx` |
| 博客详情页 | `src/app/blog/[slug]/page.tsx`、`src/components/blog/BlogPost.tsx` |
| 颜色、字体、全局样式 | `src/app/globals.css` |

## 中英切换

语言切换配置在 `content/config.toml`：

```toml
[i18n]
enabled = true
locales = ["zh", "en"]
default_locale = "zh"
mode = "fixed"
fixed_locale = "zh"
persist = true
switcher = true
```

目前语言切换主要影响配置驱动的文案和身份信息。博客和项目内容不强制翻译，除非后续你自己想维护双语版本。

## 发布前检查

每次准备提交或发布前，建议先跑：

```bash
npm run build
```

如果遇到 `.next` 缓存导致的构建异常，可以先停掉 dev server，再执行：

```bash
rm -rf .next
npm run build
```

## Git 和部署说明

远程仓库：

```text
https://github.com/Nanki-nn/personal-site
```

当前仓库暂时没有 `.github/workflows/deploy.yml`。之前从本地推送时，当前 GitHub 授权没有 `workflow` 权限，所以先移除了 workflow 文件。以后如果要自动部署，可以在 GitHub 页面上添加，或使用带 `workflow` 权限的 token 推送。

推荐日常更新流程：

```bash
git status
npm run build
git add <changed-files>
git commit -m "type: short description"
git push origin main
```
