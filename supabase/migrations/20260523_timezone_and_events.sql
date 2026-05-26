-- Migration: timezone-aware sending + email events table
-- Applied: 2026-05-23

-- 1. Add timezone column to subscribers (NULL = unknown, falls back to Europe/Lisbon window)
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT NULL;

-- 2. Add subscriber_id to email_opens for per-subscriber open tracking
ALTER TABLE email_opens
  ADD COLUMN IF NOT EXISTS subscriber_id UUID DEFAULT NULL;

-- 3. Create unified email_events table for delivered/opened/clicked/bounced/spam
--    Populated by:
--      - tracking-worker open pixel  → event_type = 'opened'
--      - tracking-worker /webhook    → event_type = 'delivered' | 'clicked' | 'bounced' | 'spam'
CREATE TABLE IF NOT EXISTS email_events (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_number   INTEGER,
  subscriber_id  UUID,
  email          TEXT,
  event_type     TEXT        NOT NULL,  -- 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam'
  url            TEXT,                  -- populated for click events
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index for dashboard queries: "show me all events for issue N"
CREATE INDEX IF NOT EXISTS idx_email_events_issue
  ON email_events (issue_number);

-- Index for per-subscriber history
CREATE INDEX IF NOT EXISTS idx_email_events_subscriber
  ON email_events (subscriber_id);
