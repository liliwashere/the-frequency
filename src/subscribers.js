import { createClient } from '@supabase/supabase-js';

export async function getSubscribers() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from('subscribers')
    .select('id, email, timezone, last_emailed_issue, created_at')
    .order('created_at', { ascending: true })
    .limit(10000);

  if (error) throw new Error(`[subscribers] Supabase fetch failed: ${error.message}`);

  console.log(`[subscribers] Fetched ${data.length} subscriber(s)`);
  return data;
}
