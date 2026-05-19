import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are the editorial AI for "The Frequency," a twice-weekly AI digest with zero hype.
Your job is to select 6–12 stories from a candidate pool and assign them to categories.

CRITICAL: You must ONLY select URLs that appear verbatim in the candidates array you receive. Never invent, modify, or guess URLs. If a URL is not in the input, do not use it.

What to include:
- Original reporting, hands-on builder posts, peer-reviewed research
- Posts by people who build things or have real domain expertise — skin in the game
- Something the reader couldn't get from a headline

What to exclude — hard filter, no exceptions:
- LinkedIn posts recycling TechCrunch or other outlets
- "AI will replace X" thought pieces with no data or evidence
- Newsletter aggregators summarizing other newsletters
- Posts that read like "I asked ChatGPT to write this"
- Press releases dressed as blog posts
- "Top 10 AI tools" listicles where the author hasn't used them
- Lab blog posts from major AI companies (OpenAI, Google, Anthropic, Meta AI blogs)
- Vendor announcements and product marketing

Filter test: Does this person build things or have real domain expertise? Do they have skin in the game? Is there something here you couldn't get from a headline? No to any = out.

Other rules:
- Prioritize: practical depth, diverse authorship, international perspectives
- Diversity: at minimum 2 women authors and 2 non-US/UK voices per issue (infer from names, publications, context)
- Assign exactly ONE story as editors_pick: true — the most substantive, surprising, or immediately useful piece
- Zero hype: no "revolutionary", "game-changing", "unprecedented" in summaries

Summary writing rules (critical — read carefully):
- 2 sentences maximum
- Write like a sharp editor giving a colleague a quick brief — specific, direct, no throat-clearing
- Lead with the actual finding, insight, or what makes it worth reading — not a description of the piece
- NEVER start with: "This", "This article", "This includes", "This covers", "This explores", "This features", "You'll", "A look at", "An overview"
- Be concrete: name the actual tool, finding, number, decision, or person the piece is about
- If it's a list post, summarize the actual best insight from it, not "it covers N things"
- No adjective padding — cut "really", "deeply", "comprehensive", "detailed"

Categories:
- Builders: engineers, developers, open source projects, hands-on tutorials
- Research: papers, benchmarks, technical findings, evals
- AI × Business: adoption, economics, enterprise use, strategy
- Tools: new releases, comparisons, workflows worth adopting`;

const SELECT_ARTICLES_TOOL = {
  name: 'select_articles',
  description: 'Select and annotate the best articles for this issue of The Frequency.',
  input_schema: {
    type: 'object',
    properties: {
      selected: {
        type: 'array',
        minItems: 6,
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
              description: '2-sentence editorial summary, no hype — lead with the actual insight',
            },
            author: {
              type: 'string',
              description: 'Author name if identifiable from the article byline, URL, or publication context. Leave empty string if genuinely unknown — do not guess.',
            },
            editors_pick: {
              type: 'boolean',
              description: 'Exactly one story per issue must be true',
            },
            inclusion_reason: {
              type: 'string',
              description: 'Internal note: why this was selected (not rendered to readers)',
            },
          },
          required: ['url', 'category', 'summary', 'author', 'editors_pick'],
        },
      },
      diversity_notes: {
        type: 'string',
        description: 'Brief note confirming diversity requirements are met or flagging any shortfalls',
      },
    },
    required: ['selected'],
  },
};

export async function curate(rawArticles, seenUrls) {
  const seenSet = new Set(seenUrls);
  const candidates = rawArticles.filter(a => !seenSet.has(a.url));

  if (candidates.length < 6) {
    throw new Error(`[curate] Only ${candidates.length} unseen candidates — need at least 6`);
  }

  console.log(`[curate] Sending ${candidates.length} candidates to Claude for curation`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
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
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) {
    throw new Error('[curate] Claude did not return a tool_use block');
  }

  const { selected, diversity_notes } = toolUse.input;

  if (diversity_notes) {
    console.log(`[curate] Diversity notes: ${diversity_notes}`);
  }

  const editorsPicks = selected.filter(s => s.editors_pick);
  if (editorsPicks.length !== 1) {
    throw new Error(`[curate] Expected exactly 1 editors_pick, got ${editorsPicks.length}`);
  }

  // Merge Claude's selections back with the raw article data by URL
  const rawByUrl = Object.fromEntries(rawArticles.map(a => [a.url, a]));
  const curated = selected.reduce((acc, sel) => {
    const raw = rawByUrl[sel.url];
    if (!raw) {
      console.warn(`[curate] Skipping hallucinated URL: ${sel.url}`);
      return acc;
    }
    const author = sel.author || raw.author || '';
    return [...acc, { ...raw, ...sel, author }];
  }, []);

  if (curated.length < 6) {
    throw new Error(`[curate] Only ${curated.length} valid articles after filtering hallucinated URLs — need at least 6`);
  }

  // Ensure exactly one editors_pick after filtering
  const validPicks = curated.filter(a => a.editors_pick);
  if (validPicks.length !== 1) {
    // Fallback: assign editors_pick to the first article if the picked one was filtered out
    curated.forEach((a, i) => { a.editors_pick = i === 0; });
    console.warn(`[curate] editors_pick reassigned to first article after URL filtering`);
  }

  console.log(`[curate] Selected ${curated.length} articles (editors_pick: ${curated.find(a => a.editors_pick)?.url})`);
  return curated;
}
