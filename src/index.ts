import { Hono } from 'hono';
import { contextStorage, getContext } from 'hono/context-storage';
import { getBotUsername } from './utils';
import { handleMessage } from './arti';
import { CoreMessage } from "ai";

// Add this function at the top of the file, after the imports
function formatUserInfo(first_name: string, username: string): string {
  return `[${first_name}${username ? ` (@${username})` : ''}]`;
}

type Env = {
  Bindings: {
    kv: KVNamespace;
  };
  Variables: {
    BOT_TOKEN: string;
    OPENAI_API_KEY: string;
    TELEGRAM_API: string;
  };
};

const app = new Hono<Env>();

app.use(contextStorage());

const BOT_TOKEN = '7708406011:AAFDTeflES4ShKVd5zKoL_Qm1C5vqQAdkQM';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const fromKV = async (key: string) => {
  return await getContext<Env>().env.kv.get(key);
};

app.use('*', async (c, next) => {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN is not set.');
    return c.text('Internal Server Error: BOT_TOKEN not set.', 500);
  }
  c.set('BOT_TOKEN', BOT_TOKEN);
  c.set('TELEGRAM_API', TELEGRAM_API);
  await next();
});

async function sendMessage(chat_id: number, text: string) {
  const context = getContext<Env>();
  const TELEGRAM_API = context.var.TELEGRAM_API;
  const url = `${TELEGRAM_API}/sendMessage`;
  const payload = { chat_id, text };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error sending message:', errorText);
  }
}

async function getTelegramFileURL(file_id: string): Promise<string> {
  const context = getContext<Env>();
  const TELEGRAM_API = context.var.TELEGRAM_API;
  const url = `${TELEGRAM_API}/getFile?file_id=${file_id}`;
  const response = await fetch(url);
  const data: { result: { file_path: string } } = await response.json();
  return data.result.file_path;
}

async function saveChatHistory(chat_id: number, history: CoreMessage[]) {
  const context = getContext<Env>();
  const key = `chat_history_${chat_id}`;
  
  await context.env.kv.put(key, JSON.stringify(history));
}

async function getChatHistory(chat_id: number): Promise<CoreMessage[]> {
  const context = getContext<Env>();
  const key = `chat_history_${chat_id}`;
  const history: CoreMessage[] = await context.env.kv.get(key, 'json') || [];
  return history;
}

async function saveChatMessage(chat_id: number, message: any, first_name: string, username: string) {
  const context = getContext<Env>();
  const key = `chat_history_${chat_id}`;
  const existingHistory: CoreMessage[] = await context.env.kv.get(key, 'json') || [];
  const userInfo = formatUserInfo(first_name, username);
  const newMessage: CoreMessage = {
    role: 'user',
    content: `${userInfo} ${message.text}`,
  };
  existingHistory.push(newMessage);
  await context.env.kv.put(key, JSON.stringify(existingHistory));
}

app.post('/webhook', async (c) => {
  try {
    console.log('Webhook hit. Received update:');
    const update = await c.req.json();
    console.log(JSON.stringify(update, null, 2));

    if (update.message) {
      const chat_id = update.message.chat.id;
      const chat_type = update.message.chat.type;
      const first_name = update.message.from.first_name; // Extract first name
      const username = update.message.from.username; // Extract username
      
      console.log(`Received message in chat type: ${chat_type}`);

      // Save the message with user info
      await saveChatMessage(chat_id, update.message, first_name, username);

      const chatHistory = await getChatHistory(chat_id);

      if (chat_type === 'group' || chat_type === 'supergroup') {
        console.log('Message received in a group chat');
        
        // Handle new member joins
        if (update.message.new_chat_member || update.message.new_chat_members) {
          const newMember = update.message.new_chat_member || update.message.new_chat_members[0];
          console.log('New member joined:', newMember);

          if (newMember.id === parseInt(BOT_TOKEN.split(':')[0])) {
            console.log('The bot has joined the group.');
          }

          return c.text('OK');
        }

        // Handle text messages
        const received_text = update.message.text;
        if (received_text) {
          console.log(`Received text in group: ${received_text}`);
          const botUsername = await getBotUsername(BOT_TOKEN);
          const botMention = `@${botUsername}`;

          if (received_text.includes(botMention)) {
            console.log('Bot was mentioned in group');
            const cleanedText = received_text.replace(botMention, '').trim();
            const { text: response, updatedHistory } = await handleMessage(cleanedText, chatHistory, chat_id);
            await saveChatHistory(chat_id, updatedHistory);
            await sendMessage(chat_id, response);
          } else {
            console.log('Bot was not mentioned, message already saved to history');
          }
        }
      } else if (chat_type === 'private') {
        console.log('Message received in private chat');
        const received_text = update.message.text;
        if (received_text) {
          console.log(`Received text in private chat: ${received_text}`);
          const { text: response, updatedHistory } = await handleMessage(received_text, chatHistory, chat_id);
          await saveChatHistory(chat_id, updatedHistory);
          await sendMessage(chat_id, response);
        }
      }
    } else {
      console.log('Received update without message object:', update);
    }

    return c.text('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    return c.text('Internal Server Error', 500);
  }
});

app.get('/', (c) => c.text('Hello, Telegram bot is running!'));



export default app;