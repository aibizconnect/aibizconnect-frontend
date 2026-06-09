Here is the re-evaluated ruling for hosting the render bridge on Cloudflare.

---
### 1. Re-evaluation and Ruling

**RULING 162: Cloudflare Workers with Browser Rendering for the Render Bridge.**

*   **Decision:** Cloudflare Workers with Browser Rendering using `@cloudflare/puppeteer` is the **approved default** for hosting the render bridge.
*   **Rationale:**
    *   **Consolidation:** Directly addresses Ali's preference for "ONE place" by leveraging our existing Cloudflare account and R2 infrastructure.
    *   **Cost-Effectiveness:** Cloudflare Workers' pricing model (especially the free tier for initial scale) is highly attractive for on-demand, burstable workloads like rendering.
    *   **Managed Service:** It's a fully managed serverless offering, reducing operational overhead compared to self-hosting a container.
    *   **Fidelity (Confirmed):**
        1.  **`page.evaluate` Support:** Yes, Browser Rendering fully supports `page.evaluate` with custom JavaScript, allowing us to run our exact annotation script (`data-cs` injection, `document.styleSheets` harvesting) directly within the browser context.
        2.  **JS Execution & Tailwind CDN:** Yes, JavaScript execution is fully enabled and automatic within the browser environment. The Tailwind CDN script will execute, and its classes will resolve correctly, ensuring fidelity for Stitch imports.
    *   **Limits (Acceptable for Initial Scale):**
        *   **Session Caps/Concurrency:** Cloudflare manages this. For small scale, it's sufficient. As usage grows, we'd monitor and potentially upgrade tiers.
        *   **CPU Time:** Workers have CPU limits (e.g., 50ms per invocation on free tier, up to 10s on paid). Rendering complex pages *can* hit this. We must optimize our `page.evaluate` script and `page.goto` options (e.g., `waitUntil: 'domcontentloaded'`).
        *   **Cold Start:** Browser Rendering instances can have cold starts, but this is mitigated by Cloudflare's infrastructure and acceptable for non-realtime, on-demand imports.
        *   **Worker Request Body Size:** Workers have a 1MB request body limit. This is a **critical concern** for `POST /render-html` with large captured pages (20-200KB for Stitch docs is fine, but larger pages could exceed).

*   **Cloudflare Containers vs. Workers-Browser-Rendering:**
    *   **Workers-Browser-Rendering (Preferred):** Better fit for this specific workload due to its serverless nature, integrated browser, and cost model for on-demand tasks. Our custom annotation logic is perfectly suited for `page.evaluate`.
    *   **Cloudflare Containers (Fallback/Upgrade Path):** If Worker limits (especially request body size or CPU time for very complex pages) become a hard blocker, Cloudflare Containers would be the next best Cloudflare-native option. It would allow running our exact `render-server.mjs` Dockerfile, bypassing Worker limits but incurring higher operational overhead and potentially different cost structures. For now, Workers is the default.

---
### 2. Implementation Details

**RULING 163: Render Bridge Deployment on Cloudflare Workers.**

**1. Worker Project Structure:**
*   **Location:** `deploy/render-bridge-cf/`
*   **Files:**
    *   `src/index.ts`: Worker entry point.
    *   `src/render-logic.ts`: Contains the core logic adapted from `scripts/render-server.mjs` (e.g., `annotateDomWithComputedStyles`, `harvestPageStyles`).
    *   `wrangler.toml`: Cloudflare Worker configuration.

**2. `wrangler.toml` Configuration:**

```toml
name = "aibizconnect-render-bridge"
main = "src/index.ts"
compatibility_date = "2024-05-18" # Use a recent date

[vars]
# Optional: A token to protect the endpoint from unauthorized access
RENDER_BRIDGE_TOKEN = "" # Will be set via secrets

# Bindings for Browser Rendering
[[unsafe.bindings]]
name = "MYBROWSER" # Name of the browser binding
type = "browser"

# Bindings for R2 (if needed for temporary storage of large HTML, though not in initial spec)
# [[r2_buckets]]
# binding = "R2_BUCKET_NAME"
# bucket_name = "your-r2-bucket-name"
```

**3. `src/index.ts` Worker Logic:**

```typescript
// deploy/render-bridge-cf/src/index.ts
import puppeteer from '@cloudflare/puppeteer';
import { annotateDomWithComputedStyles, harvestPageStyles } from './render-logic'; // Adapted from render-server.mjs

export interface Env {
  MYBROWSER: DurableObjectNamespace;
  RENDER_BRIDGE_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Token-guard the endpoint
    const authHeader = request.headers.get('Authorization');
    if (!env.RENDER_BRIDGE_TOKEN || authHeader !== `Bearer ${env.RENDER_BRIDGE_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch(env.MYBROWSER);
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1024 }); // Consistent viewport

      let htmlContent: string;
      if (url.pathname === '/render') { // GET /render?url=
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return new Response('Missing URL parameter', { status: 400 });
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }); // 30s timeout
        htmlContent = await page.content(); // Get the rendered DOM
      } else if (url.pathname === '/render-html' && request.method === 'POST') { // POST /render-html
        const rawHtml = await request.text();
        if (!rawHtml) return new Response('Missing HTML body', { status: 400 });
        await page.setContent(rawHtml, { waitUntil: 'domcontentloaded', timeout: 30000 }); // 30s timeout
        htmlContent = await page.content(); // Get the rendered DOM
      } else {
        return new Response('Not Found', { status: 404 });
      }

      // Run our custom annotation script
      const annotatedHtml = await page.evaluate(annotateDomWithComputedStyles); // This function needs to be defined in render-logic.ts
      const pageStyles = await page.evaluate(harvestPageStyles); // This function needs to be defined in render-logic.ts

      return new Response(JSON.stringify({ html: annotatedHtml, styles: pageStyles }), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (e: any) {
      console.error('Render bridge error:', e);
      return new Response(`Render bridge error: ${e.message || 'Unknown error'}`, { status: 500 });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },
};
```

**4. Vercel App Wiring:**
*   **Environment Variables:**
    *   `SITE_RENDER_URL`: `https://aibizconnect-render-bridge.<your-worker-subdomain>.workers.dev/render`
    *   `SITE_RENDER_HTML_URL`: `https://aibizconnect-render-bridge.<your-worker-subdomain>.workers.dev/render-html`
    *   `SITE_RENDER_TOKEN`: A secret token for authorization.
*   **Client Calls:** `lib/sites/site-clone.ts` `fetchPage` and `renderHtmlToDom` will use these URLs and pass the `Authorization: Bearer <token>` header.

**5. Fidelity Caveat vs. Self-Hosted Container:**
*   **CPU Time:** Complex pages with heavy JS or very large DOMs might hit the Worker's CPU limits, potentially leading to timeouts or incomplete rendering.
*   **Request Body Size:** The 1MB request body limit for `POST /render-html` is a hard constraint. While Stitch exports are typically smaller, very large raw HTML pastes might need to be chunked or stored in R2 and passed by URL.
*   **Degradation:** If these limits are hit, the system will degrade by returning a 500 error from the Worker. Our application must catch this and inform the user of a low-fidelity capture (RULING 144). The self-hosted container would offer more control over these limits.

---
DECISION-LOG
[D-162] rule_cloudflare_workers_render_bridge — Ruled Cloudflare Workers with Browser Rendering for the render bridge (status: ruled)
[D-163] rule_render_bridge_deployment_cf — Ruled render bridge deployment details on Cloudflare Workers (status: ruled)