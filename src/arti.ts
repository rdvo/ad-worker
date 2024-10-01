import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { fromKV } from './utils';

export async function generateArticle(prompt: string) {
  const systemPrompt = await fromKV('system_prompt') || 'You are a helpful assistant that generates articles based on a given prompt.';

  const response = await generateText({
    system: systemPrompt,
    model: openai("gpt-4o"),
    prompt: prompt,
  });
  return response.text;
}