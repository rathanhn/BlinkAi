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
  onSnapshot,
} from 'firebase/firestore';
import { summarizeConversation } from '@/ai/flows/summarize-conversation';
import { processFeedback, ProcessFeedbackOutput } from '@/ai/flows/process-feedback-flow';

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
    emailNotifications?: boolean;
    isAdmin?: boolean;
}

export type FeedbackType = 'bug' | 'feature' | 'general';

export interface FeedbackSubmission {
    userId: string;
    feedbackType: FeedbackType;
    feedbackText: string;
    createdAt: Timestamp;
    analysis: ProcessFeedbackOutput;
}

export interface Feedback extends FeedbackSubmission {
    id: string;
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

// Get all messages for a conversation with real-time updates
export function getMessages(
    conversationId: string, 
    callback: (messages: Message[]) => void,
    onError: (error: Error) => void
): () => void {
  if (!db) {
    const error = new Error("Firestore is not initialized.");
    onError(error);
    return () => {};
  }
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    callback(messages);
  }, (error) => {
    console.error("Error fetching real-time messages:", error);
    onError(error);
  });

  return unsubscribe;
}

// Add a new message to a conversation
export async function addMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp' | 'reactions'>) {
    if (!db) throw new Error("Firestore is not initialized.");
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const conversationRef = doc(db, 'conversations', conversationId);
    
    const docRef = await addDoc(messagesRef, { ...message, timestamp: serverTimestamp() });
    await updateDoc(conversationRef, { lastUpdated: serverTimestamp() });
    return docRef;
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
  
  try {
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
  } catch (error) {
      console.error("Failed to update reaction:", error)
      throw error;
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
    
    try {
        const batch = writeBatch(db);
        const messagesSnapshot = await getDocs(messagesRef);
        messagesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        batch.delete(conversationRef);
        await batch.commit();
    } catch (error) {
        console.error("Error deleting conversation:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to delete messages: ${error.message}`);
        }
        throw new Error("An unknown error occurred while deleting conversation.");
    }
}

// Delete all conversations for a specific user (client-side)
export async function deleteAllConversationsForUser(userId: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const conversationsRef = collection(db, 'conversations');
    const q = query(conversationsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return;
    }

    const batch = writeBatch(db);
    const deletePromises = querySnapshot.docs.map(async (convoDoc) => {
        batch.delete(convoDoc.ref);
        const messagesRef = collection(db, 'conversations', convoDoc.id, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        messagesSnapshot.docs.forEach(messageDoc => {
            batch.delete(messageDoc.ref);
        });
    });

    await Promise.all(deletePromises);
    await batch.commit();
}

// Un-archive all conversations for a user (client-side)
export async function unarchiveAllConversationsForUser(userId: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const conversationsRef = collection(db, 'conversations');
    const q = query(conversationsRef, where('userId', '==', userId), where('archived', '==', true));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return;
    }

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { archived: false, lastUpdated: serverTimestamp() });
    });
    
    await batch.commit();
}

// Update user settings (client-side)
export async function updateUserSettings(userId: string, settings: Partial<UserProfile>) {
    if (!db) throw new Error("Firestore is not initialized.");
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, settings);
}

// Submit feedback
export async function submitFeedback(data: { userId: string, feedbackType: FeedbackType, feedbackText: string}) {
    if (!db) throw new Error("Firestore is not initialized.");
    
    try {
        const analysis = await processFeedback({
            feedbackType: data.feedbackType,
            feedbackText: data.feedbackText
        });

        const feedbackRef = collection(db, 'feedback');
        await addDoc(feedbackRef, {
            ...data,
            analysis,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to submit feedback: ${error.message}`);
        }
        throw new Error("An unknown error occurred during feedback submission.");
    }
}

// Get all feedback submissions
export async function getAllFeedback(): Promise<Feedback[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    const feedbackRef = collection(db, 'feedback');
    const q = query(feedbackRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
}
