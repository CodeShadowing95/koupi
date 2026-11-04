'use client';
import { initials } from '@/lib/admin-card';
import { useCreatorAvatar } from '@/components/avatar-map';

/** Avatar d'un créateur dans l'admin : sa photo de profil si on l'a récupérée (en base ou par `npm run avatars`), sinon ses initiales. */
export function AdminCreatorAvatar({ name, small = false }: { name: string; small?: boolean }) {
  const src = useCreatorAvatar(name);
  const className = `adm-avatar${small ? ' adm-avatar-sm' : ''}${src ? ' adm-avatar-photo' : ''}`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- petite image servie par Merkod, déjà à la bonne taille
    return <img className={className} src={src} alt="" width={32} height={32} loading="lazy" decoding="async" />;
  }
  return <span className={className} aria-hidden="true">{initials(name)}</span>;
}
