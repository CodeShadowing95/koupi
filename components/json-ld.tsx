import { jsonLdText } from '@/lib/structured-data';

/** Données structurées pour Google. Un bloc de données, pas un script exécuté. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
