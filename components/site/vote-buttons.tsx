'use client';
import type { Code } from '@/lib/data';
import { CodeThumbs } from '@/components/site/code-thumbs';

/** « Ça a marché ? » suivi des pouces, sur le fond nuit (fiche outil). Mêmes pouces que sur les coupons. */
export function VoteButtons({ code }: { code: Pick<Code, 'id' | 'code' | 'votes' | 'success'> }) {
  return (
    <div className="k-vote">
      <span>Ça a marché ?</span>
      <CodeThumbs code={code} dark />
    </div>
  );
}
