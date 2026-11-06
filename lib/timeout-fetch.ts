// fetch avec un délai maximal : un service externe lent (YouTube, Apple Podcasts, Resend…) ne bloque jamais
// une page ou une tâche planifiée jusqu'à la limite de la fonction Vercel. Passé le délai, l'appel échoue
// comme une coupure réseau (TimeoutError), que les appelants savent déjà traiter.

/** Délai par défaut des API externes appelées par Merkod. */
export const EXTERNAL_API_TIMEOUT_MS = 10_000;

/** Ajoute un délai à chaque appel. Un signal déjà donné par l'appelant est gardé : le premier des deux qui coupe l'emporte. */
export function withTimeout(fetchFn: typeof fetch = fetch, timeoutMs: number = EXTERNAL_API_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetchFn(input, { ...init, signal });
  };
}
