'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { CardItem, CardPageConfig } from '@/types/page';

function getYear(item: CardItem): string {
  return item.date?.slice(0, 4) || 'Undated';
}

function groupPosts(items: CardItem[]): Array<[string, CardItem[]]> {
  const groups = new Map<string, CardItem[]>();

  for (const item of items) {
    const year = getYear(item);
    groups.set(year, [...(groups.get(year) || []), item]);
  }

  return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
}

export default function BlogTimeline({ config }: { config: CardPageConfig }) {
  const groups = groupPosts(config.items);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="mb-10 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <h1 className="font-serif text-4xl font-bold text-primary">{config.title}</h1>
        {config.description && (
          <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600 dark:text-neutral-500">
            {config.description}
          </p>
        )}
      </header>

      <div className="space-y-10">
        {groups.map(([year, posts]) => (
          <section key={year} className="grid gap-4 sm:grid-cols-[5rem_1fr]">
            <div className="font-serif text-2xl font-bold text-accent">{year}</div>
            <div className="relative space-y-5 border-l border-neutral-200 pl-6 dark:border-neutral-800">
              {posts.map((post) => (
                <article key={post.slug || post.title} className="group relative pb-5 last:pb-0">
                  <span className="absolute -left-[1.68rem] top-2 h-3 w-3 rounded-full border-2 border-background bg-accent" />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold leading-snug text-primary">
                        {post.link ? (
                          <Link href={post.link} className="transition-colors hover:text-accent">
                            {post.title}
                          </Link>
                        ) : (
                          post.title
                        )}
                      </h2>
                    </div>
                    <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
                      {post.date && (
                        <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-500 dark:bg-neutral-800">
                          {post.date}
                        </span>
                      )}
                      {post.link && (
                        <Link
                          href={post.link}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-accent"
                        >
                          Read
                          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                  {post.tags && (
                    <div className="mt-4 flex flex-wrap gap-2">
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
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </motion.div>
  );
}
