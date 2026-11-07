// Lecture et écriture des interrupteurs du site (pages publiques, mode maintenance) et du journal de l'administration.
import { desc, eq, lt } from 'drizzle-orm';
import type { Db } from '@/db';
import { adminAuditLog, siteSettings } from '@/db/schema';
import { MAINTENANCE_KEY, OFFER_LINKS_KEY, SITE_PAGES, isPageKey, pageSettingKey, type PageKey, type SiteState } from './site-pages';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type SiteSwitchRow = { key: string; enabled: boolean; updatedAt: string | null };

/** État du site : pages coupées, maintenance et option des liens d'affiliation. Une clé absente garde sa valeur par défaut. */
export async function loadSiteState(db: Db): Promise<SiteState & { offerLinks: boolean; rows: SiteSwitchRow[] }> {
  const rows = await db.select().from(siteSettings);
  const byKey = new Map(rows.map(row => [row.key, row]));
  const off = SITE_PAGES.filter(page => !page.locked && byKey.get(pageSettingKey(page.key))?.enabled === false).map(page => page.key);
  return {
    off,
    maintenance: byKey.get(MAINTENANCE_KEY)?.enabled === true,
    offerLinks: byKey.get(OFFER_LINKS_KEY)?.enabled === true,
    rows: rows.map(row => ({ key: row.key, enabled: row.enabled, updatedAt: row.updatedAt.toISOString() })),
  };
}

/** L'IA relève-t-elle aussi les liens d'affiliation ? Non tant que l'admin n'a pas allumé l'option. */
export async function offerLinksEnabled(db: Db): Promise<boolean> {
  const [row] = await db.select({ enabled: siteSettings.enabled }).from(siteSettings).where(eq(siteSettings.key, OFFER_LINKS_KEY)).limit(1);
  return row?.enabled === true;
}

export async function logAdminAction(db: Db, action: string, target: string): Promise<void> {
  await db.insert(adminAuditLog).values({ action: action.slice(0, 60), target: target.slice(0, 200) });
}

/** Allume ou coupe une page (target = clé de page), le mode maintenance (« maintenance ») ou les liens d'affiliation (« offer-links »). */
export async function setSiteSwitch(db: Db, body: Record<string, unknown>, now = new Date()): Promise<Parsed<{ key: string; enabled: boolean }>> {
  if (typeof body.enabled !== 'boolean') return { ok: false, error: 'État manquant.' };
  const enabled = body.enabled;
  let key: string, action: string, target: string;
  if (body.target === MAINTENANCE_KEY) {
    key = MAINTENANCE_KEY;
    action = enabled ? 'maintenance_on' : 'maintenance_off';
    target = 'Site entier';
  } else if (body.target === OFFER_LINKS_KEY) {
    key = OFFER_LINKS_KEY;
    action = enabled ? 'offer_links_on' : 'offer_links_off';
    target = 'Liens d’affiliation';
  } else if (isPageKey(body.target)) {
    const page = SITE_PAGES.find(item => item.key === body.target)!;
    if (page.locked) return { ok: false, error: `${page.label} reste toujours en ligne.` };
    key = pageSettingKey(page.key as PageKey);
    action = enabled ? 'page_on' : 'page_off';
    target = page.label;
  } else {
    return { ok: false, error: 'Page inconnue.' };
  }
  await db.insert(siteSettings).values({ key, enabled, updatedAt: now })
    .onConflictDoUpdate({ target: siteSettings.key, set: { enabled, updatedAt: now } });
  await logAdminAction(db, action, target);
  return { ok: true, data: { key, enabled } };
}

export type AuditEntry = { id: string; action: string; target: string; at: string };

export async function listAuditLog(db: Db, limit = 100): Promise<AuditEntry[]> {
  const rows = await db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(limit);
  return rows.map(row => ({ id: row.id, action: row.action, target: row.target, at: row.createdAt.toISOString() }));
}

export const AUDIT_RETENTION_MONTHS = 12;

/** Efface les lignes du journal de plus de 12 mois. Renvoie le nombre de lignes effacées. */
export async function purgeAuditLog(db: Db, now = new Date()): Promise<number> {
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - AUDIT_RETENTION_MONTHS);
  const rows = await db.delete(adminAuditLog).where(lt(adminAuditLog.createdAt, limit)).returning({ id: adminAuditLog.id });
  return rows.length;
}
