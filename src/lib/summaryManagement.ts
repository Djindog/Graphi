import { supabase } from './supabase';
import type Groq from 'groq-sdk';
import type { Message } from '../types';

type GroqClient = InstanceType<typeof Groq>;

/**
 * Generate a summary sentence from node messages.
 */
export async function generateSummaryText(
  messages: Message[],
  client: GroqClient | null | undefined
): Promise<string> {
  if (!client || messages.length === 0) return '';

  try {
    const messagesText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Summarize this conversation in 3-4 sentences (max 60 words). Be concise and capture the main point. Output ONLY the summary, nothing else.',
        },
        {
          role: 'user',
          content: messagesText,
        },
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || '';
    return summary.replace(/^["']|["']$/g, '');
  } catch (err) {
    console.error('Failed to generate summary text:', err);
    return '';
  }
}

/**
 * Extract topic keywords from a summary text and node title.
 */
export async function generateNodeSummary(
  summaryText: string,
  client: GroqClient | null | undefined,
  nodeTitle?: string | null
): Promise<string> {
  if (!client || !summaryText.trim()) return '';

  try {
    const titleContext = nodeTitle ? `Node title: "${nodeTitle}"\n\n` : '';

    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Extract 2-4 core topics from this summary that directly relate to the node title. Each topic should be specific, actionable, and concrete.\
\nFocus on: main subjects discussed, specific problems or questions, key decisions or insights, concrete examples or techniques mentioned.\
\nGood examples: Recurrent Neural Networks, Explain Merge Sort, Donald Norman, Neilsen\'s 10 Principles, Improve Type Safety, Handle Null Cases\
\nBad examples: Help, User, Discussion, Question, Chat\
\nList as comma-separated items in decreasing order of importance (2-4 words each). Capitalize first letter. Output ONLY the topics, nothing else.',
        },
        {
          role: 'user',
          content: titleContext + `Summary: ${summaryText}`,
        },
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const topics = completion.choices[0]?.message?.content?.trim() || '';
    return topics.replace(/^["']|["']$/g, '');
  } catch (err) {
    console.error('Failed to generate node topics:', err);
    return '';
  }
}

/**
 * Update node summary in database.
 */
export async function updateNodeSummary(nodeId: string, summary: string): Promise<void> {
  try {
    await supabase
      .from('nodes')
      .update({ summary })
      .eq('id', nodeId);
  } catch (err) {
    console.error('Failed to update node summary:', err);
  }
}
