
"use client";

import { addMessage, getMessages, updateMessageReaction, updateConversationTitle, startNewConversation, type Conversation, Timestamp } from "@/lib/chat-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SendHorizonal, User, ThumbsUp, ThumbsDown, Heart, MessageSquareQuote, X } from "lucide-react";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from 'framer-motion';
import { generateChatResponse } from "@/ai/flows/generate-chat-response";
import type { User as FirebaseUser } from 'firebase/auth';
import { Logo } from "@/components/icons";
import { useRouter } from "next/navigation";


interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reactions?: { [key: string]: string[] };
  replyTo?: string;
}

export function Chat({ 
  conversationId, 
  user, 
  onTitleUpdate,
  setActiveConversations,
}: { 
  conversationId?: string; 
  user: FirebaseUser;
  onTitleUpdate: (id: string, title: string) => void;
  setActiveConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isTempChat, setIsTempChat] = useState(!conversationId);
  const { toast } = useToast();
  const router = useRouter();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setIsTempChat(!conversationId);
    if (!conversationId) {
        setMessages([]);
        setLoading(false);
        return;
    }
    setLoading(true);
    getMessages(conversationId)
        .then((history) => {
            const serializableHistory = history.map(msg => ({
                ...msg,
                timestamp: (msg.timestamp as unknown as Timestamp).toDate(),
            }));
            setMessages(serializableHistory);
        })
        .catch(err => {
            console.error("Error fetching messages: ", err);
            toast({ title: "Error", description: "Failed to load message history.", variant: 'destructive'})
        })
        .finally(() => {
            setLoading(false);
        });
  }, [conversationId, toast]);

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
    if (!userInput || isPending) return;

    let currentConvoId = conversationId;
    let isNewChat = false;
    
    // UI message for user
    const tempUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
      ...(replyingTo && { replyTo: replyingTo.id }),
    }
    setMessages((prev) => [...prev, tempUserMessage]);
    setInput("");
    setReplyingTo(null);
    
    startTransition(async () => {
      try {
        // If starting a new permanent chat from the temporary chat view
        if (!conversationId && !isTempChat) {
          isNewChat = true;
          const newConversation = await startNewConversation(user.uid);
          if (newConversation) {
              currentConvoId = newConversation.id;
              const serializableConvo = {
                  ...newConversation,
                  lastUpdated: (newConversation.lastUpdated as Timestamp).toDate()
              };
              setActiveConversations(prev => [serializableConvo as any, ...prev]);
              router.push(`/chat/${newConversation.id}`);
          } else {
              throw new Error("Failed to create a new conversation.");
          }
        }

        const newUserMessage: Omit<Message, 'id' | 'timestamp'> = {
          role: "user",
          content: userInput,
          ...(replyingTo && { replyTo: replyingTo.id }),
        };

        if (currentConvoId) {
            await addMessage(currentConvoId, newUserMessage);
        }

        const aiResponse = await generateChatResponse({ userInput, personaInformation: `The user's name is ${user.displayName}.` });

        if (aiResponse.aiResponse) {
          const aiMessage: Omit<Message, 'id' | 'timestamp'> = {
            role: "assistant",
            content: aiResponse.aiResponse,
          };
          
          if (currentConvoId) {
            await addMessage(currentConvoId, aiMessage);
            if (isNewChat) {
              const summary = await updateConversationTitle(currentConvoId, userInput);
              if (summary) {
                onTitleUpdate(currentConvoId, summary);
              }
            }
          }

          // This logic now runs for both temp and permanent chats
          const tempAiMessage: Message = {
            ...(aiMessage as Message),
            id: crypto.randomUUID(),
            timestamp: new Date(),
          }
          // Replace temp user message and add AI response
          setMessages((prev) => [...prev.filter(m => m.id !== tempUserMessage.id), tempUserMessage, tempAiMessage]);
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
        setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));
      }
    });
  };

  const handleReaction = async (messageId: string, reaction: string) => {
    if (!user || !conversationId) return;
    
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

    try {
      await updateMessageReaction(conversationId, messageId, reaction, user.uid);
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save reaction.' });
      // Re-fetch to correct UI on error
      getMessages(conversationId).then(history => {
          const serializableHistory = history.map(msg => ({
              ...msg,
              timestamp: (msg.timestamp as unknown as Timestamp).toDate(),
          }));
          setMessages(serializableHistory);
      });
    }
  };
  
  const getReplyingToMessage = (replyToId: string) => {
    return messages.find(m => m.id === replyToId);
  }

  if (loading) {
     return (
       <div className="flex items-center justify-center h-full">
         <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-primary animate-pulse" />
            <h1 className="text-xl font-semibold">Loading messages...</h1>
          </div>
       </div>
     )
  }

  return (
    <div className={cn(
        "flex flex-col h-full max-h-full",
        isPending && "bg-breathing-gradient-bg bg-200% animate-breathing-gradient"
      )}>
      <div className="p-4 border-b bg-card flex justify-end items-center gap-2">
          <Label htmlFor="temp-chat-toggle" className="text-sm text-muted-foreground">
            Temporary Chat
          </Label>
          <Switch
            id="temp-chat-toggle"
            checked={isTempChat}
            onCheckedChange={setIsTempChat}
            disabled={!!conversationId || isPending}
          />
      </div>
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
                  <Avatar className="w-8 h-8 border shadow-sm shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Logo className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="relative flex flex-col items-end max-w-full md:max-w-[75%]">
                    {message.replyTo && getReplyingToMessage(message.replyTo) && (
                      <div className="text-xs text-muted-foreground bg-background border rounded-t-lg px-2 py-1 max-w-full truncate">
                          Replying to: <i>"{getReplyingToMessage(message.replyTo)?.content}"</i>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg p-3 shadow-sm",
                        message.role === "user"
                          ? "bg-gradient-to-br from-primary to-blue-500 text-primary-foreground"
                          : "bg-card",
                        message.replyTo && getReplyingToMessage(message.replyTo) && "rounded-t-none"
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
                  <Avatar className="w-8 h-8 border shadow-sm shrink-0">
                    {user?.photoURL ? <AvatarImage src={user.photoURL} alt={user.displayName || "User"} /> : <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>}
                  </Avatar>
                )}
              </motion.div>
            ))}
            {isPending && (
              <div className="flex items-start gap-4">
                <Avatar className="w-8 h-8 border shadow-sm shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Logo className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[75%] rounded-lg p-3 shadow-sm bg-card/80">
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
      <div className={cn(
          "p-4 border-t bg-card",
          isPending && "bg-transparent border-transparent"
        )}>
        <AnimatePresence>
        {replyingTo && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn("text-sm bg-secondary p-2 rounded-t-md flex justify-between items-center",
                    isPending && "bg-transparent"
                )}
            >
                <div>
                  <p className="font-semibold text-secondary-foreground">Replying to {replyingTo.role === 'user' ? user.displayName : 'BlinkAi'}</p>
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
            placeholder={isTempChat ? "Temporary chat. History will not be saved." : "Type your message..."}
            className={cn("flex-1 resize-none min-h-[40px] max-h-48",
              replyingTo && "rounded-t-none",
              isPending && "bg-background/50 placeholder:text-foreground/80"
            )}
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
