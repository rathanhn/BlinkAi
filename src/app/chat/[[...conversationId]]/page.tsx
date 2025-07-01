import { ChatLayout } from '@/components/chat/chat-layout';

export default function ChatPage({ params }: { params: { conversationId?: string[] } }) {
  // The `conversationId` param will be an array of path segments.
  // For /chat, it's undefined.
  // For /chat/123, it's ['123'].
  // We only care about the first segment.
  const conversationId = params.conversationId?.[0];

  // The key prop is important to force a re-render of the layout when changing conversations.
  return <ChatLayout key={conversationId} conversationId={conversationId} />;
}
