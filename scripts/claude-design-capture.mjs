// Capture the RENDERED DOM of the Claude Design preview already open in the debug Chrome.
// The preview is a cross-origin out-of-process IFRAME, which Playwright's connectOverCDP doesn't
// enumerate — so we attach to its CDP target's webSocketDebuggerUrl directly and evaluate.
// Unlike claude-design-pull (the SOURCE .dc.html with unexpanded {{ }} bindings), this returns the
// expanded, pixel-faithful HTML + the collected CSS. Usage: node scripts/claude-design-capture.mjs [Home]
import { mkdirSync, writeFileSync } from "fs";

const slug = (process.argv[2] || "Home").replace(/\.dc\.html$/i, "");
const HOST = process.env.CHROME_CDP_HOST || "127.0.0.1:9222";
const rx = new RegExp(`claudeusercontent\\.com.*serve/${slug}\\.dc\\.html`, "i");

const targets = await fetch(`http://${HOST}/json/list`).then((r) => r.json());
const t = targets.find((x) => x.type === "iframe" && rx.test(x.url) && x.webSocketDebuggerUrl)
  || targets.find((x) => rx.test(x.url) && x.webSocketDebuggerUrl);
if (!t) { console.error("No rendered target for", `${slug}.dc.html`); process.exit(2); }

const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });

await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
await send("Runtime.enable");
const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value ?? "";

const html = await evalJs("document.documentElement.outerHTML");
const css = await evalJs(`(()=>{const o=[];for(const s of document.styleSheets){try{o.push(Array.from(s.cssRules).map(r=>r.cssText).join("\\n"))}catch(e){}}return o.join("\\n\\n")})()`);
const text = await evalJs("document.body?document.body.innerText:''");
ws.close();

const dir = `design-handoffs/${slug.toLowerCase()}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/${slug}.rendered.html`, html);
writeFileSync(`${dir}/${slug}.rendered.css`, css);
writeFileSync(`${dir}/${slug}.text.txt`, text);
console.log(`RENDERED ${html.length}b html · ${css.length}b css · ${text.length}b text -> ${dir}/${slug}.rendered.html`);
