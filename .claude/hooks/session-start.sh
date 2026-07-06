#!/bin/bash
# SessionStart hook: install Node dependencies so lint/build/tests work
# in Claude Code on the web. Idempotent and non-interactive.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Skip the Playwright browser download; Chromium is pre-provisioned in the
# remote image (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers).
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install exactly what's in package-lock.json. Use `npm ci`: it installs
# strictly from the lockfile and, unlike `npm install`, never rewrites it —
# the container's npm would otherwise strip `libc` hints from optional deps
# on every run, leaving the tree dirty. Fall back to `npm install` only if
# the lockfile is genuinely out of sync (e.g. deps changed on a branch).
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
