import { getContext } from 'hono/context-storage';

type Env = {
  Bindings: {
    kv: KVNamespace;
  };
};

export const fromKV = async (key: string) => {
  return await getContext<Env>().env.kv.get(key);
};

interface TelegramResponse {
  ok: boolean;
  result?: {
    username: string;
  };
}

export async function getBotUsername(botToken: string): Promise<string> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const data: TelegramResponse = await response.json();
  
  if (data.ok && data.result && typeof data.result.username === 'string') {
    return data.result.username;
  }
  throw new Error('Failed to get bot username');
}