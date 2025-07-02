
'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { Logo, VisuallyHidden } from '@/components/icons';
import { Plus, Settings, MessageSquare, LogOut, MoreVertical, Archive, Trash2, ArchiveRestore, FlaskConical, Megaphone, Shield } from 'lucide-react';
import { Chat } from './chat';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getConversations, startNewConversation, getArchivedConversations, deleteConversation, archiveConversation, type Conversation, Timestamp, getUserProfile, UserProfile } from '@/lib/chat-service';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { TooltipProvider } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { logout } from '@/app/auth/actions';
import { ToastAction } from '../ui/toast';
import { SheetTitle } from '../ui/sheet';

export function ChatLayout({ conversationId }: { conversationId?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeConversations, setActiveConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const isTempChat = !conversationId;

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
      setLoadingAuth(false);
      router.push('/login');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
        router.push('/login');
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  // This effect should only run once when the user logs in.
  useEffect(() => {
    if (user) {
      setLoadingConversations(true);
      // Fetch all conversations
      Promise.all([
        getConversations(user.uid),
        getArchivedConversations(user.uid)
      ]).then(([activeConvos, archivedConvos]) => {
          const serialize = (c: Conversation) => ({ ...c, lastUpdated: (c.lastUpdated as Timestamp).toDate() });
          setActiveConversations(activeConvos.map(serialize) as any);
          setArchivedConversations(archivedConvos.map(serialize) as any);

          // This check is now safe because this effect only runs once on user load.
          // It redirects if the app loads on the base URL without a specific chat open.
          if (!conversationId && activeConvos.length > 0) {
            router.replace(`/chat/${activeConvos[0].id}`);
          }
      }).catch(err => {
          console.error("Error fetching conversations:", err);
          handleError(err, 'Could not fetch conversations');
      }).finally(() => {
          setLoadingConversations(false);
      });
    }
  // We intentionally only run this when the user object changes.
  // Subsequent state updates are handled by the action handlers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  
  const handleNewChat = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to start a new chat.', variant: 'destructive' });
      return;
    }
    try {
      const newConversation = await startNewConversation(user.uid);
      const serializableConvo = {
          ...newConversation,
          lastUpdated: (newConversation.lastUpdated as Timestamp).toDate()
      };
      setActiveConversations(prev => [serializableConvo as any, ...prev]);
      router.push(`/chat/${newConversation.id}`);
    } catch (error) {
      handleError(error, 'Could not start new chat');
    }
  };

  const handleTitleUpdate = (convoId: string, newTitle: string) => {
    const updater = (conversations: Conversation[]) => 
        conversations.map(c => c.id === convoId ? { ...c, title: newTitle } : c);
    setActiveConversations(updater);
    setArchivedConversations(updater);
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name[0];
  };

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    await logout();
  };

  const handleDelete = async (convoId: string) => {
    try {
        await deleteConversation(convoId);

        const newActive = activeConversations.filter(c => c.id !== convoId);
        const newArchived = archivedConversations.filter(c => c.id !== convoId);

        setActiveConversations(newActive);
        setArchivedConversations(newArchived);
        
        toast({ title: "Conversation Deleted" });

        // If we deleted the chat we are currently on
        if (conversationId === convoId) {
            // Combine and sort all remaining chats to find the most recent one
            const allRemainingConversations = [...newActive, ...newArchived].sort((a,b) => (b.lastUpdated as any).getTime() - (a.lastUpdated as any).getTime());
            
            if (allRemainingConversations.length > 0) {
                // Navigate to the most recent remaining conversation
                router.push(`/chat/${allRemainingConversations[0].id}`);
            } else {
                // If no chats are left, go to the temporary chat screen
                router.push('/chat');
            }
        }
    } catch (error) {
      handleError(error, 'Could not delete conversation');
    }
  };

  const handleArchiveToggle = async (convo: Conversation, shouldArchive: boolean) => {
      try {
          await archiveConversation(convo.id, shouldArchive);
          if (shouldArchive) {
              const newActive = activeConversations.filter(c => c.id !== convo.id);
              const newArchived = [{...convo, archived: true }, ...archivedConversations].sort((a,b) => (b.lastUpdated as any).getTime() - (a.lastUpdated as any).getTime());

              setActiveConversations(newActive);
              setArchivedConversations(newArchived);
              toast({ title: "Conversation Archived" });

              if (conversationId === convo.id) {
                const allRemainingActive = newActive.sort((a, b) => (b.lastUpdated as any).getTime() - (a.lastUpdated as any).getTime());
                if (allRemainingActive.length > 0) {
                    router.push(`/chat/${allRemainingActive[0].id}`);
                } else {
                    router.push('/chat');
                }
              }
          } else { // un-archive
              setArchivedConversations(prev => prev.filter(c => c.id !== convo.id));
              const newActiveConversations = [{...convo, archived: false }, ...activeConversations].sort((a,b) => (b.lastUpdated as any).getTime() - (a.lastUpdated as any).getTime());
              setActiveConversations(newActiveConversations);
              toast({ title: "Conversation Restored" });
              router.push(`/chat/${convo.id}`);
          }
      } catch (error) {
        handleError(error, 'Could not update conversation');
      }
  };

  const renderConversation = (convo: Conversation) => (
      <SidebarMenuItem key={convo.id} className="relative group/item">
          <SidebarMenuButton asChild className="w-full pr-8" isActive={conversationId === convo.id}>
              <Link href={`/chat/${convo.id}`}>
                  <MessageSquare className="mr-2" />
                  <span className="truncate">{convo.title}</span>
              </Link>
          </SidebarMenuButton>
          <div className="absolute top-1/2 -translate-y-1/2 right-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleArchiveToggle(convo, !convo.archived)}>
                          {convo.archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                          <span>{convo.archived ? 'Restore' : 'Archive'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                              </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This will permanently delete this conversation and all its messages. This action cannot be undone.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(convo.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
      </SidebarMenuItem>
  );

  if (loadingAuth) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-primary animate-pulse" />
            <h1 className="text-xl font-semibold">Loading BlinkAi...</h1>
          </div>
       </div>
    )
  }

  return (
    <SidebarProvider>
    <TooltipProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar>
          <SidebarHeader>
             <div className="flex items-center justify-between p-2">
              <Link href="/" className="flex items-center gap-2">
                <Logo className="w-8 h-8 text-primary" />
                <h1 className="text-xl font-semibold">BlinkAi</h1>
              </Link>
              <div className="flex items-center gap-1">
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" className="h-8 w-8 rounded-full">
                         <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                         </Avatar>
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                       <DropdownMenuLabel>My Account</DropdownMenuLabel>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem asChild>
                        <Link href="/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                       </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/feedback">
                            <Megaphone className="mr-2 h-4 w-4" />
                            <span>Feedback</span>
                          </Link>
                        </DropdownMenuItem>
                       {userProfile?.isAdmin && (
                        <DropdownMenuItem asChild>
                            <Link href="/admin/feedback">
                                <Shield className="mr-2 h-4 w-4" />
                                <span>Admin</span>
                            </Link>
                        </DropdownMenuItem>
                       )}
                       <DropdownMenuSeparator />
                       <DropdownMenuItem onClick={handleLogout}>
                         <LogOut className="mr-2 h-4 w-4" />
                         <span>Log out</span>
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex flex-col gap-2 p-2">
                    <div className="flex items-center justify-between rounded-md border px-3 h-10">
                        <Label htmlFor="temp-chat-toggle" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <FlaskConical />
                            Temporary Chat
                        </Label>
                        <Switch
                            id="temp-chat-toggle"
                            checked={isTempChat}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    router.push('/chat');
                                } else if (isTempChat) { // Only switch if currently in temp chat
                                    if (activeConversations.length > 0) {
                                        router.push(`/chat/${activeConversations[0].id}`);
                                    } else {
                                        handleNewChat();
                                    }
                                }
                            }}
                        />
                    </div>
                    <SidebarMenuButton onClick={handleNewChat} className="w-full">
                      <Plus className="mr-2" />
                      New Chat
                    </SidebarMenuButton>
                </div>
              </SidebarMenuItem>
              <SidebarSeparator />
              <div className={cn("space-y-1 transition-opacity", isTempChat && "opacity-50 pointer-events-none")}>
                {loadingConversations ? (
                   <div className="p-2 space-y-2">
                      <SidebarMenuSkeleton showIcon />
                      <SidebarMenuSkeleton showIcon />
                      <SidebarMenuSkeleton showIcon />
                   </div>
                ) : (
                  <>
                    {activeConversations.map(renderConversation)}
                    {archivedConversations.length > 0 && (
                      <Accordion type="single" collapsible className="w-full px-2">
                        <AccordionItem value="archived" className="border-none">
                          <AccordionTrigger className="py-2 text-sm text-muted-foreground hover:no-underline">
                            Archived ({archivedConversations.length})
                          </AccordionTrigger>
                          <AccordionContent className="pb-0">
                            <div className="space-y-1">
                             {archivedConversations.map(renderConversation)}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </>
                )}
              </div>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4 md:hidden">
                <SidebarTrigger asChild>
                    <Button size="icon" variant="outline">
                        <Logo className="h-6 w-6" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SidebarTrigger>
                <div className="flex-1">
                </div>
                {user && (
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" className="h-8 w-8 rounded-full">
                         <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                         </Avatar>
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                       <DropdownMenuLabel>My Account</DropdownMenuLabel>
                       <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/feedback">
                            <Megaphone className="mr-2 h-4 w-4" />
                            <span>Feedback</span>
                          </Link>
                        </DropdownMenuItem>
                        {userProfile?.isAdmin && (
                            <DropdownMenuItem asChild>
                                <Link href="/admin/feedback">
                                    <Shield className="mr-2 h-4 w-4" />
                                    <span>Admin</span>
                                </Link>
                            </DropdownMenuItem>
                        )}
                       <DropdownMenuSeparator />
                       <DropdownMenuItem onClick={handleLogout}>
                         <LogOut className="mr-2 h-4 w-4" />
                         <span>Log out</span>
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </header>
            <main className='flex-1 flex flex-col overflow-hidden'>
            {user && userProfile ? (
              <Chat 
                key={conversationId}
                conversationId={conversationId} 
                user={user} 
                userProfile={userProfile}
                onTitleUpdate={handleTitleUpdate} 
                setActiveConversations={setActiveConversations}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Logo className="w-20 h-20 text-primary mb-4" />
                <h2 className="text-2xl font-semibold">Welcome to BlinkAi</h2>
                <p className="text-muted-foreground">Select a conversation or start a new one to begin.</p>
              </div>
            )}
            </main>
        </SidebarInset>
      </div>
    </TooltipProvider>
    </SidebarProvider>
  );
}

    