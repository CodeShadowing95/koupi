// Alertes vraiment urgentes en haut de l'accueil admin : codes qui expirent cette semaine, source en échec,
// quota YouTube ou plafond IA presque atteint. Sans base ni réseau : importable par les composants client.
import type { Code } from './data';
import { isPublic } from './data';
import { EXPIRY_WARNING_DAYS, expiryOf } from './code-expiry';

/** Une jauge passe en alerte à partir de cette part utilisée. */
export const NEAR_LIMIT = 0.8;

export type UrgentAlert = { id: string; tone: 'bad' | 'warn'; title: string; detail: string; href: string; cta: string };
export type FailedSource = { label: string; error: string | null };
export type Gauge = { key: string; label: string; ratio: number; detail: string };

const percent = (ratio: number) => `${Math.round(ratio * 100)} %`;

export function urgentAlerts({ codes, failedSources, gauges, now }: {
  codes: Pick<Code, 'code' | 'tool' | 'status' | 'expiresOn'>[]; failedSources: FailedSource[]; gauges: Gauge[]; now: Date;
}): UrgentAlert[] {
  const alerts: UrgentAlert[] = [];

  const expiring = codes
    .filter(code => isPublic(code))
    .flatMap(code => {
      const expiry = expiryOf(code.expiresOn, now);
      return expiry.state === 'today' || expiry.state === 'soon' ? [{ code, daysLeft: expiry.daysLeft }] : [];
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (expiring.length) {
    const first = expiring[0];
    const when = first.daysLeft === 0 ? 'expire aujourd’hui' : `expire dans ${first.daysLeft} jour${first.daysLeft > 1 ? 's' : ''}`;
    alerts.push({
      id: 'expiring', tone: first.daysLeft === 0 ? 'bad' : 'warn',
      title: expiring.length === 1 ? `1 code expire d’ici ${EXPIRY_WARNING_DAYS} jours` : `${expiring.length} codes expirent d’ici ${EXPIRY_WARNING_DAYS} jours`,
      detail: `Le premier : ${first.code.code} (${first.code.tool}) ${when}. Cherche un nouveau code chez le même créateur, ou archive-le à sa date de fin.`,
      href: '/admin/codes?status=expiring', cta: 'Voir les codes',
    });
  }

  for (const source of failedSources) {
    alerts.push({
      id: `source-${source.label}`, tone: 'bad', title: `${source.label} : le dernier passage a échoué`,
      detail: source.error ? `Erreur : ${source.error}` : 'Rien n’a pu être lu.',
      href: '/admin/sources', cta: 'Ouvrir les sources',
    });
  }

  for (const gauge of gauges) {
    if (gauge.ratio < NEAR_LIMIT) continue;
    const ai = gauge.key === 'ai';
    alerts.push({
      id: `gauge-${gauge.key}`, tone: gauge.ratio >= 0.95 ? 'bad' : 'warn',
      title: ai ? `Plafond IA presque atteint : ${percent(gauge.ratio)}` : `Quota ${gauge.label} presque atteint : ${percent(gauge.ratio)}`,
      detail: ai ? `${gauge.detail}. Au plafond, la lecture continue sans IA jusqu’au mois prochain.` : `${gauge.detail}. Évite de lancer une recherche avant la remise à zéro, vers 9 h.`,
      href: '/admin/stats?tab=consommation', cta: 'Voir la consommation',
    });
  }

  return alerts.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'bad' ? -1 : 1));
}
