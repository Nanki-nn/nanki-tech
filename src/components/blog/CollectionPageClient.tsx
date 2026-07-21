'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useLocaleStore } from '@/lib/stores/localeStore';
import type { CardItem } from '@/types/page';
import type { ResolvedBlogCollection } from '@/types/blog';

interface CollectionPageClientProps {
  dataByLocale: Record<string, ResolvedBlogCollection>;
  defaultLocale: string;
}

function PostDetails({ post }: { post: CardItem }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-neutral-400">
        {post.subtitle && <span>{post.subtitle}</span>}
        {post.date && <span>{post.date}</span>}
      </div>
      <h2 className="mt-2 font-serif text-2xl font-bold leading-snug text-primary transition-colors group-hover:text-accent">
        {post.title}
      </h2>
      {post.content && (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600 dark:text-neutral-500">
          {post.content}
        </p>
      )}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="border border-neutral-200 bg-neutral-50 px-2 py-1 text-[0.6875rem] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function SeriesPosts({ posts, readLabel }: { posts: CardItem[]; readLabel: string }) {
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
                <PostDetails post={post} />
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors group-hover:text-accent">
                  {readLabel}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            ) : (
              <PostDetails post={post} />
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function TopicPosts({ posts, readLabel }: { posts: CardItem[]; readLabel: string }) {
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
              <PostDetails post={post} />
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors group-hover:text-accent">
                {readLabel}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          ) : (
            <div><PostDetails post={post} /></div>
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
  const readLabel = isChinese ? '阅读文章' : 'Read article';

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
          <SeriesPosts posts={collection.posts} readLabel={readLabel} />
        ) : (
          <TopicPosts posts={collection.posts} readLabel={readLabel} />
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
