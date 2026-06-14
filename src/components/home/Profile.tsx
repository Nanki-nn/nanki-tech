'use client';

import { motion } from 'framer-motion';
import {
    EnvelopeIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import { Github, Linkedin, Sparkles } from 'lucide-react';
import type { SiteConfig } from '@/lib/config';
import { useMessages } from '@/lib/i18n/useMessages';

interface ProfileProps {
    author: SiteConfig['author'];
    social: SiteConfig['social'];
    features: SiteConfig['features'];
    researchInterests?: string[];
}

export default function Profile({ author, social, researchInterests }: ProfileProps) {
    const messages = useMessages();

    const socialLinks = [
        ...(social.github ? [{
            name: 'GitHub',
            href: social.github,
            icon: Github,
        }] : []),
        ...(social.email ? [{
            name: messages.profile.email,
            href: `mailto:${social.email}`,
            icon: EnvelopeIcon,
        }] : []),
        ...(social.linkedin ? [{
            name: 'LinkedIn',
            href: social.linkedin,
            icon: Linkedin,
        }] : []),
        ...(social.yuque ? [{
            name: 'Yuque',
            href: social.yuque as string,
            label: 'Y',
        }] : []),
        ...(social.csdn ? [{
            name: 'CSDN',
            href: social.csdn as string,
            label: 'C',
        }] : []),
    ];

    return (
        <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="sticky top-8"
        >
            <div className="mb-6">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-accent">
                    <Sparkles className="h-3.5 w-3.5" />
                    build in pulic
                </p>
                <h1 className="mb-3 text-4xl font-serif font-bold leading-tight text-primary sm:text-5xl lg:text-4xl">
                    {author.name}
                </h1>
                <p className="mb-3 text-lg font-semibold text-accent">
                    {author.title}
                </p>
                <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-500">
                    {author.institution}
                </p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                {socialLinks.map((link) => {
                    const IconComponent = link.icon;
                    return (
                        <a
                            key={link.name}
                            href={link.href}
                            target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                            rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors duration-200 hover:border-accent/40 hover:text-accent dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
                            aria-label={link.name}
                            title={link.name}
                        >
                            {IconComponent ? (
                                <IconComponent className="h-5 w-5" />
                            ) : (
                                <span className="text-sm font-bold">{link.label}</span>
                            )}
                        </a>
                    );
                })}
            </div>

            {social.location && (
                <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
                    <MapPinIcon className="h-4 w-4" />
                    <span>{social.location}</span>
                </div>
            )}

            {researchInterests && researchInterests.length > 0 && (
                <div className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
                    <h2 className="mb-3 text-sm font-semibold text-primary">
                        {messages.profile.researchInterests}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {researchInterests.map((interest) => (
                            <span
                                key={interest}
                                className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                            >
                                {interest}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </motion.aside>
    );
}
