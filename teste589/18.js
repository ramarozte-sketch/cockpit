
/* ===== Tesla: escolher um canal no Início abre-o no quadro do destaque; duplo toque = ecrã total ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const st = $("stage"), home = {p:st.parentNode, n:st.nextSibling};
  const on = () => cfg.tvHome !== "classic";
  let stayUntil = 0;
  const art = () => document.querySelector("#ahHero .ahHeroArt");
  const hasCh = () => !!(lastPlayed && lastPlayed[0]);
  const ctl = in_ => ["vid0", "vid1"].forEach(id => { const v = $(id); if(v) v.controls = !in_ && !document.body.classList.contains("pfull"); });
  /* leva o leitor para o quadro do destaque (ou devolve-o à página TV) — o vídeo continua a tocar */
  const toHero = () => {
    const a = art(); if(!a || !hasCh() || currentView !== "tvinicio") return false;
    if(st.parentNode !== a){ a.appendChild(st); }
    if(!a.querySelector(".ahFsHint")){ const h = document.createElement("span"); h.className = "ahFsHint"; h.textContent = "Toca duas vezes para ecrã total"; a.appendChild(h); }
    document.body.classList.add("ahStageIn"); window.__ahStageIn = true; ctl(true);
    try{ window.__ahPrevStop && window.__ahPrevStop(); }catch(e){}
    return true;
  };
  const toTv = () => {
    if(st.parentNode !== home.p){ try{ home.p.insertBefore(st, home.n && home.n.parentNode === home.p ? home.n : null); }catch(e){ home.p.appendChild(st); } }
    document.body.classList.remove("ahStageIn"); window.__ahStageIn = false; ctl(false);
  };
  window.__ahStageHome = () => { if(currentView === "tvinicio" && hasCh() && on()) toHero(); };
  const _sh = window.show;
  window.show = function(v){
    if(v === "tv" && currentView === "tvinicio" && Date.now() < stayUntil) return;   /* o canal foi escolhido no Início: fica no Início */
    if(v !== "tvinicio") toTv();
    const r = _sh.apply(this, arguments);
    if(currentView === "tvinicio" && on()) setTimeout(() => { if(currentView === "tvinicio") toHero(); }, 0);
    return r;
  };
  /* tocar num canal em direto do Início: começa a dar no destaque */
  window.addEventListener("click", e => {
    const t = e.target; if(!on() || !t || !t.closest || currentView !== "tvinicio") return;
    const b = t.closest("#ahRows .ahCard[data-k], #ahHero .ahBtn.pri[data-k]"); if(!b) return;   /* «▶ Ver agora» do destaque conta como um cartão */
    const c = window.__ah && window.__ah.flat[+b.dataset.k];
    if(!c || /^(movie|series|episode|vod)$/.test(c.kind || "")) return;   /* filmes e séries: como antes (detalhes / ecrã total) */
    e.stopImmediatePropagation(); e.preventDefault();
    try{ if(tvBlocked(c)){ toast("Vídeo só com o carro parado.", true); return; } }catch(x){}
    if(window.__ahStageIn && lastPlayed[0] && lastPlayed[0].url === c.url){ goFull(); return; }   /* já está na pré-visualização: ecrã total */
    stayUntil = Date.now() + 20000;
    try{ const sm = document.querySelector('[data-mode="single"]'); if(sm && !st.classList.contains("single")) sm.click(); }catch(x){}
    /* v247: guarda a fila de onde o canal veio (ex.: lista do operador): a lista à esquerda do ecrã total e o zapping seguem-na */
    try{ if(b.closest("#ahRows")) window.__srcFromRow(b, window.__ah.flat); }catch(x){}
    window.__oneConn(c, 0);
    const upd = () => { try{ window.__ah.render(false); }catch(x){} toHero(); };
    setTimeout(upd, 60); setTimeout(upd, 1200);
    const h = () => { const a = art(), x = a && a.querySelector(".ahFsHint"); if(x){ x.classList.add("on"); setTimeout(() => x.classList.remove("on"), 3000); } }; setTimeout(h, 400);
  }, true);
  /* duplo toque (ou duplo clique) no vídeo do destaque: ecrã total */
  const goFull = () => {
    stayUntil = 0; window.__fsFromHome = true; window.__fsEnterAt = Date.now();
    if(window.__ah) window.__ah.pass = Date.now() + 3000;
    show("tv"); setCinema(true);
    try{ window.__goFull && window.__goFull(); }catch(e){}
  };
  let last = 0, lx = 0, ly = 0;
  st.addEventListener("pointerup", e => {
    if(!window.__ahStageIn) return;
    const n = Date.now();
    if(n - last < 380 && Math.hypot(e.clientX - lx, e.clientY - ly) < 60){ last = 0; e.stopImmediatePropagation(); goFull(); }
    else { last = n; lx = e.clientX; ly = e.clientY; }
  }, true);
  st.addEventListener("dblclick", e => { if(!window.__ahStageIn) return; e.stopImmediatePropagation(); e.preventDefault(); if(currentView === "tvinicio") goFull(); }, true);
  st.addEventListener("click", e => { if(window.__ahStageIn){ e.stopImmediatePropagation(); } }, true);
  /* duplo toque para sair do ecrã total também volta ao Início, se foi de lá que vieste */
  document.addEventListener("fullscreenchange", () => { if(!(document.fullscreenElement || document.webkitFullscreenElement)) setTimeout(() => { if(window.__fsFromHome && currentView === "tv" && !$("v-tv").classList.contains("cinema") && on()){ window.__fsFromHome = false; show("tvinicio"); } }, 250); });
  new MutationObserver(() => { if(window.__fsFromHome && currentView === "tv" && !$("v-tv").classList.contains("cinema") && on() && !(document.fullscreenElement || document.webkitFullscreenElement)){ window.__fsFromHome = false; setTimeout(() => show("tvinicio"), 0); } }).observe($("v-tv"), {attributes:true, attributeFilter:["class"]});
  /* a pré-visualização automática (sem som) não corre quando o leitor já está no destaque */
  const _pp = window.__ahPrevStop;
  }catch(e){ console.log("destaque", e); }
})();
