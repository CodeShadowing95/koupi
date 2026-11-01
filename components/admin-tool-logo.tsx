import { toolLogo } from '@/lib/tool-logos';

/** Petit logo d'outil pour les listes admin (24 px). Sans logo récupéré : l'initiale sur fond neutre. */
export function AdminToolLogo({ slug, name }: { slug: string; name: string }) {
  const logo = toolLogo(slug) ?? toolLogo(name);
  if (!logo) return <span className="adm-tool-logo is-empty" title="Logo pas encore récupéré (npm run logos)" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
  return (
    <span className={`adm-tool-logo is-${logo.kind}`} style={{ background: logo.bg }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- petit fichier statique local */}
      <img src={logo.src} alt="" width={24} height={24} loading="lazy" decoding="async" />
    </span>
  );
}

/** Le nom de l'outil précédé de son logo. */
export function AdminToolName({ slug, name }: { slug: string; name: string }) {
  return <span className="adm-tool-name"><AdminToolLogo slug={slug} name={name} /><b>{name}</b></span>;
}
