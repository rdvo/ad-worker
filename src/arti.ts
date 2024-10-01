import { generateText, CoreMessage, CoreUserMessage, convertToCoreMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { fromKV } from './utils';
// Remove the gpt-3-encoder import
// import { encode } from 'gpt-3-encoder';

const MAX_TOKENS = 128000;

export async function handleMessage(message: string, chatHistory: CoreMessage[], chat_id: number) {
  const systemPrompt = await fromKV('system_prompt') || 'You are a helpful assistant in a Telegram chat. Respond to user queries and engage in conversation.';

  // Include the entire chat history in the prompt
  const userMessage: CoreUserMessage = { role: 'user', content: message };
  const messages: CoreMessage[] = [...chatHistory, userMessage];

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: messages,
    maxTokens: 8000,
  });

  console.log('Message generated:', { text });

  // Return both the generated text and the updated chat history
  return {
    text,
    updatedHistory: [...messages, { role: 'assistant', content: text } as CoreMessage]
  };
}

function truncateHistory(history: CoreMessage[]): CoreMessage[] {
  // For now, just return the history as is without truncation
  return history;
}

// Remove the saveChatHistory function from here as it's now handled in index.ts