'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Camera } from 'lucide-react';

export function SignupForm() {
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState({
    value: 0,
    text: '',
    className: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        className: 'bg-destructive text-destructive',
      });
    } else if (score < 5) {
      setStrength({
        value: 66,
        text: 'Medium',
        className: 'bg-primary text-primary',
      });
    } else {
      setStrength({
        value: 100,
        text: 'Strong',
        className: 'bg-primary text-primary',
      });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>
          Join BlinkAi and get your personal AI assistant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar
                className="w-24 h-24 border-2 border-primary cursor-pointer"
                onClick={triggerFileSelect}
              >
                <AvatarImage src={imagePreview || ''} alt="Profile preview" />
                <AvatarFallback className="bg-muted">
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={triggerFileSelect}
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90"
              >
                <Camera className="w-4 h-4" />
                <span className="sr-only">Upload profile picture</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" type="text" placeholder="Your Name" required />
            <p className="text-xs text-muted-foreground">
              The AI will use this name to address you.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
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
          <Button type="submit" className="w-full">
            Create Account
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
