import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { Db } from '../db';
import * as schema from '../db/schema';
import { importCatalog } from '../lib/catalog-import';

// Ajoute à la base les catégories, outils et codes de data/ qui n'y sont pas encore (npm run db:import).
// Ne modifie jamais une ligne existante : les changements faits dans l'admin sont gardés.
async function main() {
  try { process.loadEnvFile('.env.local'); } catch { /* pas de .env.local : on lit l'environnement */ }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquant : ajoute-le dans .env.local ou dans les variables Vercel.');
  const db = drizzle(neon(url), { schema }) as unknown as Db;
  const result = await importCatalog(db, {
    toolsCsv: readFileSync('data/outils-v0.csv', 'utf8'),
    candidatesCsv: readFileSync('data/candidats-tous.csv', 'utf8'),
    manual: JSON.parse(readFileSync('data/catalogue-manuel.json', 'utf8')),
  });
  console.log(`Import terminé : ${result.categories} catégories, ${result.tools} outils et ${result.codes} codes ajoutés.`);
}

main().catch(error => { console.error(error); process.exit(1); });
