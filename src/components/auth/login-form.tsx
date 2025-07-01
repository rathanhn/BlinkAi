
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo, GoogleIcon } from '@/components/icons';

const MOCK_USER_KEY = 'blinkai-user';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // In a real app, you'd validate this. Here, we'll just log in.
    if (!email || !password) {
      setError("Please enter email and password.");
      setLoading(false);
      return;
    }

    const mockUser = {
      uid: `mock_${email}`,
      displayName: email.split('@')[0],
      email: email,
      photoURL: null,
    };

    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
    router.push('/chat');
  };
  
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const mockUser = {
      uid: 'mock_google_user',
      displayName: 'Google User',
      email: 'google.user@example.com',
      photoURL: `https://placehold.co/100x100.png`,
    };

    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
    router.push('/chat');
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Link href="/" className="flex items-center gap-2 justify-center mb-4">
          <Logo className="w-10 h-10 text-primary" />
        </Link>
        <CardTitle className="text-2xl">Welcome Back!</CardTitle>
        <CardDescription>
          Your friendly AI assistant is waiting for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
         <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
        >
            <GoogleIcon className="mr-2 h-4 w-4" />
            Sign in with Google
        </Button>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
