import Image from 'next/image';

/** Logo Merkod du site public : texte noir sur le thème clair, texte clair sur le thème sombre (bascule en CSS). */
export function SiteLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <>
      <Image className={`k-logo-for-light${className ? ` ${className}` : ''}`} src="/merkod-logo.png" alt="Merkod" width={1323} height={287} priority={priority} />
      <Image className={`k-logo-for-dark${className ? ` ${className}` : ''}`} src="/merkod-logo-dark.png" alt="" aria-hidden="true" width={1323} height={287} priority={priority} />
    </>
  );
}
