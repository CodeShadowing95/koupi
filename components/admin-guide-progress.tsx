'use client';
// Progression de lecture du guide, gardée dans le navigateur (aucune donnée envoyée au serveur).
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { GUIDE_STORAGE_KEY, guideChapters, nextUnread, parseRead } from '@/lib/admin-guide';

const EVENT = 'koupi-guide-read';

function load() {
  try { return parseRead(window.localStorage.getItem(GUIDE_STORAGE_KEY)); } catch { return []; }
}

export function useGuideRead() {
  const [read, setRead] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setRead(load());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const save = useCallback((next: string[]) => {
    try { window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(next)); } catch { /* navigation privée : on garde l'état en mémoire */ }
    setRead(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { read, save };
}

/** Barre de progression et bouton « Commencer / Continuer » du sommaire. */
export function GuideProgress() {
  const { read, save } = useGuideRead();
  const done = read.length;
  const total = guideChapters.length;
  const next = nextUnread(read);
  const percent = Math.round((done / total) * 100);
  return (
    <div className="gd-progress">
      <div className="gd-progress-text">
        <b>{done === 0 ? 'Pas encore commencé' : done === total ? 'Guide terminé, bravo !' : `${done} chapitre${done > 1 ? 's' : ''} lu${done > 1 ? 's' : ''} sur ${total}`}</b>
        <div className="gd-bar" role="progressbar" aria-label="Progression du guide" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div>
      </div>
      {next
        ? <Link className="adm-btn adm-btn-pri" href={`/admin/guide/${next.slug}`}>{done === 0 ? 'Commencer le guide' : 'Continuer'} →</Link>
        : <button type="button" className="adm-btn" onClick={() => save([])}>Recommencer</button>}
    </div>
  );
}

/** Coche « lu » à côté d'un chapitre dans les listes. */
export function ReadMark({ slug }: { slug: string }) {
  const { read } = useGuideRead();
  return read.includes(slug) ? <span className="gd-read" aria-label="Lu" title="Lu">✓</span> : null;
}

/** Bas de chapitre : marquer comme lu puis passer au suivant. */
export function ChapterDone({ slug, nextHref, nextTitle }: { slug: string; nextHref: string | null; nextTitle: string | null }) {
  const { read, save } = useGuideRead();
  const isRead = read.includes(slug);
  const markRead = () => { if (!isRead) save([...read, slug]); };
  return (
    <div className="gd-done">
      <div>
        <b>{isRead ? 'Chapitre lu ✓' : 'Tu as tout compris ?'}</b>
        <span>{isRead ? 'Tu peux y revenir quand tu veux.' : 'Marque-le comme lu pour suivre ta progression.'}</span>
      </div>
      {nextHref
        ? <Link className="adm-btn adm-btn-pri" href={nextHref} onClick={markRead}>{isRead ? 'Chapitre suivant' : 'J’ai compris, chapitre suivant'} : {nextTitle} →</Link>
        : <Link className="adm-btn adm-btn-pri" href="/admin/guide" onClick={markRead}>{isRead ? 'Retour au sommaire' : 'J’ai compris, terminer le guide'} →</Link>}
    </div>
  );
}
