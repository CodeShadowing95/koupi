import type { Metadata } from 'next';
import './globals.css';
import { Header, Footer } from '@/components/shell';

export const metadata: Metadata = {
  title: 'Koupi — Le code du créateur, vérifié.',
  description: 'Trouve les codes promo partagés par les créateurs, avec leur source et les votes de la communauté.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><Header />{children}<Footer /></body></html>;
}
