import Link from 'next/link';
import type { CardItem } from '@/types/page';

export default function BlogListItemContent({
  post,
  linkTitle = false,
}: {
  post: CardItem;
  linkTitle?: boolean;
}) {
  const hasMeta = Boolean(post.date);
  const title = linkTitle && post.link ? (
    <Link
      href={post.link}
      className="transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      {post.title}
    </Link>
  ) : (
    post.title
  );

  return (
    <>
      {hasMeta && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-neutral-400">
          {post.date && <span>{post.date}</span>}
        </div>
      )}
      <h2
        className={`${hasMeta ? 'mt-2 ' : ''}font-serif text-2xl font-bold leading-snug text-primary transition-colors group-hover:text-accent`}
      >
        {title}
      </h2>
      {post.content && (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600 dark:text-neutral-500">
          {post.content}
        </p>
      )}
    </>
  );
}
