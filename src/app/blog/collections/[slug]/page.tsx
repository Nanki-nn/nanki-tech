import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CollectionPageClient from '@/components/blog/CollectionPageClient';
import {
  getBlogCollectionSlugs,
  getResolvedBlogCollection,
} from '@/lib/blogCollections';
import { getConfig } from '@/lib/config';
import { getRuntimeI18nConfig } from '@/lib/i18n/config';
import type { ResolvedBlogCollection } from '@/types/blog';

function getTargetLocales(): string[] {
  const runtimeI18n = getRuntimeI18nConfig(getConfig().i18n);
  return runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];
}

export function generateStaticParams() {
  const slugs = new Set<string>();

  for (const locale of getTargetLocales()) {
    getBlogCollectionSlugs(locale).forEach((slug) => slugs.add(slug));
  }

  getBlogCollectionSlugs().forEach((slug) => slugs.add(slug));
  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const defaultLocale = getRuntimeI18nConfig(getConfig().i18n).defaultLocale;
  const collection = getResolvedBlogCollection(slug, defaultLocale) || getResolvedBlogCollection(slug);

  if (!collection) return {};

  return {
    title: collection.title,
    description: collection.description,
  };
}

export default async function BlogCollectionRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const runtimeI18n = getRuntimeI18nConfig(getConfig().i18n);
  const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];
  const dataByLocale: Record<string, ResolvedBlogCollection> = {};

  for (const locale of targetLocales) {
    const collection = getResolvedBlogCollection(slug, locale);
    if (collection) dataByLocale[locale] = collection;
  }

  const fallback = getResolvedBlogCollection(slug);
  if (fallback && !dataByLocale[runtimeI18n.defaultLocale]) {
    dataByLocale[runtimeI18n.defaultLocale] = fallback;
  }

  if (Object.keys(dataByLocale).length === 0) notFound();

  return (
    <CollectionPageClient
      dataByLocale={dataByLocale}
      defaultLocale={runtimeI18n.defaultLocale}
    />
  );
}
