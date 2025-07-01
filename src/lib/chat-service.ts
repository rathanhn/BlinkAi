
import { db } from '@/lib/firebase';
import { summarizeConversation } from '@/ai/flows/summarize-conversation';
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  Timestamp,
  setDoc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reactions?: { [key: string]: string[] };
  replyTo?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastUpdated: Timestamp;
}

// Get all conversations for a user
export async function getConversations(userId: string): Promise<Conversation[]> {
  const conversationsRef = collection(db, `users/${userId}/conversations`);
  const q = query(conversationsRef, orderBy('lastUpdated', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
}

// Get all messages for a conversation
export async function getMessages(userId: string, conversationId: string): Promise<Message[]> {
  const messagesRef = collection(db, `users/${userId}/conversations/${conversationId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: (data.timestamp as Timestamp).toDate(),
    } as Message;
  });
}

// Add a new message to a conversation
export async function addMessage(userId: string, conversationId: string, message: Message) {
  const { id, ...messageData } = message;
  const messageRef = doc(db, `users/${userId}/conversations/${conversationId}/messages`, id);
  const conversationRef = doc(db, `users/${userId}/conversations/${conversationId}`);
  
  await Promise.all([
    setDoc(messageRef, { ...messageData, timestamp: Timestamp.fromDate(message.timestamp) }),
    updateDoc(conversationRef, { lastUpdated: serverTimestamp() })
  ]);
}

// Start a new conversation
export async function startNewConversation(userId: string): Promise<Conversation> {
  const conversationRef = collection(db, `users/${userId}/conversations`);
  const newConversationData = {
    title: 'New Chat',
    lastUpdated: serverTimestamp(),
  };
  const newDocRef = await addDoc(conversationRef, newConversationData);
  return {
    id: newDocRef.id,
    title: 'New Chat',
    lastUpdated: Timestamp.now()
  };
}

// Update conversation title based on summary
export async function updateConversationTitle(userId: string, conversationId: string, firstUserInput: string): Promise<string | null> {
    try {
        const result = await summarizeConversation({ conversation: firstUserInput });
        if (result.summary) {
            const conversationRef = doc(db, `users/${userId}/conversations/${conversationId}`);
            await updateDoc(conversationRef, { title: result.summary });
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
  const messageRef = doc(db, `users/${userId}/conversations/${conversationId}/messages`, messageId);
  const docSnap = await getDoc(messageRef);

  if (docSnap.exists()) {
    const messageData = docSnap.data();
    const reactions = messageData.reactions || {};
    const userList = reactions[reaction] || [];

    if (userList.includes(userId)) {
      reactions[reaction] = userList.filter((uid: string) => uid !== userId);
    } else {
      reactions[reaction] = [...userList, userId];
    }
    await updateDoc(messageRef, { reactions });
  }
}
