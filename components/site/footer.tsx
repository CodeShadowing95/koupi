import { SiteLinkItem } from '@/components/site/site-pages';
import Image from 'next/image';
import { routes } from '@/lib/routes';
import { usesLogoDev } from '@/lib/tool-logos';
import { PORTFOLIO_URL, PUBLISHER_NAME } from '@/lib/site-contact';

export function SiteFooter() {
  return (
    <footer className="k-footer">
      <div className="k-wrap">
        <div className="k-footer-in">
          <div>
            <Image src="/koupi-logo-dark.png" alt="Koupi" width={971} height={348} />
            <p>Le code du créateur. Crédité, vérifié. On ne remplace jamais son code par le nôtre.</p>
          </div>
          <div>
            <h3>Explorer</h3>
            <ul>
              <SiteLinkItem href={routes.codes}>Tous les codes</SiteLinkItem>
              <SiteLinkItem href={routes.categories}>Catégories</SiteLinkItem>
              <SiteLinkItem href={routes.creators()}>Créateurs</SiteLinkItem>
              <SiteLinkItem href={routes.submit()}>Proposer un code</SiteLinkItem>
              <SiteLinkItem href={routes.forCreators()}>Pour les créateurs</SiteLinkItem>
            </ul>
          </div>
          <div>
            <h3>Koupi</h3>
            <ul>
              <SiteLinkItem href={routes.transparency}>Transparence</SiteLinkItem>
              <SiteLinkItem href={routes.legal}>Mentions légales</SiteLinkItem>
              <SiteLinkItem href={routes.privacy}>Confidentialité</SiteLinkItem>
            </ul>
          </div>
        </div>
        <div className="k-footer-bottom">
          <span>© {new Date().getFullYear()} Koupi · 100 % pro-créateurs · <a className="k-footer-credit" href={PORTFOLIO_URL} target="_blank" rel="noopener">Made by {PUBLISHER_NAME}</a></span>
          <span>
            Zéro pub · zéro cookie publicitaire
            {usesLogoDev() && <> · <a href="https://logo.dev" target="_blank" rel="noopener">Logos provided by Logo.dev</a></>}
          </span>
        </div>
      </div>
    </footer>
  );
}
