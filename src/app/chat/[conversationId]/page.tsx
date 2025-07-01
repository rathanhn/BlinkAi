import { ChatLayout } from '@/components/chat/chat-layout';

export default function ConversationPage({ params }: { params: { conversationId: string } }) {
  // This page handles a specific conversation route, e.g., /chat/123.
  // The key prop is important to force a re-render of the layout when changing conversations.
  return <ChatLayout key={params.conversationId} conversationId={params.conversationId} />;
}
