import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse } from 'node-html-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

const DS = {
  primary: '#6c47ff',
  gradient: 'linear-gradient(135deg, #6c47ff, #a855f7)',
  bg: '#f7f6f3',
  border: '#e8e5df',
  cardBg: '#ffffff',
  radius: '12px',
  font: "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  umamiId: '06dbf26f-457b-473a-a135-27e85ed3ea7c',
  siteUrl: 'https://thefrequency.lilitarutyunyan.com',
};

const CATEGORIES = ['Builders', 'Research', 'AI × Business', 'Tools'];

const CATEGORY_TAG_CLASS = {
  'Builders': 'tag',
  'Research': 'tag blue',
  'AI × Business': 'tag orange',
  'Tools': 'tag green',
};

const SUBSCRIBE_HOOK = 'https://hook.eu1.make.com/3g1ugqw30uuo1bwmht9l9hjk1yla4w69';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function nextIssueDate(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun,2=Tue,4=Thu
  let daysUntil;
  if (day < 2) daysUntil = 2 - day;
  else if (day === 2) daysUntil = 2; // Thu
  else if (day < 4) daysUntil = 4 - day;
  else daysUntil = 7 - day + 2; // next Tue
  d.setDate(d.getDate() + daysUntil);
  return formatDate(d);
}

function e(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addUtm(url, issueNum) {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'email');
    u.searchParams.set('utm_medium', 'newsletter');
    u.searchParams.set('utm_campaign', `issue-${issueNum}`);
    return u.toString();
  } catch {
    return url;
  }
}

function umamiAttrs(eventName, article) {
  return `data-umami-event="${eventName}" data-umami-event-title="${e(article.title)}" data-umami-event-category="${e(article.category)}"`;
}

// ── Full-page issue generator (Workers-site design) ───────────────────────────

function tagClass(category) {
  return CATEGORY_TAG_CLASS[category] ?? 'tag';
}

function uniqueSources(articles) {
  return [...new Set(articles.map(a => a.source).filter(Boolean))];
}

function uniqueAuthors(articles) {
  return [...new Set(articles.map(a => a.author).filter(Boolean))];
}

function renderFullIssue(ctx) {
  const ep = ctx.editors_pick;
  const rest = ctx.articles.filter(a => !a.editors_pick);
  const secondaryCards = rest.slice(0, 3);
  const hitsArticles = rest.slice(3);

  const sources = uniqueSources(ctx.articles);
  const authors = uniqueAuthors(ctx.articles);

  const activeTabs = CATEGORIES.filter(cat => ctx.articles.some(a => a.category === cat));

  function renderCategoryPanel(cat) {
    const arts = ctx.articles.filter(a => a.category === cat);
    if (!arts.length) return '';
    const filterBtns = [...new Set(arts.map(a => a.source).filter(Boolean))].slice(0, 5)
      .map(src => `<button class="filter-btn" onclick="filterCards('${cat.replace(/[^a-zA-Z0-9]/g, '-')}', '${e(src)}')">${e(src)}</button>`).join('\n            ');

    const articleRows = arts.map(a => `<div class="article" data-source="${e(a.source ?? '')}">
              <div class="article-content">
                <div class="article-tags"><span class="${tagClass(a.category)}">${e(a.category)}</span></div>
                <h3 class="article-title"><a href="${e(a.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-click', a)}>${e(a.title)}</a></h3>
                <p class="article-summary">${e(a.summary)}</p>
                ${a.author ? `<p class="article-byline">${e(a.author)}</p>` : ''}
              </div>
              <div class="article-source">
                <span class="source-name">${e(a.source ?? '')}</span>
                <a href="${e(a.url)}" class="read-btn" target="_blank" rel="noopener" ${umamiAttrs('article-read', a)}>Read →</a>
              </div>
            </div>`).join('\n            ');

    const panelId = cat.replace(/[^a-zA-Z0-9]/g, '-');
    return `<div class="panel" id="panel-${panelId}" style="display:none">
          <div class="panel-filters">
            <button class="filter-btn active" onclick="filterCards('${panelId}', null)">All</button>
            ${filterBtns}
          </div>
          <div class="article-list" id="list-${panelId}">
            ${articleRows}
          </div>
        </div>`;
  }

  const tabButtons = [
    `<button class="tab active" data-tab="overview" onclick="switchTab('overview')">Overview</button>`,
    ...activeTabs.map(cat => {
      const id = cat.replace(/[^a-zA-Z0-9]/g, '-');
      return `<button class="tab" data-tab="${id}" onclick="switchTab('${id}')">${e(cat)}</button>`;
    }),
  ].join('\n        ');

  const categoryPanels = activeTabs.map(renderCategoryPanel).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Frequency #${ctx.issue_number} — AI digest</title>
  <meta name="description" content="The Frequency: twice-weekly AI digest for builders and thinkers." />
  <script defer src="https://cloud.umami.is/script.js" data-website-id="${DS.umamiId}"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${DS.bg}; font-family: ${DS.font}; color: #1a1a1a; line-height: 1.6; font-size: 15px; }
    a { color: ${DS.primary}; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ── Masthead ── */
    .masthead {
      position: sticky; top: 0; z-index: 100;
      background: #fff; border-bottom: 1px solid #e8e5df;
      padding: 0 24px;
    }
    .masthead-inner {
      max-width: 1100px; margin: 0 auto;
      display: flex; align-items: center; gap: 16px;
      height: 60px;
    }
    .logo-mark {
      width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
      background: ${DS.gradient};
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; color: #fff;
    }
    .masthead-text { flex: 1; min-width: 0; }
    .masthead-name { font-size: 16px; font-weight: 800; color: #1a1a1a; line-height: 1.1; }
    .masthead-tagline { font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .issue-badge {
      background: ${DS.primary}; color: #fff;
      border-radius: 20px; padding: 3px 12px;
      font-size: 12px; font-weight: 700; white-space: nowrap;
    }
    .masthead-actions { display: flex; gap: 8px; }
    .btn-ghost {
      border: 1px solid #e8e5df; background: #fff; color: #555;
      border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 600;
      cursor: pointer; white-space: nowrap;
    }
    .btn-ghost:hover { border-color: #d4cff7; color: ${DS.primary}; }

    /* ── Nav tabs ── */
    .nav-bar {
      background: #fff; border-bottom: 1px solid #e8e5df;
      padding: 0 24px;
    }
    .nav-inner {
      max-width: 1100px; margin: 0 auto;
      display: flex; gap: 0; overflow-x: auto;
      scrollbar-width: none;
    }
    .nav-inner::-webkit-scrollbar { display: none; }
    .tab {
      padding: 14px 18px; font-size: 14px; font-weight: 600; color: #666;
      border: none; background: none; cursor: pointer; white-space: nowrap;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
    }
    .tab:hover { color: ${DS.primary}; }
    .tab.active { color: ${DS.primary}; border-bottom-color: ${DS.primary}; }

    /* ── Subscribe strip ── */
    .subscribe-strip {
      background: ${DS.gradient};
      padding: 20px 24px;
    }
    .subscribe-inner {
      max-width: 1100px; margin: 0 auto;
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    .subscribe-text { color: #fff; flex: 1; min-width: 200px; }
    .subscribe-text strong { font-size: 15px; }
    .subscribe-text span { font-size: 13px; opacity: 0.85; margin-left: 8px; }
    .subscribe-form { display: flex; gap: 8px; }
    .subscribe-input {
      border: none; border-radius: 8px; padding: 9px 14px;
      font-size: 14px; width: 220px; outline: none;
    }
    .subscribe-btn {
      background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5);
      color: #fff; border-radius: 8px; padding: 9px 18px;
      font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap;
    }
    .subscribe-btn:hover { background: rgba(255,255,255,0.35); }

    /* ── Page container ── */
    .page { max-width: 1100px; margin: 0 auto; padding: 32px 24px 80px; }

    /* ── Stats row ── */
    .stats-row {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 16px; margin-bottom: 32px;
    }
    .stat-cell {
      background: #fff; border: 1px solid ${DS.border};
      border-radius: ${DS.radius}; padding: 18px 20px; text-align: center;
    }
    .stat-num { font-size: 28px; font-weight: 900; color: ${DS.primary}; }
    .stat-label { font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

    /* ── Lead grid ── */
    .lead-grid {
      display: grid; grid-template-columns: 1fr 340px;
      gap: 20px; margin-bottom: 32px;
    }
    @media (max-width: 768px) { .lead-grid { grid-template-columns: 1fr; } }

    .lead-left {
      background: ${DS.gradient};
      border-radius: ${DS.radius}; padding: 32px; color: #fff;
      display: flex; flex-direction: column;
    }
    .lead-label {
      font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; opacity: 0.75; margin-bottom: 10px;
    }
    .lead-tag {
      display: inline-flex; align-items: center;
      background: rgba(255,255,255,0.2); border-radius: 6px;
      padding: 3px 10px; font-size: 12px; font-weight: 600;
      margin-bottom: 16px; width: fit-content;
    }
    .lead-title {
      font-size: 22px; font-weight: 900; line-height: 1.3;
      margin-bottom: 14px;
    }
    .lead-title a { color: #fff; }
    .lead-summary {
      font-size: 15px; opacity: 0.9; line-height: 1.65;
      flex: 1; margin-bottom: 20px;
    }
    .lead-byline { font-size: 13px; opacity: 0.7; margin-bottom: 18px; }
    .lead-read {
      display: inline-block;
      background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.45);
      color: #fff; border-radius: 8px; padding: 9px 20px;
      font-size: 14px; font-weight: 700; align-self: flex-start;
    }
    .lead-read:hover { background: rgba(255,255,255,0.35); text-decoration: none; }

    .lead-right { display: flex; flex-direction: column; gap: 14px; }

    .secondary {
      background: #fff; border: 1px solid ${DS.border};
      border-radius: ${DS.radius}; padding: 18px 20px;
      flex: 1; display: flex; flex-direction: column;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .secondary:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); border-color: #d4cff7; }
    .secondary-tag { margin-bottom: 8px; }
    .secondary-title { font-size: 15px; font-weight: 700; line-height: 1.35; margin-bottom: 8px; flex: 1; }
    .secondary-title a { color: #1a1a1a; }
    .secondary-title a:hover { color: ${DS.primary}; text-decoration: none; }
    .secondary-meta { font-size: 12px; color: #999; display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
    .secondary-meta a { color: ${DS.primary}; font-weight: 600; }

    /* ── Tags ── */
    .tag {
      display: inline-block; background: rgba(108,71,255,0.1);
      color: ${DS.primary}; border-radius: 5px;
      padding: 2px 9px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .tag.green { background: rgba(16,185,129,0.1); color: #059669; }
    .tag.orange { background: rgba(245,158,11,0.1); color: #d97706; }
    .tag.blue { background: rgba(59,130,246,0.1); color: #2563eb; }
    .tag.red { background: rgba(239,68,68,0.1); color: #dc2626; }

    /* ── Hits grid ── */
    .section-head {
      font-size: 12px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: #888;
      border-bottom: 1px solid ${DS.border}; padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .hits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 14px; margin-bottom: 40px;
    }
    .hit {
      background: #fff; border: 1px solid ${DS.border};
      border-radius: ${DS.radius}; padding: 18px 20px;
      display: flex; flex-direction: column;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .hit:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); border-color: #d4cff7; }
    .hit-tag { margin-bottom: 8px; }
    .hit-title { font-size: 15px; font-weight: 700; line-height: 1.35; margin-bottom: 8px; flex: 1; }
    .hit-title a { color: #1a1a1a; }
    .hit-title a:hover { color: ${DS.primary}; text-decoration: none; }
    .hit-summary { font-size: 13px; color: #555; line-height: 1.55; margin-bottom: 12px; }
    .hit-meta { font-size: 12px; color: #999; display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
    .hit-meta a { color: ${DS.primary}; font-weight: 600; font-size: 13px; }

    /* ── Category panels ── */
    .panel-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-btn {
      border: 1px solid ${DS.border}; background: #fff; color: #666;
      border-radius: 20px; padding: 5px 14px; font-size: 13px; font-weight: 500;
      cursor: pointer;
    }
    .filter-btn:hover, .filter-btn.active { border-color: ${DS.primary}; color: ${DS.primary}; background: rgba(108,71,255,0.06); }
    .article-list { display: flex; flex-direction: column; gap: 12px; }
    .article {
      background: #fff; border: 1px solid ${DS.border};
      border-radius: ${DS.radius}; padding: 18px 20px;
      display: grid; grid-template-columns: 1fr 120px;
      gap: 16px; align-items: start;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .article:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); border-color: #d4cff7; }
    .article-tags { margin-bottom: 8px; }
    .article-title { font-size: 16px; font-weight: 700; line-height: 1.35; margin-bottom: 8px; }
    .article-title a { color: #1a1a1a; }
    .article-title a:hover { color: ${DS.primary}; text-decoration: none; }
    .article-summary { font-size: 14px; color: #444; line-height: 1.6; }
    .article-byline { font-size: 12px; color: #999; margin-top: 6px; }
    .article-source { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; padding-top: 4px; }
    .source-name { font-size: 12px; color: #aaa; font-weight: 500; }
    .read-btn {
      display: inline-block; border: 1px solid ${DS.primary};
      color: ${DS.primary}; border-radius: 7px; padding: 5px 14px;
      font-size: 13px; font-weight: 700;
    }
    .read-btn:hover { background: ${DS.primary}; color: #fff; text-decoration: none; }

    /* ── Footer ── */
    .footer {
      border-top: 1px solid ${DS.border}; margin-top: 60px; padding-top: 32px;
      text-align: center; font-size: 13px; color: #999;
    }
    .footer a { color: ${DS.primary}; }
    .footer-brand { font-size: 16px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; }

    /* ── Toast ── */
    .toast {
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
      background: #1a1a1a; color: #fff; border-radius: 8px;
      padding: 10px 22px; font-size: 14px; font-weight: 600;
      opacity: 0; pointer-events: none; transition: opacity 0.25s;
      z-index: 9999;
    }
    .toast.show { opacity: 1; }

    @media (max-width: 600px) {
      .stats-row { grid-template-columns: repeat(3, 1fr); }
      .article { grid-template-columns: 1fr; }
      .article-source { flex-direction: row; align-items: center; justify-content: space-between; text-align: left; }
      .masthead-tagline { display: none; }
      .subscribe-form { width: 100%; }
      .subscribe-input { flex: 1; min-width: 0; }
    }
  </style>
</head>
<body>

<!-- Masthead -->
<header class="masthead">
  <div class="masthead-inner">
    <div class="logo-mark">🧠</div>
    <div class="masthead-text">
      <div class="masthead-name">The Frequency</div>
      <div class="masthead-tagline">Original AI thinking, twice a week · Real builders · Zero hype</div>
    </div>
    <span class="issue-badge">Issue #${ctx.issue_number}</span>
    <div class="masthead-actions">
      <a href="${DS.siteUrl}/archive.html"><button class="btn-ghost">Archive</button></a>
      <button class="btn-ghost" onclick="shareDigest()">Share</button>
    </div>
  </div>
</header>

<!-- Nav tabs -->
<nav class="nav-bar">
  <div class="nav-inner">
    ${tabButtons}
  </div>
</nav>

<!-- Subscribe strip -->
<div class="subscribe-strip">
  <div class="subscribe-inner">
    <div class="subscribe-text">
      <strong>Get The Frequency in your inbox</strong>
      <span>Every Thursday</span>
    </div>
    <form class="subscribe-form" onsubmit="handleSubscribe(event)">
      <input class="subscribe-input" type="email" placeholder="your@email.com" required id="sub-email" />
      <button class="subscribe-btn" type="submit">Subscribe →</button>
    </form>
  </div>
</div>

<!-- Main page -->
<div class="page">

  <!-- Overview panel -->
  <div class="panel" id="panel-overview" style="display:block">

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-cell">
        <div class="stat-num">${ctx.articles.length}</div>
        <div class="stat-label">Stories</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${sources.length}</div>
        <div class="stat-label">Sources</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${authors.length > 0 ? authors.length : activeTabs.length}</div>
        <div class="stat-label">${authors.length > 0 ? 'Authors' : 'Topics'}</div>
      </div>
    </div>

    <!-- Lead grid -->
    <div class="lead-grid">
      <div class="lead-left">
        <div class="lead-label">★ Editor's Pick</div>
        <div class="lead-tag">${e(ep.category)}</div>
        <h2 class="lead-title"><a href="${e(ep.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-click', ep)}>${e(ep.title)}</a></h2>
        <p class="lead-summary">${e(ep.summary)}</p>
        <p class="lead-byline">${ep.author ? e(ep.author) + ' · ' : ''}${e(ep.source)}</p>
        <a class="lead-read" href="${e(ep.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-read', ep)}>Read →</a>
      </div>
      <div class="lead-right">
        ${secondaryCards.map(a => `<div class="secondary">
          <div class="secondary-tag"><span class="${tagClass(a.category)}">${e(a.category)}</span></div>
          <div class="secondary-title"><a href="${e(a.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-click', a)}>${e(a.title)}</a></div>
          <div class="secondary-meta">
            <span>${a.author ? e(a.author) + ' · ' : ''}${e(a.source)}</span>
            <a href="${e(a.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-read', a)}>Read →</a>
          </div>
        </div>`).join('\n        ')}
      </div>
    </div>

    ${hitsArticles.length ? `<!-- Quick hits -->
    <div class="section-head">Quick Hits</div>
    <div class="hits-grid">
      ${hitsArticles.map(a => `<div class="hit">
        <div class="hit-tag"><span class="${tagClass(a.category)}">${e(a.category)}</span></div>
        <div class="hit-title"><a href="${e(a.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-click', a)}>${e(a.title)}</a></div>
        <div class="hit-summary">${e(a.summary)}</div>
        <div class="hit-meta">
          <span>${a.author ? e(a.author) + ' · ' : ''}${e(a.source)}</span>
          <a href="${e(a.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-read', a)}>Read →</a>
        </div>
      </div>`).join('\n      ')}
    </div>` : ''}

  </div><!-- /panel-overview -->

  <!-- Category panels -->
  ${categoryPanels}

</div><!-- /page -->

<!-- Footer -->
<footer class="footer">
  <div class="footer-brand">The Frequency</div>
  <p>Next issue: ${e(ctx.next_date)}</p>
  <p style="margin-top:8px;">
    <a href="${DS.siteUrl}/archive.html">Archive</a> &nbsp;·&nbsp;
    <a href="${DS.siteUrl}">Latest issue</a>
  </p>
  <p style="margin-top:12px;font-size:12px;color:#bbb;">Original AI thinking, twice a week.</p>
</footer>

<div class="toast" id="toast"></div>

<script>
  function switchTab(id) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    const btn = document.querySelector('[data-tab="' + id + '"]');
    if (btn) btn.classList.add('active');
    const panel = document.getElementById('panel-' + id);
    if (panel) panel.style.display = 'block';
    if (typeof umami !== 'undefined') umami.track('tab-switch', { tab: id });
  }

  function filterCards(panelId, source) {
    const list = document.getElementById('list-' + panelId);
    if (!list) return;
    list.querySelectorAll('.article').forEach(a => {
      a.style.display = (!source || a.dataset.source === source) ? '' : 'none';
    });
    const panel = document.getElementById('panel-' + panelId);
    if (panel) panel.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.textContent.trim() === (source ?? 'All'));
    });
  }

  function shareDigest() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'The Frequency #${ctx.issue_number}', url });
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied!'));
    }
    if (typeof umami !== 'undefined') umami.track('share');
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  async function handleSubscribe(e) {
    e.preventDefault();
    const email = document.getElementById('sub-email').value;
    try {
      await fetch('${SUBSCRIBE_HOOK}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      showToast('Subscribed! See you next issue.');
      document.getElementById('sub-email').value = '';
      if (typeof umami !== 'undefined') umami.track('subscribe');
    } catch {
      showToast('Something went wrong. Try again.');
    }
  }
</script>

</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateIssue(ctx) {
  const html = renderFullIssue(ctx);
  writeFileSync(path.join(PUBLIC, 'index.html'), html, 'utf8');
  writeFileSync(path.join(PUBLIC, `issue-${ctx.issue_number}.html`), html, 'utf8');
  console.log(`[generate] Wrote index.html and issue-${ctx.issue_number}.html`);
}

export function generateEmail(ctx) {
  const ep = ctx.editors_pick;
  const teasers = ctx.articles.filter(a => !a.editors_pick).slice(0, 4);
  const subject = `The Frequency #${ctx.issue_number} — ${ep.title.slice(0, 60)}${ep.title.length > 60 ? '…' : ''}`;
  const issuePageUrl = `${DS.siteUrl}?utm_source=email&utm_medium=newsletter&utm_campaign=issue-${ctx.issue_number}`;
  const openTrackerUrl = process.env.OPEN_TRACKER_URL;
  const pixelHtml = openTrackerUrl
    ? `\n<img src="${openTrackerUrl}?i=${ctx.issue_number}" width="1" height="1" alt="" style="display:block;height:1px;width:1px;border:0;" />`
    : '';

  const html = `<!-- subject: ${subject} -->
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f6f3;font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',sans-serif;">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f6f3">
<tr><td align="center" style="padding:24px 12px;">

<!-- Content card -->
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e5df;">

<!-- Header -->
<tr>
  <td style="background:#6c47ff;padding:32px 32px 28px;background-image:linear-gradient(135deg,#6c47ff,#a855f7);">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);">The Frequency</p>
    <p style="margin:0 0 6px;font-size:28px;font-weight:900;color:#ffffff;">Issue #${ctx.issue_number}</p>
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);">${e(ctx.date)}</p>
  </td>
</tr>

<!-- Greeting -->
<tr>
  <td style="padding:28px 32px 16px;">
    <p style="margin:0;font-size:15px;color:#1a1a1a;">Hi {{name}},</p>
    <p style="margin:10px 0 0;font-size:15px;color:#444;line-height:1.6;">Here's what's worth your attention in AI this week.</p>
  </td>
</tr>

<!-- Editor's Pick -->
<tr>
  <td style="padding:0 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#6c47ff;border-radius:10px;background-image:linear-gradient(135deg,#6c47ff,#a855f7);">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.75);">★ Editor's Pick</p>
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.6);">${e(ep.category)}</p>
          <p style="margin:0 0 10px;font-size:18px;font-weight:800;color:#ffffff;line-height:1.35;">${e(ep.title)}</p>
          <p style="margin:0 0 16px;font-size:14px;color:rgba(255,255,255,0.9);line-height:1.6;">${e(ep.summary)}</p>
          <p style="margin:0 0 16px;font-size:12px;color:rgba(255,255,255,0.65);">${ep.author ? e(ep.author) + ' · ' : ''}${e(ep.source)}</p>
          <a href="${e(addUtm(ep.url, ctx.issue_number))}" style="display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:#ffffff;text-decoration:none;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;">Read →</a>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Story teasers -->
${teasers.map(a => `<tr>
  <td style="padding:0 32px 20px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6c47ff;text-transform:uppercase;letter-spacing:0.08em;">${e(a.category)}</p>
    <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1a1a1a;line-height:1.35;"><a href="${e(addUtm(a.url, ctx.issue_number))}" style="color:#1a1a1a;text-decoration:none;">${e(a.title)}</a></p>
    <p style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.55;">${e(a.summary)}</p>
    <p style="margin:0;font-size:12px;color:#999;">${a.author ? e(a.author) + ' · ' : ''}${e(a.source)} &nbsp;<a href="${e(addUtm(a.url, ctx.issue_number))}" style="color:#6c47ff;font-weight:600;text-decoration:none;">Read →</a></p>
  </td>
</tr>
<tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #e8e5df;margin:0 0 20px;" /></td></tr>`).join('\n')}

<!-- CTA -->
<tr>
  <td style="padding:8px 32px 32px;text-align:center;">
    <a href="${issuePageUrl}" style="display:inline-block;background:#6c47ff;color:#ffffff;text-decoration:none;border-radius:10px;padding:14px 32px;font-size:15px;font-weight:700;">Read the full issue →</a>
  </td>
</tr>

<!-- Footer -->
<tr>
  <td style="padding:20px 32px 28px;border-top:1px solid #e8e5df;text-align:center;">
    <p style="margin:0 0 6px;font-size:13px;color:#999;">Next issue: ${e(ctx.next_date)}</p>
    <p style="margin:0;font-size:12px;color:#bbb;">You're receiving this because you subscribed to The Frequency.<br /><a href="${DS.siteUrl}/archive.html" style="color:#6c47ff;">Archive</a></p>
  </td>
</tr>

</table><!-- /content card -->
</td></tr>
</table><!-- /outer wrapper -->
${pixelHtml}
</body>
</html>`;

  writeFileSync(path.join(PUBLIC, 'email-latest.html'), html, 'utf8');
  console.log(`[generate] Wrote email-latest.html (subject: ${subject})`);

  return subject;
}

export function updateArchive(ctx) {
  const archivePath = path.join(PUBLIC, 'archive.html');
  const categoryList = CATEGORIES
    .filter(cat => ctx.articles.some(a => a.category === cat))
    .join(', ');

  const newCard = `<article class="archive-card" data-issue="${ctx.issue_number}">
    <div class="issue-meta">Issue #${ctx.issue_number} &nbsp;·&nbsp; ${e(ctx.date)}</div>
    <h3><a href="${DS.siteUrl}/issue-${ctx.issue_number}.html">The Frequency #${ctx.issue_number}</a></h3>
    <p>${ctx.articles.length} stories across ${e(categoryList)}</p>
    <p class="ep-label">★ Editor's Pick: <a href="${e(ctx.editors_pick.url)}">${e(ctx.editors_pick.title)}</a></p>
  </article>`;

  if (!existsSync(archivePath)) {
    // Create archive from scratch
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Frequency — Archive</title>
  <script defer src="https://cloud.umami.is/script.js" data-website-id="${DS.umamiId}"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${DS.bg}; font-family: ${DS.font}; color: #1a1a1a; line-height: 1.6; }
    a { color: ${DS.primary}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 720px; margin: 0 auto; padding: 0 20px 60px; }
    .header { background: ${DS.gradient}; padding: 40px 32px; border-radius: 0 0 ${DS.radius} ${DS.radius}; margin-bottom: 40px; }
    .header-logo { font-size: 22px; font-weight: 800; color: rgba(255,255,255,0.7); letter-spacing: 0.12em; text-transform: uppercase; }
    .header-title { font-size: 36px; font-weight: 900; color: #fff; margin: 4px 0 8px; }
    .header-meta { font-size: 14px; color: rgba(255,255,255,0.75); }
    .archive-card { background: #fff; border: 1px solid ${DS.border}; border-radius: ${DS.radius}; padding: 24px; margin-bottom: 16px; }
    .archive-card .issue-meta { font-size: 12px; color: #999; margin-bottom: 8px; }
    .archive-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
    .archive-card p { font-size: 14px; color: #555; margin-bottom: 4px; }
    .archive-card .ep-label { font-size: 13px; color: #6c47ff; }
    .back-link { display: inline-block; margin-bottom: 24px; font-size: 14px; color: ${DS.primary}; font-weight: 600; }
  </style>
</head>
<body>
<div class="header">
  <div class="container" style="padding-top:0;padding-bottom:0;">
    <div class="header-logo">The Frequency</div>
    <div class="header-title">Archive</div>
    <div class="header-meta">Every issue, in one place.</div>
  </div>
</div>
<div class="container">
  <a class="back-link" href="${DS.siteUrl}">← Latest issue</a>
  <div id="issues-list">
  ${newCard}
  </div>
</div>
</body>
</html>`;
    writeFileSync(archivePath, html, 'utf8');
  } else {
    // Prepend new card to existing archive
    const existing = readFileSync(archivePath, 'utf8');
    const root = parse(existing);
    const list = root.querySelector('#issues-list');
    if (!list) throw new Error('[generate] archive.html is missing #issues-list div');
    list.set_content(newCard + '\n  ' + list.innerHTML);
    writeFileSync(archivePath, root.toString(), 'utf8');
  }

  console.log(`[generate] Updated archive.html with Issue #${ctx.issue_number}`);
}
