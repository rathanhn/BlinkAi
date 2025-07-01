
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
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons';
import { Home, Plus, User as UserIcon, LogOut } from 'lucide-react';
import { Chat } from './chat';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
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

export function ChatLayout() {
  const [chatKey, setChatKey] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      setChatKey(Date.now()); // Reset chat on auth change
    });
    return () => unsubscribe();
  }, []);

  const startNewChat = () => {
    setChatKey(Date.now());
  };
  
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
                       <DropdownMenuItem disabled>{user.displayName || 'User'}</DropdownMenuItem>
                       <DropdownMenuItem disabled className="text-xs text-muted-foreground -mt-2">{user.email}</DropdownMenuItem>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem onClick={() => logout()}>
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
                <SidebarMenuButton onClick={startNewChat} className="w-full">
                  <Plus className="mr-2" />
                  New Chat
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="w-full">
                  <Link href="/">
                    <Home className="mr-2" />
                    Home
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                       <DropdownMenuItem disabled>{user.displayName || 'User'}</DropdownMenuItem>
                       <DropdownMenuItem disabled className="text-xs text-muted-foreground -mt-2">{user.email}</DropdownMenuItem>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem onClick={() => logout()}>
                         <LogOut className="mr-2 h-4 w-4" />
                         <span>Log out</span>
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </header>
            {chatKey && <Chat key={chatKey} />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
