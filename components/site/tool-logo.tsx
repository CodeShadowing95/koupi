import { useId } from 'react';
import { sealText, toolLogo } from '@/lib/tool-logos';

type Props = { tool: string; name: string; className?: string };

/** Le logo de l'outil dans un disque de sa couleur. Sans logo : son initiale. */
export function ToolLogo({ tool, name, className = '' }: Props) {
  const logo = toolLogo(tool) ?? toolLogo(name);
  if (!logo) {
    return <span className={`k-tool-logo ${className}`} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
  }
  return (
    <span className={`k-tool-logo is-real is-${logo.kind} ${className}`} style={{ background: logo.bg }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- petit fichier statique local, pas besoin de next/image */}
      <img src={logo.src} alt="" width={28} height={28} loading="lazy" decoding="async" />
    </span>
  );
}

/**
 * Le sceau Koupi : le logo de l'outil au centre, son nom écrit en cercle autour,
 * comme un tampon posé sur le coupon. L'anneau tourne doucement (GSAP, voir effects.tsx).
 */
export function ToolSeal({ tool, name, size = 'md', className = '' }: Props & { size?: 'sm' | 'md' | 'lg' }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className={`k-seal k-seal-${size} ${className}`} aria-hidden="true">
      <svg className="k-seal-ring" viewBox="0 0 100 100">
        <defs><path id={`seal-${id}`} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" /></defs>
        <circle cx="50" cy="50" r="48" className="k-seal-edge" />
        <circle cx="50" cy="50" r="29" className="k-seal-dash" />
        <text><textPath href={`#seal-${id}`} textLength="238" lengthAdjust="spacing">{sealText(name)}</textPath></text>
      </svg>
      <ToolLogo tool={tool} name={name} className="k-seal-logo" />
    </span>
  );
}
