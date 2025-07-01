
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
import { User as UserIcon, Camera, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// Helper function to convert file to Base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

export function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setName(currentUser.displayName || '');
        setImagePreview(currentUser.photoURL || null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user || !auth.currentUser || !db) {
      toast({ title: 'Error', description: "You must be logged in to update your profile.", variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      let newPhotoURL = user.photoURL;

      if (imageFile) {
        // Convert the image to a Base64 string to store in Firestore/Auth
        newPhotoURL = await toBase64(imageFile);
      }
      
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: newPhotoURL,
      });
      
      // Update user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName: name,
        photoURL: newPhotoURL,
      }, { merge: true });

      // Update local state to reflect changes immediately
      setUser({ ...user, displayName: name, photoURL: newPhotoURL } as User);

      toast({ title: 'Success', description: "Profile updated successfully!" });

    } catch (error: any) {
      toast({ title: 'Error', description: error.message || "An unexpected error occurred.", variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
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
  
  if (!user) {
    // This case might be hit briefly before redirect or if something goes wrong
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Not Logged In</CardTitle>
          <CardDescription>You need to be logged in to view settings.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild><Link href="/login">Go to Login</Link></Button>
        </CardFooter>
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
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar
                className="w-24 h-24 border-2 border-primary cursor-pointer"
                onClick={triggerFileSelect}
              >
                <AvatarImage src={imagePreview || ''} alt="Profile preview" />
                <AvatarFallback className="bg-muted">
                  <UserIcon className="w-12 h-12" />
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
            <Input id="name" name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            <p className="text-xs text-muted-foreground">
              The AI will use this name to address you.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={user?.email || ''} disabled />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
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
