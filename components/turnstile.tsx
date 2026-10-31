'use client';
import Script from 'next/script';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

// Widget anti-robot Cloudflare Turnstile, rendu explicitement pour fonctionner aussi après une navigation côté client.
type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

export type TurnstileHandle = { reset: () => void };

export const Turnstile = forwardRef<TurnstileHandle, { siteKey: string; onToken: (token: string) => void }>(function Turnstile({ siteKey, onToken }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  const render = useCallback(() => {
    if (!window.turnstile || !container.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      language: 'fr',
      action: 'submission',
      callback: (token: string) => onTokenRef.current(token),
      'expired-callback': () => onTokenRef.current(''),
      'error-callback': () => onTokenRef.current(''),
    });
  }, [siteKey]);

  useEffect(() => {
    render();
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [render]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current('');
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }), []);

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} />
      <div ref={container} />
    </>
  );
});
