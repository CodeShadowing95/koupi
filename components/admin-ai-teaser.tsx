// Carte « bientôt » de l'accueil admin : les deux assistants IA prévus (voir la spec des vérifications IA).
// Kou et Pi, les deux moitiés de « Koupi » : Kou cherche les codes, Pi les vérifie. Rien n'est encore branché.

/** Le disque-coupon du logo (le « o » de Koupi), avec ses deux encoches. */
function CouponDisc({ variant }: { variant: 'kou' | 'pi' }) {
  return (
    <svg className="adm-ai-disc" data-variant={variant} width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <mask id={`adm-ai-notch-${variant}`}>
        <rect width="40" height="40" fill="#fff" />
        <circle cx="3" cy="20" r="5" fill="#000" />
        <circle cx="37" cy="20" r="5" fill="#000" />
      </mask>
      <circle className="adm-ai-body" cx="20" cy="20" r="17" mask={`url(#adm-ai-notch-${variant})`} />
      <path d="M20 6v28" strokeDasharray="2.5 3" />
    </svg>
  );
}

const agents = [
  { id: 'kou', name: 'Kou', role: 'L’éclaireur', model: 'Claude Haiku', text: 'Parcourt les vidéos et les podcasts des créateurs, repère chaque code annoncé et en garde la preuve.' },
  { id: 'pi', name: 'Pi', role: 'Le vérificateur', model: 'Claude Opus', text: 'Contrôle la source, le créateur et l’outil, puis te prépare la décision avec une note de confiance.' },
] as const;

export function AdminAiTeaser() {
  return (
    <section className="adm-panel adm-ai" aria-labelledby="ai-title">
      <div className="adm-ai-head">
        <span className="adm-ai-soon"><span aria-hidden="true" />Bientôt</span>
        <h2 id="ai-title">Kou et Pi arrivent</h2>
        <p>Deux assistants IA pour trouver et vérifier les codes à ta place. Toi, tu gardes le dernier mot.</p>
      </div>
      <ul className="adm-ai-list">
        {agents.map(agent => (
          <li key={agent.id}>
            <CouponDisc variant={agent.id} />
            <div>
              <div className="adm-ai-name"><b>{agent.name}</b><span>{agent.role}</span><small>{agent.model}</small></div>
              <p>{agent.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
