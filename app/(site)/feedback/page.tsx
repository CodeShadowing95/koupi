import { PageHead } from '@/components/site/page-head';
import { FeedbackForm } from './feedback-form';

export const metadata = {
  title: 'Ton avis · Koupi',
  description: 'Une remarque, une idée, un problème sur Koupi ? Dis-le-nous : chaque avis est lu.',
};

export default function Feedback() {
  return (
    <main className="k-page">
      <div className="k-wrap">
        <PageHead eyebrow="Ton avis" title="Dis-nous ce que tu en penses." crumbs={[{ label: 'Ton avis' }]}
          lead="Koupi vient de naître. Ce qui t’a plu, ce qui t’a gêné, ce qui manque : chaque avis est lu, et c’est lui qui décide de la suite." />
        <FeedbackForm />
      </div>
    </main>
  );
}
