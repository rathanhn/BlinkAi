import { ChatLayout } from '@/components/chat/chat-layout';

export default function ConversationPage({ params }: { params: { conversationId: string } }) {
  const { conversationId } = params;
  return <ChatLayout key={conversationId} conversationId={conversationId} />;
}
