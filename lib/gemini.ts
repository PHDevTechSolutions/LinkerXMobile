/**
 * AI utilities for LinkerX
 *
 * Text generation : Groq API (llama-3.1-8b-instant) — free, 14,400 req/day
 * Image generation: Stability AI (Stable Diffusion) — free credits included
 */

const GROQ_KEY       = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const STABILITY_KEY  = process.env.EXPO_PUBLIC_STABILITY_API_KEY;

const GROQ_BASE      = 'https://api.groq.com/openai/v1';
const STABILITY_BASE = 'https://api.stability.ai/v2beta/stable-image/generate/core';
const MODEL          = 'llama-3.1-8b-instant';

// ─── Groq text generation ─────────────────────────────────────────────────────

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

export async function generatePostContent(prompt: string): Promise<string> {
  return callGroq(
    'You are a social media content writer for LinkerX, a platform for creators and developers. Write engaging, concise posts. Return only the post text — no quotes, no labels, no extra explanation.',
    `Write an engaging social media post based on this idea: "${prompt}". Keep it under 200 characters, conversational and authentic.`,
    0.9
  );
}

export async function improvePostContent(text: string): Promise<string> {
  return callGroq(
    'You are a social media editor. Improve posts to be more engaging while keeping the same meaning and tone. Return only the improved text — no quotes, no labels, no extra explanation.',
    `Improve this social media post: "${text}"`,
    0.7
  );
}

// ─── Stability AI image generation ───────────────────────────────────────────

export async function generateImage(prompt: string): Promise<string> {
  if (!STABILITY_KEY) {
    throw new Error('Stability AI key not configured.');
  }

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('output_format', 'png');
  formData.append('aspect_ratio', '1:1');

  const res = await fetch(STABILITY_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STABILITY_KEY}`,
      'Accept': 'image/*',
    },
    body: formData,
  });

  if (!res.ok) {
    let msg = `Stability AI error ${res.status}`;
    try {
      const err = await res.json();
      msg = err.errors?.[0] || err.message || msg;
    } catch (_) {}
    console.error('[Stability Error]', msg);
    throw new Error(msg);
  }

  // Response is raw image bytes — convert to base64 data URI
  const blob   = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror  = () => reject(new Error('Failed to process generated image.'));
    reader.readAsDataURL(blob);
  });
}
