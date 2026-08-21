<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Landmines

- **Never run `npm run build` while `npm run dev` is running.** They share the `.next`
  directory and collide, which **fabricates build failures** — errors that look real,
  point at real files, and disappear when you stop the dev server. Reported by a session
  that lost time to it twice in one day.
  - Stop the dev server first, or build in a separate checkout.
  - **If a build fails, check for a running dev server before you debug the error.**
    Otherwise you will "fix" code that was never broken.
  - Corollary: a build failure is only trustworthy when nothing else is touching `.next`.
    That includes another agent session in the same folder.
