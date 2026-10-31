import './admin.css';
import { Header, Footer } from '@/components/admin-shell';

// Back-office : on garde l'interface claire d'origine, à l'identique.
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-root"><Header />{children}<Footer /></div>;
}
