// 1x1 transparent GIF
const PIXEL = Uint8Array.from(
  atob('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='),
  c => c.charCodeAt(0)
);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const issue = parseInt(url.searchParams.get('i') ?? '0', 10) || 0;

    // Record open in Supabase (fire-and-forget, never block the pixel)
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && issue) {
      fetch(`${env.SUPABASE_URL}/rest/v1/email_opens`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ issue_number: issue }),
      }).catch(() => {});
    }

    return new Response(PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
