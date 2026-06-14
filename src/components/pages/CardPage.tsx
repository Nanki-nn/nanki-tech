'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { CardPageConfig } from '@/types/page';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

const markdownComponents = {
    p: ({ children }: React.ComponentProps<'p'>) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }: React.ComponentProps<'ul'>) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
    ol: ({ children }: React.ComponentProps<'ol'>) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
    li: ({ children }: React.ComponentProps<'li'>) => <li className="mb-1">{children}</li>,
    a: ({ ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-medium transition-all duration-200 rounded hover:bg-accent/10 hover:shadow-sm"
        />
    ),
    blockquote: ({ children }: React.ComponentProps<'blockquote'>) => (
        <blockquote className="border-l-4 border-accent/50 pl-4 italic my-4 text-neutral-600 dark:text-neutral-500">
            {children}
        </blockquote>
    ),
    strong: ({ children }: React.ComponentProps<'strong'>) => <strong className="font-semibold text-primary">{children}</strong>,
    em: ({ children }: React.ComponentProps<'em'>) => <em className="italic">{children}</em>,
    code: ({ children }: React.ComponentProps<'code'>) => (
        <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[0.95em]">{children}</code>
    ),
};

export default function CardPage({ config, embedded = false }: { config: CardPageConfig; embedded?: boolean }) {
    const items = embedded && config.home_limit ? config.items.slice(0, config.home_limit) : config.items;
    const showDetails = config.title === 'Projects';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className={embedded ? "mb-4" : "mb-8"}>
                <div className="mb-4 flex items-center justify-between gap-4">
                    <h1 className={`${embedded ? "text-2xl" : "text-4xl"} font-serif font-bold text-primary`}>{config.title}</h1>
                    {embedded && config.more_href && (
                        <Link
                            href={config.more_href}
                            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-neutral-600 transition-colors hover:text-accent dark:text-neutral-500"
                        >
                            More
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    )}
                </div>
                {config.description && (
                    <div className={`${embedded ? "text-base" : "text-lg"} text-neutral-600 dark:text-neutral-500 max-w-2xl leading-relaxed`}>
                        <ReactMarkdown components={markdownComponents}>
                            {config.description}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            <div className={`grid ${embedded ? "gap-4" : "gap-6"}`}>
                {items.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 * index }}
                        className={`group bg-white dark:bg-neutral-900 ${embedded ? "p-4" : "p-6"} rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg`}
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <h3 className={`${embedded ? "text-lg" : "text-xl"} font-semibold text-primary`}>{item.title}</h3>
                                {showDetails && item.subtitle && (
                                    <p className={`${embedded ? "text-sm" : "text-base"} text-accent font-medium mt-1`}>{item.subtitle}</p>
                                )}
                                {showDetails && item.content && (
                                    <div className={`${embedded ? "text-sm" : "text-base"} text-neutral-600 dark:text-neutral-500 leading-relaxed mt-3`}>
                                        <ReactMarkdown components={markdownComponents}>
                                            {item.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                                {item.tags && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {item.tags.map(tag => (
                                            <span key={tag} className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 rounded border border-neutral-100 dark:border-neutral-800">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
                                {item.date && (
                                    <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                                        {item.date}
                                    </span>
                                )}
                                {item.link && (() => {
                                    const isInternal = item.link.startsWith('/');
                                    const linkLabel = isInternal ? 'Read More' : 'View Link';
                                    const className = "inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors duration-200 hover:text-accent";

                                    return isInternal ? (
                                        <Link href={item.link} className={className}>
                                            {linkLabel}
                                            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                        </Link>
                                    ) : (
                                        <a
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={className}
                                        >
                                            {linkLabel}
                                            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                        </a>
                                    );
                                })()}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
