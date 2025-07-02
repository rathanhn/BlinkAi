import { ChatLayout } from '@/components/chat/chat-layout';

// This page handles both the base /chat route and /chat/[conversationId] routes.
export default async function ChatPage({ params }: { params: { conversationId?: string[] } }) {
  // When the route is /chat, conversationId will be undefined.
  // When the route is /chat/123, conversationId will be ['123']. We take the first element.
  const conversationId = (params.conversationId &&
    Array.isArray(params.conversationId) &&
    params.conversationId.length > 0 &&
    typeof params.conversationId[0] === 'string' &&
    params.conversationId[0].length > 0) ? params.conversationId[0] : undefined;

  return <ChatLayout conversationId={conversationId} />;
}
