/**
 * The Frequency — Schedule checker
 *
 * Reads schedule.json and decides whether publish.js should run right now.
 *
 * Modes:
 *   weekly   — one send per week on a specific day/time (e.g. Tuesday 09:00)
 *   campaign — burst window: every day between start/end at listed times
 *              e.g. { start:"2026-06-01", end:"2026-06-07", times:["09:00","13:00","19:00"] }
 *   once     — single future send; set active:true + datetime:"2026-06-15T09:00"
 *
 * All times are in the timezone configured in schedule.json (default: Europe/Lisbon).
 * GitHub Actions cron slots (08:00, 12:00, 18:00 UTC) map to 09:00, 13:00, 19:00 Lisbon.
 * Runs that don't match a slot exit 0 silently — nothing is generated or sent.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'schedule.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns local time parts (weekday, hour, minute, YYYY-MM-DD) in a given timezone. */
function localParts(date, timezone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  return {
    weekday: parts.weekday.toLowerCase(),          // 'tuesday'
    hour:    parseInt(parts.hour,   10),           // 9
    minute:  parseInt(parts.minute, 10),           // 0
    date:    `${parts.year}-${parts.month}-${parts.day}`, // '2026-05-23'
  };
}

/** True if local time is within ±windowMin of the target "HH:MM" string. */
function withinWindow(parts, timeStr, windowMin = 35) {
  const [h, m] = timeStr.split(':').map(Number);
  const slot = h * 60 + m;
  const now  = parts.hour * 60 + parts.minute;
  return Math.abs(now - slot) <= windowMin;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Returns true if publish.js should run right now.
 * Call this at the very top of main() before doing any work.
 */
export function shouldPublishNow(overrideDate = null) {
  let config;
  try {
    config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    console.warn('[scheduler] schedule.json not found or invalid — defaulting to run');
    return true;
  }

  const now = overrideDate ?? new Date();
  const tz  = config.timezone || 'Europe/Lisbon';
  const loc  = localParts(now, tz);

  console.log(`[scheduler] mode=${config.mode} | local=${loc.weekday} ${String(loc.hour).padStart(2,'0')}:${String(loc.minute).padStart(2,'0')} (${tz})`);

  // workflow_dispatch is a manual trigger. By default it still only runs on
  // the configured publish day — accidental manual runs on the wrong day
  // (e.g. a Monday) must not fully publish + email subscribers. Set
  // CONFIRM_OFFDAY_SEND=true (workflow input) for an intentional catch-up
  // send on a non-publish day.
  if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    const confirmed = process.env.CONFIRM_OFFDAY_SEND === 'true';
    const publishDay = config.mode === 'weekly' ? config.weekly.day.toLowerCase() : 'tuesday';
    if (loc.weekday !== publishDay && !confirmed) {
      console.log(`[scheduler] workflow_dispatch on ${loc.weekday}, publish day is ${publishDay} — skipping. Re-run with "Confirm off-day send" checked to override.`);
      return false;
    }
    if (loc.weekday !== publishDay) {
      console.log(`[scheduler] workflow_dispatch on ${loc.weekday} with confirm_offday_send=true — running anyway (catch-up send).`);
    } else {
      console.log('[scheduler] workflow_dispatch on publish day — running.');
    }
    return true;
  }

  // ── weekly ────────────────────────────────────────────────────────────────
  if (config.mode === 'weekly') {
    const { day } = config.weekly;
    // For scheduled runs we check only the weekday, NOT the clock time.
    // GitHub Actions schedule is unreliable and can fire hours late — a ±35min
    // window causes silent skips on publish day. The idempotency guard in
    // publish.js (alreadyPublishedToday) prevents double-sends if both cron
    // slots (08:00 + 10:00 UTC) fire on the same calendar day.
    const match = loc.weekday === day.toLowerCase();
    if (!match) console.log(`[scheduler] Skipping — today is ${loc.weekday}, publish day is ${day}`);
    else        console.log(`[scheduler] Correct publish day (${day}) — running`);
    return match;
  }

  // ── campaign ─────────────────────────────────────────────────────────────
  if (config.mode === 'campaign') {
    const { active, start, end, times } = config.campaign;
    if (!active) { console.log('[scheduler] Campaign mode inactive — skipping'); return false; }
    if (loc.date < start || loc.date > end) {
      console.log(`[scheduler] Outside campaign window (${start} → ${end}) — skipping`);
      return false;
    }
    const match = (times || []).some(t => withinWindow(loc, t));
    if (!match) console.log(`[scheduler] Campaign active but no time slot matches now`);
    return match;
  }

  // ── once ──────────────────────────────────────────────────────────────────
  if (config.mode === 'once') {
    const { active, datetime } = config.once;
    if (!active) { console.log('[scheduler] Once mode inactive — skipping'); return false; }
    const [datePart, timePart] = (datetime || '').split('T');
    const match = loc.date === datePart && withinWindow(loc, timePart);
    if (match) console.log('[scheduler] One-time send matched — will fire');
    else       console.log(`[scheduler] Once mode: waiting for ${datetime} ${tz}`);
    return match;
  }

  console.warn(`[scheduler] Unknown mode "${config.mode}" — skipping`);
  return false;
}

/**
 * Returns the subset of subscribers for whom it is currently 9am ± windowMin
 * in their stored timezone. Falls back to ALL subscribers if timezone data is
 * missing (graceful degradation during the migration window).
 *
 * Usage: in email.js, filter subscribers before sending.
 */
export function subscribersInCurrentWindow(subscribers, windowMin = 35) {
  const now = new Date();
  const withTz  = subscribers.filter(s => s.timezone);
  const withoutTz = subscribers.filter(s => !s.timezone);

  if (withTz.length === 0) {
    // No timezone data yet — send to everyone
    return subscribers;
  }

  const inWindow = withTz.filter(s => {
    try {
      const loc = localParts(now, s.timezone);
      return withinWindow(loc, '09:00', windowMin);
    } catch {
      return false; // unknown timezone string — skip this run, they'll get it next window
    }
  });

  // Always include subscribers without timezone data on the primary (first) send
  const primaryHour = localParts(now, 'Europe/Lisbon').hour;
  const isPrimaryWindow = primaryHour >= 8 && primaryHour <= 10;
  const extra = isPrimaryWindow ? withoutTz : [];

  return [...inWindow, ...extra];
}
