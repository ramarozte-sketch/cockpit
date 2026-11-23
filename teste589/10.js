
/* ===== Tesla: ecrã total "a sério" na página (funciona mesmo quando o browser não deixa usar o ecrã inteiro) ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const vt = $("v-tv"), st = $("stage");
  const ex = document.createElement("button"); ex.id = "vExit"; ex.type = "button"; ex.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="vertical-align:-2px"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg> Sair'; document.body.appendChild(ex);
  let hT = 0;
  let lastAt = 0;
  /* v251: em meia janela no Tesla os controlos ficam 8 s (antes 5 s) */
  const ctlMs = () => document.documentElement.classList.contains("half") ? 8000 : 5000;
  const peek = () => { lastAt = Date.now(); document.body.classList.add("ctlOn"); clearTimeout(hT); hT = setTimeout(() => document.body.classList.remove("ctlOn"), ctlMs()); };
  setInterval(() => { if(document.body.classList.contains("ctlOn") && Date.now() - lastAt > ctlMs() + 200) document.body.classList.remove("ctlOn"); }, 500);
  window.__ctlPeek = peek;
  const sync = () => {
    const on = vt.classList.contains("cinema") && currentView === "tv";
    const was = document.body.classList.contains("pfull");
    document.body.classList.toggle("pfull", on);
    ["vid0", "vid1"].forEach(id => { const v = $(id); if(v) v.controls = !on; });   /* sem os controlos do browser: usamos a barra própria */
    if(on && !was) peek();
    if(!on){ document.body.classList.remove("ctlOn"); }
  };
  new MutationObserver(sync).observe(vt, {attributes:true, attributeFilter:["class"]});
  const _sh = window.show; window.show = function(){ const r = _sh.apply(this, arguments); try{ sync(); }catch(e){} return r; };
  const leave = () => {
    try{ if(document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); }catch(e){}
    setCinema(false); sync();
    try{ if(window.__fsFromHome && cfg.tvHome !== "classic"){ window.__fsFromHome = false; show("tvinicio"); } }catch(e){}
  };
  window.__fsLeave = leave;
  /* botão de formato da imagem ao lado do Sair */
  const fm = document.createElement("button"); fm.id = "vFmt"; fm.type = "button"; document.body.appendChild(fm);
  const fmPaint = () => { const a = $("chAspect"); fm.textContent = a ? a.textContent : "▭ Formato"; };
  fm.onclick = e => { e.stopPropagation(); const a = $("chAspect"); if(a) a.click(); fmPaint(); peek(); };
  setInterval(fmPaint, 1000); fmPaint();
  ex.onclick = e => { e.stopPropagation(); leave(); };
  /* lista de canais (picon + nome) à esquerda, com scroll e selecção */
  const fsl = document.createElement("div"); fsl.id = "fsCh"; document.body.appendChild(fsl);
  let fsLC = {k:"", l:null}, fsKey = "", fsLast = "", fsCenter = true, fsWas = false;
  const fsBuild = () => {
    const c = lastPlayed[tvTarget];
    if(!c){ fsl.innerHTML = ""; fsKey = ""; return; }
    const md = LS.get("fsList", "all");
    fsl.style.display = md === "off" ? "none" : "";
    if(md === "off") return;
    let list; try{ list = window.__srcListFor(c, tvTarget); }catch(e){ list = []; }
    if(!list.length) list = [c];
    const key = md + "|" + c.url + "|" + list.length + "|" + (list[0] && list[0].url);
    if(key === fsKey) return; fsKey = key;
    const gk = md + "|" + (list[0] && list[0].url) + "|" + list.length;
    const same = fsl.dataset.g === gk;
    fsl.dataset.g = gk;
    if(!same){
      fsl.innerHTML = "";
      list.forEach((x, i) => {
        const b = document.createElement("button"); b.type = "button"; b.dataset.u = x.url;
        const pi = document.createElement("span"); pi.className = "pi";
        if(x.logo){ const im = document.createElement("img"); im.loading = "lazy"; im.decoding = "async"; im.alt = ""; im.src = x.logo; im.onerror = () => { im.remove(); pi.textContent = "📺"; }; pi.appendChild(im); } else pi.textContent = "📺";
        const n = document.createElement("b"); n.textContent = x.name;
        b.append(pi, n);
        b.onclick = e => { e.stopPropagation(); peek(); if(!lastPlayed[tvTarget] || lastPlayed[tvTarget].url !== x.url) playChannel(x); };
        fsl.appendChild(b);
      });
    }
    let cur = null;
    fsl.querySelectorAll("button").forEach(b => { const on = b.dataset.u === c.url; b.classList.toggle("on", on); if(on) cur = b; });
    if(cur && (fsCenter || fsLast !== c.url)){ fsCenter = false; try{ fsl.scrollTop = Math.max(0, cur.offsetTop - fsl.clientHeight / 2 + cur.offsetHeight / 2); }catch(e){} }
    fsLast = c.url;
  };
  ["pointerdown", "wheel", "touchmove"].forEach(ev => fsl.addEventListener(ev, peek, {passive:true}));
  fsl.addEventListener("scroll", peek, {passive:true});
  fsl.addEventListener("click", e => e.stopPropagation());
  setInterval(() => { if(document.body.classList.contains("ctlOn")) try{ fsBuild(); }catch(e){} }, 1200);
  new MutationObserver(() => { const on = document.body.classList.contains("ctlOn"); if(on && !fsWas){ fsCenter = true; fsKey = ""; try{ fsBuild(); }catch(e){} } fsWas = on; }).observe(document.body, {attributes:true, attributeFilter:["class"]});
  const fb = document.createElement("button"); fb.id = "vFsl"; fb.type = "button"; document.body.appendChild(fb);
  const fbPaint = () => { const m = LS.get("fsList", "all"); fb.textContent = "☰ Lista: " + (m === "off" ? "off" : "ligada"); };
  fb.onclick = e => { e.stopPropagation(); const m = LS.get("fsList", "all"); LS.set("fsList", m === "off" ? "all" : "off"); fbPaint(); try{ const ss = document.getElementById("setFsl"); if(ss) ss.value = LS.get("fsList", "all"); }catch(x){} fsKey = ""; fsl.dataset.g = ""; fsl.style.display = ""; try{ fsBuild(); }catch(x){} peek(); };
  fbPaint();
  /* tocar no vídeo mostra/esconde os controlos */
  st.addEventListener("click", e => { if(!document.body.classList.contains("pfull") || e.target.closest("button")) return; if(document.body.classList.contains("ctlOn")){ clearTimeout(hT); document.body.classList.remove("ctlOn"); } else peek(); });
  document.querySelectorAll("#v-tv .cinebar").forEach(b => b.addEventListener("pointerdown", peek));
  /* o ecrã inteiro do browser passa a ser a página toda, para os controlos aparecerem por cima */
  const goFull = () => { try{ const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen; if(rq && !(document.fullscreenElement || document.webkitFullscreenElement)){ const r = rq.call(el); if(r && r.catch) r.catch(() => {}); } }catch(e){} };
  window.__goFull = goFull;
  $("btnFull").onclick = () => { setCinema(true); goFull(); };
  document.addEventListener("fullscreenchange", () => { if(!(document.fullscreenElement || document.webkitFullscreenElement) && document.body.classList.contains("pfull")) peek(); });
  sync();
  }catch(e){ console.log("ecrã total página", e); }
})();
