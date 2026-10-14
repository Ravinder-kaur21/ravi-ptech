import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const nim = createOpenAICompatible({
    name: 'nim',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    headers: {
      Authorization: `Bearer ${process.env.NIM_API_KEY}`,
    },
  });

  const result = streamText({
    model: nim.chatModel('deepseek-ai/deepseek-v4.1-flash'),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
