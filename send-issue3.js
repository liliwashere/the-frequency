/**
 * One-off: update Supabase seen_urls for Issue #3 regen, then send newsletter.
 * Run: node send-issue3.js
 */
import dotenv from 'dotenv';
dotenv.config();
import { appendSeenUrls } from './src/state.js';
import { getSubscribers } from './src/subscribers.js';
import { sendToAll } from './src/email.js';

const ISSUE_3_ARTICLES = [
  'https://graphite.io/five-percent/more-articles-are-now-created-by-ai-than-humans',
  'https://stratechery.com/2026/the-inference-shift/',
  'https://www.noemamag.com/to-understand-ai-think-like-a-dragonfly/',
  'https://www.wired.com/story/using-ai-negative-impact-thinking-problem-solving-study/',
  'https://arstechnica.com/tech-policy/2026/05/everything-that-could-go-wrong-with-trumps-ai-safety-tests-according-to-experts/',
  'https://www.nytimes.com/2026/05/19/business/media/future-of-truth-ai-quotes.html',
  'https://www.sitepoint.com/stop-building-dumb-ai-wrappers-getting-real-with-llm-function-calling/',
  'https://www.wired.com/story/everything-google-announced-at-google-io-2026/',
];

const ctx = { issue_number: 3 };

async function main() {
  console.log('\n[send-issue3] Updating seen_urls for Issue #3 regen...');
  await appendSeenUrls(ISSUE_3_ARTICLES, 3);
  console.log(`[send-issue3] Appended ${ISSUE_3_ARTICLES.length} URLs to seen_urls`);

  console.log('\n[send-issue3] Fetching subscribers...');
  const subscribers = await getSubscribers();
  console.log(`[send-issue3] ${subscribers.length} subscriber(s) found`);

  if (!subscribers.length) {
    console.log('[send-issue3] No subscribers — nothing to send.');
    return;
  }

  console.log('\n[send-issue3] Sending Issue #3 newsletter...');
  const result = await sendToAll(subscribers, ctx);
  console.log(`\n[send-issue3] Done — sent: ${result.sent}, failed: ${result.failed}`);
  if (result.errors?.length) {
    console.warn('[send-issue3] Errors:', result.errors);
  }
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
