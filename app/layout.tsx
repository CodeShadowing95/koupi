import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Header, Footer } from '@/components/shell';

// Polices hébergées dans app/fonts (voir app/fonts/README.md) : le build ne dépend pas de Google Fonts
// et le visiteur ne fait aucun appel à Google.
const bricolage = localFont({ src: './fonts/bricolage-grotesque-latin.woff2', weight: '700 800', variable: '--font-bricolage', display: 'swap' });
const inter = localFont({ src: './fonts/inter-latin.woff2', weight: '400 700', variable: '--font-inter', display: 'swap' });
const jetbrains = localFont({ src: './fonts/jetbrains-mono-latin.woff2', weight: '500 700', variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'Koupi · Le code du créateur, vérifié.',
  description: 'Trouve les codes promo partagés par les créateurs, avec leur source et les votes de la communauté.',
  icons: { icon: '/koupi-icone-512.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body><Header />{children}<Footer /></body>
    </html>
  );
}
