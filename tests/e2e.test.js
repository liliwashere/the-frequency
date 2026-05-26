/**
 * The Frequency — end-to-end QA test suite
 *
 * Section 1 — Archive card integrity (index.html)
 *   Guards against: archive cards with no clickable href (regression: cards were
 *   visible but unclickable — onclick-only, no <a> tag). Each card must have a
 *   "Read →" anchor with an href.
 *
 * Section 2 — Issue file existence
 *   Guards against: archive links pointing to 404s. issue-1.html was missing from
 *   public/ at one point. Asserts both issue-1.html and issue-2.html exist and are
 *   non-empty.
 *
 * Section 3 — archive.html link integrity
 *   Guards against: archive.html linking to issue files that don't exist, or
 *   silently dropping entries. Parses every .issue-card <a> href and checks the
 *   target file exists in public/ (relative) or is a well-formed absolute URL.
 *
 * Section 4 — Dry-run pipeline smoke test
 *   Guards against: publish.js crashing during search, curation, or HTML
 *   generation. Runs the full pipeline with DRY_RUN=true (no deploy, no email)
 *   and asserts exit code 0 and the "Done (dry run)" confirmation line in stdout.
 *
 * Section 5 — GitHub Actions workflow completeness
 *   Guards against: wrangler deploying with --project-name=undefined (CF_PROJECT_NAME
 *   was missing from the workflow env block). Asserts all required env vars and
 *   secrets are present in publish.yml.
 *
 * Section 6 — Generated HTML validity (post dry-run)
 *   Guards against: generate.js silently writing empty or truncated files. After a
 *   dry run, asserts that index.html and email-latest.html exist, are > 10 KB each,
 *   and contain the string "The Frequency".
 *
 * Section 7 — Placeholder string audit
 *   Guards against: unreplaced template placeholders shipping to production.
 *   Regression: the subscribe form had action="https://embeds.beehiiv.com/REPLACE-WITH-YOUR-BEEHIIV-URL"
 *   which 404'd on every subscription attempt. Scans every HTML file in public/
 *   for known placeholder patterns (REPLACE-WITH, YOUR-BEEHIIV, XXXXXXXX, TODO, FIXME,
 *   localhost references, and bare example.com domains in href/src/action attributes).
 *
 * Run: npm test
 * Prerequisites: ANTHROPIC_API_KEY must be set in env or .env (dry run still calls
 *   the Claude API for curation). TAVILY_API_KEY is required for search. If either
 *   is absent, Section 4 and 6 will fail with a [FATAL] exit — that is expected
 *   and is itself a signal worth capturing.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { parse } from 'node-html-parser';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'publish.yml');

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  PASS  ${label}`);
  passed++;
}

function fail(label, err) {
  console.error(`  FAIL  ${label}`);
  console.error(`        ${err.message}`);
  failed++;
}

function run(label, fn) {
  try {
    fn();
    pass(label);
  } catch (err) {
    fail(label, err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Archive card integrity (index.html)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSection 1: Archive card integrity (index.html)');

const indexHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const indexDoc = parse(indexHtml);
const archivePanel = indexDoc.querySelector('#panel-archive');

run('index.html contains #panel-archive panel', () => {
  assert.ok(archivePanel, '#panel-archive element not found in index.html');
});

const archiveCards = archivePanel
  ? archivePanel.querySelectorAll('.card.clickable')
  : [];

run('archive panel contains at least one .card.clickable', () => {
  assert.ok(
    archiveCards.length > 0,
    `Expected at least 1 .card.clickable in #panel-archive, found ${archiveCards.length}`
  );
});

run('every archive card has a "Read →" anchor with an href', () => {
  const missing = [];
  for (const card of archiveCards) {
    const link = card.querySelector('a[href]');
    if (!link) {
      const text = card.text.trim().slice(0, 60);
      missing.push(`Card "${text}" has no <a href=...>`);
    }
  }
  assert.equal(
    missing.length,
    0,
    `Cards missing href:\n  ${missing.join('\n  ')}`
  );
});

run('every archive card href points to an existing file in public/', () => {
  const broken = [];
  for (const card of archiveCards) {
    const link = card.querySelector('a[href]');
    if (!link) continue;
    const href = link.getAttribute('href');
    // Strip leading ./ for resolution
    const relative = href.replace(/^\.\//, '');
    const target = path.join(PUBLIC, relative);
    if (!fs.existsSync(target)) {
      broken.push(`href="${href}" → ${target} does not exist`);
    }
  }
  assert.equal(
    broken.length,
    0,
    `Broken archive card links:\n  ${broken.join('\n  ')}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Issue file existence
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSection 2: Issue file existence');

for (const filename of ['issue-1.html', 'issue-2.html']) {
  const filepath = path.join(PUBLIC, filename);

  run(`${filename} exists in public/`, () => {
    assert.ok(
      fs.existsSync(filepath),
      `${filepath} does not exist`
    );
  });

  run(`${filename} is non-empty (> 0 bytes)`, () => {
    const size = fs.existsSync(filepath) ? fs.statSync(filepath).size : 0;
    assert.ok(size > 0, `${filepath} is empty (0 bytes)`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — archive.html link integrity
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSection 3: archive.html link integrity');

const archiveHtmlPath = path.join(PUBLIC, 'archive.html');

run('archive.html exists in public/', () => {
  assert.ok(fs.existsSync(archiveHtmlPath), `${archiveHtmlPath} does not exist`);
});

if (fs.existsSync(archiveHtmlPath)) {
  const archiveHtml = fs.readFileSync(archiveHtmlPath, 'utf8');
  const archiveDoc = parse(archiveHtml);
  const issueCards = archiveDoc.querySelectorAll('a.issue-card');

  run('archive.html contains at least one a.issue-card', () => {
    assert.ok(
      issueCards.length > 0,
      `Expected at least 1 a.issue-card in archive.html, found ${issueCards.length}`
    );
  });

  run('every a.issue-card has an href attribute', () => {
    const missing = issueCards.filter(c => !c.getAttribute('href'));
    assert.equal(
      missing.length,
      0,
      `${missing.length} .issue-card element(s) have no href`
    );
  });

  run('every a.issue-card href resolves to an existing file or valid absolute URL', () => {
    const broken = [];
    for (const card of issueCards) {
      const href = card.getAttribute('href');
      if (!href) continue;

      if (href.startsWith('http://') || href.startsWith('https://')) {
        // Absolute URL — validate format only (no live fetch in unit tests)
        try {
          new URL(href);
        } catch {
          broken.push(`href="${href}" is not a valid absolute URL`);
        }
      } else {
        // Relative — must resolve to a file in public/
        const relative = href.replace(/^\.\//, '');
        const target = path.join(PUBLIC, relative);
        if (!fs.existsSync(target)) {
          broken.push(`href="${href}" → ${target} does not exist`);
        }
      }
    }
    assert.equal(
      broken.length,
      0,
      `Broken archive.html links:\n  ${broken.join('\n  ')}`
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Dry-run pipeline smoke test
// Note: requires ANTHROPIC_API_KEY and TAVILY_API_KEY in environment or .env.
// If either is absent this test will fail — that is intentional and expected.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSection 4: Dry-run pipeline smoke test');

let dryRunOutput = '';
let dryRunExitCode = null;

run('DRY_RUN=true node publish.js exits 0', () => {
  try {
    dryRunOutput = execSync('DRY_RUN=true node publish.js', {
      cwd: ROOT,
      env: { ...process.env },
      timeout: 120_000,
      encoding: 'utf8',
    });
    dryRunExitCode = 0;
  } catch (err) {
    dryRunExitCode = err.status ?? 1;
    dryRunOutput = (err.stdout ?? '') + (err.stderr ?? '');
    throw new Error(
      `Pipeline exited with code ${dryRunExitCode}.\nLast output:\n${dryRunOutput.slice(-800)}`
    );
  }
});

run('dry run stdout contains "Done (dry run)"', () => {
  assert.ok(
    dryRunOutput.includes('Done (dry run)'),
    `Expected "Done (dry run)" in stdout.\nActual output:\n${dryRunOutput.slice(-400)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — GitHub Actions workflow completeness
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSection 5: GitHub Actions workflow completeness');

const requiredWorkflowVars = [
  'CF_PROJECT_NAME',
  'CF_API_TOKEN',
  'CF_ACCOUNT_ID',
  'ANTHROPIC_API_KEY',
  'RESEND_API_KEY',
  'SUPABASE_URL',
];

run('publish.yml exists', () => {
  assert.ok(fs.existsSync(WORKFLOW), `${WORKFLOW} does not exist`);
});

if (fs.existsSync(WORKFLOW)) {
  const workflowContent = fs.readFileSync(WORKFLOW, 'utf8');

  for (const varName of requiredWorkflowVars) {
    run(`publish.yml contains ${varName}`, () => {
      assert.ok(
        workflowContent.includes(varName),
        `"${varName}" not found in publish.yml — wrangler deploy may use undefined`
      );
    });
  }

  run('CF_PROJECT_NAME is set to a non-empty literal value (not a secret reference)', () => {
    // The bug was: CF_PROJECT_NAME was missing, causing --project-name=undefined.
    // It should be a hardcoded string, not ${{ secrets.CF_PROJECT_NAME }}.
    const match = workflowContent.match(/CF_PROJECT_NAME:\s*(.+)/);
    assert.ok(match, 'CF_PROJECT_NAME line not found in publish.yml');
    const value = match[1].trim();
    assert.ok(
      !value.startsWith('${{'),
      `CF_PROJECT_NAME should be a hardcoded value, not a secret reference. Got: ${value}`
    );
    assert.ok(
      value.length > 0 && value !== 'undefined',
      `CF_PROJECT_NAME is empty or literally "undefined": "${value}"`
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — Generated HTML validity (post dry-run)
// Depends on Section 4 having run successfully.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSection 6: Generated HTML validity (post dry-run)');

const generatedFiles = ['index.html', 'email-latest.html'];
const MIN_SIZE = 10 * 1024; // 10 KB

for (const filename of generatedFiles) {
  const filepath = path.join(PUBLIC, filename);

  run(`${filename} exists after dry run`, () => {
    assert.ok(
      fs.existsSync(filepath),
      `${filepath} does not exist after dry run — generate.js may have failed silently`
    );
  });

  run(`${filename} is > 10 KB`, () => {
    const size = fs.existsSync(filepath) ? fs.statSync(filepath).size : 0;
    assert.ok(
      size > MIN_SIZE,
      `${filepath} is ${size} bytes (expected > ${MIN_SIZE}) — file may be truncated`
    );
  });

  run(`${filename} contains "The Frequency"`, () => {
    const content = fs.existsSync(filepath)
      ? fs.readFileSync(filepath, 'utf8')
      : '';
    assert.ok(
      content.includes('The Frequency'),
      `"The Frequency" not found in ${filepath} — HTML generation may have used a wrong template`
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 7: Placeholder string audit
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSection 7: Placeholder string audit');

const PLACEHOLDER_PATTERNS = [
  /REPLACE-WITH-YOUR/i,
  /YOUR-BEEHIIV-URL/i,
  /embeds\.beehiiv\.com\/[A-Z_-]{6,}/,  // all-caps slug = placeholder
  /action="[^"]*REPLACE/i,
  /href="[^"]*REPLACE/i,
  /src="[^"]*REPLACE/i,
  /localhost:\d+/,
  /127\.0\.0\.1/,
  /example\.com/i,
  /TODO:/,
  /FIXME:/,
];

const htmlFiles = fs.readdirSync(PUBLIC).filter(f => f.endsWith('.html'));

run(`public/ contains HTML files to scan`, () => {
  assert.ok(htmlFiles.length > 0, 'No HTML files found in public/ — nothing to audit');
});

for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(PUBLIC, file), 'utf8');
  const hits = [];
  for (const pattern of PLACEHOLDER_PATTERNS) {
    const match = content.match(pattern);
    if (match) hits.push(`${pattern} matched: "${match[0]}"`);
  }
  run(`${file} contains no placeholder strings`, () => {
    assert.strictEqual(
      hits.length, 0,
      `${file} has unresolved placeholders:\n  ${hits.join('\n  ')}`
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('─'.repeat(50));

if (failed > 0) {
  process.exit(1);
}
