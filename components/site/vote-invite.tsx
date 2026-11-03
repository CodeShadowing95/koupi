'use client';
// Fenêtre « Laisse un 👍 » de la page des codes. Elle entre une seule fois par navigateur, de biais depuis le coin
// bas droit, pour rappeler qu'un pouce soutient le créateur du code. Par défaut elle attend le bon moment :
// le visiteur a copié un code, est parti l'essayer et revient sur Koupi (voir lib/vote-invite.ts). Elle propose
// alors de voter tout de suite pour ce code.
// En se fermant, elle se compresse jusqu'au bouton 👍 en bas à droite, qui la rouvre quand on veut la relire.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap, MOTION_OK, MOTION_REDUCED } from '@/lib/gsap';
import { useCodeVote } from '@/components/site/use-code-vote';
import {
  CODE_COPIED_EVENT, INVITE_DELAYS, initialPhase, markInviteSeen, nextPhase, readInviteSeen,
  type CopiedCode, type InviteEvent, type InvitePhase, type InviteTrigger,
} from '@/lib/vote-invite';

const THUMB = 'M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Zm0 0 4-7a2.5 2.5 0 0 1 2.5 3L13 10h5.5a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 17 21H7';
const THUMB_DOWN = 'M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3Zm0 0-4 7a2.5 2.5 0 0 1-2.5-3L11 14H5.5a2 2 0 0 1-2-2.4l1.5-7A2 2 0 0 1 7 3h10';

function Thumb({ size = 18, down = false, filled = false }: { size?: number; down?: boolean; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d={down ? THUMB_DOWN : THUMB} />
    </svg>
  );
}

const REASONS = [
  {
    title: 'Tu soutiens le créateur',
    text: 'Il a partagé ce code avec sa communauté. Ton pouce prouve qu’il dit vrai et donne du poids à sa parole.',
    icon: <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />,
  },
  {
    title: 'Tu fais gagner du temps aux suivants',
    text: 'Les codes qui marchent passent devant. Ceux qui ne marchent plus sont revérifiés ou retirés.',
    icon: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  },
  {
    title: 'Tu rends Koupi digne de confiance',
    text: 'Ici, chaque code est jugé par ceux qui l’ont essayé. Pas de faux avis, juste des preuves.',
    icon: <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Zm-3.2 9.2 2.2 2.2 4.3-4.6" />,
  },
];

/** Vote direct pour le code que le visiteur vient d'essayer. */
function QuickVote({ copied, onVoted }: { copied: CopiedCode; onVoted: () => void }) {
  const { voted, message, sending, vote } = useCodeVote(copied.id);
  // Seul un vote donné ici range la fenêtre toute seule. Un vote déjà enregistré dans ce navigateur
  // (lu au chargement) ne doit pas la fermer avant que le visiteur ait pu la lire.
  const asked = useRef(false);
  const done = useRef(false);
  useEffect(() => {
    if (voted && asked.current && !done.current) { done.current = true; onVoted(); }
  }, [voted, onVoted]);
  const answer = (worked: boolean) => { asked.current = true; void vote(worked); };
  if (voted && !asked.current) {
    return (
      <div className="k-invite-quick is-done" role="status">
        <span className="k-invite-quick-mark"><Thumb size={20} filled down={voted === 'down'} /></span>
        <p><strong>Tu as déjà voté pour <code>{copied.code}</code>, merci !</strong> Pense au 👍 pour les prochains codes que tu essaies.</p>
      </div>
    );
  }
  if (voted) {
    return (
      <div className="k-invite-quick is-done" role="status">
        <span className="k-invite-quick-mark"><Thumb size={20} filled down={voted === 'down'} /></span>
        <p>{voted === 'up'
          ? <><strong>Merci !</strong> {copied.creator} vient de recevoir ton 👍.</>
          : <><strong>Merci, c’est noté.</strong> On revérifie <code>{copied.code}</code> pour les suivants.</>}</p>
      </div>
    );
  }
  return (
    <div className="k-invite-quick">
      <p>Tu viens d’essayer <code>{copied.code}</code> sur <strong>{copied.tool}</strong>. Il a marché&nbsp;?</p>
      <div className="k-invite-quick-actions">
        <button type="button" className="k-invite-yes" disabled={sending} onClick={() => answer(true)}><Thumb size={17} /> Oui, il a marché</button>
        <button type="button" className="k-invite-no" disabled={sending} onClick={() => answer(false)}><Thumb size={17} down /> Non</button>
      </div>
      {message && <p className="k-invite-error" role="alert">{message}</p>}
    </div>
  );
}

export function VoteInvite({ trigger = 'copy' }: { trigger?: InviteTrigger }) {
  const [phase, setPhase] = useState<InvitePhase>('idle');
  const [ready, setReady] = useState(false);
  // Rendue à la racine du site (hors du contenu) pour passer au-dessus de l'en-tête collant.
  const [host, setHost] = useState<Element | null>(null);
  const [copied, setCopied] = useState<CopiedCode | null>(null);
  const phaseRef = useRef<InvitePhase>('idle');
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const reopened = useRef(false);
  // Heure d'ouverture : un clic sur le fond juste après (par exemple pour revenir dans la fenêtre du navigateur) ne ferme pas.
  const openedAt = useRef(0);

  const send = useCallback((event: InviteEvent) => {
    const next = nextPhase(phaseRef.current, event, trigger);
    if (next === phaseRef.current) return;
    phaseRef.current = next;
    setPhase(next);
  }, [trigger]);

  // Déjà vue dans ce navigateur : seul le bouton reste.
  useEffect(() => {
    phaseRef.current = initialPhase(readInviteSeen(window.localStorage));
    setPhase(phaseRef.current);
    setHost(document.querySelector('.kp') ?? document.body);
    setReady(true);
  }, []);

  // Écoute la copie d'un code, le départ et le retour sur l'onglet.
  useEffect(() => {
    if (!ready) return;
    let timer = 0;
    const onCopied = (event: Event) => {
      if (phaseRef.current !== 'idle') return;
      setCopied((event as CustomEvent<CopiedCode>).detail ?? null);
      send('copy');
      if ((phaseRef.current as InvitePhase) === 'waiting') timer = window.setTimeout(() => send('timeout'), INVITE_DELAYS.stayed);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { send('hidden'); return; }
      if (phaseRef.current === 'away') { window.clearTimeout(timer); timer = window.setTimeout(() => send('visible'), INVITE_DELAYS.back); }
    };
    window.addEventListener(CODE_COPIED_EVENT, onCopied);
    document.addEventListener('visibilitychange', onVisibility);
    if (trigger === 'arrival' && phaseRef.current === 'idle') timer = window.setTimeout(() => send('arrive'), INVITE_DELAYS.arrival);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(CODE_COPIED_EVENT, onCopied);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ready, send, trigger]);

  // Entrée : de biais depuis le coin bas droit la première fois, depuis le bouton quand on la rouvre.
  useEffect(() => {
    if (phase !== 'open') return;
    markInviteSeen(window.localStorage);
    openedAt.current = Date.now();
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;
    const fromFab = reopened.current;
    const fab = fabRef.current;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const tl = gsap.timeline({ onComplete: () => primaryRef.current?.focus() });
      tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0);
      if (fromFab && fab) {
        const to = panel.getBoundingClientRect();
        const from = fab.getBoundingClientRect();
        tl.fromTo(panel,
          { x: from.left + from.width / 2 - (to.left + to.width / 2), y: from.top + from.height / 2 - (to.top + to.height / 2), scaleX: from.width / to.width, scaleY: from.height / to.height, borderRadius: '50%' },
          { x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: '22px', duration: 0.5, ease: 'expo.out', clearProps: 'transform,borderRadius' }, 0);
        tl.fromTo(panel.querySelectorAll('.k-invite-anim'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'all' }, 0.22);
      } else {
        tl.fromTo(panel, { x: 140, y: 90, rotate: 7, scale: 0.86, opacity: 0 }, { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: 0.75, ease: 'back.out(1.5)', clearProps: 'transform,opacity' }, 0.05);
        tl.fromTo(panel.querySelectorAll('.k-invite-anim'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: 'power3.out', clearProps: 'all' }, 0.3);
        tl.fromTo(panel.querySelector('.k-invite-stamp'), { scale: 0, rotate: -40 }, { scale: 1, rotate: -8, duration: 0.6, ease: 'back.out(2.6)' }, 0.45);
      }
      // Le pouce de démonstration prend +1.
      tl.add(() => panel.querySelector('.k-invite-demo')?.classList.add('is-voted'), fromFab ? 0.5 : 1.1);
    });
    mm.add(MOTION_REDUCED, () => {
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      panel.querySelector('.k-invite-demo')?.classList.add('is-voted');
      primaryRef.current?.focus();
    });
    return () => mm.revert();
  }, [phase]);

  // Sortie : le texte s'efface, la fenêtre se compresse jusqu'au bouton en bas à droite, puis le bouton rebondit.
  const close = useCallback(() => {
    if (closing.current || phaseRef.current !== 'open') return;
    closing.current = true;
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    const fab = fabRef.current;
    const finish = () => {
      closing.current = false;
      reopened.current = true;
      send('close');
      window.requestAnimationFrame(() => {
        const button = fabRef.current;
        if (!button) return;
        button.focus({ preventScroll: true });
        if (window.matchMedia(MOTION_OK).matches) {
          gsap.fromTo(button, { scale: 0.6 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.1,0.45)', clearProps: 'transform' });
          button.classList.remove('is-pulse');
          void button.offsetWidth;
          button.classList.add('is-pulse');
        }
      });
    };
    if (!overlay || !panel || !fab || !window.matchMedia(MOTION_OK).matches) {
      if (overlay) gsap.to(overlay, { opacity: 0, duration: 0.15, onComplete: finish });
      else finish();
      return;
    }
    const from = panel.getBoundingClientRect();
    const to = fab.getBoundingClientRect();
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(panel.querySelectorAll('.k-invite-anim, .k-invite-stamp, .k-invite-close'), { opacity: 0, duration: 0.16, ease: 'power1.in' }, 0);
    tl.to(panel, { scaleX: 0.92, scaleY: 0.92, duration: 0.14, ease: 'power2.in' }, 0.04);
    tl.to(panel, {
      x: to.left + to.width / 2 - (from.left + from.width / 2),
      y: to.top + to.height / 2 - (from.top + from.height / 2),
      scaleX: to.width / from.width, scaleY: to.height / from.height, borderRadius: '50%',
      duration: 0.5, ease: 'expo.inOut',
    }, 0.18);
    // Le fond s'efface sans rendre la fenêtre transparente, et la fenêtre prend la couleur du bouton en arrivant.
    tl.to(overlay, { backgroundColor: 'rgba(6,7,22,0)', backdropFilter: 'blur(0px)', webkitBackdropFilter: 'blur(0px)', duration: 0.4, ease: 'power1.inOut' }, 0.25);
    tl.to(panel.querySelector('.k-invite-tint'), { opacity: 1, duration: 0.3, ease: 'power1.in' }, 0.38);
  }, [send]);

  const reopen = () => {
    reopened.current = true;
    send('reopen');
  };

  // Échap ferme ; Tab reste dans la fenêtre.
  useEffect(() => {
    if (phase !== 'open') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, close]);

  // Une fois le vote donné dans la fenêtre, on laisse lire le merci puis elle rejoint son bouton.
  const afterQuickVote = useCallback(() => { window.setTimeout(close, 2200); }, [close]);

  if (!ready || !host) return null;
  const open = phase === 'open';
  const showFab = phase === 'done' || open;
  return createPortal(
    <>
      {showFab && (
        <button ref={fabRef} type="button" className={`k-invite-fab${open ? ' is-hidden' : ''}`} onClick={reopen}
          aria-haspopup="dialog" aria-label="Pourquoi laisser un pouce ? Relire le message" title="Pourquoi laisser un 👍 ?" tabIndex={open ? -1 : 0}>
          <Thumb size={22} />
          <span className="k-invite-fab-label">Pourquoi voter&nbsp;?</span>
        </button>
      )}
      {open && (
        <div ref={overlayRef} className="k-invite-overlay" onMouseDown={event => { if (event.target === event.currentTarget && Date.now() - openedAt.current > 1500) close(); }}>
          <div ref={panelRef} className="k-invite k-paper" role="dialog" aria-modal="true" aria-labelledby="k-invite-title" aria-describedby="k-invite-lead">
            <span className="k-invite-tint" aria-hidden="true" />
            <button type="button" className="k-invite-close" onClick={close} aria-label="Fermer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <span className="k-invite-stamp" aria-hidden="true"><Thumb size={30} filled /></span>
            <p className="k-invite-kicker k-invite-anim">Un geste d’une seconde</p>
            <h2 id="k-invite-title" className="k-invite-anim">Un code a marché&nbsp;?<br />Laisse un <span className="k-invite-hl">👍</span></h2>
            <p id="k-invite-lead" className="k-invite-lead k-invite-anim">C’est gratuit, c’est anonyme, et c’est le plus beau merci que tu puisses faire au créateur qui te l’a donné.</p>

            {copied && !reopened.current
              ? <div className="k-invite-anim"><QuickVote copied={copied} onVoted={afterQuickVote} /></div>
              : (
                <div className="k-invite-demo k-invite-anim" aria-hidden="true">
                  <span className="k-invite-demo-label">Sur chaque coupon, à droite du nom de l’outil&nbsp;:</span>
                  <span className="k-invite-demo-pill"><span className="k-invite-demo-up"><Thumb size={15} /><b className="is-before">127</b><b className="is-after">128</b></span><span className="k-invite-demo-down"><Thumb size={15} down /></span></span>
                </div>
              )}

            <ul className="k-invite-reasons">
              {REASONS.map(reason => (
                <li key={reason.title} className="k-invite-anim">
                  <span className="k-invite-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{reason.icon}</svg></span>
                  <span><strong>{reason.title}</strong>{reason.text}</span>
                </li>
              ))}
            </ul>

            <p className="k-invite-quote k-invite-anim">Un code qui marche sans 👍, c’est un merci qui se perd.</p>
            <div className="k-invite-actions k-invite-anim">
              <button ref={primaryRef} type="button" className="k-invite-cta" onClick={close}><Thumb size={18} /> Promis, je vote</button>
            </div>
          </div>
        </div>
      )}
    </>,
    host,
  );
}

