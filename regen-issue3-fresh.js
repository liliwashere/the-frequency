/**
 * Regenerate Issue #3 with fresh Tavily-sourced content + manually curated candidates.
 * Does NOT update Supabase state (issue number and seen_urls unchanged).
 * Run: node regen-issue3-fresh.js
 */

import dotenv from 'dotenv';
dotenv.config();
import { fetchArticles } from './src/search.js';
import { curate } from './src/curate.js';
import { generateIssue, generateEmail, updateArchive } from './src/generate.js';

// Manually provided candidates (editor-reviewed, injected ahead of Tavily results)
const MANUAL_CANDIDATES = [
  {
    url: 'https://graphite.io/five-percent/more-articles-are-now-created-by-ai-than-humans',
    title: 'More Articles Are Now Created by AI Than Humans',
    description: 'Original empirical research sampling 43,000 URLs from CommonCrawl found that AI-generated articles surpassed human-written content by November 2024, with growth plateau since May 2024 as AI content underperforms in search rankings. Led by Jose Luis Paredes PhD, Ethan Smith (CEO), and Gregory Druck PhD. Validated detection with 0.6% false negative rate on GPT-4o-generated articles.',
    published_date: '2026-05-15',
    source: 'graphite.io',
    author: 'Jose Luis Paredes',
  },
  {
    url: 'https://www.noemamag.com/to-understand-ai-think-like-a-dragonfly/',
    title: 'To Understand AI, Think Like A Dragonfly',
    description: 'Professor Anthea Roberts (international law, Georgetown/ANU) and founder of Dragonfly Thinking startup maps nine distinct AI stakeholder perspectives — builders, displaced workers, geopolitical hawks, power critics, disruptors, truth defenders, environmentalists, safety community, humanists. Argues that single-view thinking mistakes part of the picture for the whole and that governance must balance competing values across all nine lenses.',
    published_date: '2026-05-21',
    source: 'noemamag.com',
    author: 'Anthea Roberts',
  },
  {
    url: 'https://www.theatlantic.com/technology/2026/05/ai-writing-scandal-future-of-truth-book/687290/',
    title: 'The AI Writing Scandal and the Future of Truth',
    description: 'Investigative reporting on how AI-generated text infiltrated a high-profile nonfiction book and the editorial systems that failed to catch it — raising fundamental questions about verification, authorship, and what counts as truth in journalism. Paywalled but the Atlantic remains a standard for long-form tech journalism.',
    published_date: '2026-05-22',
    source: 'The Atlantic',
    author: null,
  },
  {
    url: 'https://www.nytimes.com/2026/05/19/business/media/future-of-truth-ai-quotes.html',
    title: 'AI-Generated Fake Quotes Are Slipping Into Books and Journalism',
    description: 'New York Times investigation into fabricated AI-generated quotes appearing in published works, including how newsrooms and publishers are only now building systems to detect them. Concrete examples of real incidents where AI hallucinations passed editorial review.',
    published_date: '2026-05-19',
    source: 'The New York Times',
    author: null,
  },
  {
    url: 'https://www.sitepoint.com/stop-building-dumb-ai-wrappers-getting-real-with-llm-function-calling/',
    title: 'Stop Building Dumb AI Wrappers: Getting Real with LLM Function Calling',
    description: 'Hands-on technical guide for developers on why most AI wrappers fail and how LLM function calling changes the architecture. Covers real patterns for building production-grade agentic systems versus naive prompt-chaining. Written for builders who have tried the basics and hit the wall.',
    published_date: '2026-05-20',
    source: 'sitepoint.com',
    author: null,
  },
];

async function main() {
  console.log('\n[regen-issue3-fresh] Starting fresh curation for Issue #3\n');

  // 1. Fetch from Tavily (30-day window for regen — wider pool than normal 7-day)
  console.log('[1/4] Fetching articles via Tavily (30-day window)...');
  let tavilyArticles;
  try {
    tavilyArticles = await fetchArticles(30);
  } catch (err) {
    console.error(`[FATAL] Tavily search failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Merge manual candidates (deduplicate by URL)
  const knownUrls = new Set(tavilyArticles.map(a => a.url));
  const merged = [...tavilyArticles];
  for (const c of MANUAL_CANDIDATES) {
    if (!knownUrls.has(c.url)) {
      merged.push(c);
      console.log(`[search] Injected manual candidate: ${c.url}`);
    }
  }

  // Pre-filter: enforce max 2 articles per domain before sending to Claude.
  // Manual candidates get a reserved slot and skip the cap.
  const manualUrls = new Set(MANUAL_CANDIDATES.map(c => c.url));
  const domainBucket = {};
  const capped = [];
  for (const a of merged) {
    if (manualUrls.has(a.url)) { capped.push(a); continue; } // manual candidates always pass
    let domain;
    try { domain = new URL(a.url).hostname.replace(/^www\./, ''); } catch { capped.push(a); continue; }
    domainBucket[domain] = (domainBucket[domain] ?? 0) + 1;
    if (domainBucket[domain] <= 2) capped.push(a);
  }
  const dropped = merged.length - capped.length;
  if (dropped > 0) console.log(`[search] Domain-cap pre-filter: dropped ${dropped} articles (max 2/domain)`);
  console.log(`[search] Total candidate pool after cap: ${capped.length} articles\n`);

  // 3. Curate — for regen, skip seen-URL filtering (failed issue, start fresh)
  // Seen URLs from a failed pipeline run would exclude most of the candidate pool.
  console.log('[2/4] Curating with Claude (no seen-URL filter for regen)...');
  let curateResult;
  try {
    curateResult = await curate(capped, [], { minCandidates: 5 });
  } catch (err) {
    console.error(`[FATAL] Curation failed: ${err.message}`);
    process.exit(1);
  }

  const { articles, issue_headline } = curateResult;

  // QA check
  const domains = new Set(articles.map(a => {
    try { return new URL(a.url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }));
  console.log('\n[QA] ─────────────────────────────────────');
  console.log(`[QA] Articles: ${articles.length} (target: 8+)${articles.length < 8 ? ' ⚠️' : ' ✓'}`);
  console.log(`[QA] Distinct domains: ${domains.size} (target: 5+)${domains.size < 5 ? ' ⚠️' : ' ✓'}`);
  const domainCounts = {};
  articles.forEach(a => {
    try { const d = new URL(a.url).hostname.replace(/^www\./, ''); domainCounts[d] = (domainCounts[d] ?? 0) + 1; } catch {}
  });
  const maxFromOne = Math.max(...Object.values(domainCounts));
  if (maxFromOne > 2) console.log(`[QA] ⚠️  One domain has ${maxFromOne} articles — target is max 2`);
  console.log('[QA] ─────────────────────────────────────\n');

  // 4. Generate HTML
  console.log('[3/4] Generating HTML...');
  const ctx = {
    issue_number: 3,
    date: 'Tuesday, May 26, 2026',
    next_date: 'Tuesday, June 2, 2026',
    issue_headline,
    articles,
    editors_pick: articles.find(a => a.editors_pick),
  };
  generateIssue(ctx);
  generateEmail(ctx);
  updateArchive(ctx);

  // Summary
  console.log('[4/4] Done. Files written:');
  console.log('  public/index.html');
  console.log('  public/issue-3.html');
  console.log('  public/email-latest.html\n');
  console.log(`Issue headline: "${issue_headline}"\n`);
  console.log('Articles selected:');
  for (const a of articles) {
    console.log(`  [${a.category}]${a.editors_pick ? ' ★' : '  '} ${a.author ? a.author + ' · ' : ''}${a.title}`);
    console.log(`    ${a.url}`);
  }
  console.log('\nNOTE: Supabase state (issue_number, seen_urls) NOT updated. Deploy manually when ready.\n');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
