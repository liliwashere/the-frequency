const TAVILY_API = 'https://api.tavily.com/search';

// Known practitioners whose new posts are always worth checking
const AUTHOR_DOMAINS = [
  // Established voices (English)
  'simonwillison.net',            // Simon Willison — UK
  'eugeneyan.com',                // Eugene Yan — Singapore
  'lenny.pm',                     // Lenny Rachitsky
  'levels.io',                    // Pieter Levels — Netherlands
  'hamel.dev',                    // Hamel Husain
  'interconnects.ai',             // Nathan Lambert
  'jxnl.co',                      // Jason Liu
  'sebastianraschka.com',         // Sebastian Raschka
  'vickiboykis.com',              // Vicki Boykis — Russia/US
  'huyenchip.com',                // Chip Huyen — Vietnam/US
  'blog.pragmaticengineer.com',   // Gergely Orosz — Hungary/UK
  'paulgraham.com',               // Paul Graham
  'stratechery.com',              // Ben Thompson
  'karpathy.github.io',           // Andrej Karpathy
  'karpathy.bearblog.dev',        // Andrej Karpathy (blog)
  'lilianweng.github.io',         // Lilian Weng — China/US
  'rachel.fast.ai',               // Rachel Thomas — Australia/US
  'ruder.io',                     // Sebastian Ruder — Ireland (multilingual NLP)
  'thegradient.pub',              // The Gradient — research
  'shreya-shankar.com',           // Shreya Shankar
  'bounded-regret.ghost.io',      // Bounded Regret
  'blog.matt-rickard.com',        // Matt Rickard
  'oneusefulthing.org',           // Ethan Mollick
  'latent.space',                 // swyx & Alessio — Singapore
  'swyx.io',                      // swyx

  // Women researchers & writers
  'timnit.co',                    // Timnit Gebru — Ethiopia/US (DAIR)
  'abebab.github.io',             // Abeba Birhane — Ethiopia/Ireland
  'cassiek.substack.com',         // Cassie Kozyrkov — South Africa/US
  'rummanc.substack.com',         // Rumman Chowdhury — Bangladesh/US

  // International / non-English platforms
  'zenn.dev',                     // Japanese technical publishing platform
  'habr.com',                     // Russian tech community
  'techinasia.com',               // Tech in Asia — Southeast Asia
  'techcabal.com',                // TechCabal — Africa
  'restofworld.org',              // Rest of World — global tech journalism
  'analyticsindiamag.com',        // Analytics India — India
  'latinxinai.org',               // Latinx in AI
  'dair-institute.org',           // DAIR Institute — Timnit Gebru
  'ainowinstitute.org',           // AI Now Institute
];

// Each query targets a specific content type
const QUERIES = [
  // English — practitioners & builders
  {
    query: 'AI engineering LLM practical insights builders 2026',
    include_domains: [
      'substack.com', 'every.to', 'simonwillison.net', 'eugeneyan.com',
      'interconnects.ai', 'hamel.dev', 'latent.space', 'jxnl.co',
      'blog.matt-rickard.com', 'shreya-shankar.com',
    ],
    topic: 'general',
  },
  // English — research & papers
  {
    query: 'machine learning research paper practical findings 2026',
    include_domains: [
      'arxiv.org', 'huggingface.co', 'sebastianraschka.com',
      'distill.pub', 'paperswithcode.com', 'bounded-regret.ghost.io',
      'thegradient.pub', 'ruder.io',
    ],
    topic: 'general',
  },
  // English — founders & product
  {
    query: 'AI product startup founder lessons learned perspective 2026',
    include_domains: [
      'lenny.pm', 'andrewchen.com', 'every.to', 'substack.com',
      'levels.io', 'paulgraham.com', 'cdixon.org', 'oneusefulthing.org',
    ],
    topic: 'general',
  },
  // English — global impact & policy
  {
    query: 'artificial intelligence real-world impact analysis 2026',
    include_domains: [
      'restofworld.org', 'technologyreview.com', 'wired.com',
      'arstechnica.com', 'stratechery.com', 'techcabal.com', 'techinasia.com',
    ],
    topic: 'news',
  },
  // English — diverse voices & ethics
  {
    query: 'AI research ethics bias equity diverse perspectives Global South 2026',
    include_domains: [
      'dair-institute.org', 'ainowinstitute.org', 'fast.ai',
      'techcabal.com', 'techinasia.com', 'analyticsindiamag.com',
      'latinxinai.org', 'partnershiponai.org', 'timnit.co',
    ],
    topic: 'general',
  },
  // New posts from known practitioners this week
  {
    query: 'AI machine learning engineering 2026',
    include_domains: AUTHOR_DOMAINS,
    topic: 'general',
  },
  // French — AI analysis & practitioners
  {
    query: 'intelligence artificielle IA analyse pratique constructeurs 2026',
    include_domains: [
      'substack.com', 'medium.com', 'lemonde.fr', 'letemps.ch',
      'nextinpact.com', 'numerama.com',
    ],
    topic: 'general',
  },
  // Spanish — AI builders & analysis
  {
    query: 'inteligencia artificial IA análisis constructores perspectiva 2026',
    include_domains: [
      'substack.com', 'medium.com', 'xataka.com', 'hipertextual.com',
      'elconfidencial.com',
    ],
    topic: 'general',
  },
  // Portuguese (Brazil & Portugal) — AI builders & analysis
  {
    query: 'inteligência artificial IA análise construtores desenvolvedores 2026',
    include_domains: [
      'substack.com', 'medium.com', 'tableless.com.br',
      'imasters.com.br', 'canaltech.com.br',
    ],
    topic: 'general',
  },
  // German — AI analysis & practitioners
  {
    query: 'künstliche Intelligenz KI Analyse Entwickler Perspektive 2026',
    include_domains: [
      'substack.com', 'medium.com', 'heise.de', 'golem.de',
    ],
    topic: 'general',
  },
  // Japanese — AI engineering & builders
  {
    query: '人工知能 機械学習 AI エンジニア 実践 2026',
    include_domains: [
      'zenn.dev', 'qiita.com', 'note.com',
    ],
    topic: 'general',
  },
  // Global South & Africa — AI practitioners
  {
    query: 'artificial intelligence builders Africa Asia Latin America perspectives 2026',
    include_domains: [
      'techcabal.com', 'techinasia.com', 'analyticsindiamag.com',
      'restofworld.org', 'latinxinai.org',
    ],
    topic: 'general',
  },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function isWithinWindow(dateStr, days = 4) {
  if (!dateStr) return false;
  try {
    return new Date(dateStr) >= daysAgo(days);
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
  const author = result.author ?? null;

  return { url, title, description, published_date, source, author };
}

async function queryTavily({ query, include_domains, topic }, days = 7) {
  const res = await fetch(TAVILY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results: 15,
      days,
      topic: topic ?? 'general',
      include_domains: include_domains ?? [],
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

  if (filtered.length < 8) {
    console.warn('[search] Too few results with 4-day filter — relaxing to 7 days');
    const relaxed = deduped.filter(a => isWithinWindow(a.published_date, 7));
    if (relaxed.length >= 8) return relaxed;
    console.warn('[search] Still too few — returning all deduped results, Claude will filter by relevance');
    return deduped;
  }

  return filtered;
}
