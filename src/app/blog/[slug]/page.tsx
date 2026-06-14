import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BlogPost from '@/components/blog/BlogPost';
import { getConfig } from '@/lib/config';
import { getMarkdownContent, getPageConfig } from '@/lib/content';
import { getRuntimeI18nConfig } from '@/lib/i18n/config';
import type { CardItem, CardPageConfig } from '@/types/page';

function getBlogConfig(locale?: string): CardPageConfig | null {
  return getPageConfig<CardPageConfig>('blog', locale);
}

function getBlogPost(slug: string, locale?: string): CardItem | null {
  const blogConfig = getBlogConfig(locale);
  return blogConfig?.items.find((item) => item.slug === slug) || null;
}

function getTargetLocales(): string[] {
  const config = getConfig();
  const runtimeI18n = getRuntimeI18nConfig(config.i18n);
  return runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];
}

export function generateStaticParams() {
  const slugs = new Set<string>();

  for (const locale of getTargetLocales()) {
    const blogConfig = getBlogConfig(locale);
    blogConfig?.items.forEach((item) => {
      if (item.slug) slugs.add(item.slug);
    });
  }

  const fallbackBlogConfig = getBlogConfig();
  fallbackBlogConfig?.items.forEach((item) => {
    if (item.slug) slugs.add(item.slug);
  });

  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const defaultLocale = getRuntimeI18nConfig(getConfig().i18n).defaultLocale;
  const post = getBlogPost(slug, defaultLocale) || getBlogPost(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.content,
  };
}

export default async function BlogPostRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const defaultLocale = getRuntimeI18nConfig(getConfig().i18n).defaultLocale;
  const post = getBlogPost(slug, defaultLocale) || getBlogPost(slug);

  if (!post || !post.source) {
    notFound();
  }

  const content = getMarkdownContent(post.source, defaultLocale) || getMarkdownContent(post.source);

  if (!content) {
    notFound();
  }

  return <BlogPost post={post} content={content} />;
}
