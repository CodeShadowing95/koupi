import { creatorAvatar } from '@/lib/creator-avatars';
import { avatarClass, initials } from '@/lib/ui';

type Size = 'xs' | 'md' | 'lg';

/** Avatar d'un créateur : sa photo YouTube si on l'a, sinon ses initiales sur une couleur stable. */
export function CreatorAvatar({ name, size = 'md', className: extra }: { name: string; size?: Size; className?: string }) {
  const src = creatorAvatar(name);
  const className = `k-av k-${avatarClass(name)}${size === 'lg' ? ' k-av-lg' : size === 'xs' ? ' k-av-xs' : ''}${src ? ' k-av-photo' : ''}${extra ? ` ${extra}` : ''}`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- petite image locale, déjà à la bonne taille
    return <img className={className} src={src} alt="" width={96} height={96} loading="lazy" decoding="async" />;
  }
  return <span className={className} aria-hidden="true">{initials(name)}</span>;
}
