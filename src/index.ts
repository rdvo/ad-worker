import { Hono } from 'hono';
import { contextStorage, getContext } from 'hono/context-storage';
import { getBotUsername } from './utils';

type Env = {
  Bindings: {
    kv: KVNamespace;
  };
  Variables: {
    BOT_TOKEN: string;
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

app.post('/webhook', async (c) => {
  try {
    const update = await c.req.json();
    console.log('Received update:', update);

    if (update.message) {
      const chat_id = update.message.chat.id;

      if (update.message.new_chat_member || update.message.new_chat_members) {
        const newMember = update.message.new_chat_member || update.message.new_chat_members[0];
        console.log('New member joined:', newMember);

        if (newMember.id === parseInt(BOT_TOKEN.split(':')[0])) {
          console.log('The bot has joined the group.');
        }

        return c.text('OK');
      }

      const received_text = update.message.text;
      if (received_text) {
        const botUsername = await getBotUsername(BOT_TOKEN);
        const botMention = `@${botUsername}`;

        if (received_text.includes(botMention)) {
          console.log('Bot was mentioned');
          const cleanedText = received_text.replace(botMention, '').trim();
          // Remove article generation
          // await sendMessage(chat_id, `Received: ${cleanedText}`);
        } else {
          console.log('Bot was not mentioned, ignoring message');
        }
      }
    }
    return c.text('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    return c.text('Internal Server Error', 500);
  }
});

app.get('/', (c) => c.text('Hello, Telegram bot is running!'));

export default app;
