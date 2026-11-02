// Carte « bientôt » de l'accueil admin : les deux assistants IA prévus (voir la spec des vérifications IA).
// Oubi (Claude Haiku) cherche les codes, Lili (Claude Opus) les vérifie.
// Une seule carte façon widget : Oubi à côté de son texte ; Lili, plus puissante, est plus grande et mieux équipée.
// Rien n'est encore branché.

/** Oubi : petit disque-coupon bleu ciel, encoches sur les côtés, loupe à la main. */
function OubiArt() {
  return (
    <svg className="adm-ai-art adm-ai-art-oubi" viewBox="0 0 120 110" aria-hidden="true">
      <defs>
        <linearGradient id="oubi-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EAF6FF" /><stop offset="1" stopColor="#B9E1FF" /></linearGradient>
        <mask id="oubi-notch"><rect width="120" height="110" fill="#fff" /><circle cx="22" cy="62" r="7" fill="#000" /><circle cx="98" cy="62" r="7" fill="#000" /></mask>
      </defs>
      <ellipse cx="60" cy="104" rx="30" ry="4" fill="#0B2A6B" opacity=".12" />
      <path d="M60 14v10" stroke="#7CC4FF" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 4" />
      <circle cx="60" cy="11" r="5" fill="#FFD66B" />
      <circle cx="60" cy="62" r="38" fill="url(#oubi-body)" mask="url(#oubi-notch)" />
      <circle cx="60" cy="62" r="38" fill="none" stroke="#8CCBFF" strokeWidth="2" mask="url(#oubi-notch)" />
      <ellipse cx="47" cy="62" rx="4" ry="5.5" fill="#16205A" /><circle cx="48.4" cy="60" r="1.6" fill="#fff" />
      <ellipse cx="73" cy="62" rx="4" ry="5.5" fill="#16205A" /><circle cx="74.4" cy="60" r="1.6" fill="#fff" />
      <ellipse cx="39" cy="72" rx="5" ry="3" fill="#FF9EB5" opacity=".7" /><ellipse cx="81" cy="72" rx="5" ry="3" fill="#FF9EB5" opacity=".7" />
      <path d="M55 72q2.5 3 5 0q2.5 3 5 0" fill="none" stroke="#16205A" strokeWidth="2" strokeLinecap="round" />
      <circle cx="94" cy="84" r="11" fill="#EAF6FF" fillOpacity=".55" stroke="#2C6BE0" strokeWidth="4" />
      <path d="M86 92l-9 9" stroke="#2C6BE0" strokeWidth="5" strokeLinecap="round" />
      <circle cx="90" cy="80" r="3" fill="#fff" />
    </svg>
  );
}

/** Lili : grand disque-coupon violet, couronne, bouclier coché et étincelles. */
function LiliArt() {
  return (
    <svg className="adm-ai-art adm-ai-art-lili" viewBox="0 0 150 140" aria-hidden="true">
      <defs>
        <linearGradient id="lili-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F3EEFF" /><stop offset="1" stopColor="#CDBDFF" /></linearGradient>
        <linearGradient id="lili-crown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE38A" /><stop offset="1" stopColor="#FFB938" /></linearGradient>
        <mask id="lili-notch"><rect width="150" height="140" fill="#fff" /><circle cx="27" cy="80" r="9" fill="#000" /><circle cx="123" cy="80" r="9" fill="#000" /></mask>
      </defs>
      <ellipse cx="75" cy="134" rx="38" ry="5" fill="#1B0F4D" opacity=".14" />
      <circle cx="75" cy="80" r="56" fill="#fff" opacity=".18" />
      <path d="M53 34l6-16 11 11 5-17 5 17 11-11 6 16z" fill="url(#lili-crown)" stroke="#E39A16" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="75" cy="15" r="3" fill="#fff" />
      <circle cx="75" cy="80" r="48" fill="url(#lili-body)" mask="url(#lili-notch)" />
      <circle cx="75" cy="80" r="48" fill="none" stroke="#A88BFF" strokeWidth="2.5" mask="url(#lili-notch)" />
      <path d="M57 73q5-5 10 0" fill="none" stroke="#1E1250" strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="92" cy="74" rx="5" ry="6.5" fill="#1E1250" /><circle cx="93.8" cy="71.6" r="2" fill="#fff" />
      <ellipse cx="51" cy="88" rx="6.5" ry="3.6" fill="#FF9EB5" opacity=".7" /><ellipse cx="99" cy="88" rx="6.5" ry="3.6" fill="#FF9EB5" opacity=".7" />
      <path d="M67 89q8 8 16 0" fill="none" stroke="#1E1250" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M103 98l14-5 14 5v9c0 9-6 15-14 18-8-3-14-9-14-18z" fill="#fff" stroke="#6D4BF0" strokeWidth="3" strokeLinejoin="round" />
      <path d="M110 106l5 5 9-9" fill="none" stroke="#16A34A" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path className="adm-ai-spark" d="M18 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFE38A" />
      <path className="adm-ai-spark" d="M132 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff" />
      <path className="adm-ai-spark" d="M24 112l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#fff" />
    </svg>
  );
}

function Power({ level }: { level: number }) {
  return (
    <span className="adm-ai-power" aria-label={`Puissance ${level} sur 5`}>
      {[1, 2, 3, 4, 5].map(step => <i key={step} data-on={step <= level ? '' : undefined} />)}
    </span>
  );
}

export function AdminAiTeaser() {
  return (
    <section className="adm-ai" aria-labelledby="ai-title">
      <div className="adm-ai-head">
        <h2 id="ai-title">Oubi et Lili arrivent</h2>
        <span className="adm-ai-soon"><span aria-hidden="true" />Bientôt</span>
      </div>
      <div className="adm-ai-row adm-ai-oubi">
        <div className="adm-ai-text">
          <b>Oubi</b>
          <span>L’éclaireur · Claude Haiku</span>
          <p>Repère les codes dans les vidéos et les podcasts.</p>
          <Power level={2} />
        </div>
        <OubiArt />
      </div>
      <div className="adm-ai-row adm-ai-lili">
        <LiliArt />
        <div className="adm-ai-text">
          <b>Lili</b>
          <span>La vérificatrice · Claude Opus</span>
          <p>Contrôle chaque preuve et te prépare la décision.</p>
          <Power level={5} />
        </div>
      </div>
    </section>
  );
}
