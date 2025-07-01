
"use client";

import { getAiResponse } from "@/app/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, SendHorizonal, User, ThumbsUp, ThumbsDown, Heart } from "lucide-react";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reactions?: {
    [key: string]: number;
  };
}

const suggestedQuestions = [
  "Can you help me brainstorm ideas for a new project?",
  "Tell me a joke to lighten up my day.",
  "What's the most interesting fact you know?",
  "Help me plan a weekend trip to the mountains.",
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hello! I'm BlinkAi, your personal AI agent. How can I help you solve your problems today?",
      reactions: {},
    },
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    // Directly submit the form
    const form = document.getElementById("chat-form") as HTMLFormElement;
    if(form) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
      handleSubmit(fakeEvent, question);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, question?: string) => {
    e.preventDefault();
    const userInput = (question || input).trim();
    if (!userInput || isPending) return;

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userInput,
      reactions: {},
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");

    startTransition(async () => {
      const result = await getAiResponse(userInput);
      if (result.success && result.message) {
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.message,
          reactions: {},
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== newUserMessage.id)
        );
      }
    });
  };

  const handleReaction = (messageId: string, reaction: string) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const newReactions = { ...msg.reactions };
        newReactions[reaction] = (newReactions[reaction] || 0) + 1;
        // For this example, we'll just toggle the reaction for simplicity
        // In a real app, you'd handle unique user reactions
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));
  };

  return (
    <div className="flex flex-col h-full max-h-full">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6 space-y-6">
            {messages.length <= 1 && (
              <div className="space-y-4 text-center">
                 <h2 className="text-lg font-medium text-muted-foreground">Try asking...</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedQuestions.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      className="h-auto whitespace-normal"
                      onClick={() => handleSuggestedQuestion(q)}
                    >
                      {q}
                    </Button>
                  ))}
                 </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
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
                <div className="relative">
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg p-3 shadow-sm",
                      message.role === "user"
                        ? "bg-gradient-to-br from-primary to-blue-500 text-primary-foreground"
                        : "bg-card"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <div className={cn(
                    "absolute bottom-[-10px] flex gap-1 transition-opacity opacity-0 group-hover:opacity-100",
                     message.role === "user" ? "left-2" : "right-2"
                    )}>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReaction(message.id, 'like')}><ThumbsUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReaction(message.id, 'dislike')}><ThumbsDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReaction(message.id, 'heart')}><Heart className="h-4 w-4" /></Button>
                  </div>
                </div>
                {message.role === "user" && (
                  <Avatar className="w-8 h-8 border shadow-sm">
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
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
        <form id="chat-form" onSubmit={handleSubmit} className="flex items-center gap-4">
          <Textarea
            placeholder="Type your message..."
            className="flex-1 resize-none min-h-[40px] max-h-48"
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
