
/* ===== Carro em movimento ou parado: só som em andamento, poupança de dados, avisos do carregamento,
   temporizador para desligar e libertar a ligação com o ecrã apagado. O bloqueio do vídeo em andamento fica igual. ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const D = DRIVE;
  const opt = (k, d) => { const v = cfg[k]; return v === undefined ? d : v; };

  /* (o «só som em andamento» foi retirado a pedido; fica só o necessário para o temporizador) */
  const AU = window.__drvAudio = {el:null, stop:null, c:null};
  const aEl = () => { if(!AU.el){ const a = document.createElement("audio"); a.id = "drvAud"; a.preload = "auto"; a.style.display = "none"; document.body.appendChild(a); AU.el = a; } return AU.el; };
  const srcFor = c => { const u = String(c.url || ""), ref = typeof refFor === "function" ? refFor(c) : "";
    try{ if(cfg.directMode || DIRECT_VIDEO()) return directUrl(u); if(cfg.proxy2) return px2(u, ref, c.free); if(HASPX() && !(c.free && /^https:/i.test(u))) return px(u, ref, c.free); }catch(e){}
    return u; };
  const audioStop = () => { try{ AU.stop && AU.stop(); }catch(e){} AU.stop = null; if(AU.el){ try{ AU.el.pause(); AU.el.removeAttribute("src"); AU.el.load(); }catch(e){} } AU.c = null; paintLock(); };
  window.__drvAudioStop = audioStop;
  const audioStart = async (c, at) => {
    audioStop(); AU.c = c;
    const a = aEl(); a.volume = (window.__vg && window.__vg.v) || 1;
    let u = srcFor(c);
    if(/\/live\//.test(u) && /\.ts(\?|$)/i.test(c.url) && !/\.m3u8/i.test(u)){ /* .ts direto: mpegts só com som */
      if(await loadMpegts() && mpegts.isSupported()){
        const p = mpegts.createPlayer({type:"mpegts", isLive:true, hasVideo:false, hasAudio:true, url:u}, {enableWorker:true, liveBufferLatencyChasing:true, autoCleanupSourceBuffer:true});
        p.attachMediaElement(a); p.load(); a.play().catch(() => {}); AU.stop = () => { try{ p.destroy(); }catch(e){} };
      }
    } else if(/\.m3u8(\?|#|$)/i.test(u) && window.Hls && Hls.isSupported()){
      /* HLS: a qualidade mais baixa (o som é o mesmo) e muito avanço guardado para os túneis */
      const h = new Hls({startLevel:0, capLevelToPlayerSize:false, maxBufferLength:60, maxMaxBufferLength:90, backBufferLength:10,
        manifestLoadingTimeOut:20000, levelLoadingTimeOut:20000, fragLoadingTimeOut:30000, fragLoadingMaxRetry:12, fragLoadingRetryDelay:1000, levelLoadingMaxRetry:8, manifestLoadingMaxRetry:6});
      h.on(Hls.Events.MANIFEST_PARSED, () => { try{ h.autoLevelCapping = 0; h.currentLevel = 0; }catch(e){} a.play().catch(() => {}); });
      let fails = 0;
      h.on(Hls.Events.ERROR, (ev, d) => { if(!d.fatal) return; if(++fails > 20){ toast("Sem rede para o som de " + c.name + ".", true); return; }
        setTimeout(() => { try{ if(d.type === Hls.ErrorTypes.MEDIA_ERROR) h.recoverMediaError(); else h.startLoad(-1); }catch(e){} }, Math.min(15000, 1500 * fails)); });   /* sem rede: volta a tentar, em silêncio */
      h.loadSource(u); h.attachMedia(a); AU.stop = () => { try{ h.destroy(); }catch(e){} };
      if(at && c.kind !== "live") a.addEventListener("loadedmetadata", () => { try{ a.currentTime = at; }catch(e){} }, {once:true});
    } else {
      AU.stop = await playMediaUrl(u, a, () => {});
      if(at && c.kind !== "live") a.addEventListener("loadedmetadata", () => { try{ a.currentTime = at; }catch(e){} }, {once:true});
    }
    try{ if("mediaSession" in navigator){ navigator.mediaSession.metadata = new MediaMetadata({title:c.name, artist:"Cockpit · só som"}); } }catch(e){}
    paintLock();
  };
  const paintLock = () => {
    try{
      const el = $("tvLock"); if(!el) return;
      let b = $("drvAudBar");
      if(!b){ b = document.createElement("div"); b.id = "drvAudBar"; b.className = "banner"; b.hidden = true; el.parentNode.insertBefore(b, el.nextSibling); }
      if(AU.c){ b.hidden = false; b.innerHTML = '🔊 A ouvir <b>' + esc(AU.c.name) + '</b> só com som (a imagem volta quando parares em P). <button class="btn" id="drvAudStop">⏹ Parar o som</button>';
        $("drvAudStop").onclick = () => { audioStop(); D.halted = null; toast("Som parado."); }; }
      else b.hidden = true;
    }catch(e){}
  };
  /* ---------- 3) Poupar dados: 720p em andamento (modo passageiro) ou com rede lenta ---------- */
  window.__capExtra = () => {
    if(!opt("dataSave", true)) return 99999;
    let slow = false;
    try{ const n = navigator.connection; if(n && ((n.effectiveType && /^(slow-2g|2g|3g)$/.test(n.effectiveType)) || (n.downlink && n.downlink < 3))) slow = true; }catch(e){}
    try{ const bw = +LS.get("bwEst", 0); if(bw && bw < 3e6) slow = true; }catch(e){}
    return (drivingEff() || slow) ? 720 : 99999;
  };
  let lastCap = null;
  setInterval(() => { try{ const c = window.__capExtra(); if(c !== lastCap){ lastCap = c; if(typeof applyCaps === "function") applyCaps(); } }catch(e){} }, 3000);

  /* ---------- 5) Avisos do carregamento por cima do vídeo ---------- */
  const CH = {state:"", pct:-1, five:false};
  setInterval(() => {
    try{
      if(!opt("chgNotes", true) || demo() || !car || !car.charge_state) return;
      if(!(lastPlayed[0] || lastPlayed[1] || AU.c)) { CH.state = car.charge_state.charging_state || ""; return; }
      const cs = car.charge_state, st = cs.charging_state || "", pct = Math.round(+cs.battery_level || 0), lim = +cs.charge_limit_soc || 0, mins = +cs.minutes_to_full_charge || 0, kw = Math.round(+cs.charger_power || 0);
      if(CH.state && st !== CH.state){
        if(st === "Charging") toast("🔌 A carregar: " + pct + "%" + (kw ? " · " + kw + " kW" : "") + (mins ? " · faltam " + mins + " min" : ""));
        else if(st === "Complete") toast("✅ Carregamento concluído: " + pct + "%" + (lim ? " (limite " + lim + "%)" : ""));
        else if(st === "Stopped" && CH.state === "Charging") toast("⏸ Carregamento parado: " + pct + "%");
        else if(st === "Disconnected" && CH.state === "Charging") toast("🔌 Cabo desligado: " + pct + "%");
        CH.five = false;
      }
      if(st === "Charging"){
        if(CH.pct >= 0 && Math.floor(pct / 10) > Math.floor(CH.pct / 10)) toast("🔋 Bateria a " + pct + "%" + (mins ? " · faltam " + mins + " min" : ""));
        if(mins > 0 && mins <= 5 && !CH.five){ CH.five = true; toast("⏱ Faltam " + mins + " min para chegar a " + (lim || 100) + "%"); }
      }
      CH.state = st; CH.pct = pct;
    }catch(e){}
  }, 5000);

  /* ---------- 6) Temporizador para desligar ---------- */
  const SL = window.__sleep = {end:0, t:0};
  const SLOPTS = [0, 30, 60, 90];
  const slLabel = () => SL.end ? "⏲ " + Math.max(1, Math.ceil((SL.end - Date.now()) / 60000)) + " min" : "⏲ Temporizador";
  const slPaint = () => document.querySelectorAll(".slBtn").forEach(b => { b.textContent = slLabel(); b.setAttribute("aria-pressed", String(!!SL.end)); });
  const slCycle = () => {
    const cur = SL.end ? Math.ceil((SL.end - Date.now()) / 60000) : 0;
    const i = SLOPTS.findIndex(m => m > cur + 1); const next = i < 0 ? 0 : SLOPTS[i];
    SL.end = next ? Date.now() + next * 60000 : 0; slPaint();
    toast(next ? "Desliga daqui a " + next + " min." : "Temporizador desligado.");
  };
  const mkSl = (where, before) => { if(!where) return; const b = document.createElement("button"); b.className = "btn slBtn"; b.type = "button"; b.onclick = e => { e.stopPropagation(); slCycle(); }; where.insertBefore(b, before || null); };
  try{ mkSl(document.querySelector('#v-tv .cinebar[data-testid="tv-cinebar"]'), $("chNext")); }catch(e){}
  try{ const t = document.querySelector("#v-tvinicio .ahTop"); if(t) mkSl(t, t.querySelector('[data-go="explore"]')); }catch(e){}
  slPaint();
  setInterval(() => {
    if(!SL.end) return; slPaint();
    const left = SL.end - Date.now();
    const vols = [$("vid0"), $("vid1"), AU.el].filter(Boolean);
    if(left <= 10000 && left > 0){ vols.forEach(v => { try{ if(v._v0 == null) v._v0 = v.volume; v.volume = Math.max(0, v._v0 * left / 10000); }catch(e){} }); }   /* baixa o som nos últimos 10 s */
    if(left <= 0){
      SL.end = 0; slPaint();
      try{ stopSlot(0); stopSlot(1); lastPlayed[0] = lastPlayed[1] = null; updateCinemaBar(); keepAwake(false); }catch(e){}
      audioStop();
      vols.forEach(v => { try{ if(v._v0 != null){ v.volume = v._v0; v._v0 = null; } }catch(e){} });
      try{ if(document.body.classList.contains("pfull") && window.__fsLeave) window.__fsLeave(); }catch(e){}
      toast("⏲ Temporizador: TV desligada.");
    }
  }, 1000);

  /* ---------- 7) Ecrã apagado ou página escondida: liberta a ligação ao fim de uns minutos ---------- */
  const HD = {t:0, saved:null};
  document.addEventListener("visibilitychange", () => {
    clearTimeout(HD.t);
    const mins = +opt("hideStop", 3);
    if(document.hidden){
      if(!mins || AU.c) return;   /* o som em andamento continua com a página escondida */
      HD.t = setTimeout(() => {
        if(!document.hidden) return;
        const c = lastPlayed[0] || lastPlayed[1]; if(!c) return;
        let at = 0; try{ const v = $("vid" + (lastPlayed[0] ? 0 : 1)); at = v.currentTime || 0; }catch(e){}
        HD.saved = {c, at, view:currentView};
        try{ if(c.kind !== "live" && window.RES) window.RES.save(c, at, $("vid0").duration || 0); }catch(e){}
        try{ stopSlot(0); stopSlot(1); lastPlayed[0] = lastPlayed[1] = null; updateCinemaBar(); keepAwake(false); }catch(e){}
      }, mins * 60000);
    } else if(HD.saved){
      const s = HD.saved; HD.saved = null;
      if(tvBlocked()) return;
      setTimeout(() => { try{ toast("A retomar " + s.c.name + "…"); (window.__oneConn || window.playChannel)(s.c, 0); }catch(e){} }, 400);
    }
  });

  /* ---------- Definições → TV e IPTV ---------- */
  const w = $("ahSet");
  if(w){
    const d = document.createElement("div"); d.id = "drvSet";
    d.innerHTML = '<h3 style="margin:14px 0 6px">Carro em movimento ou parado</h3>' +
      '<label class="row small"><input type="checkbox" id="dataSaveOpt"> Poupar dados: no máximo 720p em andamento ou com rede lenta</label>' +
      '<label class="row small"><input type="checkbox" id="chgOpt"> Avisos do carregamento por cima do vídeo (início, cada 10 %, faltam 5 min, concluído)</label>' +
      '<label class="f">Com o ecrã apagado ou a página escondida, parar o vídeo ao fim de<select id="hideOpt"><option value="0">Nunca</option><option value="1">1 min</option><option value="3">3 min</option><option value="10">10 min</option></select></label>' +
      '<label class="row small"><input type="checkbox" id="resOpenOpt"> Ao abrir o Cockpit, continuar o último canal ou filme (o filme no ponto onde ficou)</label>' +
      '<label class="f">Interface escura à noite (baixa o brilho dos menus e botões; o vídeo em ecrã total fica igual)<select id="nightOpt"><option value="auto">Automática: do pôr ao nascer do sol</option><option value="on">Sempre</option><option value="off">Desligada</option></select></label>';
    w.appendChild(d);
    const fill = () => { $("dataSaveOpt").checked = opt("dataSave", true); $("chgOpt").checked = opt("chgNotes", true); $("hideOpt").value = String(opt("hideStop", 3)); $("resOpenOpt").checked = !!cfg.resumeOpen; $("nightOpt").value = cfg.nightUi || "auto"; };
    $("resOpenOpt").onchange = e => { cfg.resumeOpen = e.target.checked; saveCfg(); };
    $("nightOpt").onchange = e => { cfg.nightUi = e.target.value; saveCfg(); try{ const n=$("setNightUi"); if(n) n.value=cfg.nightUi; window.__night && window.__night(); }catch(x){} };
    try{ const n=$("setNightUi"); if(n && !n._bound){ n._bound=1; n.value=cfg.nightUi||"auto"; n.onchange=e=>{ cfg.nightUi=e.target.value; saveCfg(); const o=$("nightOpt"); if(o) o.value=cfg.nightUi; try{ window.__night && window.__night(); }catch(x){} }; } }catch(e){}
    $("dataSaveOpt").onchange = e => { cfg.dataSave = e.target.checked; saveCfg(); try{ applyCaps(); }catch(x){} };
    $("chgOpt").onchange = e => { cfg.chgNotes = e.target.checked; saveCfg(); };
    $("hideOpt").onchange = e => { cfg.hideStop = +e.target.value; saveCfg(); };
    fill();
    const _fs = window.fillSettings; if(typeof _fs === "function") window.fillSettings = function(){ const r = _fs.apply(this, arguments); try{ fill(); }catch(e){} return r; };
  }
  }catch(e){ console.log("carro em movimento/parado", e); }
})();
