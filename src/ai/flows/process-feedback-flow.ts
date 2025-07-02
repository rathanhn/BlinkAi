'use server';

/**
 * @fileOverview Processes user-submitted feedback using an AI flow.
 *
 * - processFeedback - A function that analyzes, categorizes, and prioritizes feedback.
 * - ProcessFeedbackInput - The input type for the processFeedback function.
 * - ProcessFeedbackOutput - The return type for the processFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessFeedbackInputSchema = z.object({
  feedbackType: z.enum(['bug', 'feature', 'general']),
  feedbackText: z.string().describe('The user-submitted feedback text.'),
});
export type ProcessFeedbackInput = z.infer<typeof ProcessFeedbackInputSchema>;

const ProcessFeedbackOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the feedback.'),
  category: z.string().describe('A specific category for the feedback (e.g., "UI/UX", "Authentication", "Performance").'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('The suggested priority for addressing the feedback.'),
});
export type ProcessFeedbackOutput = z.infer<typeof ProcessFeedbackOutputSchema>;

export async function processFeedback(input: ProcessFeedbackInput): Promise<ProcessFeedbackOutput> {
  return processFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processFeedbackPrompt',
  input: {schema: ProcessFeedbackInputSchema},
  output: {schema: ProcessFeedbackOutputSchema},
  prompt: `You are an expert project manager responsible for triaging user feedback. Analyze the following feedback submission and provide a structured analysis.

Feedback Type: {{{feedbackType}}}
Feedback Content:
{{{feedbackText}}}

Based on the content and type, perform the following actions:
1.  **Summarize:** Create a very brief, one-sentence summary of the user's main point.
2.  **Categorize:** Assign a technical category to the feedback. Examples: "UI/UX", "Authentication", "Chat", "Performance", "Billing", "Security".
3.  **Prioritize:** Assign a priority level based on the potential impact. Use your best judgment. A bug that prevents login is "Critical". A minor typo is "Low". A good feature idea is "Medium".

Return the result in the structured format.`,
});

const processFeedbackFlow = ai.defineFlow(
  {
    name: 'processFeedbackFlow',
    inputSchema: ProcessFeedbackInputSchema,
    outputSchema: ProcessFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
