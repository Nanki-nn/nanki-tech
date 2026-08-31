'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import BlogListItemContent from '@/components/blog/BlogListItemContent';
import { useLocaleStore } from '@/lib/stores/localeStore';
import type { CardItem } from '@/types/page';
import type { ResolvedBlogCollection } from '@/types/blog';

interface CollectionPageClientProps {
  dataByLocale: Record<string, ResolvedBlogCollection>;
  defaultLocale: string;
}

function CollectionPosts({ posts, locale }: { posts: CardItem[]; locale: string }) {
  return (
    <div className="space-y-1">
      {posts.map((post) => (
        <article key={post.slug || post.title} className="group py-5">
          {post.link ? (
            <Link
              href={post.link}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <BlogListItemContent post={post} locale={locale} showDate={false} />
            </Link>
          ) : (
            <BlogListItemContent post={post} locale={locale} showDate={false} />
          )}
        </article>
      ))}
    </div>
  );
}

export default function CollectionPageClient({
  dataByLocale,
  defaultLocale,
}: CollectionPageClientProps) {
  const locale = useLocaleStore((state) => state.locale);
  const fallback = dataByLocale[defaultLocale] || Object.values(dataByLocale)[0];
  const collection = dataByLocale[locale] || fallback;

  if (!collection) return null;

  const isChinese = locale.startsWith('zh');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <header className="mb-12">
        <h1 className="text-balance font-serif text-4xl font-semibold leading-tight text-primary sm:text-5xl">
          {collection.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-500">
          {collection.description}
        </p>
        {collection.posts[0]?.date && (
          <time
            dateTime={collection.posts[0].date}
            className="mt-3 block text-sm tabular-nums text-neutral-400"
          >
            {collection.posts[0].date}
          </time>
        )}
      </header>

      {collection.posts.length > 0 ? (
        <CollectionPosts posts={collection.posts} locale={locale} />
      ) : (
        <div className="py-12 text-center">
          <p className="font-serif text-xl font-semibold text-primary">
            {isChinese ? '文章正在整理中' : 'Articles are being curated'}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            {isChinese ? '稍后回来看看。' : 'Check back soon.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
