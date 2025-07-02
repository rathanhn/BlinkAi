
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
import { User as UserIcon, Camera, ChevronLeft, Trash2, ArchiveRestore, Sun, Moon, Laptop } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { uploadProfilePicture } from '@/app/settings/actions';
import { deleteAllConversationsForUser, unarchiveAllConversationsForUser } from '@/lib/chat-service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from '../ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { ToastAction } from '../ui/toast';
import { useRouter } from 'next/navigation';

export function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  
  // Account state
  const [name, setName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Agent state
  const [persona, setPersona] = useState('');

  // System state
  const [emailNotifications, setEmailNotifications] = useState(false);

  const { toast } = useToast();

  const handleError = (error: any, title: string) => {
    const errorMessage = error.message || 'An unknown error occurred.';
    toast({
      title,
      description: errorMessage,
      variant: 'destructive',
      duration: 10000,
      action: (
        <ToastAction
          altText="Report Error"
          onClick={() => router.push(`/feedback?error=${encodeURIComponent(errorMessage)}&type=bug`)}
        >
          Report
        </ToastAction>
      ),
    });
  };

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Set account info
        setName(currentUser.displayName || '');
        setImagePreview(currentUser.photoURL || null);
        
        // Fetch and set other user data from Firestore
        if (db) {
            try {
              const userDocRef = doc(db, 'users', currentUser.uid);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                  setPersona(userDoc.data().persona || '');
                  setEmailNotifications(userDoc.data().emailNotifications || false);
              }
            } catch (error) {
              handleError(error, 'Failed to load user profile');
            }
        }
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

  const handleAccountSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user || !auth.currentUser || !db) {
      toast({ title: 'Error', description: "You must be logged in to update your profile.", variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      let newPhotoURL = user.photoURL;

      if (imageFile) {
        const formData = new FormData();
        formData.append('profilePicture', imageFile);
        const result = await uploadProfilePicture(formData);

        if (!result.success || !result.url) {
          throw new Error(result.error || 'Image upload failed.');
        }
        newPhotoURL = result.url;
      }
      
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: newPhotoURL,
      });
      
      await setDoc(doc(db, 'users', user.uid), {
        displayName: name,
        photoURL: newPhotoURL,
      }, { merge: true });

      setUser({ ...user, displayName: name, photoURL: newPhotoURL } as User);
      toast({ title: 'Success', description: "Account updated successfully!" });
    } catch (error: any) {
      handleError(error, 'Failed to update account');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAgentSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !db) return;
    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { persona });
      toast({ title: 'Success', description: 'Agent persona updated!' });
    } catch (error: any) {
      handleError(error, 'Failed to save persona');
    } finally {
      setIsSaving(false);
    }
  }

  const handleClearHistory = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await deleteAllConversationsForUser(user.uid);
      toast({ title: 'Success', description: 'Your chat history has been cleared.' });
    } catch (error: any) {
      handleError(error, 'Failed to clear history');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRestoreAll = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await unarchiveAllConversationsForUser(user.uid);
      toast({ title: 'Success', description: 'All archived chats have been restored.' });
    } catch (error: any) {
      handleError(error, 'Failed to restore chats');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationsChange = async (checked: boolean) => {
    if (!user || !db) return;
    setEmailNotifications(checked);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { emailNotifications: checked });
      toast({ title: 'Preferences Saved' });
    } catch (error: any) {
      // Revert on failure
      setEmailNotifications(!checked);
      handleError(error, 'Failed to save preferences');
    }
  };


  const renderSkeleton = () => (
    <Card className="w-full max-w-lg">
        <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
            <Skeleton className="h-10 w-full" />
        </CardContent>
    </Card>
  )
  
  if (loading) {
    return renderSkeleton();
  }
  
  if (!user) {
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
    <Tabs defaultValue="account" className="w-full max-w-lg">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="agent">Agent</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
            <Card>
                <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <CardDescription>Manage your public profile and account details.</CardDescription>
                </CardHeader>
                <form onSubmit={handleAccountSave}>
                    <CardContent className="space-y-6">
                        <div className="flex justify-center">
                            <div className="relative">
                                <Avatar className="w-24 h-24 border-2 border-primary cursor-pointer" onClick={triggerFileSelect}>
                                    <AvatarImage src={imagePreview || ''} alt="Profile preview" />
                                    <AvatarFallback className="bg-muted"><UserIcon className="w-12 h-12" /></AvatarFallback>
                                </Avatar>
                                <button type="button" onClick={triggerFileSelect} className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90"><Camera className="w-4 h-4" /><span className="sr-only">Upload</span></button>
                                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" name="profilePicture" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" defaultValue={user?.email || ''} disabled />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-between">
                       <Button variant="link" asChild className="p-0"><Link href="/chat"><ChevronLeft className="w-4 h-4 mr-2" />Back to Chat</Link></Button>
                       <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
                    </CardFooter>
                </form>
            </Card>
        </TabsContent>
        <TabsContent value="chat">
            <Card>
                <CardHeader>
                    <CardTitle>Chat Settings</CardTitle>
                    <CardDescription>Manage your conversation history.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <h3 className="font-semibold">Restore Archived Chats</h3>
                            <p className="text-sm text-muted-foreground">Move all your archived chats back to the main conversation list.</p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={isSaving}><ArchiveRestore className="mr-2 h-4 w-4"/>Restore All</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will restore all archived conversations.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleRestoreAll}>Restore</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
                        <div>
                            <h3 className="font-semibold">Clear History</h3>
                            <p className="text-sm text-muted-foreground">Permanently delete all your conversation history. This action cannot be undone.</p>
                        </div>
                         <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isSaving}><Trash2 className="mr-2 h-4 w-4"/>Clear</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete all conversations and messages. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
                 <CardFooter className="justify-start">
                       <Button variant="link" asChild className="p-0"><Link href="/chat"><ChevronLeft className="w-4 h-4 mr-2" />Back to Chat</Link></Button>
                </CardFooter>
            </Card>
        </TabsContent>
        <TabsContent value="agent">
            <Card>
                <CardHeader>
                    <CardTitle>Agent Persona</CardTitle>
                    <CardDescription>Customize how BlinkAi responds to you. Leave blank to use the default persona.</CardDescription>
                </CardHeader>
                <form onSubmit={handleAgentSave}>
                    <CardContent>
                        <Textarea 
                            placeholder="e.g., You are a pirate captain who helps with coding."
                            value={persona}
                            onChange={(e) => setPersona(e.target.value)}
                            rows={6}
                        />
                    </CardContent>
                    <CardFooter className="justify-between">
                       <Button variant="link" asChild className="p-0"><Link href="/chat"><ChevronLeft className="w-4 h-4 mr-2" />Back to Chat</Link></Button>
                       <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Persona'}</Button>
                    </CardFooter>
                </form>
            </Card>
        </TabsContent>
         <TabsContent value="system">
            <Card>
                <CardHeader>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>Manage application theme and system preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Theme</Label>
                        <p className="text-sm text-muted-foreground">Select the theme for the application.</p>
                        <RadioGroup
                            value={theme}
                            onValueChange={setTheme}
                            className="grid max-w-md grid-cols-3 gap-4 pt-2"
                            >
                            <Label className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                                <RadioGroupItem value="light" id="light" className="sr-only" />
                                <Sun className="h-6 w-6 mb-2" />
                                Light
                            </Label>
                            <Label className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                                <RadioGroupItem value="dark" id="dark" className="sr-only" />
                                <Moon className="h-6 w-6 mb-2" />
                                Dark
                            </Label>
                            <Label className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                                <RadioGroupItem value="system" id="system" className="sr-only" />
                                <Laptop className="h-6 w-6 mb-2" />
                                System
                            </Label>
                        </RadioGroup>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <h3 className="font-semibold">Email Notifications</h3>
                            <p className="text-sm text-muted-foreground">Receive notifications about new features and updates.</p>
                        </div>
                        <Switch
                          checked={emailNotifications}
                          onCheckedChange={handleNotificationsChange}
                        />
                    </div>
                </CardContent>
                 <CardFooter className="justify-start">
                       <Button variant="link" asChild className="p-0"><Link href="/chat"><ChevronLeft className="w-4 h-4 mr-2" />Back to Chat</Link></Button>
                </CardFooter>
            </Card>
        </TabsContent>
    </Tabs>
  );
}
