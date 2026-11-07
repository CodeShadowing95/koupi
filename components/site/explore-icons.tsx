// Icônes de la page Explorer : rayons de la colonne et familles de catégories. Traits simples, 24 × 24.
import type { Shelf } from '@/lib/explore';

const SHELF_PATHS: Record<Shelf, string> = {
  // Un coupon : tout le comptoir.
  all: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Zm11-2v12',
  // Une étincelle : nouveautés.
  fresh: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  // Une carte bancaire cochée : testé au paiement.
  payment: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M3 10h18M3 7v10a2 2 0 0 0 2 2h7m3-2 2 2 4-4',
  // Un pouce : les plus votés.
  votes: 'M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Zm0 0 4-7a2.5 2.5 0 0 1 2.5 3L13 10h5.5a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 17 21H7',
  // Un sablier : dernière chance.
  soon: 'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9',
};

const FAMILY_PATHS: Record<string, string> = {
  securite: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Zm-3 9 2 2 4-4',
  hebergement: 'M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01',
  sites: 'M3 5h18v14H3zM3 9h18M7 7h.01M10 7h.01',
  design: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1-.8-1.4-.8-2.3 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.2-4-7.6-9-7.6ZM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  audio: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  createurs: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z',
  marketing: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Zm13-3a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14',
  productivite: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  ecriture: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  ia: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z',
  argent: 'M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 10v4M18 10v4',
  formation: 'M2 9l10-5 10 5-10 5L2 9Zm4 2v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6',
  developpement: 'M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14',
};
// Une étiquette pour une famille ajoutée plus tard dans l'admin.
const FALLBACK = 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm5-4.5h.01';

function Svg({ d, size }: { d: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function ShelfIcon({ shelf, size = 20 }: { shelf: Shelf; size?: number }) {
  return <Svg d={SHELF_PATHS[shelf]} size={size} />;
}

export function FamilyIcon({ family, size = 20 }: { family: string; size?: number }) {
  return <Svg d={FAMILY_PATHS[family] ?? FALLBACK} size={size} />;
}
