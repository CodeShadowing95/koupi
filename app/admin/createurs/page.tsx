import { and, eq, isNotNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { creatorRequests, creatorUsers } from '@/db/schema';
import { listCreatorsAdmin } from '@/lib/catalog-admin';
import { creatorsToLink } from '@/lib/creator-account-link';
import { accountsByCreator } from '@/lib/creator-accounts';
import { copiesThisMonth } from '@/lib/creator-directory';
import { bestLevel } from '@/lib/creator-level';
import { creatorsWithoutImage } from '@/lib/stored-images';
import { channelWatches } from '@/lib/youtube-channel-read';
import { CreatorsView } from './creators-view';

export const metadata = { title: 'Créateurs · Admin Merkod' };

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [creators, accounts, toLink, missingPhotos, copies, spaces, claims, watches] = await Promise.all([
    listCreatorsAdmin(db), accountsByCreator(db), creatorsToLink(db), creatorsWithoutImage(db), copiesThisMonth(db),
    db.select({ creatorId: creatorUsers.creatorId }).from(creatorUsers).where(isNotNull(creatorUsers.creatorId)),
    db.select({ creatorId: creatorRequests.creatorId }).from(creatorRequests).where(and(eq(creatorRequests.kind, 'claim'), eq(creatorRequests.status, 'new'))),
    channelWatches(db),
  ]);
  // Il a son espace ou attend une réponse : pas besoin de le contacter.
  const inTouch = new Set([...spaces, ...claims].map(row => row.creatorId));
  const withAccounts = creators.map(creator => {
    const own = (accounts.get(creator.id) ?? []).map(account => {
      const watch = account.platform === 'youtube' && account.externalId ? watches.get(account.externalId) : undefined;
      return watch ? { ...account, watch: { active: watch.active, lastFetchedAt: watch.lastFetchedAt } } : account;
    });
    return { ...creator, accounts: own, level: bestLevel(own.map(account => account.level)), copies: copies.get(creator.id) ?? 0, inTouch: inTouch.has(creator.id) };
  });
  const followed = [...watches.values()].filter(watch => watch.active).length;
  return <CreatorsView creators={withAccounts} toLink={toLink} missingPhotos={missingPhotos} followed={followed} youtubeReady={Boolean(process.env.YOUTUBE_API_KEY)} />;
}
