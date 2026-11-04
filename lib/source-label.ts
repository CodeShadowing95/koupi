// Comment dire d'où vient un code sur le site : « Entendu dans GDIY, épisode #574 » pour un épisode de podcast,
// le titre de la vidéo ou du post sinon. Le nom du podcast vient des podcasts suivis (catalogue).

/** Numéro d'épisode écrit dans le titre (« #574 - … », « Ép. 12 », « Episode 3 : … »), sinon null. */
export function episodeNumber(title: string): string | null {
  const match = title.match(/(?:^|[\s([])#\s?(\d{1,5})\b/) ?? title.match(/^\s*(?:n°|ép(?:isode)?\.?|ep(?:isode)?\.?)\s*(\d{1,5})\b/i);
  return match?.[1] ?? null;
}

/** La ligne « source » d'un code. podcast : nom du podcast suivi d'où vient l'épisode, s'il est connu. */
export function sourceLabel(code: { sourceTitle: string; podcast?: string }): string {
  const title = code.sourceTitle.trim();
  if (!code.podcast) return title;
  const number = episodeNumber(title);
  if (number) return `Entendu dans ${code.podcast}, épisode #${number}`;
  return title ? `Entendu dans ${code.podcast} : ${title}` : `Entendu dans ${code.podcast}`;
}
