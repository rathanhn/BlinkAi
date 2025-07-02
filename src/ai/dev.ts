import { config } from 'dotenv';
config();

import '@/ai/flows/generate-chat-response.ts';
import '@/ai/flows/summarize-conversation.ts';
import '@/ai/flows/process-feedback-flow.ts';
