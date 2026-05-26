/**
 * One-off: regenerate public/issue-3.html and public/index.html
 * using the correct Issue #1 editorial template.
 * Articles extracted from the existing (wrong-format) issue-3.html.
 */

import { generateIssue, generateEmail } from './src/generate.js';

const ctx = {
  issue_number: 3,
  date: 'Tuesday, May 26, 2026',
  next_date: 'Tuesday, June 2, 2026',
  issue_headline: "Google's agentic search pivot, the Claude Code builder wave, and who pays for robot training data",
  articles: [
    {
      editors_pick: true,
      title: 'Even If You Hate AI, You Will Use Google AI Search',
      url: 'https://www.wired.com/story/even-if-you-hate-ai-you-will-use-google-ai-search/',
      category: 'AI × Business',
      source: 'WIRED',
      author: 'Steven Levy',
      summary: "Google's new Gemini-powered search box — the biggest change to the search bar in company history — will capture even resistant users through sheer convenience, at the cost of the open web's ecosystem of creators and publishers. The AI Overview expansion, two years in the making, now places Gemini responses above the already-degraded ten blue links.",
    },
    {
      editors_pick: false,
      title: "AI Agents Plunged the Tech World Into Chaos. Here's Exactly How That Happened",
      url: 'https://www.wired.com/story/how-ai-agents-plunged-tech-world-into-chaos/',
      category: 'Builders',
      source: 'WIRED',
      author: null,
      summary: "A reported narrative tracing how Claude Code and Opus 4.5 — capable of running for hours, managing sub-agents, and outscoring every human on Anthropic's engineering exam — shifted how developers actually work, told through the practitioners who gathered at a London meetup called 'Claude Code Anonymous.' The piece tracks real product launches including OpenClaw, not just model announcements.",
    },
    {
      editors_pick: false,
      title: "I Spent a Week Recording Myself Doing Chores for Money. Who's the Robot Now?",
      url: 'https://www.wired.com/story/household-chores-training-robots/',
      category: 'AI × Business',
      source: 'WIRED',
      author: null,
      summary: "A journalist spent a week doing egocentric video data collection — knife in hand, iPhone strapped to forehead — to train humanoid robots, surfacing the growing gig economy around first-person robot training data. The piece notes workers in India earn similar rates (~$125/month) from these gigs as from other self-employed work, raising questions about who bears the cost of training embodied AI.",
    },
    {
      editors_pick: false,
      title: 'Google announces agent-optimized Gemini 3.5 Flash and a do-anything model called Omni',
      url: 'https://arstechnica.com/google/2026/05/google-announces-agent-optimized-gemini-3-5-flash-and-a-do-anything-model-called-omni/',
      category: 'Tools',
      source: 'Ars Technica',
      author: null,
      summary: "Gemini 3.5 Flash is Google's bet on an agent-optimized model that already claims to match last-gen Pro performance, with innovations threaded across Search, Docs, and Chrome rather than sitting in a single product. The accompanying Omni model targets broad multimodal tasks, continuing Google's tick-tock cadence of Flash catching up to Pro.",
    },
    {
      editors_pick: false,
      title: "Google Search Goes Agentic — and Doesn't Need You Anymore",
      url: 'https://www.wired.com/story/google-search-goes-agentic-and-doesnt-need-you-anymore/',
      category: 'AI × Business',
      source: 'WIRED',
      author: 'Reece Rogers',
      summary: "Google's redesigned Search now includes automated agents that act on users' behalf — booking, researching, comparing — without requiring active input, a shift the company frames as hyper-personalization but which raises serious questions about user agency and web traffic. Despite OpenClaw's early-adopter traction in early 2026, mainstream uptake of autonomous agents remains low.",
    },
    {
      editors_pick: false,
      title: 'Google Makes It Easy to Deepfake Yourself',
      url: 'https://www.wired.com/story/google-makes-it-easy-to-make-a-deepfake-of-yourself/',
      category: 'Tools',
      source: 'WIRED',
      author: null,
      summary: "Google's Flow video platform now ships an 'avatar' feature for generating selfie-style deepfakes and has swapped its underlying video model from Veo to Omni Flash, which promises richer spatial detail. The update is part of Google's broader push to normalize vibe coding and agentic media creation for mainstream users.",
    },
  ],
  editors_pick: null, // filled below
};

ctx.editors_pick = ctx.articles.find(a => a.editors_pick);

generateIssue(ctx);
generateEmail(ctx);

console.log('\nDone. Regenerated:');
console.log('  public/index.html');
console.log('  public/issue-3.html');
console.log('  public/email-latest.html');
