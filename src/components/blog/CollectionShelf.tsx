import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ResolvedBlogCollection } from '@/types/blog';

export default function CollectionShelf({
  collections,
  locale,
}: {
  collections: ResolvedBlogCollection[];
  locale: string;
}) {
  if (collections.length === 0) return null;

  const isChinese = locale.startsWith('zh');

  return (
    <section aria-labelledby="featured-collections" className="mb-16">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2
          id="featured-collections"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500"
        >
          {isChinese ? '精选合集' : 'Featured collections'}
        </h2>
        <span className="text-xs text-neutral-400">Series &amp; Topics</span>
      </div>

      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        {collections.map((collection, index) => {
          const isSeries = collection.kind === 'series';

          return (
            <Link
              key={collection.slug}
              href={`/blog/collections/${collection.slug}`}
              className={`group relative border-t-2 bg-neutral-50/55 px-5 py-5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 dark:bg-neutral-800/25 ${
                isSeries
                  ? 'border-accent hover:border-accent-light'
                  : 'border-primary/70 hover:border-accent'
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-4 text-[0.6875rem] uppercase tracking-[0.14em] text-neutral-400">
                <span>
                  {isSeries
                    ? (isChinese ? '有序系列' : 'Series')
                    : (isChinese ? '主题专题' : 'Topic')}
                  {' · '}{collection.posts.length} {isChinese ? '篇' : 'articles'}
                </span>
                <span className="font-serif text-sm tracking-normal text-neutral-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <h3 className="font-serif text-xl font-bold leading-snug text-primary transition-colors group-hover:text-accent">
                {collection.title}
              </h3>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-600 dark:text-neutral-500">
                {collection.description}
              </p>

              <div className="mt-5 flex items-center justify-between gap-4 text-xs text-neutral-400">
                <span>
                  {collection.latestDate
                    ? `${isChinese ? '更新于' : 'Updated'} ${collection.latestDate}`
                    : (isChinese ? '持续整理中' : 'In progress')}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-neutral-600 transition-colors group-hover:text-accent dark:text-neutral-500">
                  {isChinese ? '阅读合集' : 'Explore'}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
