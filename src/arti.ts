import { generateText, CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { fromKV } from './utils';
import { getContext } from 'hono/context-storage';

type Env = {
  Bindings: {
    kv: KVNamespace;
  };
};

export async function handleMessage(message: string, chatHistory: CoreMessage[], chat_id: number) {
  const systemPrompt = await fromKV('system_prompt') || 'You are a helpful assistant in a Telegram chat. Respond to user queries and engage in conversation.';

  const { text, responseMessages } = await generateText({
    model: openai("gpt-4"),
    system: systemPrompt,
    messages: [
      ...chatHistory,
      { role: 'user', content: message }
    ],
    maxTokens: 8000,
  });

  // Save the new messages to the chat history
  await saveChatHistory(chat_id, { role: 'user', content: message });
  await saveChatHistory(chat_id, { role: 'assistant', content: text });

  console.log('Message generated:', { text });

  return text;
}

async function saveChatHistory(chat_id: number, message: CoreMessage) {
  const context = getContext<Env>();
  const key = `chat_history_${chat_id}`;
  const existingHistory = await context.env.kv.get(key, 'json') || [];
  existingHistory.push(message);
  await context.env.kv.put(key, JSON.stringify(existingHistory));
}