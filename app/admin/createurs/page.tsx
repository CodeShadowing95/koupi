import { getDb } from '@/db';
import { listCreatorsAdmin } from '@/lib/catalog-admin';
import { creatorsToLink } from '@/lib/creator-account-link';
import { accountsByCreator } from '@/lib/creator-accounts';
import { bestLevel } from '@/lib/creator-level';
import { CreatorsView } from './creators-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [creators, accounts, toLink] = await Promise.all([listCreatorsAdmin(db), accountsByCreator(db), creatorsToLink(db)]);
  const withAccounts = creators.map(creator => {
    const own = accounts.get(creator.id) ?? [];
    return { ...creator, accounts: own, level: bestLevel(own.map(account => account.level)) };
  });
  return <CreatorsView creators={withAccounts} toLink={toLink} youtubeReady={Boolean(process.env.YOUTUBE_API_KEY)} />;
}
