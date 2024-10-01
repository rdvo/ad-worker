// worker.ts

import { Hono } from 'hono';
import type { Context } from 'hono';

// Define types for the variables stored in the context
type MyVariables = {
  BOT_TOKEN: string;
  TELEGRAM_API: string;
};

// Create a new Hono app instance with typed variables
const app = new Hono<{ Variables: MyVariables }>();

// Store the BOT_TOKEN and API_KEY securely
const BOT_TOKEN = '7708406011:AAFDTeflES4ShKVd5zKoL_Qm1C5vqQAdkQM';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Middleware to set up environment variables
app.use('*', async (c, next) => {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN is not set.');
    return c.text('Internal Server Error: BOT_TOKEN not set.', 500);
  }
  c.set('BOT_TOKEN', BOT_TOKEN);
  c.set('TELEGRAM_API', TELEGRAM_API);
  await next();
});

// Function to send messages via Telegram API
async function sendMessage(chat_id: number, text: string, c: Context<{ Variables: MyVariables }>) {
  const TELEGRAM_API = c.get('TELEGRAM_API');
  const url = `${TELEGRAM_API}/sendMessage`;
  const payload = {
    chat_id,
    text,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error sending message:', errorText);
  }
}

// Endpoint to handle incoming Telegram updates
app.post('/webhook', async (c) => {
  try {
    const update = await c.req.json();
    console.log('Received update:', update);

    if (update.message) {
      const chat_id = update.message.chat.id;

      // Check if the message is a new chat member joining
      if (update.message.new_chat_member || update.message.new_chat_members) {
        const newMember = update.message.new_chat_member || update.message.new_chat_members[0];
        console.log('New member joined:', newMember);

        // Check if the new member is the bot itself
        if (newMember.id === parseInt(BOT_TOKEN.split(':')[0])) {
          console.log('The bot has joined the group.');
        }

        return c.text('OK');
      }

      const received_text = update.message.text;

      // Prepare a response based on the received message
      // const response_text = `You said: ${received_text}`;

      // Send the response back to the user
      // await sendMessage(chat_id, response_text, c);
    }
    return c.text('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    return c.text('Internal Server Error', 500);
  }
});

// Default route for testing
app.get('/', (c) => c.text('Hello, Telegram bot is running!'));

// Export the app as default
export default app;
