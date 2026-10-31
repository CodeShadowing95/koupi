// Copie un code dans le presse-papiers. Renvoie false si le navigateur refuse (on affiche alors le code à recopier).
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Ouvre le lien du créateur dans un nouvel onglet, sans transmettre de référent ni de suivi.
export function openCreatorLink(link: string): void {
  if (!link || link === '#') return;
  window.open(link, '_blank', 'noopener,noreferrer');
}
