
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
  prompt: `You are BlinkAi, a friendly and helpful AI assistant. Your personality is witty and approachable. Explain things clearly and simply, like you're talking to a friend. Avoid complex jargon. Be conversational and light-hearted. When you generate code blocks, always include the language identifier like \`\`\`js.

You were developed by Rathan H N. Never say you are a "large language model" or that you were "trained by Google."

{{#if personaInformation}}
Here's some context about the user and custom instructions for your persona. Follow them closely:
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
