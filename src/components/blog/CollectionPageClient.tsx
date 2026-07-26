'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import BlogListItemContent from '@/components/blog/BlogListItemContent';
import { useLocaleStore } from '@/lib/stores/localeStore';
import type { CardItem } from '@/types/page';
import type { ResolvedBlogCollection } from '@/types/blog';

interface CollectionPageClientProps {
  dataByLocale: Record<string, ResolvedBlogCollection>;
  defaultLocale: string;
}

function SeriesPosts({ posts }: { posts: CardItem[] }) {
  return (
    <ol>
      {posts.map((post, index) => (
        <li key={post.slug || post.title} className="grid grid-cols-[3.25rem_1fr] sm:grid-cols-[5rem_1fr]">
          <div className="pt-1 font-serif text-xl font-bold text-accent sm:text-2xl">
            {String(index + 1).padStart(2, '0')}
          </div>
          <div className="relative border-l border-neutral-200 pb-11 pl-6 last:pb-0 sm:pl-8 dark:border-neutral-800">
            <span className="absolute -left-1.5 top-2 h-3 w-3 rounded-full border-2 border-background bg-accent" />
            {post.link ? (
              <Link href={post.link} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                <BlogListItemContent post={post} />
              </Link>
            ) : (
              <BlogListItemContent post={post} />
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function TopicPosts({ posts }: { posts: CardItem[] }) {
  return (
    <div className="border-y border-neutral-200 dark:border-neutral-800">
      {posts.map((post) => (
        <article
          key={post.slug || post.title}
          className="grid gap-3 border-b border-neutral-200 py-8 last:border-b-0 sm:grid-cols-[7rem_1fr] dark:border-neutral-800"
        >
          <div className="pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {post.date || post.subtitle || 'Article'}
          </div>
          {post.link ? (
            <Link href={post.link} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              <BlogListItemContent post={post} />
            </Link>
          ) : (
            <div><BlogListItemContent post={post} /></div>
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
  const isSeries = collection.kind === 'series';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <Link
        href="/blog"
        className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition-colors hover:text-accent dark:text-neutral-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isChinese ? '返回 Blog' : 'Back to Blog'}
      </Link>

      <header className="mb-12 border-b border-neutral-200 pb-10 dark:border-neutral-800">
        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          <span className="text-accent">
            {isSeries
              ? (isChinese ? '有序系列' : 'Series')
              : (isChinese ? '主题专题' : 'Topic')}
          </span>
          <span aria-hidden="true">·</span>
          <span>{collection.posts.length} {isChinese ? '篇文章' : 'articles'}</span>
          {collection.latestDate && (
            <>
              <span aria-hidden="true">·</span>
              <span>{isChinese ? '更新于' : 'Updated'} {collection.latestDate}</span>
            </>
          )}
        </div>
        <h1 className="text-balance font-serif text-4xl font-bold leading-tight text-primary sm:text-5xl">
          {collection.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600 dark:text-neutral-500">
          {collection.description}
        </p>
      </header>

      {collection.posts.length > 0 ? (
        isSeries ? (
          <SeriesPosts posts={collection.posts} />
        ) : (
          <TopicPosts posts={collection.posts} />
        )
      ) : (
        <div className="border-y border-neutral-200 py-12 text-center dark:border-neutral-800">
          <p className="font-serif text-xl font-bold text-primary">
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
