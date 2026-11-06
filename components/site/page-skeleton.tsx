// Écrans de chargement du site public (loading.tsx) : la forme de la page arrive tout de suite,
// pendant que le serveur prépare la vraie. Aucune donnée, aucun script : rien à attendre pour l'afficher.

export type SkeletonVariant = 'list' | 'tool' | 'creator';

const Bar = ({ w, h = 'md' }: { w: string; h?: 'sm' | 'md' | 'lg' | 'xl' }) => <span className={`k-skel k-skel-${h}`} style={{ width: w }} />;

/** Coupon fantôme : partie papier, pointillés, talon. */
function CouponSkeleton() {
  return (
    <li className="k-skel-coupon">
      <span className="k-skel-coupon-main">
        <span className="k-skel-row"><span className="k-skel k-skel-dot" /><Bar w="55%" /></span>
        <Bar w="80%" h="lg" />
        <Bar w="45%" h="sm" />
      </span>
      <span className="k-skel-coupon-stub"><Bar w="70%" /></span>
    </li>
  );
}

function Coupons({ count }: { count: number }) {
  return <ul className="k-pass-grid k-skel-grid">{Array.from({ length: count }, (_, i) => <CouponSkeleton key={i} />)}</ul>;
}

export function PageSkeleton({ variant = 'list' }: { variant?: SkeletonVariant }) {
  return (
    <main className="k-page" aria-busy="true">
      <div className="k-wrap">
        <p className="k-sr" role="status">Chargement de la page…</p>
        <div aria-hidden="true">
          {variant === 'tool' ? (
            <div className="k-tool-layout k-skel-top">
              <div className="k-skel-stack">
                <Bar w="30%" h="sm" />
                <Bar w="75%" h="xl" />
                <Bar w="55%" />
                <span className="k-skel-ticket" />
                <Bar w="40%" h="sm" />
              </div>
              <div className="k-skel-stack">
                <span className="k-skel-panel" />
                <span className="k-skel-panel" />
              </div>
            </div>
          ) : variant === 'creator' ? (
            <>
              <div className="k-skel-creator k-skel-top">
                <span className="k-skel k-skel-avatar" />
                <div className="k-skel-stack">
                  <Bar w="60%" h="xl" />
                  <Bar w="40%" />
                </div>
              </div>
              <Coupons count={6} />
            </>
          ) : (
            <>
              <div className="k-skel-stack k-skel-head k-skel-top">
                <Bar w="20%" h="sm" />
                <Bar w="60%" h="xl" />
                <Bar w="45%" />
              </div>
              <Coupons count={6} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
