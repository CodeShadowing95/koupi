import { CONTACT_EMAIL, HOST, PUBLISHER_NAME } from '@/lib/site-contact';

export const metadata = { title: 'Mentions légales · Koupi' };

export default function Legal() {
  return (
    <main className="k-page">
      <div className="k-wrap k-prose">
        <h1 style={{ fontSize: 'clamp(40px,5vw,64px)', marginBottom: 12 }}>Mentions légales</h1>
        <h2>Éditeur</h2>
        <p>Koupi est édité par {PUBLISHER_NAME}, à titre non professionnel.</p>
        <p>Contact : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        <h2>Hébergement</h2>
        <p>{HOST.name}, {HOST.address}. <a href={HOST.website} rel="noopener noreferrer" target="_blank">vercel.com</a></p>
      </div>
    </main>
  );
}
