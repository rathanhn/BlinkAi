
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
import { Logo } from '@/components/icons';
import { Plus, Settings, MessageSquare, LogOut, MoreVertical, Archive, Trash2, ArchiveRestore, FlaskConical, Megaphone, Shield } from 'lucide-react';
import { Chat } from './chat';
import { useState, useEffect, useRef } from 'react';
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
import { auth, db } from '@/lib/firebase';
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
} from "@/components/ui/alert-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { TooltipProvider } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { logout } from '@/app/auth/actions';
import { ToastAction } from '../ui/toast';
import { onSnapshot, query, collection, where, orderBy } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';


const getSafeTime = (date: any): number => {
    if (!date) return 0;
    if (typeof date.toDate === 'function') {
        return date.toDate().getTime();
    }
    if (typeof date.getTime === 'function') {
        return date.getTime();
    }
    return 0;
};


export function ChatLayout({ conversationId }: { conversationId?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeConversations, setActiveConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [isTempChatActive, setIsTempChatActive] = useState(false);
  const isInitialLoad = useRef(true);
  const router = useRouter();
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
  
  useEffect(() => {
    if (user) {
        setLoadingConversations(true);

        const activeQuery = query(
            collection(db, 'conversations'), 
            where('userId', '==', user.uid), 
            where('archived', '==', false), 
            orderBy('lastUpdated', 'desc')
        );

        const archivedQuery = query(
            collection(db, 'conversations'), 
            where('userId', '==', user.uid), 
            where('archived', '==', true), 
            orderBy('lastUpdated', 'desc')
        );

        const unsubActive = onSnapshot(activeQuery, (snapshot) => {
            const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
            setActiveConversations(convos);
            if (isInitialLoad.current) {
                setLoadingConversations(false);
            }
        }, (err) => handleError(err, 'Could not fetch conversations'));

        const unsubArchived = onSnapshot(archivedQuery, (snapshot) => {
            const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
            setArchivedConversations(convos);
            if (isInitialLoad.current) {
                setLoadingConversations(false);
            }
        }, (err) => handleError(err, 'Could not fetch archived conversations'));

        return () => {
            unsubActive();
            unsubArchived();
        };
    }
  }, [user]);

  useEffect(() => {
    if (isInitialLoad.current && !loadingConversations && !conversationId) {
        const allConversations = [...activeConversations, ...archivedConversations];
        if (allConversations.length > 0) {
            const mostRecentConversation = allConversations.sort((a, b) => getSafeTime(b.lastUpdated) - getSafeTime(a.lastUpdated))[0];
            if (mostRecentConversation) {
                router.replace(`/chat/${mostRecentConversation.id}`);
            }
        }
        isInitialLoad.current = false;
    }
  }, [loadingConversations, conversationId, activeConversations, archivedConversations, router]);
  
  const handleNewChat = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to start a new chat.', variant: 'destructive' });
      return;
    }
    try {
        const newConversation = await startNewConversation(user.uid);
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
    router.push('/login');
  };

  const handleDelete = async (convoId: string) => {
    try {
        await deleteConversation(convoId);
        toast({ title: "Conversation Deleted" });

        if (conversationId === convoId) {
            const allRemainingConversations = [...activeConversations, ...archivedConversations]
                .filter(c => c.id !== convoId)
                .sort((a,b) => getSafeTime(b.lastUpdated) - getSafeTime(a.lastUpdated));
            
            if (allRemainingConversations.length > 0) {
                router.push(`/chat/${allRemainingConversations[0].id}`);
            } else {
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
              toast({ title: "Conversation Archived" });
              if (conversationId === convo.id) {
                const allRemainingActive = activeConversations
                    .filter(c => c.id !== convo.id)
                    .sort((a, b) => getSafeTime(b.lastUpdated) - getSafeTime(a.lastUpdated));
                if (allRemainingActive.length > 0) {
                    router.push(`/chat/${allRemainingActive[0].id}`);
                } else {
                    router.push('/chat');
                }
              }
          } else { 
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
                            checked={isTempChatActive}
                            onCheckedChange={setIsTempChatActive}
                        />
                    </div>
                    <SidebarMenuButton onClick={handleNewChat} className="w-full">
                      <Plus className="mr-2" />
                      New Chat
                    </SidebarMenuButton>
                </div>
              </SidebarMenuItem>
              <SidebarSeparator />
              <div className={cn("space-y-1 transition-opacity", isTempChatActive && "opacity-50 pointer-events-none")}>
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
                <SidebarTrigger />
                 <div className="flex-1" />
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
            <div className="relative flex-1 flex flex-col overflow-hidden">
                <main className='flex-1 flex flex-col overflow-hidden'>
                {user && userProfile ? (
                  <Chat 
                    key={conversationId || 'welcome'}
                    conversationId={conversationId} 
                    isTempChat={false}
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

                <AnimatePresence>
                    {isTempChatActive && user && userProfile && (
                        <motion.div
                            className="absolute inset-0 z-10 bg-background flex flex-col"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                             <Chat
                                key="temp-chat-overlay"
                                isTempChat={true}
                                user={user}
                                userProfile={userProfile}
                                onTitleUpdate={() => {}}
                                setActiveConversations={() => {}}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </SidebarInset>
      </div>
    </TooltipProvider>
    </SidebarProvider>
  );
}
