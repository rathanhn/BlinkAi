
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
import { User, Camera, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

const MOCK_USER_KEY = 'blinkai-user';

// Mock user type
interface FirebaseUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export function SettingsPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem(MOCK_USER_KEY);
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setName(parsedUser.displayName || '');
      setImagePreview(parsedUser.photoURL || null);
    }
    setLoading(false);
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
    
    if (!user) {
      toast({ title: 'Error', description: "You must be logged in to update your profile.", variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    if (!name || name.length < 2) {
      toast({ title: 'Error', description: "Name must be at least 2 characters.", variant: 'destructive' });
      setIsSaving(false);
      return;
    }
    
    try {
      // Since we don't have a backend, the image "upload" is just a preview.
      // If we had a backend, we'd upload `imageFile` here.
      // For now, we'll just use the preview URL if it's a new blob.
      let photoURL = user.photoURL;
      if (imagePreview && imagePreview.startsWith('blob:')) {
          // In a real app, you would upload the file and get a permanent URL.
          // For this mock, we can't persist blob URLs, so we'll just show a success message.
          // The image will revert on next page load unless we stored it in localStorage (which is inefficient for files).
          photoURL = imagePreview; 
      }
      
      const updatedUser = {
        ...user,
        displayName: name,
        photoURL: photoURL
      };

      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast({ title: 'Success', description: "Profile updated successfully!" });

    } catch (error: any) {
      toast({ title: 'Error', description: "An unexpected error occurred. Please try again.", variant: 'destructive' });
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
