// Début de la note d'un code repris d'une vidéo « compilation » (ADR-0042). Sans dépendance : l'analyse et le
// rattachement des chaînes YouTube le lisent sans importer la recherche de créateurs.
export const COMPILATION_NOTE = 'Repris d’une compilation';

/** Note d'un code repris d'une compilation : d'où il vient et à qui il est crédité. */
export function compilationNote(channelTitle: string, creatorName: string, evidence: string): string {
  return `${COMPILATION_NOTE} de ${channelTitle}, code crédité à ${creatorName} : vérifie-le chez le créateur avant de le valider. « ${evidence} »`;
}

export function isCompilationNote(note: string | null | undefined): boolean {
  return Boolean(note?.startsWith(COMPILATION_NOTE));
}
