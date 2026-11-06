// Écran de chargement du back-office (app/admin/loading.tsx) : en-tête, onglets et grille de cartes,
// la forme commune des listes de l'admin. Le menu latéral reste affiché, seul le contenu attend.

const Bar = ({ w, h = 'md' }: { w: string; h?: 'sm' | 'md' | 'lg' }) => <span className={`adm-skel adm-skel-${h}`} style={{ width: w }} />;

export function AdminSkeleton() {
  return (
    <main className="adm-page" aria-busy="true">
      <div className="container">
        <p className="sr-only" role="status">Chargement de la page…</p>
        <div aria-hidden="true">
          <div className="adm-skel-head">
            <Bar w="90px" h="sm" />
            <Bar w="220px" h="lg" />
            <Bar w="min(520px, 90%)" />
          </div>
          <div className="adm-skel-tabs">{[70, 90, 80, 100].map(w => <Bar key={w} w={`${w}px`} />)}</div>
          <div className="adm-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="adm-card adm-skel-card">
                <Bar w="60%" />
                <Bar w="85%" h="sm" />
                <Bar w="40%" h="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
