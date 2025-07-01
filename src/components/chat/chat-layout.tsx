
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
import { Plus, Settings, MessageSquare, LogOut } from 'lucide-react';
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
import { getConversations, startNewConversation, type Conversation, Timestamp } from '@/lib/chat-service';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';

export function ChatLayout({ conversationId }: { conversationId?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

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
      getConversations(user.uid)
        .then(convos => {
            // Firestore timestamps need to be converted to JS Dates for serialization
            const serializableConvos = convos.map(c => ({
                ...c,
                lastUpdated: (c.lastUpdated as Timestamp).toDate(),
            }));
            setConversations(serializableConvos as any);
        })
        .catch(err => {
            console.error("Error fetching conversations:", err);
            toast({ title: 'Error', description: 'Could not fetch conversations.', variant: 'destructive' });
        })
        .finally(() => {
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
      // The new conversation from firestore needs its timestamp converted
      const serializableConvo = {
          ...newConversation,
          lastUpdated: (newConversation.lastUpdated as Timestamp).toDate()
      };
      setConversations(prev => [serializableConvo as any, ...prev]);
      router.push(`/chat/${newConversation.id}`);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Could not start a new chat.', variant: 'destructive' });
    }
  };

  const handleTitleUpdate = (conversationId: string, newTitle: string) => {
    setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, title: newTitle } : c)
    );
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
    await logout(); // server action redirect
  };

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
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar>
          <SidebarHeader>
             <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <Logo className="w-8 h-8 text-primary" />
                <h1 className="text-xl font-semibold">BlinkAi</h1>
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
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleNewChat} className="w-full">
                  <Plus className="mr-2" />
                  New Chat
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarSeparator />
              {loadingConversations ? (
                 <div className="p-2 space-y-2">
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                 </div>
              ) : (
                conversations.map(convo => (
                  <SidebarMenuItem key={convo.id}>
                    <SidebarMenuButton asChild className="w-full" isActive={conversationId === convo.id}>
                      <Link href={`/chat/${convo.id}`}>
                        <MessageSquare className="mr-2" />
                        <span className="truncate">{convo.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
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
            {conversationId && user ? (
              <Chat conversationId={conversationId} user={user} onTitleUpdate={handleTitleUpdate} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Logo className="w-20 h-20 text-primary mb-4" />
                <h2 className="text-2xl font-semibold">Welcome to BlinkAi</h2>
                <p className="text-muted-foreground">Select a conversation or start a new one to begin.</p>
              </div>
            )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
