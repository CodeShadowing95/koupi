import type { Metadata } from 'next';
import { LoginPortal } from './login-portal';

export const metadata: Metadata = { title: 'Connexion admin · Merkod', robots: { index: false, follow: false } };

export default function AdminLogin() {
  return <LoginPortal />;
}
