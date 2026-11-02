'use client';
// Ferme une fenêtre ou un panneau (<dialog> ouvert avec showModal) quand on clique sur le voile, à l'extérieur.
// Le clic doit commencer ET finir dehors : sélectionner du texte dans un champ puis relâcher dehors ne ferme rien.
import { useRef, type RefObject } from 'react';
import { isOutside } from '@/lib/admin-dialog';

export function useBackdropClose(dialog: RefObject<HTMLDialogElement | null>) {
  const startedOutside = useRef(false);
  const outside = (event: React.PointerEvent | React.MouseEvent) => {
    const element = dialog.current;
    return Boolean(element) && event.target === element && isOutside(element!.getBoundingClientRect(), event.clientX, event.clientY);
  };
  return {
    onPointerDown: (event: React.PointerEvent<HTMLDialogElement>) => { startedOutside.current = outside(event); },
    onClick: (event: React.MouseEvent<HTMLDialogElement>) => {
      if (startedOutside.current && outside(event)) dialog.current?.close();
      startedOutside.current = false;
    },
  };
}
