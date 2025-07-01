
'use server';

import { auth, storage, db } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const signupTextSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required.'),
});

const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
});

export async function signupWithEmail(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const parsed = signupTextSchema.safeParse({ name, email, password });

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, { 
      displayName: name,
    });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: name,
      email: user.email,
      photoURL: null,
    });

  } catch (error: any) {
    console.error("Signup Error:", error);
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'This email is already in use. Please try another.' };
    }
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }

  redirect('/chat');
}

export async function loginWithEmail(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    console.error("Login Error:", error);
    if (error.code === 'auth/invalid-credential') {
        return { success: false, message: "Invalid email or password. Please try again." };
    }
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
  
  redirect('/chat');
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    }, { merge: true });

  } catch (error: any) {
    console.error("Google sign-in error", error);
    return { success: false, message: error.message };
  }
  redirect('/chat');
}

export async function logout() {
  await signOut(auth);
  redirect('/login');
}

export async function updateUserProfile(prevState: any, formData: FormData) {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, message: "You must be logged in to update your profile." };
  }

  const name = formData.get('name') as string;
  const profilePicture = formData.get('profilePicture') as File;

  const parsed = profileUpdateSchema.safeParse({ name });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    let photoURL = user.photoURL;
    if (profilePicture && profilePicture.size > 0) {
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await uploadBytes(storageRef, profilePicture);
      photoURL = await getDownloadURL(storageRef);
    }
    
    await updateProfile(user, { displayName: name, photoURL });

    await setDoc(doc(db, "users", user.uid), {
      displayName: name,
      photoURL: photoURL,
    }, { merge: true });

    return { success: true, message: "Profile updated successfully!" };

  } catch (error: any) {
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
}
