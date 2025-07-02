
'use server';

import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { deleteAllConversationsForUser, unarchiveAllConversationsForUser } from '@/lib/chat-service';
import { doc, updateDoc } from 'firebase/firestore';

// Cloudinary is configured automatically via the CLOUDINARY_URL environment variable.

export async function uploadProfilePicture(formData: FormData) {
  const file = formData.get('profilePicture') as File | null;

  if (!file) {
    return { success: false, error: 'No file uploaded.' };
  }

  // The SDK will use CLOUDINARY_URL from process.env
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
          folder: "blinkai-profiles",
          // We can add transformations here, e.g., to resize the image
          transformation: [{ width: 200, height: 200, crop: "fill" }]
      }, (error, result) => {
          if (error) {
              reject(error);
              return;
          }
          resolve(result);
      }).end(buffer);
    });

    if (!result.secure_url) {
        return { success: false, error: 'Cloudinary upload failed.' };
    }

    return { success: true, url: result.secure_url };

  } catch (error) {
    console.error('[ACTION FAILED: uploadProfilePicture]:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during upload.";
    return { success: false, error: `Upload failed: ${errorMessage}` };
  }
}

export async function updateUserPersona(userId: string, persona: string) {
    if (!db || !userId) {
        return { success: false, error: 'User or database not available.' };
    }
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { persona });
        return { success: true };
    } catch (error: any) {
        console.error('[ACTION FAILED: updateUserPersona]:', error);
        return { success: false, error: error.message };
    }
}

export async function updateUserPreferences(userId: string, preferences: { emailNotifications: boolean }) {
    if (!db || !userId) {
        return { success: false, error: 'User or database not available.' };
    }
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, preferences);
        return { success: true };
    } catch (error: any) {
        console.error('[ACTION FAILED: updateUserPreferences]:', error);
        return { success: false, error: error.message };
    }
}

export async function clearAllConversations(userId: string) {
    if (!db || !userId) {
        return { success: false, error: 'User or database not available.' };
    }
    try {
        await deleteAllConversationsForUser(userId);
        return { success: true };
    } catch (error: any) {
        console.error('[ACTION FAILED: clearAllConversations]:', error);
        return { success: false, error: error.message };
    }
}


export async function unarchiveAllConversations(userId: string) {
    if (!db || !userId) {
        return { success: false, error: 'User or database not available.' };
    }
    try {
        await unarchiveAllConversationsForUser(userId);
        return { success: true };
    } catch (error: any) {
        console.error('[ACTION FAILED: unarchiveAllConversations]:', error);
        return { success: false, error: error.message };
    }
}
