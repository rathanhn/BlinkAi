'use client';

import { getAllFeedback, type Feedback } from '@/lib/chat-service';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function FeedbackDashboardPage() {
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        getAllFeedback()
          .then(setFeedbackItems)
          .catch(err => {
            console.error(err);
            toast({
              title: 'Error Fetching Feedback',
              description: 'Could not load feedback. Please check console for details.',
              variant: 'destructive',
            })
          })
          .finally(() => setLoading(false));
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  const getPriorityVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const renderSkeleton = () => (
    <TableBody>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  const PageCard = ({ children }: { children: React.ReactNode }) => (
     <div className="flex min-h-screen items-start justify-center bg-background p-4 pt-10 md:pt-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Feedback & Reports</CardTitle>
          <CardDescription>
            Here are the latest submissions from your users, analyzed by AI.
          </CardDescription>
        </CardHeader>
        {children}
        <CardFooter>
            <Button variant="link" asChild className="p-0">
                <Link href="/chat">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Chat
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  )

  if (loading) {
     return (
        <PageCard>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Summary (AI)</TableHead>
                      <TableHead>Category (AI)</TableHead>
                      <TableHead>Priority (AI)</TableHead>
                    </TableRow>
                  </TableHeader>
                  {renderSkeleton()}
                </Table>
              </div>
            </CardContent>
        </PageCard>
     );
  }

  return (
    <PageCard>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Summary (AI)</TableHead>
                  <TableHead>Category (AI)</TableHead>
                  <TableHead>Priority (AI)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackItems.length > 0 ? (
                  feedbackItems.map((item) => (
                    <TooltipProvider key={item.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <TableRow className="cursor-pointer">
                              <TableCell>
                                {item.createdAt.toDate().toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {item.feedbackType}
                                </Badge>
                              </TableCell>
                              <TableCell>{item.analysis.summary}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.analysis.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPriorityVariant(item.analysis.priority)}>
                                  {item.analysis.priority}
                                </Badge>
                              </TableCell>
                           </TableRow>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md p-4">
                          <p className="font-bold">Original Feedback:</p>
                          <p>{item.feedbackText}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                       <div className="flex flex-col items-center gap-2">
                         <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                         <p className="font-medium">No feedback submitted yet.</p>
                         <p className="text-sm text-muted-foreground">When users submit feedback, it will appear here.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
    </PageCard>
  );
}