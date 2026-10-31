export const metadata = { title: 'Mentions légales · Koupi' };

export default function Legal() {
  return (
    <main className="k-page">
      <div className="k-wrap k-prose">
        <h1 style={{ fontSize: 'clamp(40px,5vw,64px)', marginBottom: 12 }}>Mentions légales</h1>
        <p>Éditeur : [Nom de l&apos;éditeur]</p>
        <p>Adresse : [Adresse de contact]</p>
        <p>E-mail : [Adresse de contact]</p>
        <p>Hébergement : Vercel, [adresse de l&apos;hébergeur].</p>
      </div>
    </main>
  );
}
