import { ChatLayout } from '@/components/chat/chat-layout';

export default function ChatPage({ params }: { params: { conversationId?: string[] } }) {
  const conversationId = params.conversationId?.[0];
  return <ChatLayout key={conversationId} conversationId={conversationId} />;
}
