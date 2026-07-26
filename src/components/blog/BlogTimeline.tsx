'use client';

import { motion } from 'framer-motion';
import BlogListItemContent from '@/components/blog/BlogListItemContent';
import CollectionShelf from '@/components/blog/CollectionShelf';
import type { ResolvedBlogCollection } from '@/types/blog';
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

export default function BlogTimeline({
  config,
  collections = [],
  locale,
}: {
  config: CardPageConfig;
  collections?: ResolvedBlogCollection[];
  locale: string;
}) {
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

      <CollectionShelf collections={collections} locale={locale} />

      <div className="space-y-10">
        {groups.map(([year, posts]) => (
          <section key={year} className="grid gap-4 sm:grid-cols-[5rem_1fr]">
            <div className="font-serif text-2xl font-bold text-accent">{year}</div>
            <div className="relative space-y-5 border-l border-neutral-200 pl-6 dark:border-neutral-800">
              {posts.map((post) => (
                <article key={post.slug || post.title} className="group relative pb-5 last:pb-0">
                  <span className="absolute -left-[1.68rem] top-2 h-3 w-3 rounded-full border-2 border-background bg-accent" />
                  <BlogListItemContent post={post} linkTitle />
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </motion.div>
  );
}
