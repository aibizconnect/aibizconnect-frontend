import { NextResponse } from "next/server";

/**
 * Listings block loader (D-361) — the one-line embed a GoHighLevel page (or any site) pastes:
 *
 *   <script src="https://app.aibizconnect.app/api/listings-block/embed?t=TENANT"
 *           data-city="Toronto" data-class="Residential" data-count="6" async></script>
 *
 * It mounts an iframe on /embed/listings/<tenant> carrying the block's filters, then keeps the
 * iframe's height glued to the content via postMessage — so the block grows and shrinks with the
 * results instead of scrolling inside a fixed box. Filters can also be passed in the script's own
 * query string, which is what the config page's "copy snippet" emits when the host builder strips
 * data-* attributes.
 */
export const runtime = "nodejs";

const APP_BASE = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");

// Config keys the loader forwards to the embed URL (filters + display options).
const KEYS = [
  "class", "t", "city", "municipality", "community", "min", "max", "beds", "baths", "use", "sqft",
  "count", "columns", "sort", "search", "sortui", "favorites", "badges", "attribution", "disclaimer", "detail", "accent", "heading",
];

function buildScript(tenantId: string, presetQuery: string): string {
  const EMBED = `${APP_BASE}/embed/listings/${encodeURIComponent(tenantId)}`;
  return `(function(){
  var EMBED=${JSON.stringify(EMBED)}, KEYS=${JSON.stringify(KEYS)}, PRESET=${JSON.stringify(presetQuery)};
  var me=document.currentScript;
  if(!me||me.getAttribute("data-abc-mounted")==="1") return;
  me.setAttribute("data-abc-mounted","1");

  function query(){
    var q=new URLSearchParams(PRESET);
    for(var i=0;i<KEYS.length;i++){
      var v=me.getAttribute("data-"+KEYS[i]);
      if(v!==null&&v!=="") q.set(KEYS[i],v);
    }
    return q.toString();
  }

  var frame=document.createElement("iframe");
  frame.src=EMBED+(query()?"?"+query():"");
  frame.title="Property listings";
  frame.loading="lazy";
  frame.setAttribute("scrolling","no");
  frame.setAttribute("allowtransparency","true");
  frame.style.cssText="display:block;width:100%;border:0;overflow:hidden;min-height:"+(me.getAttribute("data-min-height")||"600")+"px";

  var target=me.getAttribute("data-target");
  var mount=target?document.querySelector(target):null;
  if(mount) mount.appendChild(frame);
  else if(me.parentNode) me.parentNode.insertBefore(frame,me);
  else document.body.appendChild(frame);

  window.addEventListener("message",function(e){
    if(!e.data||e.source!==frame.contentWindow) return;
    if(e.data.type==="abc-listings:height"){
      var h=parseInt(e.data.height,10);
      if(h>0) frame.style.height=h+"px";
    } else if(e.data.type==="abc-listings:scroll"){
      try{ frame.scrollIntoView({behavior:"smooth",block:"start"}); }catch(err){ frame.scrollIntoView(); }
    }
  });
})();`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenantId = (url.searchParams.get("t") || url.searchParams.get("tenant") || "").trim();
  const preset = new URLSearchParams();
  for (const k of KEYS) {
    const v = url.searchParams.get(k);
    if (v) preset.set(k, v);
  }
  const js = tenantId
    ? buildScript(tenantId, preset.toString())
    : "/* AIBizConnect listings block: missing ?t=<tenantId> */";
  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      // Short cache so loader fixes reach embedded sites within ~a minute.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
