# DeerFlow Agent Architecture Article Design

## Goal

Publish the supplied Chinese article, “从 DeerFlow 探究 Agent 工程的架构与设计,” as a first-class blog post while preserving its technical argument and making only light editorial corrections.

## Content and metadata

- Import the supplied source file from `/Users/bytedance/Downloads/从 DeerFlow 探究 Agent 工程的架构与设计.md` in full. The source contains no image references or other article assets, so no public-asset migration or Markdown URL rewriting is required.
- Store one canonical Markdown file at `content/blog/deerflow-agent-architecture.md`.
- Register the post in both `content/blog.toml` and `content_zh/blog.toml` so it remains visible in either configured locale, matching the site’s current handling of Chinese technical articles.
- Use slug `deerflow-agent-architecture` and route `/blog/deerflow-agent-architecture`.
- Publish with date `2026-08-23`, subtitle `AI Agent Engineering`, and tags `DeerFlow`, `AI Agent`, `LangGraph`, and `Agent Architecture`.
- Derive a concise list summary from the article’s existing introduction.

## Editorial scope

Light proofreading may correct punctuation, spacing, escaped Markdown characters, code-fence language labels, heading numbering gaps, and clearly awkward or erroneous wording. It must not change technical claims, add new sections, or substantially rewrite the author’s voice. Retain the closing AI-generation disclosure.

## Integration behavior

The base content file is the only copy of the article. The existing loader already checks `content_<locale>/` first and then `content/`, so no loader code changes are needed. Both locale metadata lists point to the same `blog/deerflow-agent-architecture.md` source.

## Verification

- Confirm the TOML configuration parses through the application build.
- Run the production build and verify the generated article route exists.
- Open the article locally and confirm the title, date, headings, tables, code blocks, and list entry render correctly.
- Keep unrelated worktree changes out of the article commit.
