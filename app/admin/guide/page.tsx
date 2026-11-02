import Link from 'next/link';
import { GuideProgress, ReadMark } from '@/components/admin-guide-progress';
import { chapterNumber, chaptersOf, guideChapters, guideParts, totalMinutes } from '@/lib/admin-guide';

// Guide de l'admin : le sommaire, comme une notice découpée en chapitres courts.
export default function AdminGuide() {
  return (
    <main className="adm-page gd-page">
      <div className="container" style={{ maxWidth: 1120 }}>
        <header className="gd-hero">
          <div>
            <span className="eyebrow">Apprendre</span>
            <h1>Guide de l’admin Koupi</h1>
            <p>Tout ce qu’il faut pour gérer Koupi, même sans jamais avoir administré un site. {guideChapters.length} chapitres courts, environ {totalMinutes} minutes au total. Lis-les dans l’ordre la première fois, puis reviens-y comme à une notice.</p>
          </div>
          <GuideProgress />
        </header>

        <div className="gd-parts">
          {guideParts.map((part, partIndex) => (
            <section key={part.id} className="gd-part" aria-labelledby={`part-${part.id}`}>
              <div className="gd-part-head">
                <span className="gd-part-n">Partie {partIndex + 1}</span>
                <h2 id={`part-${part.id}`}>{part.title}</h2>
                <p>{part.description}</p>
              </div>
              <ol className="gd-chapters">
                {chaptersOf(part.id).map(chapter => (
                  <li key={chapter.slug}>
                    <Link className="gd-chapter" href={`/admin/guide/${chapter.slug}`}>
                      <span className="gd-chapter-n">{String(chapterNumber(chapter.slug)).padStart(2, '0')}</span>
                      <span className="gd-chapter-body">
                        <b>{chapter.title}</b>
                        <span>{chapter.summary}</span>
                      </span>
                      <span className="gd-chapter-meta">{chapter.minutes} min<ReadMark slug={chapter.slug} /></span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
