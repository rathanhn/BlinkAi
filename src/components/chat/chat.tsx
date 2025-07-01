
"use client";

import { addMessage, getMessages, updateMessageReaction, updateConversationTitle } from "@/lib/chat-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, SendHorizonal, User, ThumbsUp, ThumbsDown, Heart, MessageSquareQuote, X } from "lucide-react";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from 'framer-motion';
import { generateChatResponse } from "@/ai/flows/generate-chat-response";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reactions?: { [key: string]: string[] }; // a reaction can be voted by multiple userIds
  replyTo?: string;
}

// Mock user type
interface FirebaseUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export function Chat({ 
  conversationId, 
  user, 
  onTitleUpdate 
}: { 
  conversationId: string; 
  user: FirebaseUser | null;
  onTitleUpdate: (id: string, title: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!user || !conversationId) return;
    setLoading(true);
    getMessages(user.uid, conversationId).then((history) => {
      setMessages(history);
      setLoading(false);
    });
  }, [conversationId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userInput = input.trim();
    if (!userInput || isPending || !user) return;
    
    const isFirstMessage = messages.length === 0;

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
      ...(replyingTo && { replyTo: replyTo.id }),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setReplyingTo(null);
    
    startTransition(async () => {
      try {
        await addMessage(user.uid, conversationId, newUserMessage);

        const aiResponse = await generateChatResponse({ userInput, personaInformation: `The user's name is ${user.displayName}.` });

        if (aiResponse.aiResponse) {
          const aiMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: aiResponse.aiResponse,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          await addMessage(user.uid, conversationId, aiMessage);
          
          if (isFirstMessage) {
            const summary = await updateConversationTitle(user.uid, conversationId, userInput);
            if (summary) {
              onTitleUpdate(conversationId, summary);
            }
          }
        } else {
          throw new Error('Failed to get AI response');
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to send message. Please try again.",
        });
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== newUserMessage.id)
        );
      }
    });
  };

  const handleReaction = async (messageId: string, reaction: string) => {
    if (!user) return;
    
    // Optimistic update
    const newMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const newReactions = { ...(msg.reactions || {}) };
        const userList = newReactions[reaction] || [];
        if (userList.includes(user.uid)) {
          newReactions[reaction] = userList.filter(uid => uid !== user.uid);
        } else {
          newReactions[reaction] = [...userList, user.uid];
        }
        return { ...msg, reactions: newReactions };
      }
      return msg;
    });
    setMessages(newMessages);

    // Persist change
    try {
      await updateMessageReaction(user.uid, conversationId, messageId, reaction);
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save reaction.' });
      // Revert optimistic update if API call fails
      getMessages(user.uid, conversationId).then(setMessages);
    }
  };
  
  const getReplyingToMessage = (replyToId: string) => {
    return messages.find(m => m.id === replyToId);
  }

  if (loading) {
     return (
       <div className="flex items-center justify-center h-full">
         <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary animate-pulse" />
            <h1 className="text-xl font-semibold">Loading messages...</h1>
          </div>
       </div>
     )
  }

  return (
    <div className="flex flex-col h-full max-h-full">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6 space-y-6">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragSnapToOrigin
                onDragEnd={(event, info) => {
                  if (info.offset.x > 75) {
                    setReplyingTo(message);
                  }
                }}
                className={cn(
                  "group flex items-start gap-4",
                  message.role === "user" && "justify-end"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="w-8 h-8 border shadow-sm">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="relative flex flex-col items-end">
                    {message.replyTo && getReplyingToMessage(message.replyTo) && (
                      <div className="text-xs text-muted-foreground bg-background border rounded-t-lg px-2 py-1 max-w-full truncate">
                          Replying to: <i>"{getReplyingToMessage(message.replyTo)?.content}"</i>
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-full rounded-lg p-3 shadow-sm",
                        message.role === "user"
                          ? "bg-gradient-to-br from-primary to-blue-500 text-primary-foreground"
                          : "bg-card",
                        message.replyTo && "rounded-t-none"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className={cn(
                      "mt-1 flex gap-1 transition-opacity opacity-0 group-hover:opacity-100",
                      )}>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(message)}><MessageSquareQuote className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReaction(message.id, 'like')}><ThumbsUp className={cn("h-4 w-4", message.reactions?.like?.includes(user?.uid || '') && "fill-current text-primary")} /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReaction(message.id, 'dislike')}><ThumbsDown className={cn("h-4 w-4", message.reactions?.dislike?.includes(user?.uid || '') && "fill-current text-primary")} /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReaction(message.id, 'heart')}><Heart className={cn("h-4 w-4", message.reactions?.heart?.includes(user?.uid || '') && "fill-current text-destructive")} /></Button>
                    </div>
                </div>
                {message.role === "user" && (
                  <Avatar className="w-8 h-8 border shadow-sm">
                    {user?.photoURL ? <AvatarImage src={user.photoURL} /> : <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>}
                  </Avatar>
                )}
              </motion.div>
            ))}
            {isPending && (
              <div className="flex items-start gap-4">
                <Avatar className="w-8 h-8 border shadow-sm">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[75%] rounded-lg p-3 shadow-sm bg-card">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-75" />
                    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-150" />
                    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-300" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>
      <div className="p-4 border-t bg-card">
        <AnimatePresence>
        {replyingTo && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm bg-secondary p-2 rounded-t-md flex justify-between items-center"
            >
                <div>
                  <p className="font-semibold text-secondary-foreground">Replying to {replyingTo.role === 'user' ? 'yourself' : 'BlinkAi'}</p>
                  <p className="text-muted-foreground truncate max-w-xs md:max-w-md">"{replyingTo.content}"</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="h-6 w-6">
                    <X className="h-4 w-4"/>
                </Button>
            </motion.div>
        )}
        </AnimatePresence>
        <form id="chat-form" onSubmit={handleSubmit} className="flex items-center gap-4">
          <Textarea
            ref={textareaRef}
            placeholder="Type your message..."
            className={cn("flex-1 resize-none min-h-[40px] max-h-48", replyingTo && "rounded-t-none")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            rows={1}
            disabled={isPending}
          />
          <Button type="submit" size="lg" disabled={isPending || !input.trim()}>
            <SendHorizonal className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
