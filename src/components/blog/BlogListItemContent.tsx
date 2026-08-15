import Link from 'next/link';
import type { CardItem } from '@/types/page';

function formatDate(date: string, locale: string): string {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(parsedDate);
}

export default function BlogListItemContent({
  post,
  linkTitle = false,
  locale = 'en',
}: {
  post: CardItem;
  linkTitle?: boolean;
  locale?: string;
}) {
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
      <div className="flex items-start justify-between gap-5">
        <h2 className="font-serif text-xl font-semibold leading-snug text-primary transition-colors group-hover:text-accent">
          {title}
        </h2>
        {post.date && (
          <time
            dateTime={post.date}
            className="shrink-0 pt-1 text-xs tabular-nums text-neutral-400"
          >
            {formatDate(post.date, locale)}
          </time>
        )}
      </div>

      {post.content && (
        <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-500">
          {post.content}
        </p>
      )}
    </>
  );
}
