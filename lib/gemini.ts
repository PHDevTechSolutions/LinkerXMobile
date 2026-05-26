const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const BASE    = 'https://generativelanguage.googleapis.com/v1beta';

// ─── Text generation (gemini-2.0-flash) ──────────────────────────────────────

export async function generatePostContent(prompt: string): Promise<string> {
  if (!API_KEY) throw new Error('Gemini API key not configured.');

  const res = await fetch(
    `${BASE}/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a social media content writer for LinkerX, a platform for creators and developers.
Write an engaging, concise social media post based on this idea: "${prompt}"
- Keep it under 200 characters
- Make it conversational and authentic
- No hashtags unless specifically requested
- Return only the post text, nothing else`,
          }],
        }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Gemini error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

export async function improvePostContent(text: string): Promise<string> {
  if (!API_KEY) throw new Error('Gemini API key not configured.');

  const res = await fetch(
    `${BASE}/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Improve this social media post to make it more engaging and clear. Keep the same meaning and tone. Return only the improved text, nothing else:\n\n"${text}"`,
          }],
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Gemini error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
}

// ─── Image generation (imagen-3.0-generate-002) ───────────────────────────────

export async function generateImage(prompt: string): Promise<string> {
  if (!API_KEY) throw new Error('Gemini API key not configured.');

  const res = await fetch(
    `${BASE}/models/imagen-3.0-generate-002:predict?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult',
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Imagen error ${res.status}`);
  }

  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('No image returned from Imagen.');

  // Return as a data URI
  return `data:image/png;base64,${b64}`;
}
