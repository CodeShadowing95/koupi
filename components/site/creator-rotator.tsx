'use client';
// Lien « ou découvre les codes de X » de l'accueil : le nom de la chaîne change toutes les quelques secondes.
// Seul le nom bouge (fondu court). Pause au survol, au focus, quand l'onglet est caché ou la section hors écran.
// Avec prefers-reduced-motion, on garde un seul nom tiré au hasard, sans animation.
import Link from '@/components/site/site-pages';
import { useEffect, useRef, useState } from 'react';
import { gsap, MOTION_OK, MOTION_REDUCED, useGSAP } from '@/lib/gsap';
import { routes } from '@/lib/routes';
import { nextRotation, shuffled } from '@/lib/creator-rotation';

type Creator = { name: string; slug: string };

const INTERVAL_MS = 3200;

export function CreatorRotator({ creators }: { creators: Creator[] }) {
  // Le premier nom est celui rendu par le serveur ; l'ordre aléatoire est tiré côté client pour éviter un écart d'hydratation.
  const [order, setOrder] = useState(creators);
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLAnchorElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const paused = useRef(false);
  const visible = useRef(true);

  useEffect(() => {
    if (creators.length < 2) return;
    setOrder([creators[0], ...shuffled(creators.slice(1))]);
  }, [creators]);

  useGSAP(() => {
    if (order.length < 2) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_REDUCED, () => {
      setIndex(Math.floor(Math.random() * order.length));
    });
    mm.add(MOTION_OK, () => {
      const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; });
      if (root.current) observer.observe(root.current);
      const timer = window.setInterval(() => {
        if (paused.current || !visible.current || document.hidden || !name.current) return;
        gsap.to(name.current, {
          opacity: 0, y: -6, duration: 0.22, ease: 'power2.in',
          onComplete: () => {
            setIndex(current => nextRotation(current, order.length));
            gsap.fromTo(name.current, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
          },
        });
      }, INTERVAL_MS);
      return () => { window.clearInterval(timer); observer.disconnect(); };
    });
    return () => mm.revert();
  }, { dependencies: [order], scope: root });

  if (creators.length === 0) return null;
  const current = order[index] ?? order[0];
  const pause = () => { paused.current = true; };
  const resume = () => { paused.current = false; };

  return (
    <Link ref={root} className="k-link k-creator-rotator" href={routes.creator(current.slug)}
      onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume}>
      ou découvre les codes de <span ref={name} className="k-creator-rotator-name">{current.name}</span> →
    </Link>
  );
}
