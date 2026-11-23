
/* ===== Tesla: canais que abrem no Chrome mas não no Tesla =====
   O Chrome (telemóvel/computador) descodifica por software quase tudo. O browser do Tesla usa o descodificador do
   computador do carro, que recusa alguns formatos (HEVC, H.264 10 bits / 4:2:2, alguns 1080i/50p de alto débito).
   Aqui: 1) ao abrir, tira as qualidades que o carro diz não descodificar; 2) deteta imagem preta com som;
   3) recupera por esta ordem — qualidade mais baixa do mesmo canal, versão HD/SD, mesmo canal noutra lista —
   fechando sempre a ligação anterior antes de abrir a seguinte (contas com 1 ligação). */
(function(){
  if(window.ANDROID || !window.__TESLA) return;
  try{
  const T = window.__tfix = {log:[], drops:new Map()};
  const note = t => { try{ T.log.push(new Date().toTimeString().slice(0, 8) + " " + t); if(T.log.length > 20) T.log.shift(); }catch(e){} };

  /* 1) qualidades que o hardware do carro diz não descodificar */
  window.__tLevels = h => {
    try{
      const mc = navigator.mediaCapabilities; if(!mc || !h || !h.levels || h.levels.length < 2) return;
      const lv = h.levels.slice();
      Promise.all(lv.map(l => {
        const codec = l.videoCodec || (l.attrs && l.attrs.CODECS && String(l.attrs.CODECS).split(",").find(x => /^(avc|hvc|hev|av01|vp0?9)/i.test(x.trim()))) || "";
        if(!codec || !l.width || !l.height) return Promise.resolve({ok:true, eff:false});
        const fr = parseFloat(l.frameRate || (l.attrs && l.attrs["FRAME-RATE"])) || 25;
        return mc.decodingInfo({type:"media-source", video:{contentType:'video/mp4; codecs="' + codec.trim() + '"', width:l.width, height:l.height, bitrate:l.bitrate || 4e6, framerate:fr}})
          .then(r => ({ok:!!r.supported, eff:!!r.powerEfficient, smooth:!!r.smooth})).catch(() => ({ok:true, eff:false}));
      })).then(res => {
        if(!h.levels || h.levels.length !== lv.length) return;
        if(!res.some(r => r.ok)) return;   /* o carro diz que nenhuma serve: deixa tentar na mesma */
        for(let i = lv.length - 1; i >= 0 && h.levels.length > 1; i--){ if(!res[i].ok){ note("tirei a qualidade " + (lv[i].height || "?") + "p (o carro não a descodifica)"); try{ h.removeLevel(i); }catch(e){} } }
        /* se há qualidades com descodificação por hardware, não passa delas (evita imagem a saltar) */
        const kept = res.filter(r => r.ok); const effIdx = []; let k = 0; res.forEach(r => { if(r.ok){ if(r.eff && r.smooth !== false) effIdx.push(k); k++; } });
        if(effIdx.length && effIdx.length < kept.length){ const cap = Math.max(...effIdx); try{ if(h.autoLevelCapping < 0 || h.autoLevelCapping > cap){ h.autoLevelCapping = cap; note("limite de qualidade " + ((h.levels[cap] || {}).height || "?") + "p (hardware)"); } }catch(e){} }
      });
    }catch(e){}
  };

  /* 3) recuperação: uma ligação de cada vez */
  const later = (fn, ms) => setTimeout(fn, ms);
  const gateOpen = (slot, alt, ok, why) => {
    try{ stopSlot(slot); }catch(e){}
    toast(why + " A abrir " + alt.name + "…");
    note(why + " → " + alt.name);
    later(() => { if(ok()) playChannel(alt, slot, true); }, alt.free ? 300 : 1000);
  };
  window.__tDecodeFail = (slot, c, extra, ok) => {
    try{
      const tried = autoTried[slot]; tried.add(c.url);
      /* a) várias qualidades no mesmo canal: desce uma */
      const h = hlsInst[slot];
      if(h && h.levels && h.levels.length > 1){
        const n = (T.drops.get(c.url) || 0) + 1; T.drops.set(c.url, n);
        if(n <= 2){
          const cur = h.currentLevel >= 0 ? h.currentLevel : h.levels.length - 1;
          if(cur > 0){ note("descodificação falhou a " + ((h.levels[cur] || {}).height || "?") + "p → desce uma qualidade"); try{ h.removeLevel(cur); h.nextLevel = Math.max(0, cur - 1); h.recoverMediaError(); }catch(e){} return true; }
        }
      }
      /* a2) o mesmo canal em .ts com o outro leitor (mpegts.js) */
      if(window.__tTryTs && window.__tTryTs(slot, c)) return true;
      /* b) versão HD/SD do mesmo canal */
      const a1 = typeof altQuality === "function" ? altQuality(c, tried) : null;
      if(a1){ gateOpen(slot, a1, ok, c.name + ": o Tesla não descodifica esta versão."); return true; }
      /* c) o mesmo canal noutra lista/categoria */
      const a2 = window.__altFor ? window.__altFor(c, tried) : null;
      if(a2){ gateOpen(slot, a2, ok, c.name + ": o Tesla não descodifica esta fonte."); return true; }
      note("sem alternativa para " + c.name + " (" + (extra || "") + ")");
      const msg = c.name + ": este canal usa um formato de vídeo que o computador do Tesla não descodifica (" + (/HEVC/.test(extra || "") ? "HEVC/H.265" : "provavelmente 10 bits, 4:2:2 ou 1080i de alto débito") + "). No Chrome funciona porque descodifica por software. Procura outra versão do canal (HD/SD).";
      try{ stopSlot(slot); }catch(e){}
      toast(msg, true); const bx = $("epgBox"); if(bx) bx.innerHTML = "<b>" + (slot ? "USER 2" : "USER 1") + ": " + esc(c.name) + "</b><div class=\"small\" style=\"margin-top:4px\">" + esc(msg) + "</div>";
      return true;
    }catch(e){ return false; }
  };

  /* 2) imagem preta com som: o tempo avança mas não aparecem imagens */
  const W = [{}, {}];
  setInterval(() => {
    [0, 1].forEach(slot => {
      const v = $("vid" + slot), c = lastPlayed && lastPlayed[slot], w = W[slot];
      if(window.__sv && window.__sv.on(slot)){ w.url = ""; return; }
      const shown = v.offsetParent !== null && v.getBoundingClientRect().width > 60 && !document.hidden && (currentView === "tv" || currentView === "tvinicio") && !mirrorOn && !drivingEff();   /* em andamento o carro pode esconder a imagem de propósito */
      if(!v || !c || c.kind !== "live" || v.paused || v.readyState < 2 || !shown){ w.url = ""; return; }
      const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
      const frames = q ? q.totalVideoFrames : (v.webkitDecodedFrameCount || 0);
      if(w.url !== c.url){ W[slot] = {url:c.url, t0:v.currentTime, f0:frames, s:Date.now(), done:false}; return; }
      if(w.done || Date.now() - w.s < 6000) return;
      const adv = v.currentTime - w.t0, nf = frames - w.f0;
      if(adv > 4 && (v.videoWidth === 0 || nf <= 0)){
        w.done = true; note("imagem preta: " + c.name + " (" + v.videoWidth + "x" + v.videoHeight + ", " + nf + " imagens)");
        const sl = slot, pid = playSeq[sl];
        window.__tDecodeFail(sl, c, "sem imagem", () => pid === playSeq[sl]);
      } else if(adv > 4) w.done = true;   /* está a dar imagem: não volta a verificar este canal */
    });
  }, 2000);
  window.__tfixLog = () => T.log.slice();
  }catch(e){ console.log("tesla vídeo", e); }
})();

/* ===== Bloqueio em andamento: mesma regra (D/R/N ou velocidade = bloqueado), lógica mais rápida e mais robusta ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const D = DRIVE;
  D.why = ""; D.gps = {kmh:null, t:0, acc:999, fast:0, slowSince:0};
  /* motivo do bloqueio (mostrado na faixa da TV) */
  const _df = window.driveFrom;
  window.driveFrom = function(ds){
    const r = _df.apply(this, arguments);
    try{ const g = ds.shift_state, kmh = Math.round((ds.speed || 0) * MI); D.why = r === "moving" ? (["D","R","N"].includes(g) ? "mudança " + g + (kmh ? ", " + kmh + " km/h" : "") : kmh + " km/h") : ""; }catch(e){}
    return r;
  };
  /* GPS do browser como reserva quando a Tessie não responde (nunca desbloqueia contra a Tessie atual) */
  let gid = null;
  const gpsNeed = () => (!demo() || !!cfg.tessieOff) && !cfg.passenger && navigator.geolocation && typeof geoWatch === "function" && (D.state === "moving" || Date.now() - D.lastData > 120000 || cfg.tessieOff) && (!cfg.tessieOff || !!cfg.gpsLockOn) && driveWatching();
  const gpsOn = () => {
    if(gid != null) return;
    try{ gid = geoWatch(pos => {
      const c = pos.coords; let kmh = (c.speed != null && isFinite(c.speed)) ? c.speed * 3.6 : null;
      if(kmh == null) return;
      const g = D.gps; g.kmh = kmh; g.t = Date.now(); g.acc = c.accuracy || 999;
      if(g.acc < 60 && kmh > (+cfg.gpsLockKmh || 50)) g.fast++; else g.fast = 0;   /* GPS: bloqueia acima da velocidade das Definições (50 km/h por omissão) em 3 leituras seguidas */
      if(g.acc < 80 && kmh < 2){ if(!g.slowSince) g.slowSince = Date.now(); } else g.slowSince = 0;
    }, () => {}); }catch(e){ gid = null; }
  };
  const gpsOff = () => { if(gid != null){ try{ geoClear(gid); }catch(e){} gid = null; D.gps.fast = 0; D.gps.slowSince = 0; } };
  setInterval(() => {
    try{
      if(gpsNeed()) gpsOn(); else gpsOff();
      const now = Date.now(), stale = now - D.lastData > 120000 || !!cfg.tessieOff, g = D.gps, fresh = now - g.t < 10000;
      if(cfg.tessieOff && !cfg.gpsLockOn){ if(D.state === "moving"){ D.why = ""; driveSet("park"); } return; }   /* Tessie desligada e sem bloqueio pelo GPS: nunca fica em andamento */
      if(!stale || !fresh) return;
      if(D.state !== "moving" && g.fast >= 3){ D.why = "GPS " + Math.round(g.kmh) + " km/h, " + (cfg.tessieOff ? "Tessie desligada" : "Tessie sem resposta"); D.parkSince = 0; driveSet("moving"); }
      else if(D.state === "moving" && g.slowSince && now - g.slowSince > 30000){ D.why = ""; driveSet("park"); }
    }catch(e){}
  }, 2000);
  /* em andamento com a TV aberta: pergunta à Tessie de 5 em 5 s, para desbloquear depressa quando paras em P */
  const _dl = window.driveLoop;
  window.driveLoop = function(immediate){
    if(D.state === "moving" && driveWatching() && !demo() && !cfg.passenger){
      clearTimeout(D.timer); D.timer = setTimeout(async () => { await driveCheckNow(); window.driveLoop(); }, immediate ? 0 : 5000); return;
    }
    return _dl.apply(this, arguments);
  };
  /* faixa da TV com o motivo */
  const _lu = window.tvLockUi;
  window.tvLockUi = function(){
    const r = _lu.apply(this, arguments);
    try{ const el = $("tvLock"); if(el && !el.hidden) el.textContent = "🔒 TV bloqueada: o carro está em andamento" + (D.why ? " (" + D.why + ")" : "") + ". Volta a funcionar uns segundos depois de pores em P" + (D.halted && D.halted.c ? " e retoma " + D.halted.c.name : "") + ". (Rádio e podcasts continuam disponíveis.)"; }catch(e){}
    return r;
  };
  /* ao parar a TV por andamento, lembra o canal; ao voltar a P (até 30 min) retoma-o se a TV estiver aberta */
  const _th = window.tvHaltPlayback;
  window.tvHaltPlayback = function(){
    try{ const c = lastPlayed && lastPlayed[0]; if(c && c.kind === "live") D.halted = {c, t:Date.now()}; }catch(e){}
    return _th.apply(this, arguments);
  };
  const _ds = window.driveSet;
  window.driveSet = function(st){
    const was = D.state, r = _ds.apply(this, arguments);
    try{ if(was === "moving" && st === "park"){ window.driveLoop(); const h = D.halted; D.halted = null;
        if(h && Date.now() - h.t < 30 * 60000 && (currentView === "tv" || currentView === "tvinicio") && !document.hidden){
          setTimeout(() => { try{ if(tvBlocked()) return; toast("Parado: a retomar " + h.c.name); if(window.__oneConn) window.__oneConn(h.c, 0); else playChannel(h.c, 0); }catch(e){} }, 800);
        } }
      if(st === "moving") window.driveLoop();
    }catch(e){}
    return r;
  };
  }catch(e){ console.log("andamento", e); }
})();
