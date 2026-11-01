import Link from 'next/link';
import Image from 'next/image';
import { routes } from '@/lib/routes';
import { usesLogoDev } from '@/lib/tool-logos';

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
              <li><Link href={routes.categories}>Catégories</Link></li>
              <li><Link href={routes.keyring}>Mon trousseau</Link></li>
              <li><Link href={routes.submit()}>Proposer un code</Link></li>
            </ul>
          </div>
          <div>
            <h3>Koupi</h3>
            <ul>
              <li><Link href={routes.transparency}>Transparence</Link></li>
              <li><Link href={routes.legal}>Mentions légales</Link></li>
              <li><Link href={routes.privacy}>Confidentialité</Link></li>
            </ul>
          </div>
        </div>
        <div className="k-footer-bottom">
          <span>© {new Date().getFullYear()} Koupi · 100 % pro-créateurs</span>
          <span>
            Zéro pub · zéro cookie publicitaire
            {usesLogoDev() && <> · <a href="https://logo.dev" target="_blank" rel="noopener">Logos provided by Logo.dev</a></>}
          </span>
        </div>
      </div>
    </footer>
  );
}
