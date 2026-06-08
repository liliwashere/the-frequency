import dotenv from 'dotenv';
dotenv.config(); // do NOT use override:true — shell env vars (e.g. DRY_RUN=true) must take precedence over .env
import { getIssueNumber, saveIssueNumber, getSeenUrls, appendSeenUrls, alreadyPublishedToday } from './src/state.js';
import { fetchArticles } from './src/search.js';
import { curate } from './src/curate.js';
import { generateIssue, generateEmail, updateArchive } from './src/generate.js';
import { deploy } from './src/deploy.js';
import { getSubscribers } from './src/subscribers.js';
import { sendToAll, sendPreviewEmail } from './src/email.js';
import { shouldPublishNow, subscribersInCurrentWindow, isSkippedUntil } from './src/scheduler.js';

const DRY_RUN = process.env.DRY_RUN === 'true';
const PREVIEW_MODE = process.env.PREVIEW_MODE === 'true';

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function nextIssueDate(from) {
  const d = new Date(from);
  const day = d.getDay();
  const daysUntil = day === 2 ? 7 : (2 - day + 7) % 7;
  d.setDate(d.getDate() + daysUntil);
  return formatDate(d);
}

async function main() {
  // ── Skip-until guard — blocks both publish and preview scheduled runs ──
  // workflow_dispatch bypasses this (manual triggers are intentional).
  if (!DRY_RUN && process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' && isSkippedUntil()) {
    console.log('\n[skip_until] Skipping — skip_until date not yet passed. Nothing to do.\n');
    process.exit(0);
  }

  // ── Schedule guard — exit early if this cron slot doesn't match ──
  if (!DRY_RUN && !PREVIEW_MODE && !shouldPublishNow()) {
    console.log('\n[scheduler] Not a scheduled publish time — exiting.\n');
    process.exit(0);
  }

  // ── Idempotency guard — skip if already published today ──────────
  if (!DRY_RUN && !PREVIEW_MODE) {
    const alreadyDone = await alreadyPublishedToday();
    if (alreadyDone) {
      console.log('\n[idempotency] Issue already published today — skipping duplicate run.\n');
      process.exit(0);
    }
  }

  const startTime = Date.now();
  const now = new Date();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  The Frequency — Pipeline Start`);
  console.log(`  ${now.toISOString()}${DRY_RUN ? '  [DRY RUN]' : PREVIEW_MODE ? '  [PREVIEW]' : ''}`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── 1. Load state ────────────────────────────────────────────────
  console.log('[1/8] Loading state...');
  const currentIssueNumber = await getIssueNumber();
  const issueNumber = currentIssueNumber + 1;
  const seenUrls = await getSeenUrls();
  console.log(`      Issue will be #${issueNumber} (last published: #${currentIssueNumber})`);
  console.log(`      Seen URLs in history: ${seenUrls.length}`);

  // ── 2. Search ────────────────────────────────────────────────────
  console.log('\n[2/8] Searching for AI content...');
  let rawArticles;
  try {
    rawArticles = await fetchArticles();
  } catch (err) {
    console.error(`\n[FATAL] Search failed: ${err.message}`);
    process.exit(1);
  }

  // ── 2b. Domain-cap pre-filter (max 2 articles per domain) ───────
  const _domainBucket = {};
  const cappedArticles = rawArticles.filter(a => {
    let domain;
    try { domain = new URL(a.url).hostname.replace(/^www\./, ''); } catch { return true; }
    _domainBucket[domain] = (_domainBucket[domain] ?? 0) + 1;
    return _domainBucket[domain] <= 2;
  });
  const _dropped = rawArticles.length - cappedArticles.length;
  if (_dropped > 0) console.log(`      Domain-cap: dropped ${_dropped} articles — max 2 per domain enforced`);

  // ── 3. Curate ────────────────────────────────────────────────────
  console.log('\n[3/8] Curating with Claude...');
  let curateResult;
  try {
    curateResult = await curate(cappedArticles, seenUrls);
  } catch (err) {
    console.error(`\n[FATAL] Curation failed: ${err.message}`);
    process.exit(1);
  }

  const { articles: curatedArticles, issue_headline } = curateResult;

  // ── QA check ─────────────────────────────────────────────────────
  const qaDomains = new Set(curatedArticles.map(a => {
    try { return new URL(a.url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }));
  const qaDomainCounts = {};
  curatedArticles.forEach(a => {
    try { const d = new URL(a.url).hostname.replace(/^www\./, ''); qaDomainCounts[d] = (qaDomainCounts[d] ?? 0) + 1; } catch {}
  });
  const KNOWN_WOMEN_LAST_NAMES = ['huyen', 'boykis', 'weng', 'thomas', 'gebru', 'birhane', 'shankar', 'kozyrkov', 'chowdhury', 'bender', 'buolamwini', 'roberts', 'rachna', 'whittaker'];
  const womenCount = curatedArticles.filter(a =>
    KNOWN_WOMEN_LAST_NAMES.some(n => (a.author || '').toLowerCase().includes(n))
  ).length;
  console.log('\n[QA] ─────────────────────────────────────────────────');
  console.log(`[QA] Articles: ${curatedArticles.length}${curatedArticles.length < 8 ? ' ⚠️  (target 8+)' : ' ✓'}`);
  console.log(`[QA] Distinct domains: ${qaDomains.size}${qaDomains.size < 5 ? ' ⚠️  (target 5+)' : ' ✓'}`);
  const qaMaxFromOne = Math.max(...Object.values(qaDomainCounts));
  if (qaMaxFromOne > 2) console.warn(`[QA] ⚠️  One domain has ${qaMaxFromOne} articles — hard limit is 2`);
  if (womenCount < 2) console.warn(`[QA] ⚠️  Only ${womenCount} identified women authors — target 2+`);
  console.log('[QA] ─────────────────────────────────────────────────\n');

  const editorsPick = curatedArticles.find(a => a.editors_pick);
  const issueDate = formatDate(now);
  const nextDate = nextIssueDate(now);

  const ctx = {
    issue_number: issueNumber,
    date: issueDate,
    next_date: nextDate,
    articles: curatedArticles,
    editors_pick: editorsPick,
    issue_headline: issue_headline || '',
  };

  // ── 4. Generate HTML ─────────────────────────────────────────────
  console.log('\n[4/8] Generating HTML files...');
  try {
    generateIssue(ctx);
    generateEmail(ctx);
    updateArchive(ctx);
  } catch (err) {
    console.error(`\n[FATAL] HTML generation failed: ${err.message}`);
    process.exit(1);
  }

  if (PREVIEW_MODE) {
    console.log('\n[PREVIEW] Deploying preview to Cloudflare Pages...');
    let previewUrl = null;
    try {
      const previewDeploy = await deploy();
      previewUrl = previewDeploy?.url ?? null;
    } catch (err) {
      console.warn(`[PREVIEW] Deploy failed (continuing): ${err.message}`);
    }
    console.log('[PREVIEW] Sending preview email to editor...');
    try {
      await sendPreviewEmail(ctx, previewUrl);
      console.log('[PREVIEW] Preview email sent to lilitalent@gmail.com');
    } catch (err) {
      console.warn(`[PREVIEW] Email failed: ${err.message}`);
    }
    console.log('\n[PREVIEW] Done. Review before Tuesday 09:00 Lisbon.');
    console.log('[PREVIEW] State NOT saved — issue number and seen_urls unchanged.\n');
    return;
  }

  if (DRY_RUN) {
    console.log('\n⚠  DRY_RUN=true — skipping deploy and email.\n');
    console.log('[DRY RUN] Generated files:');
    console.log('  public/index.html');
    console.log(`  public/issue-${issueNumber}.html`);
    console.log('  public/email-latest.html');
    console.log('  public/archive.html');
    if (issue_headline) console.log(`\n[DRY RUN] Issue headline: ${issue_headline}`);
    console.log('\n[DRY RUN] Articles selected:');
    for (const a of curatedArticles) {
      console.log(`  [${a.category}]${a.editors_pick ? ' ★' : ''} ${a.title}`);
      console.log(`    ${a.url}`);
    }
    console.log('\n  Done (dry run).\n');
    return;
  }

  // ── 5. Deploy ────────────────────────────────────────────────────
  console.log('\n[5/8] Deploying to Cloudflare Pages...');
  let deployResult = null;
  try {
    deployResult = await deploy();
  } catch (err) {
    console.error(`[deploy] FAILED (continuing): ${err.message}`);
  }

  // ── 6. Fetch subscribers ─────────────────────────────────────────
  console.log('\n[6/8] Fetching subscribers...');
  let subscribers = [];
  try {
    subscribers = await getSubscribers();
  } catch (err) {
    console.error(`[subscribers] FAILED (skipping email): ${err.message}`);
  }

  // ── 7. Send emails ───────────────────────────────────────────────
  let emailResult = null;
  if (subscribers.length > 0) {
    console.log('\n[7/8] Sending emails...');
    // Manual (workflow_dispatch) catch-up sends skip the timezone window and
    // go to all subscribers immediately — the issue is already overdue.
    // Scheduled runs use the 9am ± 35min window per subscriber timezone.
    const isManual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
    const batch = isManual ? subscribers : subscribersInCurrentWindow(subscribers);
    if (isManual) {
      console.log(`      Manual send — bypassing timezone window, sending to all ${batch.length} subscriber(s)`);
    } else {
      console.log(`      Timezone window: ${batch.length}/${subscribers.length} subscriber(s) in current 9am window`);
    }
    try {
      emailResult = await sendToAll(batch, ctx);
    } catch (err) {
      console.error(`[email] FAILED: ${err.message}`);
    }
  } else {
    console.log('\n[7/8] No subscribers — skipping email step.');
  }

  // ── 8. Persist state — only if at least deploy OR email succeeded ──
  const deployOk = deployResult !== null;
  const emailOk = emailResult !== null && emailResult.sent > 0;

  if (!deployOk && !emailOk) {
    console.warn('\n[8/8] Skipping state save — both deploy and email failed. Issue number not consumed.');
    return;
  }

  console.log('\n[8/8] Saving state...');
  await saveIssueNumber(issueNumber);
  await appendSeenUrls(curatedArticles.map(a => a.url), issueNumber);
  console.log(`      issue_number saved: ${issueNumber}`);
  console.log(`      seen_urls appended: ${curatedArticles.length} new URLs`);

  // ── Summary ──────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  The Frequency #${issueNumber} — Published`);
  console.log(`  Articles: ${curatedArticles.length} | Editor's Pick: ${editorsPick?.title?.slice(0, 50)}`);
  if (deployResult) console.log(`  Deployed: ${deployResult.url}`);
  if (emailResult) console.log(`  Emails: ${emailResult.sent} sent, ${emailResult.failed} failed`);
  console.log(`  Time: ${elapsed}s`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => {
  console.error('\n[FATAL] Unhandled error:', err);
  process.exit(1);
});
