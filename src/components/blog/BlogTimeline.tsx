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
      <header className="mb-12 pb-2">
        <h1 className="font-serif text-4xl font-semibold text-primary sm:text-5xl">{config.title}</h1>
        {config.description && (
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-500">
            {config.description}
          </p>
        )}
      </header>

      <CollectionShelf collections={collections} locale={locale} />

      <div className="space-y-12">
        {groups.map(([year, posts]) => (
          <section key={year}>
            <h2 className="mb-3 font-serif text-xl font-semibold text-primary">{year}</h2>
            <div>
              {posts.map((post) => (
                <article
                  key={post.slug || post.title}
                  className="group py-5"
                >
                  <BlogListItemContent post={post} linkTitle locale={locale} />
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </motion.div>
  );
}
