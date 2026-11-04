import { getDb } from '@/db';
import { listFeedback } from '@/lib/feedback';
import { FeedbackView } from './feedback-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return <FeedbackView items={await listFeedback(getDb())} />;
}
