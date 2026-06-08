#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# ── Install dependencies ────────────────────────────────────────────────────
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

if [ -f package.json ] && [ ! -d node_modules ]; then
  echo "[session-start] Installing npm dependencies..."
  npm install --prefer-offline --no-audit --no-fund
else
  echo "[session-start] node_modules already present — skipping install"
fi

# ── Configure git signing verification ─────────────────────────────────────
# The signing server uses a fixed ed25519 key. Configure allowedSignersFile so
# git reports signed commits as B/U instead of N, which satisfies the
# stop-hook-git-check.sh signature check.
ALLOWED_SIGNERS_FILE="/home/claude/.ssh/allowed_signers"
mkdir -p "$(dirname "$ALLOWED_SIGNERS_FILE")"
echo "noreply@anthropic.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKy87HxSEheG8vEPhSs9u2KZCtVErAQfpmprtUJCZ2w7" \
  > "$ALLOWED_SIGNERS_FILE"
git config --global gpg.ssh.allowedSignersFile "$ALLOWED_SIGNERS_FILE"
echo "[session-start] Git SSH allowedSignersFile configured"

# ── Configure git credentials ───────────────────────────────────────────────
# Requires GITHUB_TOKEN to be set as a session secret in Claude Code on the web.
# Add it at: Settings → Secrets → GITHUB_TOKEN (a GitHub PAT with repo scope).
if [ -n "${GITHUB_TOKEN:-}" ]; then
  git config --global credential.helper \
    "!f() { echo username=x; echo password=${GITHUB_TOKEN}; }; f"
  echo "[session-start] Git credentials configured via GITHUB_TOKEN"
else
  echo "[session-start] WARNING: GITHUB_TOKEN not set — git push will fail."
  echo "  Add a GitHub PAT as GITHUB_TOKEN in your Claude Code session secrets."
fi
