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

# Install exactly what's in package-lock.json. `npm install` (not `npm ci`)
# is used so a warm/cached node_modules is reused across sessions.
npm install --no-audit --no-fund
