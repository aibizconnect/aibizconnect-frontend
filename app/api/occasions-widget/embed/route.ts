import { NextResponse } from "next/server";

/**
 * Occasions Widget embed script (D-401). Served per-key (the snippet is
 * <script src=".../embed?k=KEY" async>). Returns a self-contained vanilla-JS renderer that fetches
 * the gated active occasions and injects banners / fly-across airplane / emoji-particle animations
 * onto the host page. Frameworks not required. v1 supports the emoji animations; santa-sprite /
 * fireworks / glow are skipped (Gemini D-401).
 */
export const runtime = "nodejs";

const APP_BASE = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");

function buildScript(key: string): string {
  const ACTIVE = `${APP_BASE}/api/occasions-widget/active`;
  // NB: keep the embedded JS backtick-free so this outer template literal stays clean.
  return `(function(){
  if (window.__abcOccLoaded) return; window.__abcOccLoaded = true;
  var KEY=${JSON.stringify(key)}, ACTIVE=${JSON.stringify(ACTIVE)};
  var GLYPH={snow:"\\u2744\\uFE0F",hearts:"\\u2764\\uFE0F",confetti:"\\uD83C\\uDF8A",lanterns:"\\uD83C\\uDFEE",leaves:"\\uD83C\\uDF42",butterflies:"\\uD83E\\uDD8B",petals:"\\uD83C\\uDF38",shamrocks:"\\u2618\\uFE0F",pumpkins:"\\uD83C\\uDF83"};
  var RISE={hearts:1,lanterns:1,butterflies:1};
  var PLANE='<svg viewBox="0 0 16 16" width="34" height="34" style="display:block"><g transform="rotate(90 8 8)"><path fill="#1e3a8a" d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849Z"/></g></svg>';
  function injectCSS(){
    if (document.getElementById("abc-occ-css")) return;
    var s=document.createElement("style"); s.id="abc-occ-css";
    s.textContent="@keyframes abcFall{0%{transform:translateY(-10vh) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(110vh) rotate(360deg);opacity:.9}}"
      +"@keyframes abcRise{0%{transform:translateY(10vh) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(-110vh) rotate(40deg);opacity:.9}}"
      +"@keyframes abcFly{0%{transform:translateX(-40vw)}100%{transform:translateX(140vw)}}"
      +"@keyframes abcBob{0%{transform:translateY(0) rotate(0deg)}100%{transform:translateY(-5px) rotate(2deg)}}"
      +"@keyframes abcPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}"
      +".abc-occ-part{position:fixed;top:0;left:0;pointer-events:none;z-index:2147483000;will-change:transform}"
      +".abc-occ-banner{position:fixed;z-index:2147483400;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-weight:700;border-radius:10px;padding:9px 16px;box-shadow:0 6px 22px rgba(0,0,0,.18);display:inline-flex;align-items:center;gap:10px;max-width:92vw}"
      +".abc-occ-x{cursor:pointer;opacity:.7;font-weight:700;margin-left:4px}"
      +".abc-occ-fly{position:fixed;top:14%;left:0;z-index:2147483400;pointer-events:none;display:flex;align-items:center;gap:8px;animation:abcFly linear forwards;will-change:transform}"
      +".abc-occ-plane{display:block;animation:abcBob .7s ease-in-out infinite alternate}"
      +"@keyframes abcFw{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.35);opacity:0}}"
      +".abc-occ-fw{position:fixed;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:2147483000;will-change:transform,opacity}";
    document.head.appendChild(s);
  }
  var POS={"top-left":"top:14px;left:14px","top-center":"top:14px;left:50%;transform:translateX(-50%)","top-right":"top:14px;right:14px","middle-left":"top:50%;left:14px;transform:translateY(-50%)","center":"top:50%;left:50%;transform:translate(-50%,-50%)","middle-right":"top:50%;right:14px;transform:translateY(-50%)","bottom-left":"bottom:14px;left:14px","bottom-center":"bottom:14px;left:50%;transform:translateX(-50%)","bottom-right":"bottom:14px;right:14px"};
  function styleStr(b){
    var bg=b.bg||"#1e3a8a", fg=b.textColor||"#ffffff", extra="";
    if(b.pattern==="glow") extra="box-shadow:0 0 18px "+bg+",0 6px 22px rgba(0,0,0,.18);";
    else if(b.pattern==="pulse") extra="animation:abcPulse 1.6s ease-in-out infinite;";
    else if(b.pattern==="dashed") extra="border:2px dashed "+fg+";";
    else if(b.pattern==="neon") extra="border:2px solid "+fg+";text-shadow:0 0 6px "+fg+";box-shadow:0 0 14px "+bg+";";
    var w=b.widthPx?("width:"+b.widthPx+"px;justify-content:center;"):"";
    return "background:"+bg+";color:"+fg+";"+w+extra;
  }
  function renderBanner(item,fx){
    var b=item.banner||{}; var fly=item.fly; fx=fx||{};
    if(fly){
      var wrap=document.createElement("div"); wrap.className="abc-occ-fly";
      // Randomize entrance height (10% to 60% from top) based on randomness setting
      var rnd=(fx.randomness!=null?fx.randomness:60)/100;
      var baseTop=14+Math.random()*40; // 14% to 54%
      var topVar=baseTop*(Math.random()*2-1)*0.3*rnd; // ±30% variation by randomness
      var top=Math.max(5,Math.min(85,baseTop+topVar));
      wrap.style.top=top.toFixed(1)+"%";
      // Apply randomness to flight duration (like particles do)
      var baseDur=Math.max(7,22-(fx.speed||5));
      var dur=baseDur*(1+(Math.random()*2-1)*0.5*rnd);
      wrap.style.animationDuration=Math.max(4,dur).toFixed(2)+"s";
      // banner first (trails behind), plane last (leads / nose-right) so the plane PULLS the banner.
      var bn=document.createElement("div"); bn.className="abc-occ-banner"; bn.style.position="static"; bn.setAttribute("style","position:static;"+styleStr(b)); bn.textContent=b.message||item.name||"";
      wrap.appendChild(bn);
      wrap.insertAdjacentHTML("beforeend",PLANE);
      document.body.appendChild(wrap);
      return;
    }
    var el=document.createElement("div"); el.className="abc-occ-banner";
    var posStr=(POS[b.position]||POS["top-center"])+";"+styleStr(b);
    // Middle-left and middle-right banners are vertical (rotated 90°)
    if(b.position==="middle-left" || b.position==="middle-right") posStr+=";transform:rotate(-90deg);transform-origin:center";
    el.setAttribute("style",posStr);
    var span=document.createElement("span"); span.textContent=b.message||item.name||""; el.appendChild(span);
    if(b.dismissible!==false){ var x=document.createElement("span"); x.className="abc-occ-x"; x.textContent="\\u00D7"; x.onclick=function(){el.remove();}; el.appendChild(x); }
    document.body.appendChild(el);
  }
  function startParticles(kind,settings){
    var glyph=GLYPH[kind]; if(!glyph) return; // unsupported animation in v1
    var s=settings||{}; var size=s.size||22; var speed=s.speed||5; var density=s.density||40; var rise=RISE[kind];
    var rnd=(s.randomness!=null?s.randomness:60)/100; // 0 = uniform, 1 = very varied
    var dur=Math.max(4,14-speed); var interval=Math.max(120,1400-density*12);
    function vary(base){ return base*(1+(Math.random()*2-1)*0.5*rnd); }
    var timer=setInterval(function(){
      if(document.hidden) return;
      var p=document.createElement("div"); p.className="abc-occ-part"; p.textContent=glyph;
      p.style.left=(Math.random()*100)+"vw"; p.style.fontSize=vary(size).toFixed(1)+"px";
      var d=Math.max(2,vary(dur)).toFixed(2);
      p.style.animation=(rise?"abcRise ":"abcFall ")+d+"s linear forwards";
      document.body.appendChild(p);
      setTimeout(function(){p.remove();},Number(d)*1000+200);
    },interval);
    window.addEventListener("pagehide",function(){clearInterval(timer);});
  }
  function startFireworks(fx){
    var s=fx||{}; var density=s.density||40; var speed=s.speed||5;
    var interval=Math.max(450,2800-density*32);
    var colors=["#ff5252","#ffd740","#40c4ff","#69f0ae","#e040fb","#ff8a65","#ffffff"];
    function burst(){
      if(document.hidden) return;
      var cx=8+Math.random()*84, cy=8+Math.random()*46; // vw / vh
      var col=colors[Math.floor(Math.random()*colors.length)];
      var n=16+Math.floor(Math.random()*16); var reach=70+Math.random()*70+speed*3;
      for(var i=0;i<n;i++){
        var ang=(Math.PI*2*i)/n + Math.random()*0.2;
        var p=document.createElement("div"); p.className="abc-occ-fw";
        p.style.cssText="left:"+cx+"vw;top:"+cy+"vh;background:"+col+";box-shadow:0 0 8px "+col+";";
        p.style.setProperty("--dx",(Math.cos(ang)*reach).toFixed(0)+"px");
        p.style.setProperty("--dy",(Math.sin(ang)*reach).toFixed(0)+"px");
        p.style.animation="abcFw "+(1+Math.random()*0.7).toFixed(2)+"s ease-out forwards";
        document.body.appendChild(p);
        (function(el){setTimeout(function(){el.remove();},2000);})(p);
      }
    }
    burst(); var timer=setInterval(burst,interval);
    window.addEventListener("pagehide",function(){clearInterval(timer);});
  }
  function startAirplanes(banners,fx){
    if(!banners || !banners.length) return;
    var flyBanners=banners.filter(function(b){return b.fly;});
    if(!flyBanners.length) return;
    var rnd=(fx.randomness!=null?fx.randomness:60)/100;
    var baseDur=Math.max(7,22-(fx.speed||5));
    var interval=Math.max(5000,baseDur*1000*0.85); // new plane ~each flight-length (santa-style cadence)
    function launchOne(){
      if(document.hidden) return;
      var b=flyBanners[Math.floor(Math.random()*flyBanners.length)];
      // Fresh random entrance height EVERY pass (single-pass flight, so it never repeats the same spot).
      var top=Math.max(5,Math.min(82,(rnd>0? (5+Math.random()*77) : 14))); // randomness 0 = always ~top; else 5%-82%
      var wrap=document.createElement("div"); wrap.className="abc-occ-fly"; wrap.style.top=top.toFixed(1)+"%";
      var dur=baseDur*(1+(Math.random()*2-1)*0.5*rnd); dur=Math.max(4,dur); wrap.style.animationDuration=dur.toFixed(2)+"s";
      var bn=document.createElement("div"); bn.className="abc-occ-banner"; bn.style.position="static"; bn.setAttribute("style","position:static;"+styleStr(b.banner));
      bn.textContent=b.banner.message||b.name||""; wrap.appendChild(bn);
      // Plane in its own bobbing element (santa-style gallop) so the wobble doesn't fight the cross-screen transform.
      var plane=document.createElement("div"); plane.className="abc-occ-plane"; plane.innerHTML=PLANE; wrap.appendChild(plane);
      document.body.appendChild(wrap);
      wrap.addEventListener("animationend",function(){wrap.remove();});
      setTimeout(function(){if(wrap.parentNode) wrap.remove();},dur*1000+1500); // safety cleanup
    }
    launchOne(); var timer=setInterval(launchOne,interval);
    window.addEventListener("pagehide",function(){clearInterval(timer);});
  }
  function render(state){
    if(!state) return;
    injectCSS();
    var fx=state.settings||{};
    var staticBanners=(state.banners||[]).filter(function(b){return !b.fly;});
    staticBanners.forEach(function(b){renderBanner(b,fx);});
    if(state.banners) startAirplanes(state.banners,fx);
    if(state.animation==="fireworks") startFireworks(fx);
    else if(state.animation) startParticles(state.animation,fx);
  }
  function go(){
    try{
      var url=ACTIVE+"?k="+encodeURIComponent(KEY)+"&host="+encodeURIComponent(location.hostname);
      fetch(url,{mode:"cors"}).then(function(r){return r.json();}).then(render).catch(function(){});
    }catch(e){}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",go); else go();
})();`;
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("k") || "";
  const js = key ? buildScript(key) : "/* occasions widget: missing ?k= key */";
  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      // Short cache so renderer fixes / config changes propagate to embedded sites within ~1 min
      // (stale-while-revalidate keeps it instant for repeat visitors while it refreshes in the bg).
      "Cache-Control": "public, max-age=60, stale-while-revalidate=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
