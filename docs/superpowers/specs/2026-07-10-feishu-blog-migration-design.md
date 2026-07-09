# Feishu Blog Migration Design

## Goal

Migrate the Feishu document `AI认知提升之道：从大模型训练到AI应用技术` into the Chinese blog at `content_zh/blog/` with minimal editorial change.

## Constraints

- Preserve the original article structure and wording as much as possible.
- Keep the migration compatible with the site's current Markdown renderer.
- Avoid introducing custom rendering work for Feishu-specific tags.

## Approach

1. Create a new Chinese blog Markdown file at `content_zh/blog/llm-training-to-ai-applications.md`.
2. Preserve headings, paragraphs, lists, links, and code blocks from the Feishu export.
3. Replace Feishu-only tags with plain Markdown-friendly placeholders:
   - `<image .../>` -> short note that the original position contained an image
   - `<sheet .../>` -> short note that the original position contained an embedded sheet
   - `<mention-doc ...>` -> plain text mention of the referenced document
4. Add a new `[[items]]` entry to `content_zh/blog.toml` so the post appears in the site navigation and blog timeline.

## Metadata

- Title: `AI认知提升之道：从大模型训练到AI应用技术`
- Subtitle: `AI Notes`
- Date: `2026-07-10`
- Tags: `LLM`, `AI`
- Slug: `llm-training-to-ai-applications`

## Verification

- Ensure the new Markdown file exists at the expected path.
- Ensure `content_zh/blog.toml` points to the new source file and link.
- Run a site build to confirm the content parses successfully.
