import { notFound } from 'next/navigation';

// This file is intentionally left to cause a 404 if accessed directly.
// The main chat logic is now split between /chat (the welcome screen)
// and /chat/[conversationId] (for specific chats).
// This file can be safely deleted, but to avoid routing conflicts with
// the new structure, we're making it inactive.
export default function ConflictingChatPage() {
  notFound();
}
