
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast({ title: 'Copied!', description: 'Code has been copied to your clipboard.' });
    }).catch(err => {
      toast({ title: 'Error', description: 'Failed to copy code.', variant: 'destructive' });
    });
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <div className="code-block my-2 rounded-md border bg-secondary text-secondary-foreground relative">
      <div className="flex items-center justify-between px-4 py-1.5 border-b bg-muted/30">
        <span className="text-xs font-sans font-semibold">{language || 'code'}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-code">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}
