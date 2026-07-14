# Axon Tutorial Blog Migration Design

## Goal

Publish the six Axon tutorials that are not yet present in the Chinese blog, while preserving the source articles and following the site's existing blog conventions.

## Scope

The migration adds these source articles from `/Users/bytedance/axon/docs/tutorials/`:

| Source | Blog Markdown | Slug | Date |
|---|---|---|---|
| `00-overview.md` | `content_zh/blog/axon-overview.md` | `axon-overview` | `2026-06-19` |
| `04-task-planning.md` | `content_zh/blog/axon-task-planning.md` | `axon-task-planning` | `2026-06-27` |
| `05-skill-system.md` | `content_zh/blog/axon-skill-system.md` | `axon-skill-system` | `2026-06-27` |
| `07-memory-system.md` | `content_zh/blog/axon-memory-system.md` | `axon-memory-system` | `2026-06-27` |
| `08-multi-agent-collaboration.md` | `content_zh/blog/axon-multi-agent-collaboration.md` | `axon-multi-agent-collaboration` | `2026-06-27` |
| `09-streaming.md` | `content_zh/blog/axon-streaming.md` | `axon-streaming` | `2026-06-30` |

The English/default blog directory and its manifest are out of scope.

## Content Handling

- Copy each source article without editorial rewriting.
- Preserve headings, prose, code blocks, Mermaid diagrams, footnotes, and external links.
- Rewrite only the previous/next tutorial links at the end of an article so they point to the corresponding site route under `/blog/`. Relative Markdown file links would otherwise be broken after deployment.
- Do not add a synchronization script or a runtime dependency on the Axon repository. The blog receives a repository-local snapshot.

## Blog Metadata

Add one `[[items]]` entry per article to `content_zh/blog.toml`.

Each entry uses:

- the article's first-level heading as its title;
- `Axon Tutorial` as its subtitle;
- the source article's first Git commit date shown in the scope table;
- a concise one-sentence summary;
- tags led by `Axon` and `AI Agent`, plus the article's topic;
- the slug and source path from the scope table;
- `/blog/<slug>` as its internal link.

The manifest remains manually ordered newest first because the timeline preserves item order within a year. For articles with the same date, later tutorial numbers appear first, matching the existing reverse-chronological convention.

## Resulting Order

The existing `2026-07-10` article stays first. The new `2026-06-30` streaming article follows it, then the four `2026-06-27` tutorials in reverse tutorial order. Existing `2026-06-26` and `2026-06-19` entries retain their relative order, with the `2026-06-19` overview placed after tutorial 01.

## Verification

1. Confirm that all six new Markdown files exist in `content_zh/blog/`.
2. Diff each migrated article against its Axon source, allowing only the documented previous/next link rewrites.
3. Confirm that all six slugs, source paths, and internal links in `content_zh/blog.toml` are unique and resolve to their Markdown files.
4. Run `npm run build` and require a successful static export.
5. Confirm the generated output includes a route for each new slug.

