
import { summarizeConversation } from '@/ai/flows/summarize-conversation';

// Use a simple Date object for mocking Timestamp
type Timestamp = Date;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  reactions?: { [key: string]: string[] };
  replyTo?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastUpdated: Timestamp;
}

// Helper to get data from localStorage
const getLocalStorage = (key: string, defaultValue: any) => {
  if (typeof window === 'undefined') return defaultValue;
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : defaultValue;
};

// Helper to set data in localStorage
const setLocalStorage = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};


// Get all conversations for a user
export async function getConversations(userId: string): Promise<Conversation[]> {
  const conversations = getLocalStorage(`conversations_${userId}`, []);
  // Sort by lastUpdated descending
  return conversations.sort((a: Conversation, b: Conversation) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
}

// Get all messages for a conversation
export async function getMessages(userId: string, conversationId: string): Promise<Message[]> {
  const messages = getLocalStorage(`messages_${conversationId}`, []);
  return messages.map((msg: any) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
}

// Add a new message to a conversation
export async function addMessage(userId: string, conversationId: string, message: Message) {
  const messages = await getMessages(userId, conversationId);
  messages.push(message);
  setLocalStorage(`messages_${conversationId}`, messages);

  // Update conversation's lastUpdated timestamp
  const conversations = await getConversations(userId);
  const convoIndex = conversations.findIndex(c => c.id === conversationId);
  if (convoIndex > -1) {
    conversations[convoIndex].lastUpdated = new Date();
    setLocalStorage(`conversations_${userId}`, conversations);
  }
}

// Start a new conversation
export async function startNewConversation(userId: string): Promise<Conversation> {
  const conversations = await getConversations(userId);
  const newConversation: Conversation = {
    id: `convo_${crypto.randomUUID()}`,
    title: 'New Chat',
    lastUpdated: new Date(),
  };
  conversations.unshift(newConversation);
  setLocalStorage(`conversations_${userId}`, conversations);
  return newConversation;
}

// Update conversation title based on summary
export async function updateConversationTitle(userId: string, conversationId: string, firstUserInput: string): Promise<string | null> {
    try {
        const result = await summarizeConversation({ conversation: firstUserInput });
        if (result.summary) {
            const conversations = await getConversations(userId);
            const convoIndex = conversations.findIndex(c => c.id === conversationId);
            if (convoIndex > -1) {
              conversations[convoIndex].title = result.summary;
              setLocalStorage(`conversations_${userId}`, conversations);
            }
            return result.summary;
        }
        return null;
    } catch (error) {
        console.error("Failed to summarize and update title:", error);
        return null;
    }
}


// Update message reaction
export async function updateMessageReaction(userId: string, conversationId: string, messageId: string, reaction: string) {
  const messages = await getMessages(userId, conversationId);
  const messageIndex = messages.findIndex(m => m.id === messageId);

  if (messageIndex > -1) {
    const msg = messages[messageIndex];
    const reactions = msg.reactions || {};
    const userList: string[] = reactions[reaction] || [];
    
    if (userList.includes(userId)) {
      reactions[reaction] = userList.filter((uid: string) => uid !== userId);
    } else {
      reactions[reaction] = [...userList, userId];
    }
    msg.reactions = reactions;
    setLocalStorage(`messages_${conversationId}`, messages);
  }
}
