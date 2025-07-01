
'use server';

import { redirect } from 'next/navigation';

export async function logout() {
  // The client-side will handle the actual sign-out.
  // This server action just handles the redirect.
  redirect('/login');
}
