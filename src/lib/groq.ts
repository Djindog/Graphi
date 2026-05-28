import Groq from 'groq-sdk';
import type { Node } from '../types';

export function makeGroqClient(apiKey: string) {
  return new Groq({ apiKey, dangerouslyAllowBrowser: true });
}

// Fallback singleton used only during dev with env key (no-op in prod when key comes from DB)
export const groqClient = makeGroqClient(import.meta.env.VITE_GROQ_API_KEY as string ?? '');

export async function generateTitle(userMessage: string, assistantResponse: string, client = groqClient): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'You generate short thread titles. Reply with ONLY the title — 2 to 4 words, no punctuation, no quotes, no explanation.',
        },
        {
          role: 'user',
          content: `Title this thread based on what the user is asking about. The user message matters most.\n\n
          User message: ${userMessage}\n\n
          Assistant reply (context only): ${assistantResponse.slice(0, 150)}\n\n
          Good title examples: "Fix Auth Bug", "Explain Merge Sort", "Refactor DB Schema"\n
          Bad examples: "Question", "Chat", "User Message"\n\n
          Title:`,
        },
      ],
      max_tokens: 20,
    });
    return response.choices[0].message.content?.trim() || userMessage.slice(0, 50);
  } catch {
    return userMessage.slice(0, 50);
  }
}

export async function detectReferences(message: string, nodes: Node[], client = groqClient): Promise<string[]> {
  if (!nodes.length || !message.trim()) return [];
  const nodeList = nodes
    .map(n => `${n.id}: "${n.title || n.content?.substring(0, 40) || 'untitled'}"`)
    .join('\n');
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'Extract node IDs the user explicitly references or mentions in their message. Return JSON only: {"referencedNodeIds": []}. If none, return {"referencedNodeIds": []}.',
        },
        {
          role: 'user',
          content: `Project nodes:\n${nodeList}\n\nUser message: "${message}"`,
        },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    return (parsed.referencedNodeIds || []).filter((id: string) =>
      nodes.some(n => n.id === id)
    );
  } catch {
    return [];
  }
}
