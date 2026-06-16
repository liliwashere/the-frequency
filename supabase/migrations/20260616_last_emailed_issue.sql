-- Migration: track per-subscriber issue delivery for timezone catch-up sends
-- Applied: 2026-06-16

-- NULL = never emailed. Set to the issue_number each time a subscriber
-- receives an issue, so later cron slots (other timezone windows) on the
-- same publish day don't re-send to subscribers already covered.
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS last_emailed_issue INTEGER DEFAULT NULL;
