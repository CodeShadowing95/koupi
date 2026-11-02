// Dépendances réelles d'une analyse (lecteur YouTube, IA), lues dans les variables d'environnement.
// Partagées par la route d'analyse de l'admin et les retests automatiques.
import { aiConfigFrom, anthropicCreate } from './ai-extract';
import { youtubeReader, type RunDeps } from './verification-run';

export function verificationDeps(env: Record<string, string | undefined> = process.env): RunDeps {
  const config = aiConfigFrom(env);
  return {
    readSource: youtubeReader(env.YOUTUBE_API_KEY),
    ai: { config, create: config.apiKey ? anthropicCreate(config.apiKey) : null },
  };
}
