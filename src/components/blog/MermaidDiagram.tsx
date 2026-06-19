'use client';

import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        background: '#fbfaf7',
        primaryColor: '#ebe6dc',
        primaryTextColor: '#18201c',
        primaryBorderColor: '#d9d0c0',
        lineColor: '#7c6a38',
        secondaryColor: '#f5f2eb',
        tertiaryColor: '#ffffff',
        fontFamily: 'Avenir Next, IBM Plex Sans, Segoe UI, sans-serif',
      },
    });

    async function renderDiagram() {
      try {
        const result = await mermaid.render(`mermaid-${id}`, chart);
        if (mounted) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (renderError) {
        if (mounted) {
          setError(renderError instanceof Error ? renderError.message : 'Failed to render diagram.');
          setSvg('');
        }
      }
    }

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [chart, id]);

  if (error) {
    return (
      <pre className="mb-7 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-900 p-4 text-sm leading-7 text-neutral-100 shadow-sm dark:border-neutral-800">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <figure className="my-8 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div
        className="min-w-fit [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </figure>
  );
}
