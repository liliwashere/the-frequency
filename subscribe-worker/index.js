/**
 * The Frequency — Subscribe Worker
 * Accepts POST { email } → writes to Supabase + sends Resend confirmation
 */

const ALLOWED_ORIGINS = [
  'https://thefrequency.lilitarutyunyan.com',
  'https://the-frequency.pages.dev',
];

const SITE_URL = 'https://thefrequency.lilitarutyunyan.com';
const FROM_EMAIL = 'The Frequency <hello@lilitarutyunyan.com>';

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

function confirmationHtml(email) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>You're subscribed to The Frequency</title>
</head>
<body style="margin:0;padding:0;background:#f7f6f3;font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f6f3">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e5df;">

<!-- Header -->
<tr>
  <td style="background:linear-gradient(135deg,#6c47ff,#a855f7);padding:36px 36px 32px;">
    <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);">The Frequency</p>
    <p style="margin:0 0 8px;font-size:26px;font-weight:900;color:#ffffff;line-height:1.2;">You're in.</p>
    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.85);line-height:1.5;">Next issue arrives Tuesday morning — original AI thinking, real builders, zero hype.</p>
  </td>
</tr>

<!-- Body -->
<tr>
  <td style="padding:32px 36px 24px;">
    <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">While you wait, catch up on what you missed:</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-bottom:12px;">
          <a href="${SITE_URL}/issue-2" style="display:block;background:#f7f6f3;border:1px solid #e8e5df;border-radius:10px;padding:16px 20px;text-decoration:none;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6c47ff;">Issue #2 · May 23</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.35;">Infrastructure reality check — Railway's outage &amp; where agent memory lives</p>
          </a>
        </td>
      </tr>
      <tr>
        <td>
          <a href="${SITE_URL}/issue-1" style="display:block;background:#f7f6f3;border:1px solid #e8e5df;border-radius:10px;padding:16px 20px;text-decoration:none;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6c47ff;">Issue #1 · May 14</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.35;">Software 3.0 — the launch issue</p>
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- CTA -->
<tr>
  <td style="padding:0 36px 32px;text-align:center;">
    <a href="${SITE_URL}" style="display:inline-block;background:#6c47ff;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 28px;font-size:14px;font-weight:700;">Read the latest issue →</a>
  </td>
</tr>

<!-- Footer -->
<tr>
  <td style="padding:20px 36px 28px;border-top:1px solid #e8e5df;text-align:center;">
    <p style="margin:0;font-size:12px;color:#bbb;line-height:1.6;">You subscribed with ${email}. This is a one-time confirmation — you'll only hear from us on issue days.<br />To unsubscribe, reply with "unsubscribe" or email <a href="mailto:hello@lilitarutyunyan.com" style="color:#6c47ff;">hello@lilitarutyunyan.com</a>.</p>
  </td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
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

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email' }, 400, origin);
    }

    // Cloudflare auto-detects visitor timezone — no GeoIP lookup needed
    const timezone = request.cf?.timezone || null;

    // Write to Supabase
    const supaRes = await fetch(`${env.SUPABASE_URL}/rest/v1/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({ email, ...(timezone ? { timezone } : {}) }),
    });

    if (!supaRes.ok && supaRes.status !== 409) {
      const text = await supaRes.text();
      console.error('Supabase error:', supaRes.status, text);
      return json({ error: 'Failed to subscribe — try again.' }, 500, origin);
    }

    const alreadySubscribed = supaRes.status === 409;

    // Send confirmation via Resend (skip if already subscribed)
    if (!alreadySubscribed && env.RESEND_API_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: "You're subscribed to The Frequency",
          html: confirmationHtml(email),
        }),
      });

      if (!emailRes.ok) {
        // Log but don't fail the request — subscription was saved
        const errText = await emailRes.text();
        console.error('Resend confirmation failed:', emailRes.status, errText);
      }
    }

    return json({ ok: true }, 200, origin);
  },
};
