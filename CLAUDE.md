# The Frequency — Project Instructions

## What This Is
A twice-weekly AI newsletter (thefrequency.lilitarutyunyan.com). Automated pipeline: Tavily search → Claude curation → HTML generation → Cloudflare Pages deploy → Resend email. Publishes every Tuesday 09:00 Lisbon.

Email: **Resend** (`RESEND_API_KEY`). Gmail OAuth2 was removed — it expired every 7 days. Never reintroduce it.
Supabase account: **pukkala@gmail.com** · project ref: `mhociwppaqolnlnsynfu`

**Lessons Learned log:** `LESSONS.md` — read it before touching the pipeline.

---

## Issue Quality Standards — Non-Negotiable

Every issue MUST pass ALL of these before going live:

| Check | Requirement |
|-------|-------------|
| Stories | 8–12 articles (hard minimum: 8) |
| Distinct domains | 5+ unique domains |
| Max per domain | 2 articles maximum from any single source |
| Women authors | Minimum 2 identified women authors |
| Non-US/UK voices | Minimum 2 voices from outside US/UK |
| Format | ALWAYS use Issue #1 design (`public/issue-1.html`) — never the masthead/lead-grid layout |

If any check fails, the issue must NOT be deployed. Fix curation first.

---

## Quality Watchdog — Sub-Agent Protocol

**After every issue is published (or regenerated), invoke the `quality-assurance` sub-agent to validate:**
1. Story count (8+), domain diversity (5+ domains, max 2 per domain)
2. Author diversity (2+ women, 2+ non-US/UK)
3. HTML format matches Issue #1 design exactly
4. No hallucinated URLs (all URLs resolve to real articles)
5. Editor's Pick is marked on exactly one story

If any check fails, report it immediately. Do NOT mark the issue as done until QA passes.

---

## Monday Preview Protocol

Every Monday morning, the pipeline runs in `PREVIEW_MODE=true` via GitHub Actions (`.github/workflows/preview.yml`). This:
- Searches and curates content for the upcoming Tuesday issue
- Deploys to Cloudflare Pages (preview URL, not production alias)
- Sends a preview email to `lilitalent@gmail.com` with `[PREVIEW]` subject prefix
- Does NOT update Supabase state (issue number + seen_urls unchanged)

**Lilit reviews the Monday preview and can:**
- Provide feedback or additional candidate URLs
- Request a re-curation before Tuesday

Tuesday's pipeline then runs normally and publishes the final version.

---

## PMM/Research Pre-Curation Protocol

Before or alongside Tavily search, the `research-content` sub-agent should be consulted for:
- What has been happening in AI this week? (news, papers, practitioner posts)
- Specific practitioner blogs to check: simonwillison.net, huyenchip.com, eugeneyan.com, vickiboykis.com, oneusefulthing.org, latent.space
- Any major AI events or papers from the past 7 days that shouldn't be missed
- Candidate URLs from diverse international sources (Africa, Southeast Asia, Latin America, Eastern Europe)

The research agent's candidate list gets injected into the Tavily pool before Claude's curation step.

---

## HTML Template — Canonical Reference

**ALWAYS use `public/issue-1.html` as the canonical template.** Never use any other format.

Key elements (all required):
- Header: brain emoji + "The Frequency" + tagline + issue/date badge + Archive + Share buttons
- Tabs: colored dot (●) before each label — Overview, Builders, Research, AI × Business, Tools, Authors, Sources
- Date banner: calendar emoji + date + editorial description + "Browse past issues →"
- Stats row: 4 columns — Stories, Podcast picks, Sources tracked, Authors on radar
- Editor's Pick: 🔥 EDITOR'S PICK section + card with "✦ MUST READ" badge
- Quick Hits: ⚡ QUICK HITS section + cards with left `.card-accent` border
- Authors panel: schedule-banner + emoji avatars (category icon, NOT initials) + "New" badge + bio + site link + "Who should be added next?" card
- Sources panel: schedule-banner + source pills with actual source URLs (not Google search) + SOURCE_META icons + "What's excluded and why" card
- Tab switching: `classList.add/remove('active')` — NOT `style.display`

---

## Pipeline Files

| File | Role |
|------|------|
| `publish.js` | Main pipeline (search → curate → generate → deploy → email) |
| `src/search.js` | Tavily queries across 12 query types, 40+ author domains |
| `src/curate.js` | Claude `select_articles` tool — 8–12 stories from candidate pool |
| `src/generate.js` | HTML generation — `renderFullIssue()` + `generateEmail()` |
| `src/email.js` | Gmail OAuth2 send + `sendPreviewEmail()` for Monday previews |
| `src/scheduler.js` | Schedule guard + timezone-aware subscriber windowing |
| `src/state.js` | Supabase: issue_number + seen_urls |
| `src/deploy.js` | Cloudflare Pages via wrangler |
| `.github/workflows/publish.yml` | Tuesday 08:00 UTC — full publish run |
| `.github/workflows/preview.yml` | Monday 08:00 UTC — preview email to editor |
| `schedule.json` | Weekly/campaign/once schedule config |
| `regen-issue3-fresh.js` | One-off: regenerate issue #3 with Tavily + manual candidates |

---

## Claude Code on the Web — Session Setup

**Every session working on this repo needs two things:**

### 1. Repository scope
When starting a new Claude Code web session, make sure `liliwashere/the-frequency` is included in the session's repository scope. If it isn't, load `mcp__claude-code-remote__list_repos` via ToolSearch and call `add_repo` to add it before attempting any GitHub pushes via `mcp__github__push_files`.

### 2. GITHUB_TOKEN secret
The session-start hook (`.claude/hooks/session-start.sh`) configures git credentials automatically using a `GITHUB_TOKEN` session secret. Without it, `git push` will fail.

To add the secret: **Claude Code on the web → Settings → Secrets → Add `GITHUB_TOKEN`** (a GitHub PAT with `repo` scope for `liliwashere/the-frequency`).

---

## Environment Variables Required

```
GITHUB_TOKEN          — GitHub PAT (repo scope) — for git push from Claude Code sessions
ANTHROPIC_API_KEY     — Claude API
TAVILY_API_KEY        — Tavily search
CF_ACCOUNT_ID         — Cloudflare
CF_API_TOKEN          — Cloudflare
CF_PROJECT_NAME       — the-frequency
SUPABASE_URL          — Supabase project URL
SUPABASE_SERVICE_ROLE_KEY — Supabase admin key
GMAIL_CLIENT_ID       — Gmail OAuth2
GMAIL_CLIENT_SECRET   — Gmail OAuth2
GMAIL_REFRESH_TOKEN   — Gmail OAuth2 (expires! regenerate via Google OAuth2 Playground)
GMAIL_FROM_ADDRESS    — lilitalent@gmail.com
```

---

## Deployment

```bash
# Manual deploy to Cloudflare Pages
CF_PROJECT_NAME=the-frequency CF_ACCOUNT_ID=... CF_API_TOKEN=... \
  npx wrangler pages deploy public/ --project-name=the-frequency

# Fresh regen for current issue (with Tavily + manual candidates)
node regen-issue3-fresh.js   # does NOT update Supabase state

# Full pipeline dry run
DRY_RUN=true node publish.js

# Monday preview (sends to lilitalent@gmail.com only)
PREVIEW_MODE=true node publish.js
```
