'use client';
// Pages coupées par l'admin (espace Administration) : le layout du site les donne une fois, chaque lien les consulte.
// SiteLink remplace next/link sur le site public : vers une page coupée, un bouton disparaît et un lien devient du texte.
import NextLink from 'next/link';
import { createContext, useContext, type ComponentProps } from 'react';
import { isPathOff, type PageKey } from '@/lib/site-pages';

const OffPages = createContext<readonly PageKey[]>([]);

export function SitePagesProvider({ off, children }: { off: readonly PageKey[]; children: React.ReactNode }) {
  return <OffPages.Provider value={off}>{children}</OffPages.Provider>;
}

/** Vrai si l'adresse mène à une page coupée par l'admin. */
export function useIsOff(): (href: string) => boolean {
  const off = useContext(OffPages);
  return href => off.length > 0 && href.startsWith('/') && isPathOff(href, off);
}

// Boutons et appels à l'action : sans leur page, ils n'ont plus de sens et disparaissent.
const ACTION = /\bk-(btn|nav-coupon|more-ticket|link-btn|board-empty-stub)\b/;

type Props = ComponentProps<typeof NextLink>;

export default function SiteLink({ href, className, children, ...rest }: Props) {
  const isOff = useIsOff();
  const path = typeof href === 'string' ? href : href.pathname ?? '';
  if (!isOff(path)) return <NextLink href={href} className={className} {...rest}>{children}</NextLink>;
  if (className && ACTION.test(className)) return null;
  return <span className={className} style={rest.style}>{children}</span>;
}

/** Élément de liste de liens (pied de page) : disparaît avec sa page. */
export function SiteLinkItem({ href, children }: { href: string; children: React.ReactNode }) {
  const isOff = useIsOff();
  return isOff(href) ? null : <li><NextLink href={href}>{children}</NextLink></li>;
}
