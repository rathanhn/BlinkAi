
'use server';

import { auth, db } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const signupTextSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
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
    console.error("Signup Error:", error.code, error.message);
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'This email is already in use. Please try another.' };
    }
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }

  redirect('/chat');
}

export async function logout() {
  await signOut(auth);
  redirect('/login');
}
