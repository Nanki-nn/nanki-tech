export interface MarkdownHeading {
  depth: 2 | 3;
  text: string;
  id: string;
  line: number;
}

function inlineMarkdownToText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_~]/g, '')
    .replace(/\\([\\`*_[\]{}()#+\-.!>])/g, '$1')
    .trim();
}

function slugifyHeading(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extracts second- and third-level ATX headings from Markdown. Fenced code
 * blocks are skipped so comments such as `## example` never leak into the TOC.
 */
export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const slugCounts = new Map<string, number>();
  let activeFence: { marker: '`' | '~'; length: number } | null = null;

  content.split(/\r?\n/).forEach((line, index) => {
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/);

    if (fence) {
      const marker = fence[1][0] as '`' | '~';
      const length = fence[1].length;

      if (!activeFence) {
        activeFence = { marker, length };
      } else if (activeFence.marker === marker && length >= activeFence.length) {
        activeFence = null;
      }

      return;
    }

    if (activeFence) return;

    const match = line.match(/^\s{0,3}(#{2,3})[\t ]+(.+?)\s*$/);
    if (!match) return;

    const text = inlineMarkdownToText(match[2].replace(/[\t ]+#+[\t ]*$/, ''));
    if (!text) return;

    const baseSlug = slugifyHeading(text) || 'section';
    const count = (slugCounts.get(baseSlug) ?? 0) + 1;
    slugCounts.set(baseSlug, count);

    headings.push({
      depth: match[1].length as 2 | 3,
      text,
      id: count === 1 ? baseSlug : `${baseSlug}-${count}`,
      line: index + 1,
    });
  });

  return headings;
}
