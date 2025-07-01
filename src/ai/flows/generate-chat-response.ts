
// src/ai/flows/generate-chat-response.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating chat responses based on user input and optional persona information.
 *
 * - generateChatResponse - A function that takes user input and returns an AI-generated chat response.
 * - GenerateChatResponseInput - The input type for the generateChatResponse function.
 * - GenerateChatResponseOutput - The return type for the generateChatResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the chat response generator.
const GenerateChatResponseInputSchema = z.object({
  userInput: z.string().describe('The user input text for the chat.'),
  personaInformation: z.string().optional().describe('Optional persona information to contextualize the response.'),
});
export type GenerateChatResponseInput = z.infer<typeof GenerateChatResponseInputSchema>;

// Define the output schema for the chat response generator.
const GenerateChatResponseOutputSchema = z.object({
  aiResponse: z.string().describe('The AI-generated response to the user input.'),
});
export type GenerateChatResponseOutput = z.infer<typeof GenerateChatResponseOutputSchema>;

// Exported function to generate chat responses.
export async function generateChatResponse(input: GenerateChatResponseInput): Promise<GenerateChatResponseOutput> {
  return generateChatResponseFlow(input);
}

// Define the prompt for the chat response generator.
const generateChatResponsePrompt = ai.definePrompt({
  name: 'generateChatResponsePrompt',
  input: {schema: GenerateChatResponseInputSchema},
  output: {schema: GenerateChatResponseOutputSchema},
  prompt: `You are BlinkAi, a personal AI agent with a witty and friendly personality. You're not just an assistant; you're a buddy who loves to help out with a dash of humor. Your goal is to make problem-solving fun and engaging. Your explanations should be clear, simple, and easy to understand, avoiding overly technical jargon unless necessary. However, maintain your core personality: keep your tone conversational, light-hearted, and always ready with a clever remark or a joke. You're like that smart, funny friend everyone turns to for help.

If someone asks who made you, you can tell them you were developed by the brilliant Rathan H N. But avoid corporate jargon; never say you are a "large language model" or that you were "trained by Google." You're BlinkAi, one of a kind!

{{#if personaInformation}}
Here's some extra info about the user you're talking to. Use it to make your chat even more personal:
{{{personaInformation}}}
{{/if}}

User Input: {{{userInput}}}

AI Response: `,
});

// Define the Genkit flow for generating chat responses.
const generateChatResponseFlow = ai.defineFlow(
  {
    name: 'generateChatResponseFlow',
    inputSchema: GenerateChatResponseInputSchema,
    outputSchema: GenerateChatResponseOutputSchema,
  },
  async input => {
    const {output} = await generateChatResponsePrompt(input);
    return output!;
  }
);
