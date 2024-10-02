import { tool } from 'ai';
import { z } from 'zod';
import { fromEnv } from '../src/utils';

// Define types for the API responses
interface SubmitResponse {
  request_id: string;
}

interface StatusResponse {
  status: string;
}

interface ResultResponse {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  seed: number;
  prompt: string;
  timings: Record<string, unknown>;
  has_nsfw_concepts: boolean[];
}

export const fluxImageGenerationTool = tool({
  description: 'Generate AI images using the FLUX.1 Pro text-to-image model.',
  parameters: z.object({
    prompt: z.string(),
    image_size: z.enum(['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9']).optional(),
  }),
  execute: async ({ prompt, image_size = 'landscape_4_3' }) => {
    console.log('Executing Flux Image Generation Tool for prompt:', prompt);

    const url = 'https://queue.fal.run/fal-ai/flux-pro';
    const apiKey = fromEnv('FAL_KEY') as string;
    const headers = {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    };
    const body = JSON.stringify({
      prompt,
      image_size,
      num_images: 1,
      // Hard-coded values
      safety_tolerance: '6',
      num_inference_steps: 28,
      guidance_scale: 3.5
    });

    try {
      const submitResponse = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      if (!submitResponse.ok) {
        throw new Error(`HTTP error! status: ${submitResponse.status}`);
      }

      const submitData = await submitResponse.json() as SubmitResponse;
      const requestId = submitData.request_id;

      // Poll for the result
      let result: ResultResponse;
      while (true) {
        const statusResponse = await fetch(`${url}/requests/${requestId}/status`, {
          method: 'GET',
          headers: headers,
        });

        if (!statusResponse.ok) {
          throw new Error(`HTTP error! status: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json() as StatusResponse;
        if (statusData.status === 'completed') {
          const resultResponse = await fetch(`${url}/requests/${requestId}`, {
            method: 'GET',
            headers: headers,
          });

          if (!resultResponse.ok) {
            throw new Error(`HTTP error! status: ${resultResponse.status}`);
          }

          result = await resultResponse.json() as ResultResponse;
          break;
        }

        // Wait for 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('Flux Image Generation result:', result);
      // Return the image URL
      if (result.images && result.images.length > 0 && result.images[0].url) {
        return { imageUrl: result.images[0].url };
      } else {
        throw new Error('No image URL found in the result');
      }
    } catch (error) {
      console.error('Error generating image with Flux:', error);
      throw error;
    }
  },
});
