
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
import { Plus, Settings, MessageSquare, LogOut, MoreVertical, Archive, Trash2, ArchiveRestore, FlaskConical } from 'lucide-react';
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
import { logout } from '@/app/auth/actions';
import { getConversations, startNewConversation, getArchivedConversations, deleteConversation, archiveConversation, type Conversation, Timestamp } from '@/lib/chat-service';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';

export function ChatLayout({ conversationId }: { conversationId?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeConversations, setActiveConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const isTempChat = !conversationId;

  useEffect(() => {
    if (!auth) {
      setLoadingAuth(false);
      router.push('/login');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
        router.push('/login');
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  useEffect(() => {
    if (user) {
      setLoadingConversations(true);
      const activeQuery = getConversations(user.uid);
      const archivedQuery = getArchivedConversations(user.uid);

      Promise.all([activeQuery, archivedQuery]).then(([activeConvos, archivedConvos]) => {
          const serialize = (c: Conversation) => ({ ...c, lastUpdated: (c.lastUpdated as Timestamp).toDate() });
          setActiveConversations(activeConvos.map(serialize) as any);
          setArchivedConversations(archivedConvos.map(serialize) as any);
      }).catch(err => {
          console.error("Error fetching conversations:", err);
          toast({ title: 'Error', description: 'Could not fetch conversations. Check Firestore rules and indexes.', variant: 'destructive' });
      }).finally(() => {
          setLoadingConversations(false);
      });
    }
  }, [user, toast]);

  
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
      console.error(error);
      toast({ title: 'Error', description: 'Could not start a new chat.', variant: 'destructive' });
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
        setActiveConversations(prev => prev.filter(c => c.id !== convoId));
        setArchivedConversations(prev => prev.filter(c => c.id !== convoId));
        toast({ title: "Conversation Deleted" });
        if (conversationId === convoId) {
            router.push('/chat');
        }
    } catch (error) {
        console.error("Error deleting conversation:", error);
        toast({ title: 'Error', description: 'Could not delete conversation.', variant: 'destructive' });
    }
  };

  const handleArchiveToggle = async (convo: Conversation, shouldArchive: boolean) => {
      try {
          await archiveConversation(convo.id, shouldArchive);
          if (shouldArchive) {
              setActiveConversations(prev => prev.filter(c => c.id !== convo.id));
              setArchivedConversations(prev => [{...convo, archived: true }, ...prev].sort((a,b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()));
              toast({ title: "Conversation Archived" });
          } else {
              setArchivedConversations(prev => prev.filter(c => c.id !== convo.id));
              setActiveConversations(prev => [{...convo, archived: false }, ...prev].sort((a,b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()));
              toast({ title: "Conversation Restored" });
          }
      } catch (error) {
          console.error("Error updating conversation:", error);
          toast({ title: 'Error', description: 'Could not update conversation status.', variant: 'destructive' });
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
              <div className="flex items-center gap-2">
                <Logo className="w-8 h-8 text-primary" />
                <h1 className="text-xl font-semibold">BlinkAi</h1>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild variant={isTempChat ? "secondary" : "ghost"} size="icon" className="h-8 w-8">
                            <Link href="/chat">
                                <FlaskConical className="h-4 w-4" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Temporary Chat</p>
                    </TooltipContent>
                </Tooltip>
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
                    <DropdownMenuContent align="end">
                       <DropdownMenuLabel>My Account</DropdownMenuLabel>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem asChild>
                        <Link href="/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                       </DropdownMenuItem>
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
                    <SidebarMenuButton onClick={handleNewChat} className="w-full">
                      <Plus className="mr-2" />
                      New Chat
                    </SidebarMenuButton>
                </div>
              </SidebarMenuItem>
              <SidebarSeparator />
              <div className={cn("space-y-1", isTempChat && "opacity-50 pointer-events-none transition-opacity")}>
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
            <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
                <SidebarTrigger asChild>
                    <Button size="icon" variant="outline">
                        <Logo className="h-6 w-6" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SidebarTrigger>
                <h1 className="flex-1 text-xl font-semibold">BlinkAi Chat</h1>
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
                    <DropdownMenuContent align="end">
                       <DropdownMenuLabel>My Account</DropdownMenuLabel>
                       <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                          </Link>
                        </DropdownMenuItem>
                       <DropdownMenuItem onClick={handleLogout}>
                         <LogOut className="mr-2 h-4 w-4" />
                         <span>Log out</span>
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </header>
            {user ? (
              <Chat 
                key={conversationId}
                conversationId={conversationId} 
                user={user} 
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
        </SidebarInset>
      </div>
    </TooltipProvider>
    </SidebarProvider>
  );
}
