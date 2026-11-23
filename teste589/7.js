
/* ===== Tesla: ao escolher um canal ou filme, abre logo em ecrã total ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const on = () => cfg.tvAutoFull !== false;
  const pick = t => {
    let b, c;
    if((b = t.closest("#ahRows [data-k], #ahHero [data-k]"))) c = window.__ah && window.__ah.flat[+b.dataset.k];
    else if((b = t.closest("#ahSrRes [data-i]"))) c = {kind:"?"};
    else if((b = t.closest("#tvList [data-play]"))) c = (window.__tvShown || [])[+b.dataset.play];
    else if((b = t.closest("#tvList [data-ep]"))) c = {kind:"episode"};
    else if((b = t.closest("#gdPlay, #mvGo, [data-gdx='play']"))) c = {kind:"?"};
    return b && c ? c : null;
  };
  document.addEventListener("click", e => {
    if(!on() || !e.target || !e.target.closest) return;
    const c = pick(e.target); if(!c) return;
    if(currentView === "tvinicio") window.__fsFromHome = true;
    if(c.kind === "series") return;                          /* séries: primeiro a lista de episódios */
    if(c.kind === "?" && e.target.closest("#mvGo") && window.__mvSeries) return;
    try{ if(tvBlocked(c)) return; }catch(x){}
    const st = $("stage"); if(!st) return;
    if(!st.classList.contains("single")){ if(!/split|pip/.test(st.className)) return; st.classList.add("solo"); }   /* vista dupla / PIP: o ecrã seleccionado ocupa tudo até sair do ecrã total */
    if(window.__ah) window.__ah.pass = Date.now() + 3000;
    if(currentView !== "tv") show("tv");
    setCinema(true);
    try{ if(window.__goFull) window.__goFull(); else { const rq = st.requestFullscreen || st.webkitRequestFullscreen; if(rq && !(document.fullscreenElement || document.webkitFullscreenElement)){ const r = rq.call(st); if(r && r.catch) r.catch(() => {}); } } }catch(x){}
  }, true);
  /* sai do ecrã total/cinema: volta à vista dupla */
  try{
    const unsolo = () => { const st = $("stage"); if(st && st.classList.contains("solo") && !(document.fullscreenElement || document.webkitFullscreenElement) && !$("v-tv").classList.contains("cinema")) st.classList.remove("solo"); };
    document.addEventListener("fullscreenchange", () => setTimeout(unsolo, 150));
    new MutationObserver(() => setTimeout(unsolo, 150)).observe($("v-tv"), {attributes:true, attributeFilter:["class"]});
  }catch(e){}
  /* série escolhida no ecrã de informação: não entra em ecrã total */
  try{ const g = $("mvGo"); if(g) new MutationObserver(() => { window.__mvSeries = /epis/i.test(g.textContent); }).observe(g, {childList:true, characterData:true, subtree:true}); }catch(e){}
  /* Definições → TV e IPTV → Ecrã inicial da TV */
  const w = $("ahSet");
  if(w){
    const l = document.createElement("label"); l.className = "row small"; l.style.marginTop = "6px";
    l.innerHTML = '<input type="checkbox" id="ahSetFull"> Abrir canais e filmes logo em ecrã total (toca duas vezes no vídeo para sair)';
    w.appendChild(l);
    const cb = $("ahSetFull"); cb.checked = on();
    cb.onchange = () => { cfg.tvAutoFull = cb.checked; saveCfg(); };
    const _fs = window.fillSettings; if(typeof _fs === "function") window.fillSettings = function(){ const r = _fs.apply(this, arguments); try{ cb.checked = on(); }catch(e){} return r; };
  }
  }catch(e){ console.log("ecrã total", e); }
})();
