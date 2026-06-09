# The Frequency — Lessons Learned

> Running record of what broke, why, and what changed. Every incident ends with a permanent rule.

---

## Incident 1 — Gmail OAuth2 token expiry (May 2026)

**What broke:** Pipeline crashed on every Tuesday send with `invalid_grant`. No emails sent for Issue #3.

**Root cause:** Gmail OAuth2 refresh token expired after 7 days because the Google Cloud project was left in **Testing mode**. Testing mode = tokens expire after 7 days regardless of usage. The token had been generated once during setup and never rotated.

**Fix applied:** Switched email sending to **Resend** (API key auth, no token rotation). `RESEND_API_KEY` is now the only email credential.

**Permanent rule:** Never use OAuth2 token-based auth for automated pipeline steps. OAuth2 is for user-delegated flows. Pipelines need API keys or service accounts that don't expire.

---

## Incident 2 — GitHub Actions schedule delay silently skipping publish (June 2026)

**What broke:** Issue #4 did not go out on Tuesday June 2. Both scheduled cron runs fired but produced no output. Subscribers received nothing.

**Root cause:** GitHub Actions cron (`0 8 * * 2`) is not time-precise — it fired **5–6 hours late** on both the primary and retry slots. The scheduler had a `±35min` window check: runs that landed outside the window were silently exited. There was no alerting on silent skips.

**Fix applied:**
- Scheduled runs now check **weekday only** (not clock time)
- `workflow_dispatch` (manual) runs bypass the scheduler entirely
- Idempotency guard (`alreadyPublishedToday()`) is now the sole double-send protection

**Permanent rule:** GitHub Actions schedule cron is unreliable by ±hours. Never gate a publish on clock precision. Time-window checks belong in the subscriber filter (per-timezone), not in the pipeline entry guard.

---

## Incident 3 — Supabase free-tier auto-pause (June 2026)

**What broke:** Catch-up run for Issue #4 crashed immediately: `fetch failed` on `getIssueNumber()`. Supabase project was completely unreachable.

**Root cause:** Supabase free tier pauses projects after **7 days of no API activity**. The last successful pipeline run was May 26. The June 2 pipeline runs were silently skipped (Incident 2) before touching Supabase, so they didn't reset the inactivity clock. By June 3 the project had paused.

**Fix applied:** Added `.github/workflows/keepalive.yml` — a cron every 3 days that does a single `GET` on `newsletter_state`. Zero writes, ~2 seconds. Fails visibly if the project is already paused.

**Permanent rule:** Any project on Supabase free tier **must** have a keep-alive workflow. Do not assume the publish/preview pipelines will keep it alive — they can fail before touching Supabase.

---

## Incident 4 — Manual workflow_dispatch blocked by day-of-week guard (June 2026)

**What broke:** After Supabase was restored, triggering the pipeline manually on Wednesday to send the missed issue was silently rejected by the scheduler ("wrong day").

**Root cause:** The scheduler enforced `config.weekly.day` even on `workflow_dispatch` events. Manual triggers are by definition intentional catch-up sends — blocking them on day-of-week is wrong.

**Fix applied:** `workflow_dispatch` now bypasses `shouldPublishNow()` entirely.

**Permanent rule:** Manual pipeline triggers must always run. Schedule guards are for automated cron slots only.

---

## Incident 5 — Timezone window blocking catch-up email send (June 2026)

**What broke:** After fixing the scheduler, the pipeline ran successfully and deployed Issue #4 — but sent 0 emails. It was 1am Lisbon time; no subscribers were in their 9am window.

**Root cause:** `subscribersInCurrentWindow()` filtered out all subscribers because it was the middle of the night. This filter makes sense for scheduled sends but not for manual catch-up sends.

**Fix applied:** `workflow_dispatch` runs bypass `subscribersInCurrentWindow()` and send to all subscribers immediately.

**Permanent rule:** Time-of-day subscriber filtering is for scheduled sends only. Any manual or override send path must reach all subscribers.

---

## Incident 6 — Idempotency guard blocking email resend (June 2026)

**What broke:** After Issue #4 deployed (but 0 emails sent), re-triggering the pipeline was blocked by the idempotency guard: "Issue already published today". The guard had correctly saved `issue_number=4` during the first run, even though emails were never sent.

**Root cause:** `alreadyPublishedToday()` checks whether state was saved today — it doesn't distinguish between "deployed + emailed" and "deployed but emails failed".

**Current gap:** This is an unresolved design issue. The idempotency guard prevents the most likely failure mode (double-send) but creates a blind spot when a deploy succeeds but email fails. For now, the workaround is a manual send script.

**Workaround used:** `node --env-file=.env -e "import('./src/email.js').then(...)"` to send emails directly outside the publish pipeline.

**Future fix (not yet implemented):** Track `emails_sent` as separate state. Only block re-runs when both deploy AND email have succeeded.

---

## Incident 7 — Archive showing duplicate Issue #3 entries (May 2026)

**What broke:** `archive.html` showed three copies of Issue #3 after the issue was regenerated during debugging.

**Root cause:** `updateArchive()` always prepended a new card without checking if a card for that issue number already existed. Multiple runs on the same issue number → multiple cards.

**Fix applied:** Added a deduplication pass in `updateArchive()` that removes any existing card for `ctx.issue_number` before prepending the new one. Now idempotent.

**Permanent rule:** Any function that appends to a persistent dataset must be idempotent. Run-twice must produce the same result as run-once.

---

## Incident 8 — Issue #2 Archive tab showing stale embedded data (May 2026)

**What broke:** Navigating to Issue #2 from the archive, then clicking the Archive tab, showed only Issues #1 and #2 — not Issue #3. The "archive" was a hardcoded panel baked into the HTML at generation time.

**Root cause:** The original issue-2.html template embedded an Archive tab panel with hardcoded issue data. When Issue #3 was published, the embedded panel was never updated.

**Fix applied:** Removed the embedded Archive tab/panel from issue-2.html entirely. The header Archive button and "Browse past issues →" link both point to the live `archive.html`.

**Permanent rule:** Never embed live, growing datasets as hardcoded HTML in generated files. Link to the source of truth instead.

---

## Incident 9 — Tavily over-filtering reduced article pool to 3 (May 2026)

**What broke:** Curation step received only 3 articles (target: 8–12). Claude had almost nothing to select from and the issue failed the QA count check.

**Root cause:** A local date post-filter (`isWithinWindow()`) in `search.js` checked `published_date` on each Tavily result and kept only articles dated within the last 4 days. Most Tavily results either have no `published_date` or carry stale metadata dates — 163 out of 166 articles were rejected.

**Fix applied:** Removed the local date post-filter entirely. Tavily's own `days` parameter handles freshness; we don't need to double-filter.

**Permanent rule:** Don't post-filter on metadata that an external API already filters via its own parameters. Trust the source, not the metadata field.

---

## Open Issues (not yet fixed)

| Issue | Status |
|---|---|
| Idempotency guard doesn't distinguish deploy-only vs deploy+email | Documented — fix needed before subscriber list grows large |
| GitHub Actions Node.js 20 deprecation warning | Needs `actions/checkout@v4` + `setup-node@v4` update before Sept 2026 |
