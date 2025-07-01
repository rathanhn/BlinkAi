
"use client";

import { getAiResponse } from "@/app/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, SendHorizonal, User } from "lucide-react";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hello! I'm BlinkAi, your personal AI agent developed by Rathan H N. How can I help you solve your problems today?",
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userInput = input.trim();
    if (!userInput || isPending) return;

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userInput,
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

  return (
    <div className="flex flex-col h-full max-h-full">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-4",
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
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg p-3 shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
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
        <form onSubmit={handleSubmit} className="flex items-center gap-4">
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
