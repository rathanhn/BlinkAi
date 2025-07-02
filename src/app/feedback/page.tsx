import { FeedbackForm } from '@/components/feedback/feedback-form';

export const dynamic = 'force-dynamic';

export default function FeedbackPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-4 pt-10 md:items-center md:pt-4">
      <FeedbackForm />
    </div>
  );
}
