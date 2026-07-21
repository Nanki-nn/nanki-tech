import type { CardItem } from '@/types/page';

export type BlogCollectionKind = 'series' | 'topic';

export interface BlogCollectionDefinition {
  slug: string;
  title: string;
  kind: BlogCollectionKind;
  description: string;
  featured?: boolean;
  order?: number;
  posts: string[];
}

export interface BlogCollectionsConfig {
  collections: BlogCollectionDefinition[];
}

export interface ResolvedBlogCollection extends Omit<BlogCollectionDefinition, 'posts'> {
  postSlugs: string[];
  posts: CardItem[];
  missingPostSlugs: string[];
  latestDate?: string;
}
