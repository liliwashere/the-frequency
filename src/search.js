const TAVILY_API = 'https://api.tavily.com/search';

const QUERIES = [
  'AI developer tools open source builders 2026',
  'machine learning research paper findings 2026',
  'artificial intelligence business enterprise adoption 2026',
  'AI product launch workflow automation tools 2026',
  'AI policy ethics regulation global non-US 2026',
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function isWithinWindow(dateStr, days = 4) {
  if (!dateStr) return false;
  try {
    const articleDate = new Date(dateStr);
    return articleDate >= daysAgo(days);
  } catch {
    return false;
  }
}

function parseResult(result) {
  const url = result.url;
  const title = result.title ?? '';
  const description = result.content ?? '';
  const published_date = result.published_date ?? null;
  const source = new URL(url).hostname.replace(/^www\./, '');
  const author = null; // Tavily doesn't return author metadata

  return { url, title, description, published_date, source, author };
}

async function queryTavily(query, days = 7) {
  const res = await fetch(TAVILY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results: 10,
      days,
      include_answer: false,
      include_raw_content: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Tavily returned ${res.status} for query: "${query}" — ${text.slice(0, 120)}`);
  }

  const json = await res.json();
  return (json.results ?? []).map(parseResult);
}

export async function fetchArticles() {
  const results = await Promise.allSettled(
    QUERIES.map(q => queryTavily(q, 7))
  );

  const allArticles = [];
  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    } else {
      console.warn(`[search] Query ${i + 1} failed: ${result.reason?.message}`);
    }
  }

  if (!allArticles.length) {
    throw new Error('[search] All Tavily queries failed — aborting');
  }

  // Deduplicate by URL
  const seen = new Set();
  const deduped = [];
  for (const article of allArticles) {
    if (!seen.has(article.url)) {
      seen.add(article.url);
      deduped.push(article);
    }
  }

  // Filter to last 4 days
  const filtered = deduped.filter(a => isWithinWindow(a.published_date, 4));

  console.log(`[search] Found ${allArticles.length} raw → ${deduped.length} deduped → ${filtered.length} within 4-day window`);

  // Relax to 7 days if too few pass the strict filter
  if (filtered.length < 8) {
    console.warn('[search] Too few results with 4-day filter — relaxing to 7 days');
    const relaxed = deduped.filter(a => isWithinWindow(a.published_date, 7));
    if (relaxed.length >= 8) return relaxed;
    // If still too few, return all deduped and let Claude decide
    console.warn('[search] Still too few — returning all deduped results, Claude will filter by relevance');
    return deduped;
  }

  return filtered;
}
