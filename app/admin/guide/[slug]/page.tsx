import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChapterDone, ReadMark } from '@/components/admin-guide-progress';
import { chapterNumber, findChapter, guideChapters, guideParts, neighbours } from '@/lib/admin-guide';
import { chapterContent } from '../chapters';

export function generateStaticParams() {
  return guideChapters.map(chapter => ({ slug: chapter.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = findChapter(slug);
  return { title: chapter ? `${chapter.title} · Guide de l’admin` : 'Guide de l’admin' };
}

// Un chapitre du guide : objectifs, contenu, mise en pratique, puis chapitre suivant.
export default async function GuideChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = findChapter(slug);
  const Content = chapterContent[slug];
  if (!chapter || !Content) notFound();
  const { previous, next } = neighbours(slug);
  const number = chapterNumber(slug);
  const part = guideParts.find(item => item.id === chapter.part);

  return (
    <main className="adm-page gd-page">
      <div className="container gd-layout" style={{ maxWidth: 1120 }}>
        <nav className="gd-toc" aria-label="Chapitres du guide">
          <Link href="/admin/guide" className="gd-toc-back">← Sommaire</Link>
          <ol>
            {guideChapters.map(item => (
              <li key={item.slug}>
                <Link href={`/admin/guide/${item.slug}`} aria-current={item.slug === slug ? 'page' : undefined}>
                  <span className="gd-toc-n">{chapterNumber(item.slug)}</span><span>{item.title}</span><ReadMark slug={item.slug} />
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <article className="gd-article">
          <header className="gd-chapter-head">
            <span className="eyebrow">Chapitre {number} sur {guideChapters.length}{part ? ` · ${part.title}` : ''} · {chapter.minutes} min</span>
            <h1>{chapter.title}</h1>
            <p>{chapter.summary}</p>
          </header>

          <div className="gd-goals">
            <b>À la fin de ce chapitre, tu sauras :</b>
            <ul>{chapter.goals.map(goal => <li key={goal}>{goal}</li>)}</ul>
          </div>

          <Content />

          {chapter.practice && (
            <div className="gd-practice">
              <div><b>À toi de jouer</b><span>Ouvre la vraie page et refais ce que tu viens de lire.</span></div>
              <Link className="adm-btn" href={chapter.practice.href}>{chapter.practice.label} ↗</Link>
            </div>
          )}

          <ChapterDone slug={slug} nextHref={next ? `/admin/guide/${next.slug}` : null} nextTitle={next?.title ?? null} />

          <nav className="gd-pager" aria-label="Chapitre précédent ou suivant">
            {previous ? <Link href={`/admin/guide/${previous.slug}`}><span>← Précédent</span><b>{previous.title}</b></Link> : <span />}
            {next && <Link href={`/admin/guide/${next.slug}`} className="is-next"><span>Suivant →</span><b>{next.title}</b></Link>}
          </nav>
        </article>
      </div>
    </main>
  );
}
