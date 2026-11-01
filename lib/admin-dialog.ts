// Fenêtres du back-office : durée de l'animation d'ouverture et de fermeture (voir .adm-dialog dans admin.css).
export const DIALOG_MS = 200;

/**
 * Appelle fn une fois l'animation de fermeture finie, pour que le contenu ne disparaisse pas pendant le fondu.
 * Tout de suite si l'utilisateur a demandé moins d'animations.
 */
export function afterDialogClose(fn: () => void): void {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) fn();
  else window.setTimeout(fn, DIALOG_MS);
}
