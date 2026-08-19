import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
    <section aria-labelledby="featured-collections" className="mb-14">
      <h2
        id="featured-collections"
        className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500"
      >
        {isChinese ? '合集' : 'Collections'}
      </h2>

      <div>
        {collections.map((collection) => (
          <Link
            key={collection.slug}
            href={`/blog/collections/${collection.slug}`}
            className="group grid gap-2 py-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8"
          >
            <div className="min-w-0">
              <h3 className="font-serif text-lg font-semibold text-primary transition-colors group-hover:text-accent">
                {collection.title}
              </h3>
              <p className="mt-1 line-clamp-1 text-sm leading-6 text-neutral-600 dark:text-neutral-500">
                {collection.description}
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors group-hover:text-accent">
              {collection.posts.length} {isChinese ? '篇文章' : collection.posts.length === 1 ? 'post' : 'posts'}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
