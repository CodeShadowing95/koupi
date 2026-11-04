'use client';
// Photos des créateurs gardées en base (ADR-0027), chargées une fois par la mise en page du site et de l'admin
// et lues par chaque avatar. Sans elles (base injoignable), les photos du dépôt et les initiales prennent le relais.
import { createContext, useContext, type ReactNode } from 'react';
import { creatorAvatar } from '@/lib/creator-avatars';

const AvatarMap = createContext<Record<string, string>>({});

export function AvatarMapProvider({ avatars, children }: { avatars: Record<string, string>; children: ReactNode }) {
  return <AvatarMap.Provider value={avatars}>{children}</AvatarMap.Provider>;
}

/** La photo d'un créateur (en base, sinon dans le dépôt), ou null pour ses initiales. */
export function useCreatorAvatar(name: string): string | null {
  return creatorAvatar(name, useContext(AvatarMap));
}
