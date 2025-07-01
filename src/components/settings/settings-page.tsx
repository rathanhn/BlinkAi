
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useActionState } from 'react-dom';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Camera, ChevronLeft } from 'lucide-react';
import { updateUserProfile } from '@/app/auth/actions';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

export function SettingsPage() {
  const [state, formAction] = useActionState(updateUserProfile, null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser?.photoURL) {
        setImagePreview(currentUser.photoURL);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (state?.success) {
      toast({ title: 'Success', description: state.message });
    } else if (state?.message) {
      toast({ title: 'Error', description: state.message, variant: 'destructive' });
    }
  }, [state, toast]);


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name[0];
  };

  if (loading) {
    return (
        <Card className="w-full max-w-md">
            <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-center"><Skeleton className="w-24 h-24 rounded-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Account Settings</CardTitle>
        <CardDescription>
          Update your profile information here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
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
                name="profilePicture"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" type="text" defaultValue={user?.displayName || ''} required />
            <p className="text-xs text-muted-foreground">
              The AI will use this name to address you.
            </p>
             {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={user?.email || ''} disabled />
          </div>
          <SubmitButton />
        </form>
      </CardContent>
       <CardFooter className="justify-center">
          <Button variant="link" asChild>
              <Link href="/chat">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Link>
          </Button>
       </CardFooter>
    </Card>
  );
}
