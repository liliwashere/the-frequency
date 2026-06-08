/**
 * One-off: advance newsletter_state.updated_at to 2026-06-09 so Tuesday's
 * scheduled cron sees "already published today" and exits without sending.
 *
 * Issue #5 went out Monday June 8 by accident. This prevents a second issue
 * going out the very next day. Issue #6 will still publish on June 16.
 *
 * Run once:
 *   node --env-file=.env skip-tuesday-send.js
 */

import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SKIP_DATE = '2026-06-09T09:00:00.000Z'; // Tuesday Lisbon 09:00 = UTC 08:00

const { data, error } = await supabase
  .from('newsletter_state')
  .update({ updated_at: SKIP_DATE })
  .eq('key', 'issue_number')
  .select();

if (error) {
  console.error('[skip-tuesday] Failed:', error.message);
  process.exit(1);
}

console.log('[skip-tuesday] Done. newsletter_state.updated_at set to', SKIP_DATE);
console.log('[skip-tuesday] Tomorrow\'s cron will exit: "Issue already published today"');
console.log('[skip-tuesday] Issue #6 will publish on Tuesday June 16 as normal.');
console.log(data);
