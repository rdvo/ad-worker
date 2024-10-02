import { tool } from 'ai';
import { z } from 'zod';
import { fromEnv } from '../src/utils'; // Import fromEnv utility
// import fetch from appropriate library if needed

export const googleNewsTool = tool({
  description: 'Fetches the latest news from Google based on the query.',
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    // Log a message when the tool is actually used
    console.log('Executing Google News Tool for query:', query);
    
    const url = 'https://google.serper.dev/news';
    const apiKey = fromEnv('SERPER_API_KEY') as string;
    const headers = {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    };
    const body = JSON.stringify({
      q: query,
      location: 'United Kingdom',
      gl: 'gb',
      num: 50,
      tbs: 'qdr:m',
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data);
      return data;
    } catch (error) {
      console.error('Error fetching Google News:', error);
      throw error;
    }
  },
});