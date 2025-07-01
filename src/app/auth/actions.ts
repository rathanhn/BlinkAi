
'use server';

import { auth } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required.'),
});

export async function signupWithEmail(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData);
  const parsed = signupSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }
  
  const { name, email, password } = parsed.data;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
  } catch (error: any) {
    return { success: false, message: error.message };
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
    return { success: false, message: "Invalid email or password. Please try again." };
  }
  
  redirect('/chat');
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
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
