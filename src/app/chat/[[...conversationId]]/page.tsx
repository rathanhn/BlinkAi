
import { ChatLayout } from '@/components/chat/chat-layout';

// This page handles both the base /chat route and /chat/[conversationId] routes.
export default async function ChatPage({ params }: { params: { conversationId?: string[] } }) {
  // Await params before accessing properties.
  const awaitedParams = await params;
  // When the route is /chat, conversationId will be undefined.
  // When the route is /chat/123, conversationId will be ['123']. We take the first element.
  const conversationId = awaitedParams.conversationId?.[0];
  
  // The ChatLayout and its children are designed to react to changes in conversationId
  // without needing a key to force a remount. Removing the key fixes the temp chat toggle issue.
  return <ChatLayout conversationId={conversationId} />;
}
