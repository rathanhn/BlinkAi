
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
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
import { Progress } from '@/components/ui/progress';

const MOCK_USER_KEY = 'blinkai-user';

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState({
    value: 0,
    text: '',
    className: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) {
      setStrength({ value: 0, text: '', className: '' });
      return;
    }
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score < 3) {
      setStrength({
        value: 33,
        text: 'Not Secure',
        className: 'bg-destructive text-destructive-foreground',
      });
    } else if (score < 5) {
      setStrength({
        value: 66,
        text: 'Medium',
        className: 'bg-yellow-500 text-yellow-500',
      });
    } else {
      setStrength({
        value: 100,
        text: 'Strong',
        className: 'bg-primary text-primary-foreground',
      });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const mockUser = {
      uid: `mock_${email}`,
      displayName: name,
      email: email,
      photoURL: null,
    };

    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
    router.push('/chat');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>
          Let&apos;s get you started! Your new AI buddy is just a few clicks away.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" type="text" placeholder="Your Name" required value={name} onChange={(e) => setName(e.target.value)}/>
            <p className="text-xs text-muted-foreground">
              The AI will use this name to address you.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              required
            />
          </div>
          {password.length > 0 && (
            <div className="space-y-1">
              <Progress value={strength.value} className={strength.className.split(' ')[0]} />
              <p className={`text-xs text-right font-medium ${strength.className.split(' ')[1]}`}>
                {strength.text}
              </p>
            </div>
          )}
           {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
