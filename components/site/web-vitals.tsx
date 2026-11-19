'use client';
// Mesure de la vitesse ressentie (ADR-0038) : Next.js donne chaque Web Vital avec son verdict, on l'envoie
// à Merkod sans bloquer la page. Seuls le type de page, la mesure, l'appareil et le verdict partent : pas la valeur
// exacte, pas l'adresse complète côté serveur, aucun identifiant.
import { useReportWebVitals } from 'next/web-vitals';

const KEPT = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);

/**
 * Part des chargements de page mesurés. Chaque mesure est écrite en base et la réveille : tout envoyer, robots compris,
 * contribuait à épuiser les heures de calcul du plan gratuit de Neon (ADR-0051). Un chargement sur dix donne les mêmes
 * proportions, avec moins de mesures.
 */
const SAMPLE_RATE = 0.1;
let sampled: boolean | null = null;

function inSample(): boolean {
  // Tiré une fois par chargement : les mesures d'une même page partent toutes ou aucune.
  if (sampled === null) sampled = !navigator.webdriver && Math.random() < SAMPLE_RATE;
  return sampled;
}

function device(): 'mobile' | 'desktop' {
  try {
    return window.matchMedia('(max-width: 760px), (pointer: coarse)').matches ? 'mobile' : 'desktop';
  } catch {
    return 'desktop';
  }
}

export function WebVitals() {
  useReportWebVitals(metric => {
    if (!KEPT.has(metric.name) || !inSample()) return;
    const body = JSON.stringify({ path: window.location.pathname, metric: metric.name, device: device(), rating: metric.rating });
    try {
      if (navigator.sendBeacon?.('/api/vitals', new Blob([body], { type: 'application/json' }))) return;
    } catch { /* on tente fetch */ }
    void fetch('/api/vitals', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
  });
  return null;
}
