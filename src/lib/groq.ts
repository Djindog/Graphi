import Groq from 'groq-sdk';
import type { Node } from '../types';

type GroqClient = InstanceType<typeof Groq>;

export function makeGroqClient(apiKey: string) {
  return new Groq({ apiKey, dangerouslyAllowBrowser: true });
}

// Fallback singleton used only during dev with env key (no-op in prod when key comes from DB)
export const groqClient = makeGroqClient(import.meta.env.VITE_GROQ_API_KEY as string ?? '');

export async function generateTitle(userMessage: string, assistantResponse: string, client: GroqClient | null | undefined = groqClient): Promise<string> {
  if (!client) return userMessage.slice(0, 50);
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
          Bad examples: "Question", "Chat", "User Message", "is deadlifting good for muscle growth"\n\n
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

export async function detectReferences(message: string, nodes: Node[], client: GroqClient | null | undefined = groqClient): Promise<string[]> {
  if (!client || !nodes.length || !message.trim()) return [];
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

export async function detectReferencesAndDrift(
  message: string,
  projectNodes: Node[],
  currentNodeSummary: string,
  currentNodeId: string | null | undefined,
  client: GroqClient | null | undefined = groqClient
): Promise<{ referencedNodeIds: string[]; driftDetected: boolean; suggestedNodeId: string | null }> {
  if (!client || !message.trim()) {
    return { referencedNodeIds: [], driftDetected: false, suggestedNodeId: null };
  }

  // Only include other nodes in the list (exclude current node)
  const otherNodes = projectNodes.filter(n => n.id !== currentNodeId);
  const nodeList = otherNodes
    .map(n => `${n.id}: "${n.title || n.content?.substring(0, 40) || 'untitled'}"`)
    .join('\n');

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a context analyzer. Analyze the user message and current node context.

IMPORTANT: Default to staying in the current node unless there is CLEAR, DEFINITIVE topic divergence.

1. Extract node IDs explicitly referenced or mentioned in the message.
2. Determine if the message represents a SUBSTANTIAL topic shift AWAY from the current node.
   - Elaborating on ideas, asking follow-ups, providing details, or building on current topic = NO drift
   - Shifting to a completely different subject = drift
   - Only flag drift if the topic change is unmistakable and intentional

3. Only suggest a move if drift is detected AND a more appropriate node exists.

Return JSON only: {
  "referencedNodeIds": ["id1", "id2"],
  "driftDetected": boolean,
  "suggestedNodeId": "id" or null
}

- If no drift detected, set both driftDetected=false and suggestedNodeId=null
- If drift detected but no suitable node exists, set suggestedNodeId=null (user should branch new)
- When in doubt, assume the user is continuing the current conversation and set driftDetected=false`,
        },
        {
          role: 'user',
          content: `Project nodes (other than current):
${nodeList || '(none)'}

Current node summary: "${currentNodeSummary || '(empty)'}"

User message: "${message}"

Based on the current node summary and available nodes, does this message drift from the current topic? If so, which node would be most appropriate?`,
        },
      ],
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    const referencedIds = (parsed.referencedNodeIds || []).filter((id: string) =>
      projectNodes.some(n => n.id === id)
    );
    const suggestedId = parsed.suggestedNodeId && projectNodes.some(n => n.id === parsed.suggestedNodeId) && parsed.suggestedNodeId !== currentNodeId
      ? parsed.suggestedNodeId
      : null;

    return {
      referencedNodeIds: referencedIds,
      driftDetected: Boolean(parsed.driftDetected),
      suggestedNodeId: suggestedId,
    };
  } catch {
    return { referencedNodeIds: [], driftDetected: false, suggestedNodeId: null };
  }
}
