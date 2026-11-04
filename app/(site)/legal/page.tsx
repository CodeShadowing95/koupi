import { CONTACT_EMAIL, HOST, PUBLISHER_NAME } from '@/lib/site-contact';
import { PageHead } from '@/components/site/page-head';

export const metadata = { title: 'Mentions légales · Merkod' };

export default function Legal() {
  return (
    <main className="k-page">
      <div className="k-wrap">
        <PageHead eyebrow="Merkod" title="Mentions légales" />
        <div className="k-prose">
          <h2>Éditeur</h2>
          <p>Merkod est édité par {PUBLISHER_NAME}, à titre non professionnel.</p>
          <p>Contact : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          <h2>Hébergement</h2>
          <p>{HOST.name}, {HOST.address}. <a href={HOST.website} rel="noopener noreferrer" target="_blank">vercel.com</a></p>
        </div>
      </div>
    </main>
  );
}
