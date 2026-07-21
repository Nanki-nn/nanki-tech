'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { ChevronDown, ListTree } from 'lucide-react';
import type { MarkdownHeading } from '@/lib/markdownHeadings';

interface TableOfContentsProps {
  headings: MarkdownHeading[];
  variant: 'desktop' | 'mobile';
}

function TocLinks({
  headings,
  activeId,
  onNavigate,
}: {
  headings: MarkdownHeading[];
  activeId: string;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  return (
    <ol className="relative border-l border-neutral-200 dark:border-neutral-800">
      {headings.map((heading) => {
        const isActive = heading.id === activeId;

        return (
          <li key={`${heading.line}-${heading.id}`} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-px top-[0.55rem] h-5 w-0.5 origin-center bg-accent transition-transform duration-200 motion-reduce:transition-none ${
                isActive ? 'scale-y-100' : 'scale-y-0'
              }`}
            />
            <a
              href={`#${heading.id}`}
              onClick={(event) => onNavigate(event, heading.id)}
              aria-current={isActive ? 'location' : undefined}
              className={`block py-1.5 pr-1 text-[0.8125rem] leading-5 transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 motion-reduce:transition-none ${
                heading.depth === 3 ? 'pl-7' : 'pl-4'
              } ${isActive ? 'font-semibold text-primary' : 'text-neutral-500'}`}
            >
              {heading.text}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export default function TableOfContents({ headings, variant }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '');
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const headingIds = useMemo(() => headings.map((heading) => heading.id), [headings]);

  useEffect(() => {
    const elements = headingIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return;

    let frame = 0;
    const updateActiveHeading = () => {
      frame = 0;
      const activationLine = 136;
      let current = elements[0];

      for (const element of elements) {
        if (element.getBoundingClientRect().top <= activationLine) {
          current = element;
        } else {
          break;
        }
      }

      const reachedPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActiveId(reachedPageEnd ? elements[elements.length - 1].id : current.id);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headingIds]);

  if (headings.length === 0) return null;

  const activeHeading = headings.find((heading) => heading.id === activeId);

  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollToTarget = () => {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${encodeURIComponent(id)}`);
      setActiveId(id);
    };

    if (variant === 'mobile') {
      detailsRef.current?.removeAttribute('open');
      window.requestAnimationFrame(scrollToTarget);
    } else {
      scrollToTarget();
    }
  };

  if (variant === 'mobile') {
    return (
      <details ref={detailsRef} className="group border-y border-neutral-200 dark:border-neutral-800">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 py-4 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [&::-webkit-details-marker]:hidden">
          <ListTree className="h-4 w-4 text-accent" aria-hidden="true" />
          <span>本文目录</span>
          <span className="ml-auto max-w-[55%] truncate text-xs font-normal text-neutral-500">
            {activeHeading?.text ?? `${headings.length} 个章节`}
          </span>
          <ChevronDown
            className="h-4 w-4 text-neutral-400 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </summary>
        <nav aria-label="本文目录" className="pb-4">
          <TocLinks headings={headings} activeId={activeId} onNavigate={handleNavigate} />
        </nav>
      </details>
    );
  }

  return (
    <nav aria-label="本文目录" className="max-h-[calc(100vh-8rem)] overflow-y-auto py-1 pr-1">
      <p className="mb-3 pl-4 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
        本文目录
      </p>
      <TocLinks headings={headings} activeId={activeId} onNavigate={handleNavigate} />
    </nav>
  );
}
