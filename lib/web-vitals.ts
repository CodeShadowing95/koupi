// Vitesse ressentie par les visiteurs (Web Vitals, ADR-0038) : le navigateur envoie le verdict de chaque mesure
// (bon, à améliorer, mauvais) et Merkod ajoute 1 au total du jour. Ni IP, ni cookie, ni identifiant, ni adresse exacte.
import { gte, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { VITAL_DEVICES, VITAL_METRICS, VITAL_PAGES, VITAL_RATINGS, webVitals } from '@/db/schema';
import { dayOf } from './audience';

export type VitalMetric = (typeof VITAL_METRICS)[number];
export type VitalPage = (typeof VITAL_PAGES)[number];
export type VitalDevice = (typeof VITAL_DEVICES)[number];
export type VitalRating = (typeof VITAL_RATINGS)[number];
export type Vital = { page: VitalPage; metric: VitalMetric; device: VitalDevice; rating: VitalRating };

const includes = <T extends string>(list: readonly T[], value: unknown): value is T => (list as readonly unknown[]).includes(value);

/** Range une adresse dans un type de page : on ne garde jamais l'adresse exacte (ni outil, ni créateur, ni recherche). */
export function pageGroup(path: string): VitalPage {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (clean === '/') return 'home';
  if (clean === '/codes') return 'codes';
  if (clean.startsWith('/tools/')) return 'tool';
  if (clean.startsWith('/@') || clean.startsWith('/creators/')) return 'creator';
  if (clean === '/creators') return 'creators';
  if (clean.startsWith('/categories/')) return 'category';
  return 'other';
}

/** Lit et valide une mesure envoyée par le navigateur. null si quelque chose ne va pas. */
export function parseVital(data: Record<string, unknown>): Vital | null {
  const { path, metric, device, rating } = data;
  if (typeof path !== 'string' || path.length > 300 || !path.startsWith('/')) return null;
  if (!includes(VITAL_METRICS, metric) || !includes(VITAL_DEVICES, device) || !includes(VITAL_RATINGS, rating)) return null;
  return { page: pageGroup(path), metric, device, rating };
}

export async function recordVital(db: Db, vital: Vital, now = new Date()): Promise<void> {
  await db.insert(webVitals).values({ day: dayOf(now), ...vital, count: 1 })
    .onConflictDoUpdate({
      target: [webVitals.day, webVitals.page, webVitals.metric, webVitals.device, webVitals.rating],
      set: { count: sql`${webVitals.count} + 1` },
    });
}

/** En dessous, trop peu de visites pour conclure. */
export const MIN_SAMPLES = 20;
/** Les trois mesures que Google regarde (Core Web Vitals). */
export const CORE_VITALS: VitalMetric[] = ['LCP', 'INP', 'CLS'];

export type VitalVerdict = VitalRating | 'unknown';
export type VitalCell = { good: number; needs: number; poor: number; total: number; goodShare: number; verdict: VitalVerdict };
export type VitalRow = { page: VitalPage; device: VitalDevice; metrics: Record<VitalMetric, VitalCell>; verdict: VitalVerdict };

/**
 * Verdict à la manière de Google, qui juge le 75e centile : bon si au moins 75 % des visites sont bonnes,
 * mauvais si plus de 25 % sont mauvaises, à améliorer sinon.
 */
export function verdictOf(good: number, needs: number, poor: number): VitalVerdict {
  const total = good + needs + poor;
  if (total < MIN_SAMPLES) return 'unknown';
  if (good / total >= 0.75) return 'good';
  if (poor / total > 0.25) return 'poor';
  return 'needs-improvement';
}

/** Une page est bonne si ses trois mesures clés le sont ; la plus mauvaise donne le verdict. */
export function pageVerdict(cells: VitalCell[]): VitalVerdict {
  const verdicts = cells.map(cell => cell.verdict);
  if (verdicts.includes('poor')) return 'poor';
  if (verdicts.includes('needs-improvement')) return 'needs-improvement';
  if (verdicts.includes('unknown')) return 'unknown';
  return 'good';
}

export type VitalsReport = { days: number; samples: number; rows: VitalRow[] };

export function buildVitalsReport(rows: { page: VitalPage; metric: VitalMetric; device: VitalDevice; rating: VitalRating; count: number }[], days: number): VitalsReport {
  const key = (page: string, device: string) => `${page}|${device}`;
  const sums = new Map<string, Record<VitalMetric, { good: number; needs: number; poor: number }>>();
  for (const row of rows) {
    const k = key(row.page, row.device);
    const entry = sums.get(k) ?? Object.fromEntries(VITAL_METRICS.map(metric => [metric, { good: 0, needs: 0, poor: 0 }])) as Record<VitalMetric, { good: number; needs: number; poor: number }>;
    const cell = entry[row.metric];
    if (row.rating === 'good') cell.good += row.count; else if (row.rating === 'poor') cell.poor += row.count; else cell.needs += row.count;
    sums.set(k, entry);
  }
  const result: VitalRow[] = [];
  for (const page of VITAL_PAGES) for (const device of VITAL_DEVICES) {
    const entry = sums.get(key(page, device));
    if (!entry) continue;
    const metrics = Object.fromEntries(VITAL_METRICS.map(metric => {
      const { good, needs, poor } = entry[metric];
      const total = good + needs + poor;
      return [metric, { good, needs, poor, total, goodShare: total ? good / total : 0, verdict: verdictOf(good, needs, poor) }];
    })) as Record<VitalMetric, VitalCell>;
    result.push({ page, device, metrics, verdict: pageVerdict(CORE_VITALS.map(metric => metrics[metric])) });
  }
  return { days, samples: rows.filter(row => row.metric === 'LCP').reduce((sum, row) => sum + row.count, 0), rows: result };
}

/** Les mesures des derniers jours (28 par défaut, comme le rapport de Google), par type de page et appareil. */
export async function vitalsReport(db: Db, days = 28, now = new Date()): Promise<VitalsReport> {
  const first = dayOf(new Date(now.getTime() - (days - 1) * 86_400_000));
  const rows = await db.select().from(webVitals).where(gte(webVitals.day, first));
  return buildVitalsReport(rows, days);
}
