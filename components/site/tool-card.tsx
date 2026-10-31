import Link from 'next/link';
import type { Tool } from '@/lib/data';
import { routes } from '@/lib/routes';
import { plural } from '@/lib/ui';

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link className="k-tool" href={routes.tool(tool.slug)} data-reveal>
      <div className="k-tool-top">
        <span className="k-tool-logo" aria-hidden="true">{tool.name.slice(0, 1).toUpperCase()}</span>
        <div><h3>{tool.name}</h3><p>{tool.category}</p></div>
      </div>
      <div className="k-tool-foot"><span className="k-mono">{plural(tool.codes, 'code', 'codes')}</span><span aria-hidden="true">Voir →</span></div>
    </Link>
  );
}
