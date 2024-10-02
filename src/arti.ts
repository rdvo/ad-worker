import {
  generateText,
  CoreMessage,
  CoreUserMessage,
  CoreAssistantMessage,
  CoreSystemMessage,
  CoreToolMessage
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fromKV, fromEnv, replaceMacros } from './utils';
import { googleNewsTool } from '../tools/google'; // Import tools individually

import { z } from 'zod';

const MAX_TOKENS = 128000;

export async function handleMessage(
  message: string,
  chatHistory: CoreMessage[],
  chat_id: number
) {
  const systemPromptTemplate = await fromKV('system_prompt') || `You are a helpful assistant in a Telegram chat. Respond to user queries and engage in conversation.`;

  const currentTime = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' });
  const currentDate = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
  const currentLocation = 'New York, NY'; // This should be dynamically set based on actual location data

  const systemPrompt = replaceMacros(systemPromptTemplate, {
    TIME: currentTime,
    DATE: currentDate,
    LOCATION: currentLocation,
  });

  const formattedMessages: CoreMessage[] = chatHistory.map((msg) => {
    if (msg.role === 'user') {
      return { role: 'user', content: msg.content } as CoreUserMessage;
    } else if (msg.role === 'system') {
      return { role: 'system', content: msg.content } as CoreSystemMessage;
    } else if (msg.role === 'assistant') {
      return { role: 'assistant', content: msg.content } as CoreAssistantMessage;
    } else if (msg.role === 'tool') {
      return { role: 'tool', content: msg.content } as CoreToolMessage;
    } else {
      throw new Error('Unknown role');
    }
  });

  const openai = createOpenAI({
    apiKey: fromEnv('OPENAI_API_KEY') as string,
    baseURL: 'https://gateway.ai.cloudflare.com/v1/26fadb0e7fb3b317bc68bd136f7e9329/my-gateway/openai',
  });

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: formattedMessages,
    maxTokens: 4096,
    tools: {
      googleNews: googleNewsTool,
    },
    toolChoice: 'auto',
    maxSteps: 10,
  });

  console.log('Message generated:', { text });

  return {
    text,
    updatedHistory: [...chatHistory, { role: 'assistant', content: text } as CoreMessage]
  };
}

function truncateHistory(history: CoreMessage[]): CoreMessage[] {
  return history;
}