import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are the editorial AI for "The Frequency," a twice-weekly AI digest with zero hype.
Your job is to select 8–12 stories from a candidate pool and assign them to categories.

CRITICAL: You must ONLY select URLs that appear verbatim in the candidates array you receive. Never invent, modify, or guess URLs.

EDITORIAL IDENTITY — this is what sets The Frequency apart:
The Frequency publishes writing by people who build things, have skin in the game, or do original research.
Think: Andrej Karpathy explaining a framework he actually uses. Simon Willison writing about a tool he maintains.
Ethan Mollick sharing research he ran himself. Pieter Levels sharing real revenue numbers.
NOT: "10 best AI tools for 2026" from a SaaS vendor. NOT: "AI will transform X" from a thought leader with no code.

What to include:
- Original posts by practitioners: builders, researchers, engineers, founders who actually ship things
- First-person accounts of what worked and what broke
- Peer-reviewed research or serious technical writing with real findings
- Analysis with a concrete position, not "on one hand… on the other hand"
- Non-English writing from international practitioners — these are valuable, not second-class

What to exclude — hard filter, no exceptions:
- "Top N AI tools / statistics / trends" listicles (regardless of publisher)
- "AI will replace X" thought pieces with no data or personal experience
- Lab blog posts from major AI companies (OpenAI, Google, Anthropic, Meta AI blogs) — they are marketing
- Vendor announcements and product marketing
- Newsletter aggregators summarizing other newsletters
- Press releases dressed as blog posts
- LinkedIn-style recycled content with no original thinking
- Generic "statistics for 2026" roundups from SEO content farms

Author diversity — hard requirement, not an afterthought:
- Minimum 2 women authors per issue. Priority voices: Chip Huyen, Vicki Boykis, Lilian Weng, Rachel Thomas,
  Timnit Gebru, Abeba Birhane, Shreya Shankar, Cassie Kozyrkov, Rumman Chowdhury, Emily Bender, Joy Buolamwini.
  Look beyond this list — find women actually writing about AI from any country.
- Minimum 2 non-US/UK voices. Actively prioritize: African, South/Southeast Asian, Latin American,
  Eastern European, Middle Eastern, East Asian perspectives.
  Good signals: TechCabal, Tech in Asia, Habr, Zenn, Rest of World.
- If the candidate pool has no qualifying women authors, flag it in diversity_notes.
  Do not fail silently — always note the gap.

Non-English content — handling rules:
- Articles written in French, Spanish, Portuguese, German, Japanese, Arabic, Russian, or other languages
  are eligible and encouraged. Language is not a barrier to inclusion.
- For any non-English article: set language to the correct ISO 639-1 code (fr, es, pt, de, ja, zh, ko, ar, ru…)
  and provide a translated_excerpt: 2–3 sentences in English that give the reader a genuine taste of the piece.
  The excerpt should be a translation of the article's key insight, not a description of what the article covers.
- For English articles: language = "en", translated_excerpt = "".

Source diversity — hard rule, no exceptions:
- No more than 2 articles from the same domain per issue. wired.com, techcrunch.com, arstechnica.com are individual sources too.
- If one domain has 5 excellent candidates, pick the best 2 and find alternatives from other sources for the rest.
- Aim for at least 5 distinct domains across the 8–12 stories. Single-source issues are editorially unacceptable.

Summary writing rules (critical):
- 2 sentences maximum
- Write like a sharp editor giving a colleague a quick brief — specific, direct, no throat-clearing
- Lead with the actual finding, insight, or what makes it worth reading
- NEVER start with: "This", "This article", "A look at", "An overview", "You'll"
- Be concrete: name the actual tool, finding, number, decision, or person
- No adjective padding — cut "really", "deeply", "comprehensive", "detailed"

Categories:
- Builders: engineers, developers, open source, hands-on tutorials, workflow walkthroughs
- Research: papers, benchmarks, technical findings, evals, model analyses
- AI × Business: adoption, economics, enterprise use, strategy, real revenue/cost signals
- Tools: new releases, comparisons, workflows worth adopting

Issue headline:
Write a 10–20 word editorial headline summarising the 2–3 main themes of this issue.
Format: "Theme A, theme B, and theme C" — not a sentence, no period.
Examples: "Karpathy's Software 3.0 framework, solo founders rewriting the rules, and the zombie internet problem"`;

const SELECT_ARTICLES_TOOL = {
  name: 'select_articles',
  description: 'Select and annotate the best articles for this issue of The Frequency.',
  input_schema: {
    type: 'object',
    properties: {
      selected: {
        type: 'array',
        minItems: 8,
        maxItems: 12,
        items: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            category: {
              type: 'string',
              enum: ['Builders', 'Research', 'AI × Business', 'Tools'],
            },
            summary: {
              type: 'string',
              description: '2-sentence editorial summary — lead with the actual insight, no hype',
            },
            author: {
              type: 'string',
              description: 'Author name, optionally with affiliation (e.g. "Chip Huyen · huyenchip.com"). Empty string if genuinely unknown — do not guess.',
            },
            author_url: {
              type: 'string',
              description: "Author's personal website, blog, or canonical profile URL. Empty string if unknown.",
            },
            author_bio: {
              type: 'string',
              description: 'One sentence describing who this person is and why they are credible on this topic. Only what is verifiably known. Empty string if uncertain.',
            },
            editors_pick: {
              type: 'boolean',
              description: 'Exactly one story per issue must be true — the most substantive, surprising, or immediately useful piece',
            },
            language: {
              type: 'string',
              description: 'ISO 639-1 code of the original article language. Use "en" for English, "fr" for French, "es" for Spanish, "pt" for Portuguese, "de" for German, "ja" for Japanese, "zh" for Chinese, "ko" for Korean, "ar" for Arabic, "ru" for Russian, etc.',
            },
            translated_excerpt: {
              type: 'string',
              description: 'For non-English articles only: 2–3 sentences in English translating the key insight or passage from the original. This is a translation, not a description. Empty string for English articles.',
            },
            inclusion_reason: {
              type: 'string',
              description: 'Internal note: why this was selected (not shown to readers)',
            },
          },
          required: ['url', 'category', 'summary', 'author', 'author_url', 'author_bio', 'editors_pick', 'language', 'translated_excerpt'],
        },
      },
      issue_headline: {
        type: 'string',
        description: '10–20 word editorial headline capturing the 2–3 main themes of this issue. Format: "Theme A, theme B, and theme C" with no trailing period.',
      },
      diversity_notes: {
        type: 'string',
        description: 'Confirm diversity requirements are met (women authors, non-US/UK voices) or flag any shortfalls clearly',
      },
    },
    required: ['selected', 'issue_headline', 'diversity_notes'],
  },
};

export async function curate(rawArticles, seenUrls, { minCandidates = 6 } = {}) {
  const seenSet = new Set(seenUrls);
  const candidates = rawArticles.filter(a => !seenSet.has(a.url));

  if (candidates.length < minCandidates) {
    throw new Error(`[curate] Only ${candidates.length} unseen candidates — need at least ${minCandidates}`);
  }

  console.log(`[curate] Sending ${candidates.length} candidates to Claude for curation`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const requestParams = {
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          candidates: candidates.map(a => ({
            url: a.url,
            title: a.title,
            description: a.description,
            published_date: a.published_date,
            source: a.source,
            author: a.author,
          })),
        }),
      },
    ],
    tools: [SELECT_ARTICLES_TOOL],
    tool_choice: { type: 'tool', name: 'select_articles' },
  };

  // Curation regularly takes 70-90s+. A plain non-streaming call sits idle
  // waiting for the full response, which intermediary network hops (GitHub
  // Actions egress, Anthropic's gateway) can kill with "Premature close".
  // Streaming keeps the connection active with incremental chunks, which
  // avoids that class of failure. A couple of retries with backoff cover
  // any other transient connection drop on top of that.
  let response;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await client.messages.stream(requestParams).finalMessage();
      break;
    } catch (err) {
      lastErr = err;
      console.warn(`[curate] Attempt ${attempt}/3 failed: ${err.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 5000));
    }
  }
  if (!response) throw lastErr;

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error('[curate] Claude did not return a tool_use block');

  const { selected, issue_headline, diversity_notes } = toolUse.input;

  if (diversity_notes) console.log(`[curate] Diversity notes: ${diversity_notes}`);
  if (issue_headline) console.log(`[curate] Issue headline: ${issue_headline}`);

  const editorsPicks = selected.filter(s => s.editors_pick);
  if (editorsPicks.length !== 1) {
    throw new Error(`[curate] Expected exactly 1 editors_pick, got ${editorsPicks.length}`);
  }

  // Merge Claude's selections back with raw article data by URL
  const rawByUrl = Object.fromEntries(rawArticles.map(a => [a.url, a]));
  const curated = selected.reduce((acc, sel) => {
    const raw = rawByUrl[sel.url];
    if (!raw) {
      console.warn(`[curate] Skipping hallucinated URL: ${sel.url}`);
      return acc;
    }
    return [...acc, {
      ...raw,
      ...sel,
      author: sel.author || raw.author || '',
      language: sel.language || 'en',
      translated_excerpt: sel.translated_excerpt || '',
      author_url: sel.author_url || '',
      author_bio: sel.author_bio || '',
    }];
  }, []);

  if (curated.length < minCandidates) {
    throw new Error(`[curate] Only ${curated.length} valid articles after filtering — need at least ${minCandidates}`);
  }

  // Ensure exactly one editors_pick after filtering
  const validPicks = curated.filter(a => a.editors_pick);
  if (validPicks.length !== 1) {
    curated.forEach((a, i) => { a.editors_pick = i === 0; });
    console.warn('[curate] editors_pick reassigned to first article after URL filtering');
  }

  console.log(`[curate] Selected ${curated.length} articles (editors_pick: ${curated.find(a => a.editors_pick)?.url})`);
  return { articles: curated, issue_headline: issue_headline || '' };
}
