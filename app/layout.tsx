import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { isIndexable, siteUrl } from '@/lib/seo';

// Polices hébergées dans app/fonts (voir app/fonts/README.md) : le build ne dépend pas de Google Fonts
// et le visiteur ne fait aucun appel à Google.
const bricolage = localFont({ src: './fonts/bricolage-grotesque-latin.woff2', weight: '700 800', variable: '--font-bricolage', display: 'swap' });
const inter = localFont({ src: './fonts/inter-latin.woff2', weight: '400 700', variable: '--font-inter', display: 'swap' });
const jetbrains = localFont({ src: './fonts/jetbrains-mono-latin.woff2', weight: '500 700', variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  // Adresse publique : les canoniques et les aperçus de partage deviennent des adresses complètes merkod.com.
  metadataBase: new URL(siteUrl()),
  openGraph: { siteName: 'Merkod', locale: 'fr_FR', type: 'website' },
  twitter: { card: 'summary_large_image' },
  // La pré-production ne doit jamais apparaître dans Google (robots.txt la ferme aussi).
  ...(isIndexable() ? {} : { robots: { index: false, follow: false } }),
  title: 'Merkod · Le code du créateur, vérifié.',
  description: 'Trouve les codes promo partagés par les créateurs, avec leur source et les votes de la communauté.',
  icons: { icon: '/merkod-icone-512.png' },
};

// Mise en page racine : seulement les polices. Le site public (app/(site)) et le back-office (app/admin)
// ont chacun leur propre en-tête et leur propre feuille de style.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
