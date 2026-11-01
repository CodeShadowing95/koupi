'use client';
import { usePathname } from 'next/navigation';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '@/lib/gsap';

// Effets communs à toutes les pages publiques :
// - [data-reveal] : l'élément monte et apparaît quand il entre à l'écran (par lots, avec un léger décalage) ;
// - .k-seal-ring : le nom de l'outil tourne autour de son logo ;
// - .k-tile : un halo suit le pointeur (variables --mx / --my).
// Sans JavaScript ou avec « réduire les animations », tout reste simplement visible.
export function SiteEffects() {
  const pathname = usePathname();

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      gsap.set(items, { y: 36, opacity: 0 });
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        once: true,
        onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08, overwrite: true }),
      });

      // L'anneau des sceaux tourne lentement, chacun à son rythme.
      gsap.utils.toArray<SVGElement>('.k-seal-ring').forEach((ring, i) => {
        gsap.to(ring, { rotation: i % 2 ? -360 : 360, duration: 28 + (i % 4) * 4, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
      });
    });

    const onMove = (event: PointerEvent) => {
      const tile = (event.target as HTMLElement).closest<HTMLElement>('.k-tile');
      if (!tile) return;
      const rect = tile.getBoundingClientRect();
      tile.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      tile.style.setProperty('--my', `${event.clientY - rect.top}px`);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, { dependencies: [pathname], revertOnUpdate: true });

  return null;
}
