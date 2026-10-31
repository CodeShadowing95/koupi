import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header, Footer } from '@/components/shell';

// next/font télécharge les polices au build et les sert depuis notre domaine :
// aucun appel à Google côté visiteur.
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-bricolage', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-jetbrains', display: 'swap' });

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
