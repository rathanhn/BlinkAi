
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { summarizeConversation } from '@/ai/flows/summarize-conversation';

// Re-export Timestamp for use in components
export { Timestamp };

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  reactions?: { [key:string]: string[] };
  replyTo?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastUpdated: Timestamp;
  userId: string;
  archived?: boolean;
}

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    persona?: string;
}


// Get a user's profile from Firestore
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!db) throw new Error("Firestore is not initialized.");
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
    }
    return null;
}

// Get all non-archived conversations for a user
export async function getConversations(userId: string): Promise<Conversation[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef, 
    where('userId', '==', userId), 
    where('archived', '==', false), 
    orderBy('lastUpdated', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
}

// Get all archived conversations for a user
export async function getArchivedConversations(userId: string): Promise<Conversation[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    const conversationsRef = collection(db, 'conversations');
    const q = query(
        conversationsRef,
        where('userId', '==', userId),
        where('archived', '==', true),
        orderBy('lastUpdated', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
}

// Get all messages for a conversation
export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
}

// Add a new message to a conversation
export async function addMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp' | 'reactions'>) {
    if (!db) throw new Error("Firestore is not initialized.");
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const conversationRef = doc(db, 'conversations', conversationId);
    
    await addDoc(messagesRef, { ...message, timestamp: serverTimestamp() });
    await updateDoc(conversationRef, { lastUpdated: serverTimestamp() });
}

// Start a new conversation
export async function startNewConversation(userId: string): Promise<Conversation> {
  if (!db) throw new Error("Firestore is not initialized.");
  const conversationsRef = collection(db, 'conversations');
  const newConversation = {
    title: 'New Chat',
    userId: userId,
    lastUpdated: serverTimestamp(),
    archived: false,
  };
  const docRef = await addDoc(conversationsRef, newConversation);
  
  const newDoc = await getDoc(docRef);

  return { id: newDoc.id, ...newDoc.data() } as Conversation;
}

// Update conversation title based on summary
export async function updateConversationTitle(conversationId: string, firstUserInput: string): Promise<string | null> {
    if (!db) throw new Error("Firestore is not initialized.");
    try {
        const result = await summarizeConversation({ conversation: firstUserInput });
        if (result.summary) {
            const conversationRef = doc(db, 'conversations', conversationId);
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
export async function updateMessageReaction(conversationId: string, messageId: string, reaction: string, userId: string) {
  if (!db) throw new Error("Firestore is not initialized.");
  const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const messageSnap = await getDoc(messageRef);

  if (messageSnap.exists()) {
    const msgData = messageSnap.data();
    const reactions = msgData.reactions || {};
    const userList: string[] = reactions[reaction] || [];
    
    if (userList.includes(userId)) {
      reactions[reaction] = userList.filter(uid => uid !== userId);
    } else {
      reactions[reaction] = [...userList, userId];
    }
    
    await updateDoc(messageRef, { reactions });
  }
}

// Archive or unarchive a conversation
export async function archiveConversation(conversationId: string, archive: boolean) {
  if (!db) throw new Error("Firestore is not initialized.");
  const conversationRef = doc(db, 'conversations', conversationId);
  await updateDoc(conversationRef, { archived: archive, lastUpdated: serverTimestamp() });
}

// Delete a conversation and all its messages
export async function deleteConversation(conversationId: string) {
    if (!db) throw new Error("Firestore is not initialized.");

    const conversationRef = doc(db, 'conversations', conversationId);
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');

    const messagesSnapshot = await getDocs(messagesRef);
    const batch = writeBatch(db);
    messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    await deleteDoc(conversationRef);
}

// Delete all conversations for a specific user
export async function deleteAllConversationsForUser(userId: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const conversationsRef = collection(db, 'conversations');
    const q = query(conversationsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    // This can be a long-running operation. For production apps with many conversations,
    // a Cloud Function would be a more robust solution.
    for (const doc of querySnapshot.docs) {
        await deleteConversation(doc.id);
    }
}
