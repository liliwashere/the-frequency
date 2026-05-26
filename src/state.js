import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function getIssueNumber() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('newsletter_state')
    .select('value')
    .eq('key', 'issue_number')
    .single();

  if (error) throw new Error(`[state] Failed to read issue_number: ${error.message}`);
  return parseInt(data.value, 10);
}

export async function saveIssueNumber(n) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('newsletter_state')
    .upsert({ key: 'issue_number', value: String(n), updated_at: new Date().toISOString() });

  if (error) throw new Error(`[state] Failed to save issue_number: ${error.message}`);
}

/**
 * Returns true if an issue was already published today (UTC).
 * Used to make the pipeline idempotent when cron fires twice (e.g. primary + retry).
 */
export async function alreadyPublishedToday() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('newsletter_state')
    .select('value, updated_at')
    .eq('key', 'issue_number')
    .single();

  if (error || !data?.updated_at) return false;

  const updatedDate = new Date(data.updated_at).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  return updatedDate === today;
}

export async function getSeenUrls() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('seen_urls')
    .select('url');

  if (error) throw new Error(`[state] Failed to read seen_urls: ${error.message}`);
  return data.map(row => row.url);
}

export async function appendSeenUrls(urls, issueNumber) {
  if (!urls.length) return;
  const supabase = getSupabase();
  const rows = urls.map(url => ({
    url,
    issue_number: issueNumber,
    added_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('seen_urls')
    .upsert(rows, { onConflict: 'url' });

  if (error) throw new Error(`[state] Failed to append seen_urls: ${error.message}`);
}
