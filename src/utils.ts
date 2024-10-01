import { getContext } from 'hono/context-storage';

type Env = {
  Bindings: {
    kv: KVNamespace;
  };
};

export const fromKV = async (key: string) => {
  return await getContext<Env>().env.kv.get(key);
};

export async function getBotUsername(botToken: string): Promise<string> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const data = await response.json();
  if (data.ok) {
    return data.result.username;
  }
  throw new Error('Failed to get bot username');
}