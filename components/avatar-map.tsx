'use client';
// Images gardées en base (ADR-0027) : photos des créateurs et logos des outils, chargées une fois par la mise en page
// du site et de l'admin, et lues par chaque avatar ou logo. Sans elles (base injoignable), les images du dépôt
// et les initiales prennent le relais.
import { createContext, useContext, type ReactNode } from 'react';
import { creatorAvatar } from '@/lib/creator-avatars';
import { toolLogo, type ToolLogo } from '@/lib/tool-logos';

type Media = { avatars: Record<string, string>; logos: Record<string, string> };
const MediaMap = createContext<Media>({ avatars: {}, logos: {} });

export function AvatarMapProvider({ avatars, logos = {}, children }: { avatars: Record<string, string>; logos?: Record<string, string>; children: ReactNode }) {
  return <MediaMap.Provider value={{ avatars, logos }}>{children}</MediaMap.Provider>;
}

/** La photo d'un créateur (en base, sinon dans le dépôt), ou null pour ses initiales. */
export function useCreatorAvatar(name: string): string | null {
  return creatorAvatar(name, useContext(MediaMap).avatars);
}

/** Le logo d'un outil (en base, sinon dans le dépôt), par son slug ou son nom. null pour son initiale. */
export function useToolLogo(slug: string, name: string): ToolLogo | null {
  const { logos } = useContext(MediaMap);
  return toolLogo(slug, logos) ?? toolLogo(name, logos);
}
