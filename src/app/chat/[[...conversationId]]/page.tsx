import { ChatLayout } from '@/components/chat/chat-layout';

// This page handles both the base /chat route and /chat/[conversationId] routes.
export default async function ChatPage({ params }: { params: { conversationId?: string[] } }) {
  // Await params before accessing properties.
  const awaitedParams = await params;
  // When the route is /chat, conversationId will be undefined.
  // When the route is /chat/123, conversationId will be ['123']. We take the first element.
  const conversationId = awaitedParams.conversationId?.[0];
  
  // The key attribute has been removed to prevent the component from remounting
  // on every navigation, which was the root cause of the toggle bug.
  return <ChatLayout conversationId={conversationId} />;
}
