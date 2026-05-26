import dotenv from 'dotenv';
dotenv.config(); // do NOT use override:true — shell env vars (e.g. DRY_RUN=true) must take precedence over .env
import { getIssueNumber, saveIssueNumber, getSeenUrls, appendSeenUrls } from './src/state.js';
import { fetchArticles } from './src/search.js';
import { curate } from './src/curate.js';
import { generateIssue, generateEmail, updateArchive } from './src/generate.js';
import { deploy } from './src/deploy.js';
import { getSubscribers } from './src/subscribers.js';
import { sendToAll } from './src/email.js';
import { shouldPublishNow, subscribersInCurrentWindow } from './src/scheduler.js';

const DRY_RUN = process.env.DRY_RUN === 'true';

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
  // ── Schedule guard — exit early if this cron slot doesn't match ──
  if (!DRY_RUN && !shouldPublishNow()) {
    console.log('\n[scheduler] Not a scheduled publish time — exiting.\n');
    process.exit(0);
  }

  const startTime = Date.now();
  const now = new Date();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  The Frequency — Pipeline Start`);
  console.log(`  ${now.toISOString()}${DRY_RUN ? '  [DRY RUN]' : ''}`);
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

  // ── 3. Curate ────────────────────────────────────────────────────
  console.log('\n[3/8] Curating with Claude...');
  let curateResult;
  try {
    curateResult = await curate(rawArticles, seenUrls);
  } catch (err) {
    console.error(`\n[FATAL] Curation failed: ${err.message}`);
    process.exit(1);
  }

  const { articles: curatedArticles, issue_headline } = curateResult;
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
    // Filter to subscribers whose local time is currently 9am ± 35min
    const batch = subscribersInCurrentWindow(subscribers);
    console.log(`      Timezone window: ${batch.length}/${subscribers.length} subscriber(s) in current 9am window`);
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
