import { getDb } from '@/db';
import { usageLevel, usageRatio } from '@/lib/api-usage';
import { usageSummary } from '@/lib/api-usage-summary';
import { formatUsd } from '@/lib/verification-display';
import { RefreshButton } from '@/components/admin-refresh-button';

export const dynamic = 'force-dynamic';

const number = (value: number) => value.toLocaleString('fr-FR');
const percent = (ratio: number) => `${Math.round(ratio * 100)} %`;
const parisTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * Histogramme simple, une barre par jour ; le tableau caché donne les mêmes chiffres aux lecteurs d'écran.
 * Le tableau est caché dans un div : un tableau ne respecte pas la hauteur de 1 px de .sr-only et allongeait la page.
 */
function DayBars({ days, max, format, label }: { days: { day: string; value: number }[]; max: number; format: (value: number) => string; label: string }) {
  const top = Math.max(max, ...days.map(item => item.value), 1);
  return (
    <figure className="adm-use-chart">
      <div className="adm-use-bars" aria-hidden="true">
        {days.map(item => <span key={item.day} title={`${shortDay(item.day)} : ${format(item.value)}`}><i style={{ height: `${(item.value / top) * 100}%` }} /></span>)}
      </div>
      <figcaption className="adm-use-axis" aria-hidden="true"><span>{shortDay(days[0].day)}</span><span>{shortDay(days[days.length - 1].day)}</span></figcaption>
      <div className="sr-only"><table><caption>{label}</caption><tbody>{days.map(item => <tr key={item.day}><th scope="row">{shortDay(item.day)}</th><td>{format(item.value)}</td></tr>)}</tbody></table></div>
    </figure>
  );
}

// Consommation des API (ADR-0028) : quota YouTube compté par Merkod, dépense IA relue dans ses journaux.
export default async function Page() {
  const summary = await usageSummary(getDb());
  const ai = summary.ai;
  const aiRatio = usageRatio(ai.spentUsdMicros, ai.budgetUsdMicros);
  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Pilotage</span>
            <h1>Consommation</h1>
            <p>Ce que Merkod dépense chez les services qu’il appelle pour trouver et vérifier les codes. Les barres passent à l’orange à 70 % et au rouge à 90 %.</p>
          </div>
          <div className="adm-head-actions"><RefreshButton /></div>
        </div>

        <div className="adm-use-grid">
          {summary.services.map(service => {
            const ratio = usageRatio(service.today, service.dailyLimit);
            const max = Math.max(...service.days.map(day => day.units));
            return (
              <section key={service.service} className="adm-panel">
                <div className="adm-panel-head"><h2>{service.label}</h2><span className="adm-panel-sub">Remise à zéro à {parisTime(service.resetAt)} (heure de Paris)</span></div>
                <div className="adm-use-figure"><strong>{number(service.today)}</strong><span>sur {number(service.dailyLimit)} unités aujourd’hui · {percent(ratio)}</span></div>
                <span className={`adm-usage-bar is-${usageLevel(ratio)}`} aria-hidden="true"><i style={{ width: `${ratio * 100}%` }} /></span>
                <p className="adm-panel-sub">{service.calls ? `${number(service.calls)} appel${service.calls > 1 ? 's' : ''} aujourd’hui. ` : 'Aucun appel aujourd’hui. '}Une lecture (vidéo, chaîne) coûte 1 unité, une recherche 100. Il reste {number(Math.max(0, service.dailyLimit - service.today))} unités.</p>
                <h3 className="adm-use-sub">30 derniers jours <small>(pic : {number(max)} unités)</small></h3>
                <DayBars days={service.days.map(day => ({ day: day.day, value: day.units }))} max={0} format={value => `${number(value)} unités`} label={`${service.label}, unités par jour`} />
              </section>
            );
          })}

          <section className="adm-panel">
            <div className="adm-panel-head"><h2>IA (Claude)</h2><span className="adm-panel-sub">{ai.active ? 'Plafond remis à zéro le 1er du mois' : 'En attente d’activation'}</span></div>
            <div className="adm-use-figure"><strong>{formatUsd(ai.spentUsdMicros)}</strong><span>sur {formatUsd(ai.budgetUsdMicros)} ce mois-ci · {percent(aiRatio)}</span></div>
            <span className={`adm-usage-bar is-${usageLevel(aiRatio)}`} aria-hidden="true"><i style={{ width: `${aiRatio * 100}%` }} /></span>
            <p className="adm-panel-sub">Analyses des codes, outils à ajouter et lecture des notes d’épisodes. Le plafond est fixé par AI_MONTHLY_BUDGET_EUR (10 € par défaut) : une fois atteint, l’IA s’arrête jusqu’au mois suivant.</p>
            <h3 className="adm-use-sub">Ce mois-ci, par jour</h3>
            <DayBars days={ai.days.map(day => ({ day: day.day, value: day.usdMicros }))} max={0} format={formatUsd} label="Dépense IA par jour" />
          </section>
        </div>
      </div>
    </main>
  );
}
