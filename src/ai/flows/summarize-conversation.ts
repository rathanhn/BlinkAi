
'use server';

/**
 * @fileOverview Summarizes a conversation.
 *
 * - summarizeConversation - A function that summarizes a conversation.
 * - SummarizeConversationInput - The input type for the summarizeConversation function.
 * - SummarizeConversationOutput - The return type for the summarizeConversation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeConversationInputSchema = z.object({
  conversation: z.string().describe('The conversation to summarize.'),
});
export type SummarizeConversationInput = z.infer<
  typeof SummarizeConversationInputSchema
>;

const SummarizeConversationOutputSchema = z.object({
  summary: z.string().describe('The summary of the conversation.'),
});
export type SummarizeConversationOutput = z.infer<
  typeof SummarizeConversationOutputSchema
>;

export async function summarizeConversation(
  input: SummarizeConversationInput
): Promise<SummarizeConversationOutput> {
  return summarizeConversationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeConversationPrompt',
  input: {schema: SummarizeConversationInputSchema},
  output: {schema: SummarizeConversationOutputSchema},
  prompt: `Your task is to create a very short, concise title for the following conversation. The title must be a maximum of 4 words and should summarize the main topic. For example, if the conversation is about planning a trip to Japan, a good title would be "Japan Trip Planning". Do not use quotation marks in the title.

Conversation:
{{{conversation}}}
`,
});

const summarizeConversationFlow = ai.defineFlow(
  {
    name: 'summarizeConversationFlow',
    inputSchema: SummarizeConversationInputSchema,
    outputSchema: SummarizeConversationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
