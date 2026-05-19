# The Frequency — Automated Newsletter Pipeline

Twice-weekly AI digest that runs fully automatically every Tuesday and Thursday at 9am.

**Stack:** Node.js · Claude API · Tavily Search · Cloudflare Pages · Supabase · Gmail OAuth2

---

## How it works

```
node publish.js
  ├─ 1. Read state from Supabase (issue counter, seen URLs)
  ├─ 2. Search web via Tavily API (5 queries × 10 results)
  ├─ 3. Curate with Claude (8–12 stories, diversity rules, Editor's Pick)
  ├─ 4. Generate HTML (index.html, email-latest.html, archive.html)
  ├─ 5. Deploy public/ to Cloudflare Pages
  ├─ 6. Fetch subscribers from Supabase
  ├─ 7. Send personalized emails via Gmail OAuth2
  └─ 8. Save updated state to Supabase
```

---

## Setup

### 1. Install dependencies

```bash
cd the-frequency
npm install
```

Requires Node.js 18+.

### 2. Create Supabase tables

In the Supabase SQL editor at https://mhociwppaqolnlnsynfu.supabase.co, run:

```sql
-- Issue state table
create table if not exists newsletter_state (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Seed with current issue number (newsletter is on Issue #1)
insert into newsletter_state (key, value)
values ('issue_number', '1'), ('last_run', '')
on conflict do nothing;

-- Seen article URL history
create table if not exists seen_urls (
  url text primary key,
  issue_number int not null,
  added_at timestamptz default now()
);

-- Email open tracking (used by tracking-worker/)
create table if not exists email_opens (
  id bigserial primary key,
  issue_number int not null,
  opened_at timestamptz default now()
);
```

### 3. Fill in `.env`

Copy `.env.example` to `.env` and fill in the values:

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com → API keys |
| `TAVILY_API_KEY` | https://tavily.com → sign up, free tier, no credit card |
| `CF_ACCOUNT_ID` | Cloudflare dashboard → right sidebar |
| `CF_PROJECT_NAME` | Your Pages project name (must already exist) |
| `CF_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token (Pages:Edit) |
| `SUPABASE_URL` | Project settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project settings → API → service_role key |
| `GMAIL_CLIENT_ID` | Google Cloud Console → OAuth 2.0 credentials |
| `GMAIL_CLIENT_SECRET` | Same as above |
| `GMAIL_REFRESH_TOKEN` | Obtained once via OAuth flow (see below) |

### 4. Authorize Gmail OAuth2 (one-time)

1. Go to https://console.cloud.google.com
2. Create or open a project → **APIs & Services** → **Credentials**
3. Create an **OAuth 2.0 Client ID** (type: Desktop or Web)
4. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI
5. Go to https://developers.google.com/oauthplayground
6. Click the gear icon → check "Use your own OAuth credentials" → enter your Client ID + Secret
7. In step 1, search for and select: **Gmail API v1** → `https://mail.google.com/`
8. Click **Authorize APIs** → sign in as `lilitalent@gmail.com` → allow access
9. In step 2, click **Exchange authorization code for tokens**
10. Copy the **Refresh token** → paste into `.env` as `GMAIL_REFRESH_TOKEN`

The refresh token does not expire unless you revoke it or it's unused for 6+ months.

### 5. Create the Cloudflare Pages project

If the project doesn't exist yet:

```bash
# Install wrangler globally (one-time)
npm install -g wrangler
wrangler login

# Create the project
wrangler pages project create the-frequency
```

The project must exist before `deploy.js` can push deployments to it.

---

## Running manually

```bash
# Dry run — generates HTML only, no deploy, no email
DRY_RUN=true node publish.js

# Full run
node publish.js
```

---

## Scheduling via Claude Code /schedule

To run automatically every Tuesday and Thursday at 9am, use the `/schedule` skill in Claude Code:

1. Open Claude Code
2. Type `/schedule`
3. When prompted, configure:
   - **Prompt:** `Run node publish.js in /Users/lilit/lilit-operator/the-frequency/`
   - **Schedule:** `0 9 * * 2,4`

The scheduled agent will run the pipeline remotely. All state (issue counter, seen URLs) is in Supabase so it persists across runs regardless of where the script executes.

**Fallback: macOS crontab**

If remote scheduling isn't available, add to your crontab (`crontab -e`):

```cron
0 9 * * 2,4 cd /Users/lilit/lilit-operator/the-frequency && /opt/homebrew/bin/node publish.js >> logs/cron.log 2>&1
```

Find your node path with: `which node`

---

## Verifying a run

After a full run, check:

- `public/index.html` — open in browser, confirm content looks correct
- `public/email-latest.html` — open in browser, check email layout
- Cloudflare Pages dashboard — confirm new deployment is live
- Supabase `newsletter_state` table — `issue_number` should have incremented
- Supabase `seen_urls` table — new article URLs should appear
- Check `lilitalent@gmail.com` inbox for the email

---

## Design system

| Token | Value |
|---|---|
| Primary | `#6c47ff` |
| Gradient | `linear-gradient(135deg, #6c47ff, #a855f7)` |
| Background | `#f7f6f3` |
| Border | `#e8e5df` |
| Card | white, `border-radius: 12px` |
| Font | `-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| Analytics | Umami `06dbf26f-457b-473a-a135-27e85ed3ea7c` |

Do not change these values — they match the live site design.

---

## Content rules (enforced by Claude)

- Only articles published in the last 4 days
- No repeat articles (tracked in Supabase `seen_urls`)
- 8–12 stories per issue, 1 Editor's Pick
- ≥2 women authors, ≥2 non-US/UK voices
- Categories: Builders · Research · AI × Business · Tools
- No lab blog posts, press releases, or AI-generated content
- Zero hype language in summaries

---

## Troubleshooting

**Search returns too few results**
The 4-day filter is automatically relaxed to 7 days if fewer than 8 articles pass. If still too few, check `BRAVE_API_KEY` is valid.

**Curation fails with "Only N unseen candidates"**
All recent articles have already been used. Tavily may be returning the same results repeatedly. The pipeline will abort — try running again the next scheduled day.

**Deploy returns 404 or auth error**
Verify `CF_API_TOKEN` has Pages:Edit permission and `CF_PROJECT_NAME` matches exactly.

**Gmail "invalid_grant"**
The refresh token expired or was revoked. Repeat the OAuth flow in step 4 to get a new one.

**Archive link 404s on `/issue-N.html`**
Each issue is saved as both `index.html` (current) and `issue-N.html` (permalink). Both are deployed together, so they should always exist. If a past issue link 404s, re-deploy from that issue's `public/` state.
