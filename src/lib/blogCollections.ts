import { getPageConfig } from '@/lib/content';
import type { CardItem, CardPageConfig } from '@/types/page';
import type {
  BlogCollectionDefinition,
  BlogCollectionsConfig,
  ResolvedBlogCollection,
} from '@/types/blog';

function getCollectionDefinitions(locale?: string): BlogCollectionDefinition[] {
  return getPageConfig<BlogCollectionsConfig>('collections', locale)?.collections ?? [];
}

function getBlogItems(locale?: string): CardItem[] {
  return getPageConfig<CardPageConfig>('blog', locale)?.items ?? [];
}

function sortCollections(collections: ResolvedBlogCollection[]): ResolvedBlogCollection[] {
  return [...collections].sort((a, b) => {
    const orderDifference = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
    return orderDifference || a.title.localeCompare(b.title);
  });
}

export function getResolvedBlogCollections(locale?: string): ResolvedBlogCollection[] {
  const postsBySlug = new Map(
    getBlogItems(locale)
      .filter((post): post is CardItem & { slug: string } => Boolean(post.slug))
      .map((post) => [post.slug, post])
  );

  const collections = getCollectionDefinitions(locale).map((collection) => {
    const postSlugs = Array.from(new Set(collection.posts));
    const posts: CardItem[] = [];

    for (const slug of postSlugs) {
      const post = postsBySlug.get(slug);
      if (post) posts.push(post);
    }

    const missingPostSlugs = postSlugs.filter((slug) => !postsBySlug.has(slug));
    const latestDate = posts
      .map((post) => post.date)
      .filter((date): date is string => Boolean(date))
      .sort((a, b) => b.localeCompare(a))[0];

    return {
      ...collection,
      postSlugs,
      posts,
      missingPostSlugs,
      latestDate,
    };
  });

  return sortCollections(collections);
}

export function getFeaturedBlogCollections(locale?: string, limit = 4): ResolvedBlogCollection[] {
  return getResolvedBlogCollections(locale)
    .filter((collection) => collection.featured)
    .slice(0, limit);
}

export function getResolvedBlogCollection(
  slug: string,
  locale?: string
): ResolvedBlogCollection | null {
  return getResolvedBlogCollections(locale).find((collection) => collection.slug === slug) ?? null;
}

export function getBlogCollectionSlugs(locale?: string): string[] {
  return getCollectionDefinitions(locale).map((collection) => collection.slug);
}
