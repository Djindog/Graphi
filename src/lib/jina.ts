const JINA_API_KEY = import.meta.env.VITE_JINA_API_KEY as string;

export async function embedText(text: string): Promise<number[]> {
  const response = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v2-base-en',
      input: [text],
    }),
  });
  if (!response.ok) throw new Error(`Jina error: ${response.status}`);
  const data = await response.json();
  return data.data[0].embedding as number[];
}
