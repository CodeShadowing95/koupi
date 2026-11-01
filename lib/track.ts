// Envoie une mesure anonyme (code copié, lien ouvert) sans bloquer la page ni la navigation.
export function track(metric: 'copy' | 'open', codeId: string | undefined): void {
  if (!codeId || typeof window === 'undefined') return;
  const body = JSON.stringify({ metric, codeId });
  try {
    if (navigator.sendBeacon?.('/api/events', new Blob([body], { type: 'application/json' }))) return;
  } catch { /* on tente fetch */ }
  void fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
}
