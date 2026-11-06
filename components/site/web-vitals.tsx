'use client';
// Mesure de la vitesse ressentie (ADR-0038) : Next.js donne chaque Web Vital avec son verdict, on l'envoie
// à Merkod sans bloquer la page. Seuls le type de page, la mesure, l'appareil et le verdict partent : pas la valeur
// exacte, pas l'adresse complète côté serveur, aucun identifiant.
import { useReportWebVitals } from 'next/web-vitals';

const KEPT = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);

function device(): 'mobile' | 'desktop' {
  try {
    return window.matchMedia('(max-width: 760px), (pointer: coarse)').matches ? 'mobile' : 'desktop';
  } catch {
    return 'desktop';
  }
}

export function WebVitals() {
  useReportWebVitals(metric => {
    if (!KEPT.has(metric.name)) return;
    const body = JSON.stringify({ path: window.location.pathname, metric: metric.name, device: device(), rating: metric.rating });
    try {
      if (navigator.sendBeacon?.('/api/vitals', new Blob([body], { type: 'application/json' }))) return;
    } catch { /* on tente fetch */ }
    void fetch('/api/vitals', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
  });
  return null;
}
