import Link from 'next/link';
import { Children, isValidElement } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import MermaidDiagram from '@/components/blog/MermaidDiagram';
import TableOfContents from '@/components/blog/TableOfContents';
import { extractMarkdownHeadings, type MarkdownHeading } from '@/lib/markdownHeadings';
import type { CardItem } from '@/types/page';

function createMarkdownComponents(headings: MarkdownHeading[]): Components {
  const idsByLine = new Map(headings.map((heading) => [heading.line, heading.id]));
  const fallbackIds = {
    2: headings.filter((heading) => heading.depth === 2).map((heading) => heading.id),
    3: headings.filter((heading) => heading.depth === 3).map((heading) => heading.id),
  };
  let h2Index = 0;
  let h3Index = 0;

  return {
    h1: ({ children }) => (
      <h1 className="mt-12 mb-6 font-serif text-3xl font-bold leading-tight text-primary">
        {children}
      </h1>
    ),
    h2: ({ children, node }) => {
      const fallbackId = fallbackIds[2][h2Index++];
      const id = idsByLine.get(node?.position?.start.line ?? -1) ?? fallbackId;

      return (
        <h2 id={id} className="scroll-mt-28 mt-10 mb-4 text-2xl font-serif font-bold text-primary">
          {children}
        </h2>
      );
    },
    h3: ({ children, node }) => {
      const fallbackId = fallbackIds[3][h3Index++];
      const id = idsByLine.get(node?.position?.start.line ?? -1) ?? fallbackId;

      return (
        <h3 id={id} className="scroll-mt-28 mt-8 mb-3 text-xl font-semibold text-primary">
          {children}
        </h3>
      );
    },
    p: ({ children }: React.ComponentProps<'p'>) => (
      <p className="mb-5 leading-8 text-neutral-700 dark:text-neutral-400">{children}</p>
    ),
    ul: ({ children }: React.ComponentProps<'ul'>) => (
      <ul className="mb-6 list-disc space-y-2 pl-6 text-neutral-700 dark:text-neutral-400">
        {children}
      </ul>
    ),
    ol: ({ children }: React.ComponentProps<'ol'>) => (
      <ol className="mb-6 list-decimal space-y-2 pl-6 text-neutral-700 dark:text-neutral-400">
        {children}
      </ol>
    ),
    li: ({ children }: React.ComponentProps<'li'>) => <li className="leading-8">{children}</li>,
    strong: ({ children }: React.ComponentProps<'strong'>) => (
      <strong className="font-semibold text-primary">{children}</strong>
    ),
    pre: ({ children }) => {
      const child = Children.only(children);

      if (isValidElement(child) && child.type === MermaidDiagram) {
        return child;
      }

      return (
        <pre className="mb-7 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-900 p-4 text-sm leading-7 text-neutral-100 shadow-sm dark:border-neutral-800">
          {children}
        </pre>
      );
    },
    code: ({ children, className }) => {
      const isBlock = Boolean(className);
      const language = className?.replace('language-', '');

      if (isBlock) {
        if (language === 'mermaid') {
          return <MermaidDiagram chart={String(children).trim()} />;
        }

        return (
          <code className={`${className || ''} whitespace-pre font-mono text-[0.92rem]`}>
            {children}
          </code>
        );
      }

      return (
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.92em] text-primary dark:bg-neutral-800">
          {children}
        </code>
      );
    },
    img: ({ src = '', alt = '' }: React.ComponentProps<'img'>) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="my-8 block h-auto w-full rounded-xl border border-neutral-200 bg-white object-contain shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      />
    ),
    blockquote: ({ children }: React.ComponentProps<'blockquote'>) => (
      <blockquote className="my-7 border-l-2 border-accent pl-5 font-serif text-lg italic text-neutral-700 dark:text-neutral-400">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="my-7 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-neutral-100 text-primary dark:bg-neutral-800">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="border border-neutral-200 px-3 py-2 font-semibold dark:border-neutral-800">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-neutral-200 px-3 py-2 align-top text-neutral-700 dark:border-neutral-800 dark:text-neutral-400">
        {children}
      </td>
    ),
    hr: () => <hr className="my-10 border-neutral-200 dark:border-neutral-800" />,
  };
}

interface BlogPostProps {
  post: CardItem;
  content: string;
}

export default function BlogPost({ post, content }: BlogPostProps) {
  const headings = extractMarkdownHeadings(content);
  const markdownComponents = createMarkdownComponents(headings);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 xl:grid xl:max-w-[82rem] xl:grid-cols-[minmax(0,48rem)_13rem] xl:justify-center xl:gap-16 2xl:gap-20">
        <article className="min-w-0">
          <Link
            href="/blog"
            className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition-colors hover:text-accent dark:text-neutral-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          <header
            className={`${headings.length > 0 ? 'mb-6 xl:mb-10' : 'mb-10'} border-b border-neutral-200 pb-8 dark:border-neutral-800`}
          >
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
              {post.subtitle && <span>{post.subtitle}</span>}
              {post.date && <span>{post.date}</span>}
            </div>
            <h1 className="text-balance font-serif text-4xl font-bold leading-tight text-primary sm:text-5xl">
              {post.title}
            </h1>
            {post.content && (
              <p className="mt-5 text-lg leading-8 text-neutral-600 dark:text-neutral-500">
                {post.content}
              </p>
            )}
            {post.tags && (
              <div className="mt-6 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {headings.length > 0 && (
            <div className="mb-10 xl:hidden">
              <TableOfContents headings={headings} variant="mobile" />
            </div>
          )}

          <div className="text-base">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        </article>

        {headings.length > 0 && (
          <aside className="hidden pt-24 xl:block">
            <div className="sticky top-28">
              <TableOfContents headings={headings} variant="desktop" />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
