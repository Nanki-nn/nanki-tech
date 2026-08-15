'use client';

import { useEffect, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

export default function BlogImage({ src, alt }: { src: string; alt: string }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative my-8 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-neutral-200 bg-white text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 dark:border-neutral-800 dark:bg-neutral-900"
        aria-label={alt ? `放大图片：${alt}` : '放大图片'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
        />
        <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={alt || '图片预览'}
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 sm:top-6"
            aria-label="关闭图片预览"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[94vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
