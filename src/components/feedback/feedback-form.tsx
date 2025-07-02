'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitFeedback, type FeedbackType } from '@/lib/chat-service';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export function FeedbackForm() {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      toast({
        title: 'Empty Feedback',
        description: 'Please write something before submitting.',
        variant: 'destructive',
      });
      return;
    }

    if (!auth.currentUser) {
        toast({ title: 'Not Logged In', description: "You must be logged in to submit feedback.", variant: 'destructive' });
        router.push('/login');
        return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback({
        userId: auth.currentUser.uid,
        feedbackType,
        feedbackText,
      });
      toast({
        title: 'Feedback Submitted!',
        description: "Thank you for helping us improve BlinkAi.",
      });
      setFeedbackText('');
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Submit Feedback</CardTitle>
        <CardDescription>
          Have a bug to report or an idea for a new feature? Let us know!
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Type of Feedback</Label>
            <Select
              value={feedbackType}
              onValueChange={(value: FeedbackType) => setFeedbackType(value)}
            >
              <SelectTrigger id="feedback-type" className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Feedback</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-text">Your Message</Label>
            <Textarea
              id="feedback-text"
              placeholder="Tell us what's on your mind..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="link" asChild className="p-0">
            <Link href="/chat">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
