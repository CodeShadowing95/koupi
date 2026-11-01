// Petite icône « i » placée après un libellé : au survol ou au focus clavier, une bulle explique le champ.
// Uniquement en CSS (.adm-info), donc utilisable dans les composants serveur comme client.
export function InfoTip({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <span className="adm-info">
      <button type="button" className="adm-info-btn" aria-label={label} aria-describedby={id}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 11v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="7.6" r="1.3" fill="currentColor" />
        </svg>
      </button>
      <span id={id} role="tooltip" className="adm-info-bubble">{children}</span>
    </span>
  );
}
