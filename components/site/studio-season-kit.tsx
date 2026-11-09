'use client';
// Studio : le kit de saison du créateur (Black Friday, Noël). Un lien à partager, une image story à télécharger
// et un texte prêt pour ses descriptions. Rien n'est publié à sa place : il copie, il colle.
import { useState } from 'react';

type Props = {
  label: string;
  days: number;
  pagePath: string;
  imagePath: string;
  description: string;
  count: number;
};

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(key: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1800); } catch { window.prompt('Copie ce texte :', text); }
  }
  return { copied, copy };
}

export function StudioSeasonKit({ label, days, pagePath, imagePath, description, count }: Props) {
  const { copied, copy } = useCopy();
  const absolute = () => new URL(pagePath, window.location.origin).toString();
  return (
    <div className="k-st-kit">
      <a className="k-st-kit-preview" href={imagePath} target="_blank" rel="noopener" aria-label={`Voir l’image ${label} en grand`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- image générée par une route, pas d'optimisation utile */}
        <img src={imagePath} alt={`Aperçu de l’image story ${label} : tes ${count} codes`} width={180} height={320} loading="lazy" />
      </a>
      <div className="k-st-kit-body">
        <p className="k-st-muted">
          {days > 0 ? <><b>J-{days}</b> avant {label}. </> : null}
          Partage tes codes du moment sur une page à tes couleurs de saison : {count} {count > 1 ? 'codes' : 'code'}, chacun avec sa source.
          Ton lien reste ton lien, la commission te revient.
        </p>
        <ol className="k-st-kit-steps">
          <li>
            <b>Ta page {label}</b>
            <span>À mettre dans tes descriptions, ta bio ou un post.</span>
            <div className="k-st-row">
              <button type="button" className="k-btn k-btn-primary" onClick={() => copy('link', absolute())}>{copied === 'link' ? 'Lien copié' : 'Copier le lien'}</button>
              <a className="k-btn k-btn-ghost" href={pagePath} target="_blank" rel="noopener">Voir la page ↗</a>
            </div>
          </li>
          <li>
            <b>L’image story</b>
            <span>Format 1080 × 1920, pour Instagram, TikTok ou YouTube Shorts.</span>
            <div className="k-st-row">
              <a className="k-btn k-btn-primary" href={`${imagePath}?download=1`} download>Télécharger l’image</a>
            </div>
          </li>
          <li>
            <b>Le texte de description</b>
            <span>Prêt à coller sous ta prochaine vidéo.</span>
            <textarea className="k-st-kit-text" readOnly value={description} rows={Math.min(9, description.split('\n').length + 1)} aria-label={`Texte de description ${label}`} onFocus={event => event.currentTarget.select()} />
            <div className="k-st-row">
              <button type="button" className="k-btn k-btn-ghost" onClick={() => copy('text', description)}>{copied === 'text' ? 'Texte copié' : 'Copier le texte'}</button>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
