
"use client";

import { addMessage, getMessages, updateMessageReaction, updateConversationTitle, type Conversation, Timestamp, UserProfile, startNewConversation } from "@/lib/chat-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SendHorizonal, User, ThumbsUp, ThumbsDown, Heart, MessageSquareQuote, X } from "lucide-react";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from 'framer-motion';
import { generateChatResponse } from "@/ai/flows/generate-chat-response";
import type { User as FirebaseUser } from 'firebase/auth';
import { Logo } from "@/components/icons";
import { CodeBlock } from "./code-block";
import { useRouter } from "next/navigation";
import { ToastAction } from "../ui/toast";

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
  userProfile,
  onTitleUpdate,
  setActiveConversations
}: { 
  conversationId?: string; 
  user: FirebaseUser;
  userProfile: UserProfile;
  onTitleUpdate: (id: string, title: string) => void;
  setActiveConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const isTempChat = !conversationId;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
            handleError(err, 'Failed to load message history.');
        })
        .finally(() => {
            setLoading(false);
        });
  }, [conversationId]);

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
    
    const tempUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
      ...(replyingTo && { replyTo: replyingTo.id }),
    }
    
    setInput("");
    setReplyingTo(null);
    setMessages((prev) => [...prev, tempUserMessage]);
    
    startTransition(async () => {
      try {
        let wasNewChat = false;
        
        // If it's a temp chat, create a new conversation first
        if (!currentConvoId) {
          wasNewChat = true;
          const newConversation = await startNewConversation(user.uid);
          currentConvoId = newConversation.id;
          
          const serializableConvo = {
              ...newConversation,
              lastUpdated: (newConversation.lastUpdated as Timestamp).toDate()
          };
          setActiveConversations(prev => [serializableConvo as any, ...prev]);
          router.push(`/chat/${currentConvoId}`);
        }
        
        const newUserMessage: Omit<Message, 'id' | 'timestamp'> = {
          role: "user",
          content: userInput,
          ...(replyingTo && { replyTo: replyingTo.id }),
        };

        await addMessage(currentConvoId, newUserMessage);

        const personaInfo = `The user's name is ${userProfile.displayName}.
        ${userProfile.persona ? `\nCustom Persona Instructions:\n${userProfile.persona}` : ''}`;
        
        const aiResponse = await generateChatResponse({ userInput, personaInformation: personaInfo });

        if (aiResponse.aiResponse) {
          const aiMessage: Omit<Message, 'id' | 'timestamp'> = {
            role: "assistant",
            content: aiResponse.aiResponse,
          };
          
          await addMessage(currentConvoId, aiMessage);
          
          if (wasNewChat) {
              const summary = await updateConversationTitle(currentConvoId, userInput);
              if (summary) {
                onTitleUpdate(currentConvoId, summary);
              }
          }

          const tempAiMessage: Message = {
            ...(aiMessage as Message),
            id: crypto.randomUUID(),
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev.filter(m => m.id !== tempUserMessage.id), tempUserMessage, tempAiMessage]);
        } else {
          throw new Error('Failed to get AI response');
        }
      } catch (error) {
        handleError(error, 'Failed to send message');
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
      handleError(e, 'Failed to save reaction');
      // Re-fetch to correct UI on error
      if (conversationId) {
        getMessages(conversationId).then(history => {
            const serializableHistory = history.map(msg => ({
                ...msg,
                timestamp: (msg.timestamp as unknown as Timestamp).toDate(),
            }));
            setMessages(serializableHistory);
        });
      }
    }
  };
  
  const getReplyingToMessage = (replyToId: string) => {
    return messages.find(m => m.id === replyToId);
  }

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const codeBlock = part.replace(/^```(\w*)\n?|```$/g, '$1');
        const language = part.match(/^```(\w*)/)?.[1] || '';
        return <CodeBlock key={index} code={codeBlock} language={language} />;
      }
      return part ? <p key={index} className="whitespace-pre-wrap">{part}</p> : null;
    });
  };

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
        "flex flex-col flex-1 h-full",
        isPending && "bg-breathing-gradient-bg bg-200% animate-breathing-gradient"
      )}>
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
                        "rounded-lg shadow-sm text-left w-full",
                        message.role === "user"
                          ? "bg-gradient-to-br from-primary to-blue-500 text-primary-foreground p-3"
                          : "bg-card",
                        message.replyTo && getReplyingToMessage(message.replyTo) && "rounded-t-none"
                      )}
                    >
                      {renderMessageContent(message.content)}
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
          "p-4 border-t bg-card shrink-0",
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
            placeholder={isTempChat ? "Start a new conversation..." : "Type your message..."}
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
