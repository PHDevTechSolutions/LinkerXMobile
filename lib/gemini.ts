/**
 * AI text generation using Groq API (free tier: 14,400 req/day)
 * Model: llama-3.1-8b-instant — fast, capable, generous free quota
 * Get your free key at: console.groq.com
 *
 * Image generation: uses Pollinations.ai (completely free, no key needed)
 */

const GROQ_KEY  = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODEL     = 'llama-3.1-8b-instant';

async function callGroq(systemPrompt: string, userPrompt: string, temperature = 0.9): Promise<string> {
  if (!GROQ_KEY || GROQ_KEY === 'YOUR_GROQ_API_KEY_HERE') {
    throw new Error('Groq API key not configured. Get a free key at console.groq.com');
  }

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    const msg = err.error?.message || `Groq error ${res.status}`;
    console.error('[Groq Error]', JSON.stringify(err));
    throw new Error(msg);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ─── Text generation ──────────────────────────────────────────────────────────

export async function generatePostContent(prompt: string): Promise<string> {
  return callGroq(
    'You are a social media content writer for LinkerX, a platform for creators and developers. Write engaging, concise posts. Return only the post text, nothing else — no quotes, no labels.',
    `Write an engaging social media post based on this idea: "${prompt}". Keep it under 200 characters, conversational and authentic.`,
    0.9
  );
}

export async function improvePostContent(text: string): Promise<string> {
  return callGroq(
    'You are a social media editor. Improve posts to be more engaging while keeping the same meaning and tone. Return only the improved text, nothing else.',
    `Improve this post: "${text}"`,
    0.7
  );
}

// ─── Image generation (Pollinations.ai — completely free, no key needed) ──────

export async function generateImage(prompt: string): Promise<string> {
  // Pollinations.ai generates images for free via URL — no API key, no billing
  const encoded = encodeURIComponent(prompt);
  const seed    = Math.floor(Math.random() * 999999);
  const url     = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&enhance=true`;

  // Fetch the image and convert to base64 data URI for local use
  const res = await fetch(url);
  if (!res.ok) throw new Error('Image generation failed. Try a different prompt.');

  const blob   = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror  = () => reject(new Error('Failed to process generated image.'));
    reader.readAsDataURL(blob);
  });
}
