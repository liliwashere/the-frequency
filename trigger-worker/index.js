/**
 * The Frequency — Trigger Worker
 *
 * Fires every Tuesday at 08:00 UTC (primary) and 10:00 UTC (retry).
 * Calls GitHub workflow_dispatch to start the publish pipeline.
 * The retry slot checks for a successful run today before dispatching.
 */

const REPO     = 'liliwashere/the-frequency';
const WORKFLOW = 'publish.yml';
const BRANCH   = 'main';

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'the-frequency-trigger/1.0',
  };
}

async function dispatch(token) {
  return fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: ghHeaders(token),
      body: JSON.stringify({ ref: BRANCH }),
    }
  );
}

async function alreadyPublishedToday(token) {
  const today = new Date().toISOString().split('T')[0];
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/runs?branch=${BRANCH}&event=workflow_dispatch&per_page=10`,
    { headers: ghHeaders(token) }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return (data.workflow_runs ?? []).some(
    r => r.conclusion === 'success' && r.created_at?.startsWith(today)
  );
}

export default {
  async scheduled(event, env) {
    const now = new Date();
    const isRetrySlot = now.getUTCHours() >= 10;

    console.log(`[trigger] ${now.toISOString()} — ${isRetrySlot ? 'retry' : 'primary'} slot`);

    if (isRetrySlot) {
      const done = await alreadyPublishedToday(env.GITHUB_TOKEN);
      if (done) {
        console.log('[trigger] Already published today — skipping retry');
        return;
      }
      console.log('[trigger] No successful run today — dispatching retry');
    }

    const res = await dispatch(env.GITHUB_TOKEN);
    if (res.ok || res.status === 204) {
      console.log('[trigger] Dispatch succeeded');
    } else {
      const body = await res.text();
      console.error(`[trigger] Dispatch failed: ${res.status} — ${body}`);
    }
  },
};
