import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

// Applique les migrations de db/migrations sur la base Neon de DATABASE_URL.
async function main() {
  try { process.loadEnvFile('.env.local'); } catch { /* pas de .env.local : on lit l'environnement */ }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquant : ajoute-le dans .env.local ou dans les variables Vercel.');
  await migrate(drizzle(neon(url)), { migrationsFolder: 'db/migrations' });
  console.log('Migrations appliquées.');
}

main().catch(error => { console.error(error); process.exit(1); });
