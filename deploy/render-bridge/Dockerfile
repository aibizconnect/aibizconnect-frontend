# AIBizConnect render bridge — headless Chromium that resolves a page/HTML to a DOM annotated with
# per-element computed styles (data-cs). Used by the website importer for true-to-design fidelity
# (architect D-158: self-hosted always-on container).
#
# Base image ships a matching Chromium + all OS deps, so no browser download/sandbox issues.
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

ENV NODE_ENV=production \
    RENDER_USE_BUNDLED=1 \
    RENDER_PORT=8787

WORKDIR /app

# Only the deps the bridge needs (playwright-core is already present in the base image, but install
# pinned to be safe). The server itself is a single file.
COPY deploy/render-bridge/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

# The render server (copied from the repo's scripts/).
COPY scripts/render-server.mjs ./render-server.mjs

EXPOSE 8787
CMD ["node", "render-server.mjs"]
