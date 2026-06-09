import { supabase } from './supabase';
import type Groq from 'groq-sdk';

type GroqClient = InstanceType<typeof Groq>;

/**
 * Generate an initial summary from scratch (2-3 sentences).
 * Used when summary is null/empty.
 */
export async function generateInitialSummary(
  response: string,
  client: GroqClient | null | undefined
): Promise<string> {
  if (!client) return '';
  if (!response.trim()) return '';

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following response in 2-3 concise sentences (max 25 words total). Capture the key points. Be factual. Do not include quotes.',
        },
        {
          role: 'user',
          content: response,
        },
      ],
      max_tokens: 80,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || '';
    return summary.replace(/^["']|["']$/g, ''); // Remove quotes if present
  } catch (err) {
    console.error('Failed to generate initial summary:', err);
    return '';
  }
}

/**
 * Extract a one-sentence summary from the LLM response.
 * Used when appending to an existing summary.
 */
export async function extractSummary(
  response: string,
  client: GroqClient | null | undefined
): Promise<string> {
  if (!client) return '';
  if (!response.trim()) return '';

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Extract the core point of the following response in a single sentence (max 15 words). Be concise and factual. Do not include quotes.',
        },
        {
          role: 'user',
          content: response,
        },
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || '';
    return summary.replace(/^["']|["']$/g, ''); // Remove quotes if present
  } catch (err) {
    console.error('Failed to extract summary:', err);
    return '';
  }
}

/**
 * Append a new sentence to the summary.
 */
export function appendSummary(currentSummary: string, newSentence: string): string {
  if (!newSentence.trim()) return currentSummary;
  if (!currentSummary.trim()) return newSentence;
  return `${currentSummary}\n${newSentence}`;
}

/**
 * Count sentences in a string (split by . ! ?)
 */
function countSentences(text: string): number {
  if (!text.trim()) return 0;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.length;
}

/**
 * Get sentences from a summary string.
 */
function getSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.endsWith('.') ? s : s + '.');
}

/**
 * Compact summary: when it reaches 6 sentences, compress last 4 into 2.
 * Keeps first 2 sentences anchored.
 * Example: [S1. S2. S3. S4. S5. S6.] -> [S1. S2. (compressed summary of 3-6)]
 */
export async function compactSummary(
  summary: string,
  client: GroqClient | null | undefined
): Promise<string> {
  const sentences = getSentences(summary);
  if (sentences.length < 6) return summary;

  const firstTwo = sentences.slice(0, 2);
  const toCompress = sentences.slice(2); // Last 4+ sentences

  if (!client) {
    // Fallback: just keep first 2
    return firstTwo.join(' ');
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'Compress the following sentences into 2 concise sentences (max 12 words each) that capture the key points. Be factual and concise. Do not use quotes.',
        },
        {
          role: 'user',
          content: toCompress.join(' '),
        },
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const compressedText = completion.choices[0]?.message?.content?.trim() || '';
    const compressedSentences = getSentences(compressedText);

    // Keep first 2, add up to 2 compressed
    const final = [...firstTwo, ...compressedSentences.slice(0, 2)];
    return final.join(' ');
  } catch (err) {
    console.error('Failed to compact summary:', err);
    return summary;
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

/**
 * Process summary: generate/extract, append, and queue compaction.
 * Returns the updated summary string (but doesn't wait for compaction).
 */
export async function processSummary(
  nodeId: string,
  response: string,
  currentSummary: string,
  client: GroqClient | null | undefined
): Promise<string> {
  console.log(`[SUMMARY] Processing for node ${nodeId}, current: "${currentSummary?.substring(0, 50) || '(empty)'}..."`);

  let updated: string;

  // If no summary exists, generate one from scratch
  if (!currentSummary || !currentSummary.trim()) {
    console.log(`[SUMMARY] No summary exists, generating initial...`);
    const generated = await generateInitialSummary(response, client);
    console.log(`[SUMMARY] Generated: "${generated?.substring(0, 50) || '(empty)'}..."`);
    if (!generated) {
      console.log(`[SUMMARY] Generation failed, returning empty`);
      return currentSummary;
    }
    updated = generated;
  } else {
    // Summary exists, extract and append one sentence
    console.log(`[SUMMARY] Summary exists, extracting and appending...`);
    const extracted = await extractSummary(response, client);
    console.log(`[SUMMARY] Extracted: "${extracted?.substring(0, 50) || '(empty)'}..."`);
    if (!extracted) {
      console.log(`[SUMMARY] Extraction failed, returning current`);
      return currentSummary;
    }
    updated = appendSummary(currentSummary, extracted);
  }

  console.log(`[SUMMARY] Updated summary: "${updated?.substring(0, 50) || '(empty)'}..."`);

  // Check if we need to compact
  const sentenceCount = countSentences(updated);
  console.log(`[SUMMARY] Sentence count: ${sentenceCount}`);

  if (sentenceCount >= 6) {
    // Compact in background (don't await)
    console.log(`[SUMMARY] Queueing background compaction...`);
    compactSummary(updated, client)
      .then(compacted => {
        console.log(`[SUMMARY] Compaction done, saving: "${compacted?.substring(0, 50) || '(empty)'}..."`);
        return updateNodeSummary(nodeId, compacted);
      })
      .catch(err => console.error('[SUMMARY] Background compaction failed:', err));
  } else {
    // No compaction needed, update now
    console.log(`[SUMMARY] Saving summary immediately...`);
    await updateNodeSummary(nodeId, updated);
    console.log(`[SUMMARY] Summary saved!`);
  }

  return updated;
}
