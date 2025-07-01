
'use server';

import { generateChatResponse } from '@/ai/flows/generate-chat-response';
import { z } from 'zod';

const actionSchema = z.string().min(1, { message: 'Message cannot be empty.' });

export async function getAiResponse(userInput: string) {
  try {
    const validatedInput = actionSchema.safeParse(userInput);
    if (!validatedInput.success) {
      return { success: false, message: 'Invalid input.' };
    }

    const response = await generateChatResponse({
      userInput: validatedInput.data,
    });

    if (response.aiResponse) {
      return { success: true, message: response.aiResponse };
    } else {
      return { success: false, message: 'Failed to get a response from the AI.' };
    }

  } catch (error) {
    console.error(error);
    return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
}
