/**
 * The Frequency — Subscribe Worker
 * Accepts POST { email, name } → writes to Supabase subscribers table
 */

const ALLOWED_ORIGINS = [
  'https://thefrequency.lilitarutyunyan.com',
  'https://the-frequency.pages.dev',
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, origin);
    }

    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim().slice(0, 100);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email' }, 400, origin);
    }

    // Write to Supabase
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({ email, name }),
    });

    if (!res.ok && res.status !== 409) {
      const text = await res.text();
      console.error('Supabase error:', res.status, text);
      return json({ error: 'Failed to subscribe — try again.' }, 500, origin);
    }

    return json({ ok: true }, 200, origin);
  },
};
