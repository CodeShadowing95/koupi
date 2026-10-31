import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
async function main(){const db=new PGlite('idb://koupi');await db.exec('CREATE TABLE IF NOT EXISTS seed_files (name text primary key, imported_at timestamptz default now())');const csv=await readFile('data/outils-v0.csv','utf8');console.log(`Koupi seed prêt : ${csv.split('\\n').length-2} outils de départ lus.`);await db.query('INSERT INTO seed_files(name) VALUES($1) ON CONFLICT DO NOTHING',['outils-v0.csv']);await db.close();}main().catch(error=>{console.error(error);process.exit(1)});
