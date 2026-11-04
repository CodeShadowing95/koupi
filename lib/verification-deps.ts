// Dépendances réelles d'une analyse (lecteurs YouTube et Apple Podcasts, IA), lues dans les variables d'environnement.
// Partagées par la route d'analyse de l'admin, les retests automatiques et la lecture des podcasts.
import { aiConfigFrom, anthropicCreate } from './ai-extract';
import { applePodcasts, podcastReader } from './apple-podcasts';
import { youtubeReader, type RunDeps } from './verification-run';

export function verificationDeps(env: Record<string, string | undefined> = process.env): RunDeps {
  const config = aiConfigFrom(env);
  const youtube = youtubeReader(env.YOUTUBE_API_KEY);
  const podcast = podcastReader(applePodcasts());
  return {
    // Chaque lecteur rend null pour un lien qui n'est pas le sien.
    readSource: async url => (await youtube(url)) ?? podcast(url),
    ai: { config, create: config.apiKey ? anthropicCreate(config.apiKey) : null },
  };
}
