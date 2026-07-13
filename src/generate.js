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

// ── SVG Icon library (Lucide-style, inline, zero dependency) ─────────────────
const ICON = {
  // Header logo — EQ/frequency waveform
  logo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><g stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="12" x2="3" y2="12"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="4" x2="11" y2="20"/><line x1="15" y1="7" x2="15" y2="17"/><line x1="19" y1="10" x2="19" y2="14"/><line x1="21" y1="12" x2="21" y2="12"/></g></svg>`,
  // Buttons
  archive: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>`,
  share:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>`,
  // Section labels
  calendar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  star:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  bolt:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  signal:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>`,
  // Category card icons (18×18)
  code:       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>`,
  atom:       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5z"/></svg>`,
  briefcase:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  cpu:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" x2="9" y1="1" y2="4"/><line x1="15" x2="15" y1="1" y2="4"/><line x1="9" x2="9" y1="20" y2="23"/><line x1="15" x2="15" y1="20" y2="23"/><line x1="20" x2="23" y1="9" y2="9"/><line x1="20" x2="23" y1="14" y2="14"/><line x1="1" x2="4" y1="9" y2="9"/><line x1="1" x2="4" y1="14" y2="14"/></svg>`,
  // Podcast thumbnails (28×28)
  headphones: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  mic:        `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/></svg>`,
  radio:      `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>`,
  podcast:    `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="11" r="1"/><path d="M11 17a1 1 0 0 1 2 0c0 .5-.34 3-.5 4.5a.5.5 0 0 1-1 0c-.16-1.5-.5-4-.5-4.5Z"/><path d="M8 14a5 5 0 1 1 8 0"/><path d="M17 18.5a9 9 0 1 0-10 0"/></svg>`,
  // Panel banners (24×24)
  users:      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  globe:      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  // Source pill icons (16×16)
  newspaper:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
  flask:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M14 3v4.3l4.85 8.14a1 1 0 0 1-.85 1.56H5.98a1 1 0 0 1-.85-1.56L10 7.3V3"/></svg>`,
  blog:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
  link:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  pencil:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
};

// Tab config: id, label, dot color, accent, SVG icon, icon bg/color
const CATEGORY_TAB = {
  'Builders':      { id: 'builders', dot: '#16a34a', accent: '#16a34a', icon: ICON.code,      iconBg: '#f0faf3', iconColor: '#16a34a', tagClass: 'tag green' },
  'Research':      { id: 'research', dot: '#2563eb', accent: '#2563eb', icon: ICON.atom,      iconBg: '#eff6ff', iconColor: '#2563eb', tagClass: 'tag blue'  },
  'AI × Business': { id: 'business', dot: '#dc2626', accent: '#dc2626', icon: ICON.briefcase, iconBg: '#fff1f1', iconColor: '#dc2626', tagClass: 'tag red'   },
  'Tools':         { id: 'tools',    dot: '#ea580c', accent: '#ea580c', icon: ICON.cpu,       iconBg: '#fff8ef', iconColor: '#ea580c', tagClass: 'tag orange' },
};

const LANG_FLAGS = {
  fr: '🇫🇷', es: '🇪🇸', pt: '🇧🇷', de: '🇩🇪', ja: '🇯🇵',
  zh: '🇨🇳', ko: '🇰🇷', ar: '🇸🇦', ru: '🇷🇺', it: '🇮🇹',
  nl: '🇳🇱', pl: '🇵🇱', tr: '🇹🇷', hi: '🇮🇳', sw: '🇰🇪',
};
const LANG_NAMES = {
  fr: 'French', es: 'Spanish', pt: 'Portuguese', de: 'German',
  ja: 'Japanese', zh: 'Chinese', ko: 'Korean', ar: 'Arabic',
  ru: 'Russian', it: 'Italian', nl: 'Dutch', pl: 'Polish',
  tr: 'Turkish', hi: 'Hindi', sw: 'Swahili',
};

const SUBSCRIBE_HOOK = 'https://the-frequency-subscribe.lilitalent.workers.dev';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function nextIssueDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const daysUntil = day === 2 ? 7 : (2 - day + 7) % 7;
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

function langBadge(article) {
  const lang = article.language;
  if (!lang || lang === 'en') return '';
  const flag = LANG_FLAGS[lang] ?? '';
  const name = LANG_NAMES[lang] ?? lang.toUpperCase();
  return `<span class="lang-badge">${flag} ${name}</span>`;
}

function translatedBlock(article) {
  if (!article.translated_excerpt) return '';
  const name = LANG_NAMES[article.language] ?? article.language;
  return `<div class="translated-excerpt"><span class="translated-label">Originally in ${e(name)}</span>${e(article.translated_excerpt)}</div>`;
}

// ── Full-page issue generator (Issue #1 editorial design) ────────────────────

function tagClass(category) {
  return CATEGORY_TAB[category]?.tagClass ?? 'tag';
}

function uniqueSources(articles) {
  return [...new Set(articles.map(a => a.source).filter(Boolean))];
}

function uniqueAuthors(articles) {
  return [...new Set(articles.map(a => a.author).filter(Boolean))];
}

function renderFullIssue(ctx, { forHomepage = false } = {}) {
  const ep = ctx.editors_pick;
  const rest = ctx.articles.filter(a => !a.editors_pick);

  const sources = uniqueSources(ctx.articles);
  const activeTabs = CATEGORIES.filter(cat => ctx.articles.some(a => a.category === cat));

  // Build author map
  const authorMap = {};
  for (const a of ctx.articles) {
    if (!a.author) continue;
    if (!authorMap[a.author]) {
      authorMap[a.author] = { author: a.author, author_url: a.author_url || '', author_bio: a.author_bio || '', articles: [] };
    }
    authorMap[a.author].articles.push(a);
  }
  const authorList = Object.values(authorMap);

  function initials(name) {
    return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function cardAccentStyle(cat) {
    return 'background:' + (CATEGORY_TAB[cat]?.accent ?? '#6c47ff');
  }

  function cardIconHtml(article, purpleBg) {
    const tab = CATEGORY_TAB[article.category];
    const icon = tab?.icon ?? ICON.pencil;
    const bg = purpleBg ? '#f0edff' : (tab?.iconBg ?? '#f0edff');
    const color = purpleBg ? '#6c47ff' : (tab?.iconColor ?? '#6c47ff');
    return '<div class="card-icon" style="background:' + bg + ';color:' + color + '">' + icon + '</div>';
  }

  function cardSourceLine(a) {
    return a.author ? e(a.author) + ' · ' + e(a.source ?? '') : e(a.source ?? '');
  }

  // ── Category panel ──────────────────────────────────────────────────────────
  function renderCategoryPanel(cat) {
    const arts = ctx.articles.filter(a => a.category === cat);
    if (!arts.length) return '';
    const tab = CATEGORY_TAB[cat] ?? {};
    const panelId = tab.id ?? cat.replace(/[^a-zA-Z0-9]/g, '-');
    const sectionIcon = tab.icon ?? ICON.pencil;
    const filterSources = [...new Set(arts.map(a => a.source).filter(Boolean))].slice(0, 5);
    const filterBtns = [
      '<button class="filter-btn active" onclick="filterCards(this,\'all\',\'' + panelId + '\')">All</button>',
      ...filterSources.map(src => '<button class="filter-btn" onclick="filterCards(this,\'' + src.replace(/'/g, "\\'") + '\',\'' + panelId + '\')">' + e(src) + '</button>'),
    ].join('\n        ');

    const cards = arts.map(a => `<div class="card clickable" data-source="${e(a.source ?? '')}" onclick="window.open('${e(a.url)}','_blank')">
        <div class="card-accent" style="${cardAccentStyle(a.category)}"></div>
        <div class="card-header">
          ${cardIconHtml(a)}
          <div class="card-meta">
            <div class="card-source">${cardSourceLine(a)}</div>
            <div class="card-title">${e(a.title)}</div>
          </div>
        </div>
        <div class="card-body">${e(a.summary)}${translatedBlock(a)}</div>
        <div class="card-footer">
          <span class="${tagClass(a.category)}">${e(a.category)}</span>${langBadge(a)}
          <a class="read-link" href="${e(a.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-read', a)}>Read →</a>
        </div>
      </div>`).join('\n      ');

    return `<div class="panel" id="panel-${panelId}">
      <div class="filter-row">
        ${filterBtns}
      </div>
      <div class="section-label">${sectionIcon} ${e(cat)} stories</div>
      ${cards}
    </div>`;
  }

  // ── Authors panel ───────────────────────────────────────────────────────────
  const AVATAR_BG = {
    'Builders': '#f0faf3', 'Research': '#eff6ff',
    'AI × Business': '#fff1f1', 'Tools': '#fff8ef',
  };
  function avatarBg(articles) {
    const cat = articles[0]?.category;
    return AVATAR_BG[cat] ?? '#f0edff';
  }

  const authorsPanel = authorList.length ? `<div class="panel" id="panel-authors">
    <div class="schedule-banner">
      <div class="schedule-icon">${ICON.users}</div>
      <div>
        <div class="schedule-title">${authorList.length} author${authorList.length !== 1 ? 's' : ''} on the radar — growing each issue</div>
        <div class="schedule-sub">Only people who build things, have skin in the game, or do original research. No aggregators.</div>
      </div>
    </div>
    <div class="section-label">${ICON.users} Who we track</div>
    <div class="author-grid">
      ${authorList.map(a => {
        const bg = avatarBg(a.articles);
        const catIcon = CATEGORY_TAB[a.articles[0]?.category]?.icon ?? ICON.pencil;
        const catIconColor = CATEGORY_TAB[a.articles[0]?.category]?.iconColor ?? '#6c47ff';
        const handle = a.author_url ? (() => { try { return new URL(a.author_url).hostname.replace(/^www\./, ''); } catch { return ''; } })() : '';
        return '<div class="author-card">'
          + '<div class="author-top">'
          + '<div class="author-avatar" style="background:' + bg + ';color:' + catIconColor + '">' + catIcon + '</div>'
          + '<div class="author-info">'
          + '<div class="author-name">' + e(a.author) + '</div>'
          + (handle ? '<div class="author-handle">' + e(handle) + '</div>' : '')
          + '</div>'
          + '<span class="author-new">New</span>'
          + '</div>'
          + (a.author_bio ? '<div class="author-bio">' + e(a.author_bio) + '</div>' : '')
          + '<div class="author-links">'
          + (a.author_url ? '<a class="author-link" href="' + e(a.author_url) + '" target="_blank" rel="noopener">Site</a>' : '')
          + a.articles.map(art => '<a class="author-link" href="' + e(art.url) + '" target="_blank" rel="noopener">' + e(art.title.slice(0, 38)) + (art.title.length > 38 ? '…' : '') + '</a>').join('')
          + '</div>'
          + '</div>';
      }).join('\n      ')}
    </div>
    <div class="section-label">${ICON.signal} Who should be added next?</div>
    <div class="card" style="cursor:default">
      <div class="card-body">
        Each issue, Claude scouts for new voices to add — filtering for: real skin in the game, original thinking (not aggregation), and content you couldn't get from reading a summary. Priority watchlist: <strong>Chip Huyen</strong> (ML systems at scale), <strong>Vicki Boykis</strong> (ML engineering, honest takes), <strong>Simon Willison</strong> (Django co-creator, practical AI tools), <strong>Ethan Mollick</strong> (Wharton researcher on AI adoption), and voices from Africa, Southeast Asia, and Latin America covering AI from the ground up.
      </div>
    </div>
  </div>` : '';

  // ── Sources panel ───────────────────────────────────────────────────────────
  const SOURCE_NAME_MAP = {
    'wired': 'wired.com', 'ars technica': 'arstechnica.com',
    'mit technology review': 'technologyreview.com', 'the gradient': 'thegradient.pub',
    'rest of world': 'restofworld.org', 'tech in asia': 'techinasia.com',
    'tech cabal': 'techcabal.com', 'techcabal': 'techcabal.com',
    'analytics india magazine': 'analyticsindiamag.com',
    'hugging face': 'huggingface.co', 'hacker news': 'news.ycombinator.com',
    'every': 'every.to',
  };

  const SOURCE_META = {
    'wired.com':              { icon: ICON.newspaper, type: 'Publication · Tech journalism' },
    'arstechnica.com':        { icon: ICON.flask,     type: 'Publication · Tech analysis' },
    'technologyreview.com':   { icon: ICON.flask,     type: 'MIT Technology Review' },
    'simonwillison.net':      { icon: ICON.blog,      type: 'Blog · Technical AI' },
    'eugeneyan.com':          { icon: ICON.blog,      type: 'Blog · ML engineering' },
    'interconnects.ai':       { icon: ICON.link,      type: 'Newsletter · AI research' },
    'latent.space':           { icon: ICON.podcast,   type: 'Podcast + Blog · AI engineering' },
    'huyenchip.com':          { icon: ICON.blog,      type: 'Blog · ML systems' },
    'stratechery.com':        { icon: ICON.newspaper, type: 'Newsletter · Tech strategy' },
    'paulgraham.com':         { icon: ICON.pencil,    type: 'Essays · YC co-founder' },
    'oneusefulthing.org':     { icon: ICON.pencil,    type: 'Newsletter · AI research' },
    'blog.matt-rickard.com':  { icon: ICON.blog,      type: 'Blog · AI engineering' },
    'techcabal.com':          { icon: ICON.globe,     type: 'Publication · Africa tech' },
    'techinasia.com':         { icon: ICON.globe,     type: 'Publication · Asia tech' },
    'restofworld.org':        { icon: ICON.globe,     type: 'Publication · Global tech' },
    'analyticsindiamag.com':  { icon: ICON.newspaper, type: 'Publication · India AI' },
    'huggingface.co':         { icon: ICON.cpu,       type: 'Platform · ML community' },
    'arxiv.org':              { icon: ICON.flask,     type: 'Preprint · Research' },
    'substack.com':           { icon: ICON.pencil,    type: 'Newsletter platform' },
    'every.to':               { icon: ICON.pencil,    type: 'Bundle · AI writing' },
    'zenn.dev':               { icon: ICON.blog,      type: 'Platform · Japanese tech' },
    'habr.com':               { icon: ICON.blog,      type: 'Community · Russian tech' },
    'thegradient.pub':        { icon: ICON.flask,     type: 'Publication · ML research' },
    'swyx.io':                { icon: ICON.blog,      type: 'Blog · AI engineering' },
    'levels.io':              { icon: ICON.blog,      type: 'Blog · Solo founder' },
    'vickiboykis.com':        { icon: ICON.flask,     type: 'Blog · ML engineering' },
    'sebastianraschka.com':   { icon: ICON.flask,     type: 'Blog · ML research' },
    'hamel.dev':              { icon: ICON.blog,      type: 'Blog · LLM engineering' },
  };

  const articlesPerSource = {};
  const sourceUrlMap = {};
  for (const a of ctx.articles) {
    if (a.source) articlesPerSource[a.source] = (articlesPerSource[a.source] ?? 0) + 1;
    if (a.source && a.url && !sourceUrlMap[a.source]) {
      try { sourceUrlMap[a.source] = new URL(a.url).origin; } catch {}
    }
  }

  const sourcesPanel = `<div class="panel" id="panel-sources">
    <div class="schedule-banner">
      <div class="schedule-icon">${ICON.globe}</div>
      <div>
        <div class="schedule-title">${sources.length} source${sources.length !== 1 ? 's' : ''} this issue</div>
        <div class="schedule-sub">Original practitioner writing, not LinkedIn recaps or aggregator noise.</div>
      </div>
    </div>
    <div class="section-label">${ICON.signal} Active sources</div>
    <div class="sources-grid">
      ${sources.map(src => {
        const srcLower = src.toLowerCase().replace(/^www\./, '');
        const domainKey = SOURCE_NAME_MAP[srcLower] ?? srcLower;
        const meta = SOURCE_META[domainKey] ?? { icon: ICON.newspaper, type: 'This issue' };
        const count = articlesPerSource[src] ?? 0;
        const hotClass = count >= 2 ? ' hot' : '';
        const href = sourceUrlMap[src] ?? ('https://' + domainKey);
        return `<a class="source-pill${hotClass}" href="${e(href)}" target="_blank" rel="noopener">
        <span class="source-pill-icon">${meta.icon}</span>
        <div class="source-pill-info">
          <div class="source-pill-name">${e(src)}</div>
          <div class="source-pill-type">${e(meta.type)}</div>
        </div>
      </a>`;
      }).join('\n      ')}
    </div>
    <div class="section-label">${ICON.bolt} What's excluded and why</div>
    <div class="card" style="cursor:default">
      <div class="card-body">
        <strong>Out:</strong> LinkedIn posts recycling TechCrunch · "AI will replace X" think pieces with no data · Newsletter aggregators summarising other newsletters · "I asked ChatGPT to write this" posts · Press releases dressed as blog posts · Top-10 AI tools listicles where the author hasn't used them.<br><br>
        <strong>The filter:</strong> Does this person build things or have real domain expertise? Do they have skin in the game? Is there something here you couldn't get from a headline? No to any = out.
      </div>
    </div>
  </div>`;

  // ── Podcast picks (static curated shows, updated each issue) ──────────────
  const PODCAST_PICKS = [
    {
      url: 'https://www.latent.space/',
      host: 'Latent Space · swyx & Alessio Fanelli',
      title: 'The most technically rigorous AI engineering podcast running',
      desc: 'swyx and Alessio interview the engineers actually building frontier systems — not the comms teams. 175+ episodes, zero fluff. Their AI for Science arc and the Claude Code Anonymous episode are essential listening for anyone shipping with LLMs.',
      meta: '⏱ ~60 min · AI engineers + builders · 175+ eps',
      gradient: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
      icon: ICON.headphones,
      tags: ['Engineering', 'Builders'],
    },
    {
      url: 'https://www.lennysnewsletter.com/p/introducing-how-i-ai',
      host: 'How I AI · Claire Vo · Lenny\'s spinoff',
      title: 'Real AI workflows, live screen shares — the format every podcast should steal',
      desc: '30-minute episodes with practitioners showing their actual AI setup on screen. No scripted hot takes — just what people actually do day to day. Best for product people and builders who learn by watching, not reading.',
      meta: '~30 min · Product + builder audience',
      gradient: 'linear-gradient(135deg,#6c47ff,#a855f7)',
      icon: ICON.mic,
      tags: ['Workflows', 'Product'],
    },
    {
      url: 'https://podcasts.apple.com/us/podcast/no-priors-artificial-intelligence-technology-startups/id1668002688',
      host: 'No Priors · Elad Gil & Sarah Guo',
      title: 'The most technically honest AI investor podcast',
      desc: 'Elad Gil and Sarah Guo don\'t softball. Episodes with Nat Friedman, Daniel Gross, and leading researchers speak plainly about what AI actually can and can\'t do. No "AI will change everything" non-answers — just sharp investor-grade thinking.',
      meta: '~45 min · Founders + researchers',
      gradient: 'linear-gradient(135deg,#1a1a2e,#16213e)',
      icon: ICON.radio,
      tags: ['Research', 'Strategy'],
    },
    {
      url: 'https://twimlai.com/podcast/',
      host: 'TWIML AI Podcast · Sam Charrington',
      title: 'Deep technical interviews with ML researchers and practitioners',
      desc: 'Sam Charrington has been running TWIML (This Week in Machine Learning & AI) since 2016 — one of the longest-running ML podcasts with serious technical depth. Best for following research trends: papers, benchmarks, and practitioner case studies that don\'t make headlines.',
      meta: '~60 min · ML researchers + engineers',
      gradient: 'linear-gradient(135deg,#0f4c75,#1b262c)',
      icon: ICON.podcast,
      tags: ['Research', 'ML depth'],
    },
  ];

  const podcastsPanel = `<div class="panel" id="panel-pods">
    <div class="section-label">${ICON.podcast} Shows worth your time</div>
    ${PODCAST_PICKS.map(p => `<div class="card clickable" onclick="window.open('${e(p.url)}','_blank')">
      <div class="card-accent" style="background:#ea580c"></div>
      <div class="ep-card">
        <div class="ep-thumb" style="background:${p.gradient};color:rgba(255,255,255,0.9)">${p.icon}</div>
        <div class="ep-info">
          <div class="card-source" style="font-size:11px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${e(p.host)}</div>
          <div class="ep-title">${e(p.title)}</div>
          <div class="ep-desc">${e(p.desc)}</div>
          <div class="ep-meta">${e(p.meta)}</div>
        </div>
      </div>
      <div class="card-footer" style="margin-top:14px">
        <span class="tag orange">Show rec</span>${p.tags.map(t => '<span class="tag">' + e(t) + '</span>').join('')}
        <a class="read-link" href="${e(p.url)}" target="_blank" rel="noopener">Listen →</a>
      </div>
    </div>`).join('\n    ')}
  </div>`;

  // ── Tab buttons — fixed order: Overview · Builders · Podcasts · Research · AI×Business · Tools · Authors · Sources ──
  const TAB_ORDER = ['Builders', 'Podcasts', 'Research', 'AI × Business', 'Tools'];
  const tabButtons = [
    '<div class="tab active" onclick="switchTab(\'overview\')" data-tab="overview"><span class="tab-dot" style="background:#6c47ff"></span> Overview</div>',
    ...TAB_ORDER.flatMap(cat => {
      if (cat === 'Podcasts') {
        return ['<div class="tab" onclick="switchTab(\'pods\')" data-tab="pods"><span class="tab-dot" style="background:#ea580c"></span> Podcasts</div>'];
      }
      if (!activeTabs.includes(cat)) return [];
      const tab = CATEGORY_TAB[cat] ?? {};
      const id = tab.id ?? cat.replace(/[^a-zA-Z0-9]/g, '-');
      return ['<div class="tab" onclick="switchTab(\'' + id + '\')" data-tab="' + id + '"><span class="tab-dot" style="background:' + (tab.dot ?? '#888') + '"></span> ' + e(cat) + '</div>'];
    }),
    ...(authorList.length ? ['<div class="tab" onclick="switchTab(\'authors\')" data-tab="authors"><span class="tab-dot" style="background:#f59e0b"></span> Authors</div>'] : []),
    '<div class="tab" onclick="switchTab(\'sources\')" data-tab="sources"><span class="tab-dot" style="background:#888"></span> Sources</div>',
  ].join('\n  ');

  const categoryPanels = activeTabs.map(renderCategoryPanel).join('\n  ');

  const issueUrl = `${DS.siteUrl}/issue-${ctx.issue_number}`;
  const canonicalUrl = forHomepage ? `${DS.siteUrl}/` : issueUrl;
  const dateStr = new Date().toISOString().split('T')[0];

  // Titles — keyword-rich, lead with the substance
  const headlineShort = ctx.issue_headline
    ? (ctx.issue_headline.length > 65 ? ctx.issue_headline.slice(0, 62) + '…' : ctx.issue_headline)
    : null;
  const pageTitle = forHomepage
    ? 'The Frequency: What Matters in AI This Week'
    : headlineShort
      ? `${headlineShort} | The Frequency #${ctx.issue_number}`
      : `The Frequency #${ctx.issue_number} — ${e(ctx.date)} | Weekly AI Digest`;

  // Descriptions — written for humans clicking from search, not robots
  const siteDesc = 'A weekly AI newsletter for builders and product teams: curated research, practitioner insights, and analysis worth your time. Every Tuesday.';
  const issueDesc = ctx.issue_headline
    ? `This week in AI: ${ctx.issue_headline}. Curated research and analysis for builders and product teams. Every Tuesday.`
    : ep
      ? `${ep.title.slice(0, 100)} — plus ${ctx.articles.length - 1} more stories. Curated AI insight for builders and product teams. Every Tuesday.`
      : siteDesc;
  const ogDesc = forHomepage ? siteDesc : issueDesc;

  // Schema.org — BlogPosting for issue pages, WebSite + BlogPosting for homepage
  const schemaAuthor = `{ "@type": "Person", "name": "Lilit Arutyunyan", "url": "https://lilitarutyunyan.com", "sameAs": ["https://lilitarutyunyan.com"] }`;
  const schemaBlogPosting = `{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "name": "The Frequency #${ctx.issue_number}",
    "headline": "${e(ctx.issue_headline || ep?.title || '')}",
    "datePublished": "${dateStr}",
    "dateModified": "${dateStr}",
    "url": "${issueUrl}",
    "description": "${e(issueDesc)}",
    "author": ${schemaAuthor},
    "publisher": {
      "@type": "Organization",
      "name": "The Frequency",
      "url": "${DS.siteUrl}",
      "logo": { "@type": "ImageObject", "url": "${DS.siteUrl}/logo-512.png", "width": 512, "height": 512 }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": "${issueUrl}" },
    "isPartOf": { "@type": "Blog", "name": "The Frequency", "url": "${DS.siteUrl}" },
    "about": [
      { "@type": "Thing", "name": "Artificial Intelligence" },
      { "@type": "Thing", "name": "Machine Learning" },
      { "@type": "Thing", "name": "AI Tools" }
    ],
    "keywords": "AI news, artificial intelligence, weekly digest, AI tools, machine learning, product management"
  }`;
  const schemaWebSite = `{
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "The Frequency",
    "url": "${DS.siteUrl}",
    "description": "${e(siteDesc)}",
    "inLanguage": "en",
    "author": ${schemaAuthor},
    "about": { "@type": "Thing", "name": "Artificial Intelligence" }
  }`;
  const jsonLd = forHomepage
    ? `[\n  ${schemaWebSite},\n  ${schemaBlogPosting}\n]`
    : schemaBlogPosting;

  // Article OG tags (for issue pages only — helps news aggregators pick up the content)
  const articleOg = forHomepage ? '' : `
  <meta property="article:author" content="https://lilitarutyunyan.com" />
  <meta property="article:published_time" content="${dateStr}T09:00:00+01:00" />
  <meta property="article:section" content="Technology" />
  <meta property="article:tag" content="Artificial Intelligence" />
  <meta property="article:tag" content="AI Tools" />
  <meta property="article:tag" content="Machine Learning" />`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${e(pageTitle)}</title>
  <meta name="description" content="${e(ogDesc)}" />
  <meta name="author" content="Lilit Arutyunyan" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:site_name" content="The Frequency" />
  <meta property="og:title" content="${e(pageTitle)}" />
  <meta property="og:description" content="${e(ogDesc)}" />
  <meta property="og:type" content="${forHomepage ? 'website' : 'article'}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${DS.siteUrl}/logo-512.png" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:locale" content="en_US" />${articleOg}
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${e(pageTitle)}" />
  <meta name="twitter:description" content="${e(ogDesc)}" />
  <meta name="twitter:image" content="${DS.siteUrl}/logo-512.png" />
  <script type="application/ld+json">
  ${jsonLd}
  </script>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="192x192" href="/logo-192.png" />
  <script defer src="https://cloud.umami.is/script.js" data-website-id="${DS.umamiId}"></script>
  <style>
    :root {
      color-scheme: light;
      --purple: #6c47ff;
      --purple-light: #f0edff;
      --purple-mid: #c4b5fd;
      --green: #16a34a;
      --green-light: #f0faf3;
      --orange: #ea580c;
      --orange-light: #fff8ef;
      --blue: #2563eb;
      --blue-light: #eff6ff;
      --red: #dc2626;
      --red-light: #fff1f1;
      --gray: #888;
      --border: #e8e5df;
      --bg: #f7f6f3;
      --white: #fff;
      --text: #1a1a1a;
      --muted: #555;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── IRIDESCENT BACKGROUND ── */
    @keyframes iridescentFlow {
      0%   { background-position: 0% center; }
      100% { background-position: 200% center; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: radial-gradient(ellipse 70% 50% at 5% 5%, rgba(255,42,133,0.07) 0%, transparent 100%), radial-gradient(ellipse 60% 50% at 95% 95%, rgba(0,212,255,0.06) 0%, transparent 100%), radial-gradient(ellipse 50% 60% at 95% 5%, rgba(157,0,255,0.05) 0%, transparent 100%), var(--bg);
      color: var(--text);
      min-height: 100vh;
      position: relative;
    }
    .header, .tabs-bar, .main, .footer { position: relative; z-index: 1; }
    a { color: var(--purple); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ── HEADER ── */
    .header { background: var(--white); border-bottom: 1px solid var(--border); padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; gap: 12px; flex-wrap: wrap; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo { width: 38px; height: 38px; background: linear-gradient(135deg, #FF2A85, #9D00FF, #00D4FF, #FF2A85); background-size: 200% auto; animation: iridescentFlow 4s linear infinite; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .header-title { font-size: 17px; font-weight: 700; color: #111; }
    .header-sub { font-size: 12px; color: var(--gray); margin-top: 1px; }
    .header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .issue-badge { background: var(--purple-light); color: var(--purple); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.3px; }
    .archive-btn { display: flex; align-items: center; gap: 5px; background: var(--white); color: var(--purple); border: 1px solid var(--purple-mid); cursor: pointer; font-size: 12px; font-weight: 600; padding: 6px 13px; border-radius: 20px; transition: background 0.15s; font-family: inherit; text-decoration: none; }
    .archive-btn:hover { background: var(--purple-light); }
    .share-btn { display: flex; align-items: center; gap: 5px; background: var(--purple); color: #fff; border: none; cursor: pointer; font-size: 12px; font-weight: 600; padding: 6px 13px; border-radius: 20px; transition: background 0.15s, transform 0.1s; font-family: inherit; }
    .share-btn:hover { background: #5a38e8; transform: translateY(-1px); }
    .share-btn:active { transform: translateY(0); }

    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(80px); background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 30px; font-size: 13px; font-weight: 500; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); z-index: 9999; pointer-events: none; white-space: nowrap; }
    .toast.show { transform: translateX(-50%) translateY(0); }

    /* ── TABS ── */
    .tabs-bar { background: var(--white); border-bottom: 1px solid var(--border); padding: 0 28px; display: flex; gap: 0; overflow-x: auto; scrollbar-width: none; }
    .tabs-bar::-webkit-scrollbar { display: none; }
    .tab { padding: 12px 15px; font-size: 13px; font-weight: 500; color: var(--gray); border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; transition: color 0.15s, border-color 0.15s; display: flex; align-items: center; gap: 6px; user-select: none; }
    .tab:hover { color: #444; }
    .tab.active { color: var(--purple); border-bottom-color: var(--purple); font-weight: 600; }
    .tab-dot { width: 6px; height: 6px; border-radius: 50%; }

    /* ── MAIN ── */
    .main { padding: 24px 28px; max-width: 920px; margin: 0 auto; }
    .panel { display: none; }
    .panel.active { display: block; }

    /* ── LABELS ── */
    .section-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #aaa; margin-bottom: 14px; margin-top: 28px; }
    .section-label:first-child { margin-top: 0; }
    .section-label svg { width: 13px; height: 13px; flex-shrink: 0; }

    /* ── CARDS ── */
    .card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; margin-bottom: 12px; position: relative; overflow: hidden; transition: box-shadow 0.15s, border-color 0.15s; }
    .card.clickable { cursor: pointer; }
    .card.clickable:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); border-color: var(--purple-mid); }
    .card-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 3px 0 0 3px; }
    .card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
    .card-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; margin-top: 1px; }
    .card-meta { flex: 1; min-width: 0; }
    .card-source { font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .card-title { font-size: 15px; font-weight: 650; line-height: 1.35; color: #111; }
    .card-body { font-size: 13.5px; line-height: 1.65; color: var(--muted); margin-top: 8px; }
    .card-footer { display: flex; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .tag { font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; background: var(--purple-light); color: #7c5cbf; }
    .tag.green { background: var(--green-light); color: #2d7a46; }
    .tag.orange { background: var(--orange-light); color: #b8620f; }
    .tag.blue { background: var(--blue-light); color: var(--blue); }
    .tag.red { background: var(--red-light); color: var(--red); }
    .tag.gray { background: #f3f3f3; color: #666; }
    .read-link { margin-left: auto; font-size: 12px; font-weight: 600; color: var(--purple); text-decoration: none; display: flex; align-items: center; gap: 4px; white-space: nowrap; flex-shrink: 0; }
    .read-link:hover { text-decoration: underline; }

    /* ── FEATURED ── */
    .card.featured { background: linear-gradient(135deg, #fefeff 0%, #f5f3ff 100%); border-color: var(--purple-mid); }
    .featured-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; background: var(--purple); color: #fff; padding: 2px 8px; border-radius: 20px; margin-bottom: 8px; }

    /* ── STAT STRIP ── */
    .stat-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
    .stat-box { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; text-align: center; }
    .stat-number { font-size: 24px; font-weight: 800; color: var(--purple); }
    .stat-label { font-size: 11px; color: #aaa; margin-top: 2px; }

    /* ── DATE BANNER ── */
    .date-banner { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #666; flex-wrap: wrap; }
    .date-banner strong { color: #111; }

    /* ── FILTER ROW ── */
    .filter-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-btn { font-size: 12px; font-weight: 500; padding: 5px 13px; border-radius: 20px; border: 1px solid #ddd; background: var(--white); color: #666; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .filter-btn:hover { border-color: #a78bfa; color: var(--purple); }
    .filter-btn.active { background: var(--purple); color: #fff; border-color: var(--purple); }

    /* ── SOURCES GRID ── */
    .sources-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 9px; margin-bottom: 20px; }
    .source-pill { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 11px 13px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; text-decoration: none; }
    .source-pill:hover { border-color: var(--purple-mid); box-shadow: 0 2px 8px rgba(108,71,255,0.08); }
    .source-pill.hot { border-color: var(--purple-mid); background: var(--purple-light); }
    .source-pill-icon { display: flex; align-items: center; flex-shrink: 0; }
    .source-pill-info { flex: 1; min-width: 0; }
    .source-pill-name { font-size: 13px; font-weight: 600; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .source-pill-type { font-size: 11px; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── AUTHOR GRID ── */
    .author-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .author-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 16px; transition: box-shadow 0.15s, border-color 0.15s; }
    .author-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); border-color: var(--purple-mid); }
    .author-top { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }
    .author-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .author-info { flex: 1; min-width: 0; }
    .author-name { font-size: 14px; font-weight: 700; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .author-handle { font-size: 11px; color: #aaa; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .author-new { flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; background: var(--purple-light); color: var(--purple); padding: 3px 9px; border-radius: 20px; }
    .author-bio { font-size: 12.5px; color: #666; line-height: 1.5; margin-bottom: 8px; }
    .author-links { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    .author-link { font-size: 11px; font-weight: 600; color: var(--purple); text-decoration: none; background: var(--purple-light); padding: 3px 9px; border-radius: 20px; transition: background 0.15s; }
    .author-link:hover { background: var(--purple-mid); color: #fff; }

    /* ── PODCAST CARD ── */
    .ep-card { display: flex; gap: 14px; align-items: flex-start; }
    .ep-thumb { width: 64px; height: 64px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ep-info { flex: 1; min-width: 0; }
    .ep-title { font-size: 14.5px; font-weight: 650; color: #111; line-height: 1.3; }
    .ep-desc { font-size: 13px; color: #666; margin-top: 5px; line-height: 1.5; }
    .ep-meta { font-size: 11px; color: #aaa; margin-top: 6px; }

    /* ── SCHEDULE BANNER ── */
    .schedule-banner { background: linear-gradient(135deg, var(--purple), #9333ea); border-radius: 12px; padding: 16px 20px; color: #fff; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
    .schedule-icon { flex-shrink: 0; display: flex; align-items: center; }
    .schedule-title { font-size: 14px; font-weight: 700; }
    .schedule-sub { font-size: 12px; opacity: 0.8; margin-top: 2px; }

    /* ── SUBSCRIBE BANNER ── */
    .subscribe-banner { background: linear-gradient(135deg, #6c47ff, #9333ea); border-radius: 12px; padding: 20px 24px; color: #fff; margin-top: 32px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .subscribe-text { flex: 1; min-width: 200px; }
    .subscribe-text strong { font-size: 15px; display: block; margin-bottom: 2px; }
    .subscribe-text span { font-size: 13px; opacity: 0.85; }
    .subscribe-form { display: flex; gap: 8px; }
    .subscribe-input { border: none; border-radius: 8px; padding: 9px 14px; font-size: 14px; width: 200px; outline: none; }
    .subscribe-submit { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5); color: #fff; border-radius: 8px; padding: 9px 16px; font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: inherit; }
    .subscribe-submit:hover { background: rgba(255,255,255,0.35); }

    /* ── LANGUAGE BADGE ── */
    .lang-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; background: #fff8ef; color: #b8620f; border: 1px solid #fde68a; margin-left: 6px; vertical-align: middle; }
    .translated-excerpt { font-size: 13px; color: #555; line-height: 1.6; background: #f8f7ff; border-left: 3px solid #c4b5fd; padding: 8px 12px; margin-top: 10px; border-radius: 0 6px 6px 0; }
    .translated-label { font-size: 10px; font-weight: 700; color: var(--purple); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 3px; }

    /* ── FOOTER ── */
    .footer { border-top: 1px solid var(--border); margin-top: 60px; padding: 32px 0 60px; text-align: center; font-size: 13px; color: #999; }
    .footer a { color: var(--purple); }
    .footer-brand { font-size: 16px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; }

    @media (max-width: 600px) {
      .stat-strip { grid-template-columns: repeat(2, 1fr); }
      .main { padding: 16px; }
      .header { padding: 12px 16px; }
      .tabs-bar { padding: 0 16px; }
      .author-grid { grid-template-columns: 1fr; }
      .subscribe-form { width: 100%; }
      .subscribe-input { flex: 1; min-width: 0; }
    }
  </style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <div class="logo">${ICON.logo}</div>
    <div>
      <div class="header-title">The Frequency</div>
      <div class="header-sub">Lilit's curated digest · Every Tuesday</div>
    </div>
  </div>
  <div class="header-right">
    <div class="issue-badge">Issue #${ctx.issue_number} · ${e(ctx.date)}</div>
    <a class="archive-btn" href="${DS.siteUrl}/archive.html">${ICON.archive} Archive</a>
    <button class="share-btn" onclick="shareDigest()">${ICON.share} Share digest</button>
  </div>
</div>

<!-- TABS -->
<div class="tabs-bar">
  ${tabButtons}
</div>

<!-- MAIN -->
<div class="main">

  <!-- ══ OVERVIEW ══ -->
  <div class="panel active" id="panel-overview">
    <div class="date-banner">
      ${ICON.calendar} <strong>${e(ctx.date)}</strong> — Next issue ${e(ctx.next_date)}. ${sources.length} sources — original practitioner writing, not recycled takes. &nbsp;·&nbsp; <a href="${DS.siteUrl}/archive.html" style="color:var(--purple);font-weight:600;text-decoration:none">Browse past issues →</a>
    </div>
    <div class="stat-strip">
      <div class="stat-box"><div class="stat-number">${ctx.articles.length}</div><div class="stat-label">Stories this issue</div></div>
      <div class="stat-box"><div class="stat-number">${PODCAST_PICKS.length}</div><div class="stat-label">Podcast picks</div></div>
      <div class="stat-box"><div class="stat-number">${sources.length}</div><div class="stat-label">Sources tracked</div></div>
      <div class="stat-box"><div class="stat-number">${authorList.length || activeTabs.length}</div><div class="stat-label">Authors on radar</div></div>
    </div>

    <div class="section-label">${ICON.star} Editor's pick</div>
    <div class="card featured clickable" onclick="window.open('${e(ep.url)}','_blank')">
      <div class="featured-badge">✦ Must read</div>
      <div class="card-header">
        ${cardIconHtml(ep, true)}
        <div class="card-meta">
          <div class="card-source">${cardSourceLine(ep)}</div>
          <div class="card-title">${e(ep.title)}</div>
        </div>
      </div>
      <div class="card-body">${e(ep.summary)}${translatedBlock(ep)}</div>
      <div class="card-footer">
        <span class="${tagClass(ep.category)}">${e(ep.category)}</span>${langBadge(ep)}
        <a class="read-link" href="${e(ep.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-read', ep)}>Read →</a>
      </div>
    </div>

    <div class="section-label">${ICON.bolt} Quick hits</div>

    ${rest.map(a => `<div class="card clickable" onclick="window.open('${e(a.url)}','_blank')">
      <div class="card-accent" style="${cardAccentStyle(a.category)}"></div>
      <div class="card-header">
        ${cardIconHtml(a)}
        <div class="card-meta">
          <div class="card-source">${cardSourceLine(a)}</div>
          <div class="card-title">${e(a.title)}</div>
        </div>
      </div>
      <div class="card-body">${e(a.summary)}${translatedBlock(a)}</div>
      <div class="card-footer">
        <span class="${tagClass(a.category)}">${e(a.category)}</span>${langBadge(a)}
        <a class="read-link" href="${e(a.url)}" target="_blank" rel="noopener" ${umamiAttrs('article-read', a)}>Read →</a>
      </div>
    </div>`).join('\n    ')}

    <div class="subscribe-banner">
      <div class="subscribe-text">
        <strong>Get The Frequency in your inbox</strong>
        <span>Every Tuesday · Real builders, honest takes</span>
      </div>
      <form class="subscribe-form" onsubmit="handleSubscribe(event)">
        <input class="subscribe-input" type="email" placeholder="your@email.com" required id="sub-email" />
        <button class="subscribe-submit" type="submit">Subscribe →</button>
      </form>
    </div>
  </div>

  <!-- Category panels -->
  ${categoryPanels}

  <!-- Podcasts panel -->
  ${podcastsPanel}

  <!-- Authors panel -->
  ${authorsPanel}

  <!-- Sources panel -->
  ${sourcesPanel}

</div>

<!-- FOOTER -->
<footer class="footer">
  <div class="footer-brand">The Frequency</div>
  <p>Next issue: ${e(ctx.next_date)}</p>
  <p style="margin-top:8px;"><a href="${DS.siteUrl}/archive.html">Archive</a> &nbsp;·&nbsp; <a href="${DS.siteUrl}">Latest issue</a></p>
  <p style="margin-top:12px;font-size:12px;color:#bbb;">Curated AI thinking, every Tuesday.</p>
</footer>

<div class="toast" id="toast"></div>

<script>
  function switchTab(id) {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
    var tab = document.querySelector('[data-tab="' + id + '"]');
    if (tab) tab.classList.add('active');
    var panel = document.getElementById('panel-' + id);
    if (panel) panel.classList.add('active');
    if (typeof umami !== 'undefined') umami.track('tab-switch', { tab: id });
  }

  function filterCards(btn, source, panelId) {
    document.querySelectorAll('#panel-' + panelId + ' .filter-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    document.querySelectorAll('#panel-' + panelId + ' .card[data-source]').forEach(function(card) {
      card.style.display = (!source || source === 'all' || card.dataset.source === source) ? '' : 'none';
    });
  }

  function shareDigest() {
    var url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function() { showToast('Link copied!'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); showToast('Link copied!'); } catch(err) { showToast('Copy URL from address bar'); }
      document.body.removeChild(ta);
    }
    if (typeof umami !== 'undefined') umami.track('share');
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2500);
  }

  async function handleSubscribe(evt) {
    evt.preventDefault();
    var email = document.getElementById('sub-email').value;
    try {
      await fetch('${SUBSCRIBE_HOOK}', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      showToast('Subscribed! See you next issue.');
      document.getElementById('sub-email').value = '';
      if (typeof umami !== 'undefined') umami.track('subscribe');
    } catch(err) {
      showToast('Something went wrong. Try again.');
    }
  }
</script>

</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateIssue(ctx) {
  // index.html: canonical → / (homepage SEO)
  // issue-N.html: canonical → /issue-N (permalink SEO)
  const homeHtml = renderFullIssue(ctx, { forHomepage: true });
  const issueHtml = renderFullIssue(ctx, { forHomepage: false });
  writeFileSync(path.join(PUBLIC, 'index.html'), homeHtml, 'utf8');
  writeFileSync(path.join(PUBLIC, `issue-${ctx.issue_number}.html`), issueHtml, 'utf8');
  console.log(`[generate] Wrote index.html and issue-${ctx.issue_number}.html`);
  updateSitemap(ctx);
}

function updateSitemap(ctx) {
  const sitemapPath = path.join(PUBLIC, 'sitemap.xml');
  const today = new Date().toISOString().split('T')[0];
  const issueUrl = `${DS.siteUrl}/issue-${ctx.issue_number}`;

  let xml = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';

  // Update homepage lastmod
  xml = xml.replace(
    /(<loc>https:\/\/thefrequency\.lilitarutyunyan\.com\/<\/loc>\s*<lastmod>)[^<]*/,
    `$1${today}`
  );

  // Add this issue's URL if not already present
  if (!xml.includes(issueUrl)) {
    const newEntry = `  <url>\n    <loc>${issueUrl}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>never</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    xml = xml.replace('</urlset>', `${newEntry}\n</urlset>`);
    writeFileSync(sitemapPath, xml, 'utf8');
    console.log(`[generate] Updated sitemap.xml with ${issueUrl}`);
  }
}

export function generateEmail(ctx) {
  const ep = ctx.editors_pick;
  const teasers = ctx.articles.filter(a => !a.editors_pick).slice(0, 4);
  const subject = `The Frequency #${ctx.issue_number} — ${ep.title.slice(0, 60)}${ep.title.length > 60 ? '…' : ''}`;
  const issuePageUrl = `${DS.siteUrl}?utm_source=email&utm_medium=newsletter&utm_campaign=issue-${ctx.issue_number}`;
  const openTrackerUrl = process.env.OPEN_TRACKER_URL;
  // {{subscriber_id}} is replaced per-subscriber in email.js at send time
  const pixelHtml = openTrackerUrl
    ? `\n<img src="${openTrackerUrl}?i=${ctx.issue_number}&s={{subscriber_id}}" width="1" height="1" alt="" style="display:block;height:1px;width:1px;border:0;" />`
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
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
      <tr>
        <td style="padding-right:12px;vertical-align:middle;">
          <img src="${DS.siteUrl}/logo-192.png" alt="The Frequency" width="40" height="40" style="display:block;border-radius:8px;" />
        </td>
        <td style="vertical-align:middle;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);">The Frequency</p>
        </td>
      </tr>
    </table>
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

  // Build tag pills from categories present in this issue
  const issueTags = CATEGORIES
    .filter(cat => ctx.articles.some(a => a.category === cat))
    .map(cat => {
      const cls = { 'Research': 'blue', 'AI × Business': 'orange', 'Tools': 'green' }[cat] ?? '';
      return `<span class="tag${cls ? ' ' + cls : ''}">${e(cat)}</span>`;
    }).join('');

  // Authors with non-English content get a flag note in the summary
  const intlNote = ctx.articles.some(a => a.language && a.language !== 'en')
    ? ' · includes international voices' : '';

  const headline = ctx.issue_headline
    || `${ctx.editors_pick.title.slice(0, 60)}${ctx.editors_pick.title.length > 60 ? '…' : ''}`;

  const newCard = `<a class="issue-card" href="${DS.siteUrl}/issue-${ctx.issue_number}">
    <div class="issue-num">#${ctx.issue_number}</div>
    <div class="issue-info">
      <div class="issue-date">${e(ctx.date)} <span class="current-badge">● Latest</span></div>
      <div class="issue-headline">${e(headline)}</div>
      <div class="issue-summary">${ctx.articles.length} stories · Editor's Pick: ${e(ctx.editors_pick.title.slice(0, 80))}${intlNote}</div>
      <div class="issue-tags">${issueTags}</div>
    </div>
    <div class="issue-arrow">→</div>
  </a>`;

  if (!existsSync(archivePath)) {
    // Should not normally happen — archive.html is committed. Fall through to prepend path.
    // Create archive from scratch
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Frequency — Archive</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="192x192" href="/logo-192.png" />
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
    const existing = readFileSync(archivePath, 'utf8');
    const root = parse(existing);

    const list = root.querySelector('#issues-list');
    if (!list) throw new Error('[generate] archive.html is missing #issues-list div');

    // Remove any existing card(s) for this issue number (prevents duplicates from reruns)
    const existingCards = list.querySelectorAll('a.issue-card');
    for (const card of existingCards) {
      const href = card.getAttribute('href') || '';
      if (href.includes(`/issue-${ctx.issue_number}`)) {
        card.remove();
      }
    }

    // Strip "current" badge from previously-latest card
    const prevBadge = list.querySelector('.current-badge');
    if (prevBadge) prevBadge.remove();

    // Prepend new card (latest always first)
    list.set_content(newCard + '\n  ' + list.innerHTML);

    // Update issue count in stats pill
    const statsEl = root.querySelector('#archive-stats');
    if (statsEl) {
      const html = statsEl.innerHTML.replace(/<strong>\d+<\/strong> issue/, `<strong>${ctx.issue_number}</strong> issue`);
      statsEl.set_content(html);
    }

    // Remove the "coming next" placeholder once we have more than 1 issue
    const comingNext = root.querySelector('#coming-next');
    if (comingNext) comingNext.remove();

    writeFileSync(archivePath, root.toString(), 'utf8');
  }

  console.log(`[generate] Updated archive.html with Issue #${ctx.issue_number}`);
}
