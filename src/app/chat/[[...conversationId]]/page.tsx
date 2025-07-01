import { notFound } from 'next/navigation';

// This optional catch-all route is disabled to prevent conflicts with
// more specific routes like /chat and /chat/[conversationId].
export default function DisabledCatchAllPage() {
  notFound();
}
