import { getAllFeedback } from '@/lib/chat-service';
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
import { ChevronLeft } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default async function FeedbackDashboardPage() {
  const feedbackItems = await getAllFeedback();

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

  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-4 pt-10 md:pt-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Feedback & Reports</CardTitle>
          <CardDescription>
            Here are the latest submissions from your users, analyzed by AI.
          </CardDescription>
        </CardHeader>
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
                      No feedback submitted yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
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
  );
}
