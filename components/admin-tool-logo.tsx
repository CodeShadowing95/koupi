'use client';
import { useToolLogo } from '@/components/avatar-map';

/** Petit logo d'outil pour les listes admin (24 px). Sans logo récupéré : l'initiale sur fond neutre. */
export function AdminToolLogo({ slug, name }: { slug: string; name: string }) {
  const logo = useToolLogo(slug, name);
  if (!logo) return <span className="adm-tool-logo is-empty" title="Logo pas encore récupéré (bouton « Récupérer les logos »)" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
  return (
    <span className={`adm-tool-logo is-${logo.kind}`} style={{ background: logo.bg }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- petite image servie par Merkod */}
      <img src={logo.src} alt="" width={24} height={24} loading="lazy" decoding="async" />
    </span>
  );
}

/** Le nom de l'outil précédé de son logo. */
export function AdminToolName({ slug, name }: { slug: string; name: string }) {
  return <span className="adm-tool-name"><AdminToolLogo slug={slug} name={name} /><b>{name}</b></span>;
}
