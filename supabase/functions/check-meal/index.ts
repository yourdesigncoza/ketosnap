// Checks one meal for the signed-in user. The app builds the prompt; this adds the model settings and the
// OpenRouter key, which stays here as a project secret (OPENROUTER_KEY) and never reaches the phone.
const MODEL = 'google/gemini-3.8-flash';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // Only a signed-in user may spend the key. Sign-ups are off, so that is the one account.
  const who = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { Authorization: req.headers.get('Authorization') ?? '', apikey: req.headers.get('apikey') ?? '' },
  });
  if (!who.ok) return reply({ error: 'sign in first' }, 401);

  const { messages } = await req.json();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('OPENROUTER_KEY')}` },
    body: JSON.stringify({ model: MODEL, temperature: 0, response_format: { type: 'json_object' }, messages }),
  });
  if (!res.ok) return reply({ error: `model ${res.status}` }, 502);
  try {
    const data = await res.json();
    return reply(JSON.parse(data.choices[0].message.content));
  } catch {
    return reply({ error: 'the model gave no usable answer' }, 502);
  }
});
