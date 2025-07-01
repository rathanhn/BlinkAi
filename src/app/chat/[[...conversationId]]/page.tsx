import { ChatLayout } from '@/components/chat/chat-layout';

// This page handles both the base /chat route and /chat/[conversationId] routes.
export default function ChatPage({ params }: { params: { conversationId?: string[] } }) {
  // When the route is /chat, conversationId will be undefined.
  // When the route is /chat/123, conversationId will be ['123']. We take the first element.
  const conversationId = params.conversationId?.[0];
  
  // The key prop is important to force a re-render of the layout when changing conversations.
  return <ChatLayout key={conversationId} conversationId={conversationId} />;
}
