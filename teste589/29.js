
/* ===== Som AC-3 / E-AC-3 (Dolby) por software =====
   O Chrome/Tesla não descodifica AC-3/E-AC-3: o hls.js ignora essa faixa e o canal fica mudo. Quando um canal só tem
   som Dolby, os pedaços (já recebidos pelo leitor) são lidos aqui: PES de áudio → tramas → libav (FFmpeg em WebAssembly,
   carregado só nessa altura) → PCM → WebAudio, acertado pelo relógio do vídeo. Sem ligações extra ao servidor. */
(function(){
  if(window.ANDROID) return;
  try{
  const AC3_FS = [[64,69,96],[64,70,96],[80,87,120],[80,88,120],[96,104,144],[96,105,144],[112,121,168],[112,122,168],[128,139,192],[128,140,192],[160,174,240],[160,175,240],[192,208,288],[192,209,288],[224,243,336],[224,244,336],[256,278,384],[256,279,384],[320,348,480],[320,349,480],[384,417,576],[384,418,576],[448,487,672],[448,488,672],[512,557,768],[512,558,768],[640,696,960],[640,697,960],[768,835,1152],[768,836,1152],[896,975,1344],[896,976,1344],[1024,1114,1536],[1024,1115,1536],[1152,1253,1728],[1152,1254,1728],[1280,1393,1920],[1280,1394,1920]];
  const ac3Frames = b => { const out = []; let i = 0; while(i + 6 < b.length){ if(b[i] !== 0x0B || b[i + 1] !== 0x77){ i++; continue; } const bsid = b[i + 5] >> 3; let len;
      if(bsid <= 10){ const fs = b[i + 4] >> 6, fc = b[i + 4] & 0x3f; if(fs === 3 || fc > 37){ i++; continue; } len = AC3_FS[fc][fs] * 2; } else len = ((((b[i + 2] & 7) << 8) | b[i + 3]) + 1) * 2;
      if(len < 7 || i + len > b.length) break; out.push(b.slice(i, i + len)); i += len; } return out; };
  const log = (slot, t, d) => { try{ window.__dbgEv && window.__dbgEv(slot, t, d); }catch(e){} };
  /* --- libav (carregado a pedido) --- */
  const LPm = {};
  const libav = (variant = "dolby") => LPm[variant] || (LPm[variant] = (async () => {
    const load = src => new Promise(res => { const sc = document.createElement("script"); sc.src = src; sc.onload = () => res(window.LibAV && window.LibAV.LibAV ? window.LibAV.LibAV : false); sc.onerror = () => res(false); document.head.appendChild(sc); });
    /* variantes próprias do libav.js, ao lado do index.html: «dolby» (AC-3, E-AC-3, MP2/MP3, AAC, MPEG-2) e «hevc» (vídeo H.265) */
    let ctor = null;
    for(const base of ["libav", "https://ramarozte-sketch.github.io/cockpit/libav"]){
      window.LibAV = window.LibAV || {}; window.LibAV.base = base;
      ctor = await load(base + "/libav-6.10.9.0-" + variant + ".js"); if(ctor) break;
    }
    if(!ctor) throw new Error("libav não carregou");
    const L = await ctor(); try{ await L.av_log_set_level(16); }catch(e){}
    /* v456 (só medição): tempo de cada chamada de descodificação de som, para o registo «som Dolby: níveis» (decAudMs, decAudBlocos) */
    try{ const orig = L.ff_decode_multi.bind(L); window.__audDec = window.__audDec || {ms:0, n:0, max:0};
      L.ff_decode_multi = async (...a) => { const t = performance.now(); try{ return await orig(...a); } finally { const d = performance.now() - t; const b = a[3] ? a[3].length : 0; const s = window.__audDec; s.ms += d; s.n += b; if(d > s.max) s.max = d; } };
    }catch(e){}
    return L;
  })().catch(e => { delete LPm[variant]; throw e; }));
  window.__libav = libav;
  /* --- relógio: PCM seguido, ancorado ao tempo do vídeo --- */
  class PcmClock {
    constructor(v){ this.v = v; this.ctx = null; this.g = null; this.srcs = []; this.endCtx = 0; this.endT = -1; this.born = performance.now(); }
    _ensure(sr){ if(!this.ctx){ const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC({sampleRate:sr}); this.g = this.ctx.createGain();
        /* a mistura Dolby para estéreo baixa o volume para não saturar: recupera ~4 dB com um limitador suave */
        this.agc = this.ctx.createGain(); this.agc.gain.value = 1; this.boost = this.ctx.createGain(); this.boost.gain.value = 1.5; this.env = 0; this.gA = 1; this.lastLog = 0; this.pk = 0;
        try{ const cp = this.ctx.createDynamicsCompressor(); cp.threshold.value = -8; cp.knee.value = 6; cp.ratio.value = 6; cp.attack.value = 0.004; cp.release.value = 0.2; this.g.connect(this.agc); this.agc.connect(this.boost); this.boost.connect(cp); cp.connect(this.ctx.destination); }
        catch(e){ this.g.connect(this.ctx.destination); }
        /* v424: medição na saída real (depois do ganho e do compressor, em paralelo: não altera o som) */
        try{ const an = this.ctx.createAnalyser(); an.fftSize = 2048; this.cp = this.cp || null; (this.cp || this.boost).connect(an); this.an = an; const buf = new Float32Array(2048);
          this.anT = setInterval(() => { try{ an.getFloatTimeDomainData(buf); let sum = 0, pk = 0; for(let i = 0; i < buf.length; i++){ const x = buf[i]; sum += x * x; if(Math.abs(x) > pk) pk = Math.abs(x); }
            const rms = Math.sqrt(sum / buf.length); window.__dbgEv && window.__dbgEv(0, "som: saída real", {rmsDb:+(20 * Math.log10(rms + 1e-9)).toFixed(1), picoDb:+(20 * Math.log10(pk + 1e-9)).toFixed(1), ctx:this.ctx.state, vol:this.g ? +this.g.gain.value.toFixed(2) : null}); }catch(e2){} }, 5000); }catch(e){} }
      if(this.ctx.state === "suspended") this.ctx.resume().catch(() => {}); }
    push(planes, sr, t){
      const v = this.v; this._ensure(sr); const c = this.ctx;
      this.g.gain.value = (window.__wantMuted ? window.__wantMuted(v.el || v) : v.muted) ? 0 : (v.volume == null ? 1 : v.volume);
      try{ this.boost.gain.value = 1.5 * (window.__amp ? window.__amp.pct() / 100 : 1); }catch(e){}
      /* nivelação automática: filmes e canais Dolby vêm masterizados muito baixo (dialnorm ~ -27). Leva a voz para ~ -21 dBFS
         (RMS 0,09) subindo no máximo 12x (+21 dB); sobe devagar, desce depressa, ignora silêncios */
      try{ let e2 = 0, pk = 0; const a = planes[0]; for(let i = 0; i < a.length; i += 4){ const x = a[i]; e2 += x * x; if(x > pk) pk = x; else if(-x > pk) pk = -x; } const rms = Math.sqrt(e2 / Math.ceil(a.length / 4));
        this.pk = Math.max(this.pk * 0.9, pk);
        if(rms > 0.004){ this.env = this.env ? this.env * 0.9 + rms * 0.1 : rms; let tg = Math.max(1, Math.min(12, 0.09 / this.env)); if(this.pk * tg > 0.9) tg = Math.max(1, 0.9 / this.pk);
          this.gA = tg < this.gA ? this.gA * 0.6 + tg * 0.4 : this.gA * 0.97 + tg * 0.03; }
        if(this.agc) this.agc.gain.setTargetAtTime(this.gA, c.currentTime, 0.03); /* v509: alisa a nivelação em vez de saltar (estalos) */
        const now = performance.now(); if(now - this.lastLog > 6000){ this.lastLog = now; window.__dbgEv && window.__dbgEv(v.id === "vid1" ? 1 : 0, "som Dolby: níveis", {decMs:window.__dolDec ? Math.round(window.__dolDec.ms) : null, decBlocos:window.__dolDec ? window.__dolDec.n : null, decAudMs:window.__audDec ? Math.round(window.__audDec.ms) : null, decAudBlocos:window.__audDec ? window.__audDec.n : null, decAudMaxMs:window.__audDec ? Math.round(window.__audDec.max) : null, rms:+(20 * Math.log10(rms + 1e-9)).toFixed(1), pico:+(20 * Math.log10(this.pk + 1e-9)).toFixed(1), ganhoAuto:+this.gA.toFixed(2), perdidos:this.drops || 0, tarde:this.dropLate || 0, adiante:this.dropAhead || 0, canais:planes.length, voz:cfg.dolbyVoice == null ? 1 : +cfg.dolbyVoice, amp:window.__amp ? window.__amp.pct() : 100, ctx:this.ctx ? this.ctx.state : null, taxaCtx:this.ctx ? this.ctx.sampleRate : null}); } }catch(e){}
      if(v.paused || v.seeking || v.readyState < 2){ this.reset(); return; }
      /* v430: acerto do som do filme (segundos; positivo = som mais tarde), escolhido nos botões junto à barra do tempo */
      const anchor = c.currentTime + (t + (this.aoff || 0) - v.currentTime), n = planes[0].length, dur = n / sr;
      /* seguido ao anterior, salvo se o desvio passar de 80 ms (salto, pausa ou deriva) */
      const tol = v !== (v.el || v) ? 0.25 : 0.08; /* v439: em andamento o relógio da imagem oscila centenas de ms; seguir cada oscilação dava saltos no som */
      const seamless = this.endT >= 0 && Math.abs(t - this.endT) < 0.03 && Math.abs(this.endCtx - (anchor)) < tol;
      let at = seamless ? this.endCtx : anchor;
      /* v248: no arranque de um filme o descodificador Dolby (WASM) demora a aquecer e a imagem avança sem som: os primeiros ~5 s eram deitados fora.
         Uma vez, nos primeiros 20 s, recua a imagem até ao primeiro som pronto: começa já certo. */
      if(at + dur < c.currentTime + 0.01 && !this.sync0 && performance.now() - this.born < 20000){
        this.sync0 = true;
        try{ const el = v.el || v, sl = el.id === "vid1" ? 1 : 0, cc = typeof lastPlayed !== "undefined" && lastPlayed[sl];
          const lag = el.currentTime - t, viaImg = v !== el && Math.abs(v.currentTime - el.currentTime) > 0.5; /* v439: em andamento o relógio é o da imagem: recuar o leitor do carro só pedia o ficheiro de novo */
          if(cc && /^(movie|episode|vod)$/.test(cc.kind || "") && lag > 0.4 && lag < 15 && !viaImg){ window.__dbgEv && window.__dbgEv(sl, "som Dolby atrasado no arranque: recua a imagem", {s:+lag.toFixed(1)}); this.recAt = performance.now(); el.currentTime = t; this.endT = -1; return; } }catch(e){}
      }
      if(at + dur < c.currentTime + 0.01){ this.endT = -1; this.drops = (this.drops || 0) + 1; this.dropLate = (this.dropLate || 0) + 1; return; }
      /* o leitor enche o buffer de vídeo muito à frente (30-150 s em direto): o som desses pedaços tem de ficar agendado, não ser deitado fora */
      if(at > c.currentTime + 300){ this.endT = -1; this.drops = (this.drops || 0) + 1; this.dropAhead = (this.dropAhead || 0) + 1; return; }
      const b = c.createBuffer(planes.length, n, sr); planes.forEach((p, i) => b.copyToChannel(p, i));
      const s = c.createBufferSource(); s.buffer = b;
      let skip = 0; if(at < c.currentTime){ skip = c.currentTime - at; at = c.currentTime; }
      /* v509: estalos nos cortes. Onde o som não é contínuo (atraso, falta de pedaço, arranque), o pedaço entra com uma rampa de 6 ms
         e o anterior sai com outra; um salto seco em PCM ouve-se como estalo */
      const cut = !seamless || skip > 0, fg = c.createGain(); fg.gain.value = 1;
      if(cut){ fg.gain.setValueAtTime(0, at); fg.gain.linearRampToValueAtTime(1, at + 0.006);
        if(this.lastFg && this.endCtx > c.currentTime + 0.01){ this.lastFg.gain.setValueAtTime(1, this.endCtx - 0.006); this.lastFg.gain.linearRampToValueAtTime(0, this.endCtx); } }
      s.connect(fg); fg.connect(this.g);
      try{ s.start(at, skip); }catch(e){ return; }
      this.lastFg = fg; this.endCtx = at + dur - skip; this.endT = t + dur;
      this.srcs.push(s); s.onended = () => { const i = this.srcs.indexOf(s); if(i >= 0) this.srcs.splice(i, 1); try{ fg.disconnect(); }catch(e){} };
    }
    reset(){ for(const s of this.srcs){ try{ s.stop(); }catch(e){} } this.srcs = []; this.endT = -1; }
    /* v480: depois de um salto do utilizador, volta a permitir (uma vez) recuar a imagem até ao primeiro som pronto; o salto causado por esse recuo não conta */
    rearm(){ if(performance.now() - (this.recAt || 0) > 3000){ this.sync0 = false; this.born = performance.now(); } }
    close(){ this.reset(); try{ this.ctx && this.ctx.close(); }catch(e){} this.ctx = null; }
  }
  window.__PcmClock = PcmClock;
  /* 5.1 → estéreo feito pelo próprio descodificador Dolby, com os níveis de centro/surround que vêm no sinal
     (o centro, onde estão as vozes, não fica abafado pelos efeitos) */
  window.__dolbyStereo = async (L, d) => {};   /* a mistura para estéreo é feita abaixo (downmix), com a voz realçada */
  window.__ac3Frames = ac3Frames;
  /* 5.1 → estéreo com a voz (canal central) à frente. A mistura-padrão do AC-3 deixa o centro ~11 dB abaixo do resto
     e junta os efeitos ao mesmo nível: as vozes ficam fracas e o som envolvente domina. Ordem FFmpeg: L R C LFE Ls Rs (Lb Rb) */
  const voiceMix = () => { const k = cfg.dolbyVoice == null ? 1 : +cfg.dolbyVoice; return k === 0 ? 0.7 : k === 2 ? 1.5 : 1.0; };
  const downmix = planes => {
    if(planes.length <= 2){
      const Q = planes.map(a => a instanceof Float32Array ? a : Float32Array.from(a)), vk = cfg.dolbyVoice == null ? 1 : +cfg.dolbyVoice;
      /* v210: som já em estéreo (muitos filmes AAC): as vozes vão no centro (soma L+R) e os efeitos/música nos lados (L-R). Com voz «Realçada» ou «Máxima» sobe o centro e baixa os lados */
      if(Q.length === 2 && vk >= 1){ const g = vk === 2 ? 1.7 : 1.3, w = vk === 2 ? 0.55 : 0.75, a = Q[0], b = Q[1], n = a.length, L2 = new Float32Array(n), R2 = new Float32Array(n);
        for(let i = 0; i < n; i++){ const m = (a[i] + b[i]) * 0.5 * g, d = (a[i] - b[i]) * 0.5 * w; L2[i] = m + d; R2[i] = m - d; }
        return [L2, R2]; }
      return Q; }
    const P = planes.map(a => a instanceof Float32Array ? a : Float32Array.from(a)), N = P.length, n = P[0].length, Lc = new Float32Array(n), Rc = new Float32Array(n);
    const ci = 2, sl = N === 3 ? -1 : N === 4 ? 3 : N === 5 ? 3 : 4, sr = N === 3 ? -1 : N === 4 ? 3 : N === 5 ? 4 : 5, sl2 = N >= 8 ? 6 : -1, sr2 = N >= 8 ? 7 : -1;
    const vc = voiceMix(), gf = 0.62, gs = 0.35, C = P[ci], l = P[0], r = P[1], A = sl >= 0 ? P[sl] : null, B = sr >= 0 ? P[sr] : null, A2 = sl2 >= 0 ? P[sl2] : null, B2 = sr2 >= 0 ? P[sr2] : null;
    for(let i = 0; i < n; i++){ const c = C[i] * vc; Lc[i] = gf * l[i] + c + (A ? gs * A[i] : 0) + (A2 ? gs * A2[i] : 0); Rc[i] = gf * r[i] + c + (B ? gs * B[i] : 0) + (B2 ? gs * B2[i] : 0); }
    return [Lc, Rc]; };
  window.__downmix = downmix;
  /* filmes .mkv com som AC-3/E-AC-3: lê a faixa de som do ficheiro (Range) e toca-a por software */
  window.__mka = window.__mka || [null, null];
  window.__mkaStart = (slot, c, playId, aac, keep, trackNum) => {
    try{
      const v = $("vid" + slot), M0 = v._mkvMse && v._mkvMse.alive && v._mkvMse.alive() ? v._mkvMse : null, P0 = v._mp4Pre && v._mp4Pre.pid === playId ? v._mp4Pre : null, src = M0 ? M0.src : P0 ? P0.src : (v.currentSrc || v.src), isMp4 = /\.(mp4|m4v|mov)(\?|$)/i.test(c.url) && !/^blob:/.test(src || "");
      /* v487: ao trocar de versão do filme (4K → 1080p) o leitor do carro ainda tinha o ficheiro antigo: o som lia o filme errado (mais uma descarga ao fornecedor). Espera que o leitor passe ao ficheiro novo. */
      /* v492: o leitor do carro ainda sem endereço (espera de 3 s pela ligação anterior): a vigia chamava aqui ao fim de 1 s, saía sem som e não voltava a tentar (Despicable Me 3 em andamento ficou sem som) */
      /* v494: o «blob:» do filme anterior (descarga única) ainda era a fonte atual: o som de um .mp4 aberto a seguir saía sem tentar (Despicable Me 3 sem som) */
      const staleBlob = !!src && /^blob:/.test(src) && !M0 && !P0 && v._blobPid !== playId;
      if(!P0 && ((!src && c.url) || staleBlob || (src && c.url && !/^blob:/.test(src) && window.__fileKey(src) !== window.__fileKey(c.url)))){
        const W0 = window.__mkaWait = window.__mkaWait || {}, n = W0[playId] = (W0[playId] || 0) + 1;
        if(n === 1){ try{ window.__dbgEv && window.__dbgEv(slot, "som do filme: à espera do ficheiro novo", {leitor:src ? String(window.__fileKey(src)).split("/").pop() : "(ainda sem endereço)", filme:String(window.__fileKey(c.url)).split("/").pop()}); }catch(e){} }
        if(n <= 40) setTimeout(() => { try{ const A = window.__mka && window.__mka[slot]; if(A && A.pid === playId && trackNum == null) return;   /* já arrancou por outro lado (faixa escolhida): não a substitui */
            if(playId === playSeq[slot] && lastPlayed[slot] === c) window.__mkaStart(slot, c, playId, aac, keep, trackNum); }catch(e){} }, 500);
        return true; } if(!src || !(/\.mkv(\?|$)/i.test(c.url) || (isMp4 && window.__TESLA && typeof mp4aRun === "function" && !(window.__mkaNo && window.__mkaNo[slot] === playId))) || typeof mkvRun !== "function") return false;
      const old = window.__mka[slot]; if(old){ old.dead = true; try{ old.clock && old.clock.close(); }catch(e){} }
      const st = window.__mka[slot] = {movie:true, pid:playId, aac:!!aac, keep:!!keep, trackNum:trackNum == null ? null : trackNum};
      /* v430: acerto do som também no som por software (os botões «−0,1 s / +0,1 s» só apareciam no caminho MSE); guardado por filme */
      try{ let off = 0; try{ off = parseFloat(localStorage.getItem(aoffKey(c.name))) || 0; }catch(e){} st.aoff = off;
        window.__mseAcerto = {slot, soft:true, alive: () => window.__mka[slot] === st && playId === playSeq[slot] && !st.mse, ms: () => Math.round(st.aoff * 1000),
          adj(ms){ st.aoff = Math.max(-5, Math.min(5, Math.round(st.aoff * 1000 + ms) / 1000)); try{ localStorage.setItem(aoffKey(c.name), String(st.aoff)); }catch(e){} if(st.clock && !st.mse) st.clock.aoff = st.aoff; try{ window.__dbgEv && window.__dbgEv(slot, "som: acerto", {ms:Math.round(st.aoff * 1000)}); }catch(e){} }};
        const sync = setInterval(() => { if(window.__mka[slot] !== st){ clearInterval(sync); return; } if(st.clock && !st.mse) st.clock.aoff = st.aoff; }, 300); }catch(e){}
      if(isMp4){ const onNone = () => { (window.__mkaNo = window.__mkaNo || [])[slot] = playId; const f = window.__mkaFallback && window.__mkaFallback[slot]; if(f && playId === playSeq[slot]) f(); };
        /* v351: um só leitor (MSE) quando possível; se não for aplicável ou falhar, o caminho antigo (leitor do carro + som à parte) */
        /* v374: o MSE também com a imagem em andamento (a cópia de fotogramas é feita a partir do vídeo MSE) */ let useMse = false; try{ useMse = cfg.mseFilm !== false && typeof mp4MseRun === "function" && !!window.MediaSource && !hlsInst[slot] && !(window.__mseNo && window.__mseNo[c.url] && Date.now() - window.__mseNo[c.url] < 120000); }catch(e){}
        try{ window.__dbgEv && window.__dbgEv(slot, "filme mp4: caminho", {umSoLeitor:useMse, opcao:cfg.mseFilm === false ? "desligada nas Definições" : "ligada", mse:!!window.MediaSource, hls:!!hlsInst[slot], recusadoHaPouco:!!(window.__mseNo && window.__mseNo[c.url] && Date.now() - window.__mseNo[c.url] < 120000)}); }catch(e){}
        if(useMse) mp4MseRun(slot, st, src, c, playId, () => mp4aRun(slot, st, src, onNone)); else mp4aRun(slot, st, src, onNone); }
      else mkvRun(slot, st, src, true);
      let live0 = Date.now(); const t = setInterval(() => { try{ const nw = performance.now(); if(nw - (st.wdAt || 0) > 5000 && window.__mka[slot] === st && st.aq && st.aq.length && !v.paused && v.readyState >= 2 && nw - (st.lastOut || st.t0 || (st.t0 = nw)) > 4000){ st.wdAt = nw; const cur = st.clock ? st.clock.v.currentTime : v.currentTime, h0 = st.aq[0].ts / 1e6;
          window.__dbgEv && window.__dbgEv(slot, "som por software: parado", {fila:st.aq.length, cabeca_menos_agora_s:+(h0 - cur).toFixed(1), ocupado:!!st.abusy, ocupadoHa_s:st.abusy ? +((nw - (st.busyAt || nw)) / 1000).toFixed(1) : null, descodificados:st.n, erro:st.err || "", ctx:st.clock && st.clock.ctx ? st.clock.ctx.state : null});
          if(st.abusy && nw - (st.busyAt || nw) > 8000) st.abusy = false;
          if(!st.abusy && st.drain) st.drain();
          if(st.clock && st.clock.ctx && st.clock.ctx.state !== "running") st.clock.ctx.resume().catch(() => {}); }
        /* fila vazia e sem som há mais de 8 s com o filme a andar: a leitura do som parou (ligação perdida sem erro): recomeça-a no ponto atual */
        else if(nw - (st.rsAt || 0) > 15000 && window.__mka[slot] === st && (!st.aq || !st.aq.length) && !v.paused && v.readyState >= 2 && nw - (st.lastOut || st.t0 || (st.t0 = nw)) > 8000 && !st.probing && !/sem faixa|não é um ficheiro|não aplicável/.test(String(st.err || ""))){ /* v436: sem faixa AC-3 não há o que recomeçar (antes repetia a cada 10 s) */ st.rsAt = nw; window.__dbgEv && window.__dbgEv(slot, "som por software: leitura parada, a recomeçar", {erro:st.err || "", descodificados:st.n}); setTimeout(() => { try{ if(playId === playSeq[slot]) window.__mkaStart(slot, c, playId, st.aac, st.keep, st.trackNum); }catch(e){} }, 50); } }catch(e){} try{ /* v438: se o som por software toca outra faixa (ex.: português) que não a do leitor do carro (a 1.ª), o leitor do carro não volta a falar quando o software engasga: ouvia-se inglês e português alternados */
          const mk0 = window.__mkaTracks && window.__mkaTracks[slot], other = st.trackNum != null && !!(mk0 && mk0.list && mk0.list.length > 1 && mk0.list[0].n !== st.trackNum);
          if(st.lastOut && st.trackNum != null && mk0 && mk0.cur !== st.trackNum && mk0.quer === st.trackNum) mk0.cur = st.trackNum;
          if(other && !st.otherLogged && st.lastOut){ st.otherLogged = 1; try{ window.__dbgEv && window.__dbgEv(slot, "som: faixa do software diferente da do leitor do carro: leitor do carro fica calado", {faixa:st.trackNum, doLeitor:mk0.list[0].n}); }catch(e){} }
          const live = (!!st.lastOut && performance.now() - st.lastOut < 3000) || v.paused || (other && !!st.lastOut); /* v422: volta aos 3 s da v420 (a alteração para 8 s estragou o som do MKV) */ if(st.lastOut && window.__mka[slot] === st && playId === playSeq[slot] && !!v._nat !== live){ if(live && v._want === undefined) v._want = v.muted; v._nat = live; v.muted = v._want !== undefined ? v._want : v.muted; if(window.__dbgEv) window.__dbgEv(slot, live ? "som do leitor do carro calado (só o som por software)" : "som do leitor do carro reposto (o som por software parou)", {}); } }catch(e){}
        const m0 = MIR[slot]; if(st.aac && !st.keep && !st.probing){ if(m0 && m0.wall) live0 = Date.now(); else if(Date.now() - live0 > 4000){ window.__mka[slot] = null; } } if(playId !== playSeq[slot] || window.__mka[slot] !== st){ clearInterval(t); try{ if(v._nat && !(window.__mka[slot] && window.__mka[slot] !== st && window.__mka[slot].lastOut)){ v._nat = false; v.muted = v._want !== undefined ? v._want : v.muted; } }catch(e){} if(window.__mka[slot] === st) window.__mka[slot] = null; try{ st.clock && st.clock.close(); }catch(e){} try{ st.abort && st.abort.abort(); }catch(e){} try{ v.removeEventListener("seeking", st.onSeek); }catch(e){} } }, 1000);
      return true;
    }catch(e){ return false; }
  };
  /* --- TS: faixas de áudio da PMT --- */
  const pmtAudio = d => {
    const pidOf = o => ((d[o + 1] & 0x1f) << 8) | d[o + 2];
    const ps = o => { const afc = (d[o + 3] >> 4) & 3; if(!(afc & 1)) return -1; let p = o + 4; if(afc & 2) p += 1 + d[o + 4]; return p < o + 188 ? p : -1; };
    let pmt = -1;
    for(let o = 0; o + 188 <= d.length; o += 188){
      if(d[o] !== 0x47 || !(d[o + 1] & 0x40)) continue; const pid = pidOf(o); let p = ps(o); if(p < 0) continue; p += 1 + d[p];
      if(pid === 0 && pmt < 0){ const sl = ((d[p + 1] & 0xf) << 8) | d[p + 2]; for(let i = p + 8; i < p + 3 + sl - 4; i += 4){ if((d[i] << 8) | d[i + 1]){ pmt = ((d[i + 2] & 0x1f) << 8) | d[i + 3]; break; } } }
      else if(pid === pmt){
        const sl = ((d[p + 1] & 0xf) << 8) | d[p + 2], pil = ((d[p + 10] & 0xf) << 8) | d[p + 11], L = [];
        for(let i = p + 12 + pil; i < p + 3 + sl - 4;){ const st = d[i], ep = ((d[i + 1] & 0x1f) << 8) | d[i + 2], il = ((d[i + 3] & 0xf) << 8) | d[i + 4]; let kind = "";
          if(st === 0x0f || st === 0x11) kind = "aac"; else if(st === 0x03 || st === 0x04) kind = "mpa"; else if(st === 0x81) kind = "ac3"; else if(st === 0x87) kind = "eac3";
          else if(st === 0x06){ for(let k = i + 5; k < i + 5 + il;){ const tg = d[k], ln = d[k + 1]; if(tg === 0x6A) kind = "ac3"; if(tg === 0x7A) kind = "eac3"; if(tg === 0x05 && ln >= 4){ const r = String.fromCharCode(d[k + 2], d[k + 3], d[k + 4], d[k + 5]); if(r === "AC-3") kind = "ac3"; if(r === "EAC3") kind = "eac3"; } k += 2 + ln; } }
          if(kind) L.push({pid:ep, kind}); i += 5 + il; }
        return L;
      }
    }
    return null;
  };
  const S = {}, first = {};
  function start(slot, tr){
    const h = hlsInst[slot], v = $("vid" + slot); if(!h || !v) return null;
    const st = {slot, seq:playSeq[slot], h, pid:tr.pid, kind:tr.kind, init:null, cur:null, q:[], busy:false, dec:null, clock:new PcmClock(v), sr:48000, n:0, on:true};
    try{ h.on(Hls.Events.INIT_PTS_FOUND, (e, d) => { if(d && d.id === "main" && st.init == null && d.timescale) st.init = d.initPTS / d.timescale; }); }catch(e){}
    log(slot, "som " + tr.kind.toUpperCase() + " por software", {});
    toast("Som Dolby (" + tr.kind.toUpperCase() + ") por software…");
    libav().then(async L => {
      if(!st.on) return;
      const r = await L.ff_init_decoder(tr.kind === "eac3" ? "eac3" : "ac3"); await window.__dolbyStereo(L, r); st.L = L; st.dec = r; pump(st);
    }).catch(e => { st.err = String(e.message || e); log(slot, "som Dolby falhou", {msg:st.err}); toast("Não consegui carregar o descodificador de som Dolby.", true); });
    st.poll = setInterval(() => { if(st.seq !== playSeq[slot] || hlsInst[slot] !== st.h){ stop(slot); } }, 1000);
    return st;
  }
  function stop(slot){ const st = S[slot]; if(!st) return; delete S[slot]; st.on = false; clearInterval(st.poll); st.clock.close(); try{ if(st.dec && st.L) st.L.ff_free_decoder(st.dec[1], st.dec[2], st.dec[3]); }catch(e){} }
  /* v459: filme .ts com AC-3/E-AC-3 que o browser não aceita no MSE: o mpegts.js toca só a imagem (hasAudio:false)
     e o som é lido do mesmo ficheiro (PES de áudio) e descodificado por software. Só toca do início (sem acompanhar saltos). */
  window.__tsProbe = async url => {
    try{ const r = await fetch(url); const rd = r.body.getReader(); let buf = new Uint8Array(0);
      try{ const cl = +r.headers.get("content-length"); if(cl) window.__tsSizeBy = {url, size:cl}; }catch(e){}
      while(buf.length < 3000000){ const x = await rd.read(); if(x.done) break; const m = new Uint8Array(buf.length + x.value.length); m.set(buf); m.set(x.value, buf.length); buf = m; }
      try{ rd.cancel(); }catch(e){}
      /* v464: duração do filme pelos PTS (início e fim do ficheiro), para a barra de posição */
      try{ const sz = window.__tsSizeBy && window.__tsSizeBy.url === url ? window.__tsSizeBy.size : 0;
        try{ window.__dbgEv && window.__dbgEv(0, "filme .ts: tamanho e PTS", {tamanho: sz, cabeca: tsPtsScan(buf, null)}); }catch(e){}
        const a = tsPtsScan(buf, null); let tail = null;
        if(sz > buf.length){ try{ const r2 = await fetch(url, {headers:{Range:"bytes=" + Math.max(0, sz - 2000000) + "-"}}); if(r2.status === 206) tail = new Uint8Array(await r2.arrayBuffer()); }catch(e){} }
        const b = tail ? tsPtsScan(tail, a) : a;
        if(a.min != null && b.max != null && b.max > a.min){ window.__tsDurMap = window.__tsDurMap || {}; window.__tsDurMap[url] = (b.max - a.min) / 90000; }
      }catch(e){}
      const L = pmtAudio(buf); const dl = L ? L.filter(t => t.kind === "ac3" || t.kind === "eac3") : [];
      /* v475: todas as faixas AC-3/E-AC-3 do .ts ficam guardadas para o botão Áudio; a primeira toca por defeito */
      window.__tsTrackList = window.__tsTrackList || {}; window.__tsTrackList[url] = dl.map((t, i) => Object.assign({}, t, {n: i + 1}));
      return window.__tsTrackList[url][0] || null;
    }catch(e){ return null; } };
  /* v464: procura PES de áudio/vídeo com PTS num bloco de TS e devolve o menor e o maior PTS (em ticks de 90 kHz) */
  const tsPtsScan = (buf, acc) => { const o = {min: acc ? acc.min : null, max: acc ? acc.max : null};
    let i = -1; for(let k = 0; k + 376 < buf.length; k++){ if(buf[k] === 0x47 && buf[k+188] === 0x47 && buf[k+376] === 0x47){ i = k; break; } }
    if(i < 0) return o;
    for(; i + 188 <= buf.length; i += 188){ if(buf[i] !== 0x47) continue;
      const b1 = buf[i+1], afc = (buf[i+3] >> 4) & 3; if(!(afc & 1) || !(b1 & 0x40)) continue;
      let q = i + 4; if(afc & 2) q += 1 + buf[i+4]; if(q + 14 > i + 188) continue;
      if(buf[q] !== 0 || buf[q+1] !== 0 || buf[q+2] !== 1) continue;
      const sid = buf[q+3]; if(!((sid >= 0xE0 && sid <= 0xEF) || (sid >= 0xC0 && sid <= 0xDF))) continue;
      if(!(buf[q+7] & 0x80)) continue;
      const pts = (buf[q+9] & 0x0E) * 1073741824 + buf[q+10] * 4194304 + (buf[q+11] & 0xFE) * 16384 + buf[q+12] * 128 + ((buf[q+13] & 0xFE) >> 1);
      if(o.min == null || pts < o.min) o.min = pts; if(o.max == null || pts > o.max) o.max = pts; }
    return o; };
  /* v461: carregador do mpegts.js que reescreve a tabela de programas (PMT): as faixas AC-3/E-AC-3 deixam de existir
     para o leitor (tipo 0x06, CRC refeito) e o vídeo entra sem o som que o browser não aceita. O som sai do __tsMovieSound. */
  const crcT = (() => { const t = new Uint32Array(256); for(let i = 0; i < 256; i++){ let c = i << 24; for(let k = 0; k < 8; k++) c = (c & 0x80000000) ? ((c << 1) ^ 0x04C11DB7) : (c << 1); t[i] = c >>> 0; } return t; })();
  const crc32m = (b, s, e) => { let c = 0xFFFFFFFF; for(let i = s; i < e; i++) c = ((c << 8) ^ crcT[((c >>> 24) ^ b[i]) & 0xFF]) >>> 0; return c >>> 0; };
  class TsPmtLoader {
    constructor(seekHandler, config){ this._config = config || {}; this._startAt = window.__tsStartAt || 0; window.__tsStartAt = 0; this._ctl = null; this._status = 0; this._pmtPid = -1; this._carry = new Uint8Array(0); this._total = 0; this._aligned = true; this._wd = setInterval(() => this._watch(), 2000); }
    static isSupported(){ return typeof fetch === "function" && typeof ReadableStream !== "undefined"; }
    get status(){ return this._status; }
    get type(){ return "tsPmtFetch"; }
    isWorking(){ return this._status === 1 || this._status === 2; }
    open(ds, range){
      let from = range && range.from > 0 ? range.from : 0; if(from === 0 && this._startAt){ from = this._startAt; this._startAt = 0; } const ctl = this._ctl = new AbortController(); this._ds = ds; this._last = Date.now();
      this._status = 1; this._total = from; this._carry = new Uint8Array(0); this._aligned = from === 0; this._pmtPid = -1;
      const headers = from > 0 ? {Range:"bytes=" + from + "-"} : {};
      (async () => { try{ const r = await fetch(ds.url, {headers, signal:ctl.signal});
          if(ctl !== this._ctl) return;
          try{ window.__dbgEv && window.__dbgEv(0, "carregador .ts: pedido", {from, http:r.status}); }catch(e){}
          if(!(r.ok || r.status === 206)) throw new Error("HTTP " + r.status);
          if(from === 0 && this.onContentLengthKnown){ const cl = +r.headers.get("content-length"); if(cl) this.onContentLengthKnown(cl); }
          this._status = 2; const rd = r.body.getReader();
          let nb = 0, first = true; while(true){ const x = await rd.read(); if(ctl !== this._ctl) return; if(x.done) break; this._last = Date.now(); nb += x.value.length; if(first){ first = false; try{ window.__dbgEv && window.__dbgEv(0, "carregador .ts: primeiros dados", {from, bytes:x.value.length}); }catch(e){} } this._push(x.value); }
          if(this._carry.length) this._emit(this._carry); this._carry = new Uint8Array(0);
          /* v470: o servidor fecha o pedido antes do fim do ficheiro: reabre a partir do byte atual (até 5 vezes) */
          const sz = window.__tsSizeBy && window.__tsSizeBy.url === ds.url ? window.__tsSizeBy.size : 0;
          try{ window.__dbgEv && window.__dbgEv(0, "carregador .ts: fim do pedido", {from, bytes:nb, total:this._total, faltam: sz ? sz - this._total : null}); }catch(e){}
          if(sz && this._total < sz - 1000000 && (this._re || 0) < 5){ this._re = (this._re || 0) + 1; this.open(ds, {from:this._total}); return; }
          this._status = 4; if(this.onComplete) this.onComplete(from, this._total - 1);
        }catch(e){ if(ctl !== this._ctl) return; if(e.name === "AbortError"){ this._status = 0; return; } this._status = 3; if(this.onError) this.onError(3, {code:-1, msg:String(e.message || e)}); } })();
    }
    /* v464: se o servidor deixa de enviar dados durante 8 s, o carregador reabre o pedido a partir da posição atual */
    _watch(){ if(this._status === 2 && this._ds && Date.now() - this._last > 8000){ try{ window.__dbgEv && window.__dbgEv(0, "carregador .ts: sem dados, reabre a partir do byte", {byte:this._total}); }catch(e){} this._last = Date.now(); this.open(this._ds, {from:this._total}); } }
    abort(){ try{ this._ctl && this._ctl.abort(); }catch(e){} this._status = 0; }
    destroy(){ clearInterval(this._wd); this.abort(); this.onDataArrival = this.onComplete = this.onError = this.onContentLengthKnown = this.onURLRedirect = this.onRecoveredEarlyEof = null; }
    _push(d){
      let buf = d; if(this._carry.length){ buf = new Uint8Array(this._carry.length + d.length); buf.set(this._carry); buf.set(d, this._carry.length); }
      if(!this._aligned){ let s = -1; for(let i = 0; i + 188 < buf.length; i++){ if(buf[i] === 0x47 && buf[i + 188] === 0x47){ s = i; break; } }
        if(s < 0){ this._carry = buf.slice(Math.max(0, buf.length - 376)); return; } buf = buf.subarray(s); this._aligned = true; }
      const n = Math.floor(buf.length / 188) * 188; this._carry = buf.slice(n); this._emit(buf.subarray(0, n)); }
    _emit(b){ this._patch(b); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); const start = this._total; this._total += b.byteLength;
      /* v476: débito real do ficheiro (Mbps) a cada 5 s, para saber se a rede chega para o vídeo */
      const now = Date.now(); if(!this._dt0){ this._dt0 = now; this._db0 = 0; } this._db0 += b.byteLength;
      if(now - this._dt0 >= 5000){ try{ window.__dbgEv && window.__dbgEv(0, "filme .ts: débito", {mbps: Math.round(this._db0 * 8 / ((now - this._dt0) / 1000) / 1e5) / 10, bytes: this._db0, total: this._total}); }catch(e){} this._dt0 = now; this._db0 = 0; } if(this.onDataArrival) this.onDataArrival(ab, start, this._total); }
    _patch(b){ for(let o = 0; o + 188 <= b.length; o += 188){ if(b[o] !== 0x47) continue;
        const pid = ((b[o + 1] & 0x1f) << 8) | b[o + 2], pusi = !!(b[o + 1] & 0x40), afc = (b[o + 3] >> 4) & 3; if(!pusi || !(afc & 1)) continue;
        let p = o + 4; if(afc & 2) p += 1 + b[o + 4]; if(p >= o + 188) continue; const pe = o + 188;
        if(pid === 0 && this._pmtPid < 0){ const sec = p + 1 + b[p]; if(sec + 8 > pe || b[sec] !== 0) continue; const sl = ((b[sec + 1] & 0xf) << 8) | b[sec + 2]; const end = Math.min(sec + 3 + sl - 4, pe);
          for(let i = sec + 8; i + 4 <= end; i += 4){ const prog = (b[i] << 8) | b[i + 1]; if(prog){ this._pmtPid = ((b[i + 2] & 0x1f) << 8) | b[i + 3]; break; } } }
        else if(this._pmtPid >= 0 && pid === this._pmtPid){ this._patchPmt(b, p, pe); if(!this._pmtOk){ this._pmtOk = true; try{ window.__dbgEv && window.__dbgEv(0, "carregador .ts: PMT lida", {pid:this._pmtPid, total:this._total}); }catch(e){} } }
      } }
    _patchPmt(b, p, pe){
      const sec = p + 1 + b[p]; if(sec + 12 > pe || b[sec] !== 2) return; const sl = ((b[sec + 1] & 0xf) << 8) | b[sec + 2]; const end = sec + 3 + sl; if(end > pe) return;
      const pil = ((b[sec + 10] & 0xf) << 8) | b[sec + 11]; let i = sec + 12 + pil, changed = false;
      while(i + 5 <= end - 4){ const st = b[i], il = ((b[i + 3] & 0xf) << 8) | b[i + 4]; let hide = st === 0x81 || st === 0x87;
        if(st === 0x06){ for(let k = i + 5; k < i + 5 + il && k + 1 < end;){ const tg = b[k], ln = b[k + 1]; if(tg === 0x6A || tg === 0x7A) hide = true; k += 2 + ln; } }
        if(hide){ b[i] = 0x06; changed = true; } i += 5 + il; }
      if(changed){ const c = crc32m(b, sec, end - 4); b[end - 4] = (c >>> 24) & 0xFF; b[end - 3] = (c >>> 16) & 0xFF; b[end - 2] = (c >>> 8) & 0xFF; b[end - 1] = c & 0xFF; }
    }
  }
  window.__TsPmtLoader = TsPmtLoader;
  /* v468: o mpegts.js não consegue saltar num .ts sem duração conhecida: o salto reabre o leitor no byte estimado e o tempo do vídeo volta a contar a partir do ponto */
  window.__tsBase = window.__tsBase || [];
  /* v475: troca a faixa de som de um .ts: o som reinicia na posição atual; a imagem não muda */
  window.__tsSwitchTrack = (slot, track) => {
    const a = window.__tsMovieArgs && window.__tsMovieArgs[slot]; const v = $("vid" + slot);
    if(!a || !v || !track) return;
    try{ window.__dbgEv && window.__dbgEv(slot, "som do .ts: troca de faixa", {faixa: track.n, codec: track.kind}); }catch(e){}
    try{ window.__tsSnd && window.__tsSnd[slot] && window.__tsSnd[slot].stop(); }catch(e){}
    window.__tsMovieSound(slot, a.url, track, a.playId, v.currentTime || 0);
  };
  window.__tsSeekRestart = (slot, t) => {
    const a = window.__tsMovieArgs && window.__tsMovieArgs[slot]; const v = $("vid" + slot);
    if(!a || !v || !window.mpegts || !window.__TsPmtLoader) return;
    const sz = window.__tsSizeBy && window.__tsSizeBy.url === a.url ? window.__tsSizeBy.size : 0, dur = (window.__tsDurMap || {})[a.url] || 0;
    if(!sz || !(dur > 0)) return;
    const off = Math.max(0, Math.floor(t / dur * sz / 188) * 188);
    try{ window.__tsSnd && window.__tsSnd[slot] && window.__tsSnd[slot].stop(); }catch(e){}
    try{ tsInst[slot] && tsInst[slot].destroy(); }catch(e){}
    /* v471: o leitor recomeça no início do ficheiro e carrega até ao ponto; quando o buffer chega ao ponto, a imagem salta para lá */
    window.__tsStartAt = 0;
    const p = mpegts.createPlayer({type:"mpegts", isLive:false, url:a.url, hasAudio:false}, {enableWorker:true, lazyLoad:true, customLoader:window.__TsPmtLoader});
    tsInst[slot] = p; p.attachMediaElement(v); p.load(); v.play().catch(()=>{});
    window.__tsBase[slot] = 0;
    window.__tsMovieSound(slot, a.url, a.a, a.playId, t, off);
    const pid = a.playId, t0 = Date.now(); clearInterval(window.__tsPend && window.__tsPend[slot]);
    window.__tsPend = window.__tsPend || []; window.__tsPend[slot] = setInterval(() => {
      if(pid !== playSeq[slot] || tsInst[slot] !== p || Date.now() - t0 > 900000){ clearInterval(window.__tsPend[slot]); return; }
      let ok = false; for(let k = 0; k < v.buffered.length; k++){ if(v.buffered.start(k) <= t + 0.5 && v.buffered.end(k) >= t + 3) ok = true; }
      if(ok){ clearInterval(window.__tsPend[slot]); try{ v.currentTime = t; }catch(e){} try{ window.__dbgEv && window.__dbgEv(slot, "barra: imagem no ponto", {para: Math.round(t), esperou_s: Math.round((Date.now() - t0) / 1000)}); }catch(e){} }
    }, 500);
    try{ window.__dbgEv && window.__dbgEv(slot, "barra: recarrega do início até ao ponto", {para: Math.round(t), byte: off}); }catch(e){}
  };
  window.__tsMovieSound = (slot, url, a, playId, startSec, offIn) => {
    const v = $("vid" + slot); if(!v) return;
    startSec = startSec || 0;
    /* v463: posição: o som recomeça a partir do ponto (salto na barra); o byte inicial é estimado pelo tamanho do ficheiro */
    let off = 0; if(offIn != null){ off = offIn; } else if(startSec > 0){ const sz = window.__tsSizeBy && window.__tsSizeBy.url === url ? window.__tsSizeBy.size : 0; const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : ((window.__tsDurMap || {})[url] || 0);
      if(!sz || !(dur > 0)) return; off = Math.max(0, Math.floor(startSec / dur * sz / 188) * 188); }
    window.__tsMovieArgs = window.__tsMovieArgs || []; window.__tsMovieArgs[slot] = {url, a, playId};
    window.__tsSnd = window.__tsSnd || []; if(window.__tsSnd[slot]) window.__tsSnd[slot].stop();
    const ctl = new AbortController(), st = {clock:new PcmClock(v), q:[], init:null, dec:null, L:null, on:true, busy:false};
    window.__tsSnd[slot] = {stop: () => stopIt()};
    const alive = () => st.on && playId === playSeq[slot];
    const stopIt = () => { if(!st.on) return; st.on = false; try{ ctl.abort(); }catch(e){} try{ st.clock.close(); }catch(e){} try{ if(st.dec && st.L) st.L.ff_free_decoder(st.dec[1], st.dec[2], st.dec[3]); }catch(e){} };
    const poll = setInterval(() => { if(!alive()){ clearInterval(poll); stopIt(); } }, 1000);
    const dbg = (e, o) => { try{ window.__dbgEv && window.__dbgEv(slot, e, o); }catch(x){} };
    const pump = async () => {
      if(st.busy || !st.dec || !alive()) return; st.busy = true;
      try{ while(st.q.length && alive()){
          /* v462: ritmo do vídeo: não descodifica mais de 1,5 s à frente da imagem (senão o PcmClock descarta) */
          const x = st.q[0]; if(!x) break; if((x.pts / 90000 - st.init) - v.currentTime > 1.5){ await new Promise(r => setTimeout(r, 250)); continue; }
          st.q.shift(); const fr = ac3Frames(x.data); if(!fr.length) continue;
          const [, c, pkt, frame] = st.dec; const out = await st.L.ff_decode_multi(c, pkt, frame, fr.map(f => ({data:f})), false);
          let t = x.pts / 90000 - st.init;
          for(const f of out){ const sr = f.sample_rate || 48000, planes = Array.isArray(f.data) ? f.data.map(q => q instanceof Float32Array ? q : Float32Array.from(q)) : null;
            if(!planes || !planes.length) continue; const pl = downmix(planes); st.clock.push(pl, sr, t); t += pl[0].length / sr; }
        } }catch(e){ dbg("som Dolby do filme: erro", {msg:String(e.message || e).slice(0, 120)}); }
      finally{ st.busy = false; } };
    libav().then(async L => { if(!alive()) return; st.L = L; st.dec = await L.ff_init_decoder(a.kind === "eac3" ? "eac3" : "ac3"); await window.__dolbyStereo(L, st.dec); dbg("som Dolby do filme: descodificador pronto", {codec:a.kind}); pump(); })
      .catch(e => { dbg("som Dolby do filme: falhou", {msg:String(e.message || e).slice(0, 120)}); stopIt(); });
    let cur = null;
    const closePes = () => { const c = cur; cur = null; if(!c) return; let L = 0; c.forEach(x => L += x.length); const b = new Uint8Array(L); let k = 0; c.forEach(x => { b.set(x, k); k += x.length; });
      if(!(b.length > 14 && b[0] === 0 && b[1] === 0 && b[2] === 1 && (b[7] & 0x80))) return;
      const q = b.subarray(9, 14), pts = ((q[0] >> 1) & 7) * 1073741824 + q[1] * 4194304 + (q[2] >> 1) * 32768 + q[3] * 128 + (q[4] >> 1);
      if(st.init == null) st.init = pts / 90000 - startSec;
      st.q.push({pts, data:b.subarray(9 + b[8])}); if(st.q.length > 600) st.q.splice(0, st.q.length - 600); };
    const feedTs = d => { for(let o = 0; o + 188 <= d.length; o += 188){ if(d[o] !== 0x47) continue; const pid = ((d[o + 1] & 0x1f) << 8) | d[o + 2]; if(pid !== a.pid) continue;
        const afc = (d[o + 3] >> 4) & 3; if(!(afc & 1)) continue; let p = o + 4; if(afc & 2) p += 1 + d[o + 4]; if(p >= o + 188) continue;
        if(d[o + 1] & 0x40){ closePes(); cur = []; } if(cur) cur.push(d.slice(p, o + 188)); } pump(); };
    (async () => { try{ const r = await fetch(url, {signal:ctl.signal, headers: off > 0 ? {Range:"bytes=" + off + "-"} : {}}); if(off > 0 && r.status !== 206){ dbg("som Dolby do filme: o servidor não aceita posição", {}); stopIt(); return; } const rd = r.body.getReader(); let carry = new Uint8Array(0);
        while(alive()){ while(alive() && st.q.length > 150) await new Promise(r => setTimeout(r, 300)); const x = await rd.read(); if(x.done) break; let d = x.value; if(carry.length){ const m = new Uint8Array(carry.length + d.length); m.set(carry); m.set(d, carry.length); d = m; }
          const n = Math.floor(d.length / 188) * 188; carry = d.slice(n); feedTs(d.subarray(0, n)); }
      }catch(e){ if(e.name !== "AbortError") dbg("som Dolby do filme: leitura falhou", {msg:String(e.message || e).slice(0, 120)}); } })();
  };
  /* PES de áudio */
  function feed(st, d){
    const pidOf = o => ((d[o + 1] & 0x1f) << 8) | d[o + 2];
    const close = () => { const c = st.cur; st.cur = null; if(!c) return; let L = 0; c.forEach(x => L += x.length); const b = new Uint8Array(L); let k = 0; c.forEach(x => { b.set(x, k); k += x.length; });
      if(!(b.length > 14 && b[0] === 0 && b[1] === 0 && b[2] === 1 && (b[7] & 0x80))) return; const q = b.subarray(9, 14), pts = ((q[0] >> 1) & 7) * 1073741824 + q[1] * 4194304 + (q[2] >> 1) * 32768 + q[3] * 128 + (q[4] >> 1);
      st.q.push({pts, data:b.subarray(9 + b[8])}); if(st.q.length > 600) st.q.splice(0, st.q.length - 600); };
    for(let o = 0; o + 188 <= d.length; o += 188){
      if(d[o] !== 0x47 || pidOf(o) !== st.pid) continue;
      const afc = (d[o + 3] >> 4) & 3; if(!(afc & 1)) continue; let p = o + 4; if(afc & 2) p += 1 + d[o + 4]; if(p >= o + 188) continue;
      if(d[o + 1] & 0x40){ close(); st.cur = []; } if(st.cur) st.cur.push(d.slice(p, o + 188));
    }
    close(); pump(st);
  }
  async function pump(st){
    if(st.busy || !st.dec || !st.on) return; st.busy = true;
    try{
      while(st.q.length && st.on){
        if(st.init == null){ await new Promise(r => setTimeout(r, 200)); continue; }
        const x = st.q.shift(), fr = ac3Frames(x.data); if(!fr.length) continue;
        const [, c, pkt, frame] = st.dec;
        const out = await st.L.ff_decode_multi(c, pkt, frame, fr.map(f => ({data:f})), false);
        let t = x.pts / 90000 - st.init;
        for(const f of out){
          const sr = f.sample_rate || 48000, planes = Array.isArray(f.data) ? f.data.map(a => a instanceof Float32Array ? a : Float32Array.from(a)) : null;
          if(!planes || !planes.length) continue;
          /* mais de 2 canais (5.1): mistura para estéreo */
          const pl = downmix(planes);
          st.clock.push(pl, sr, t); t += pl[0].length / sr; st.n++;
        }
      }
    }catch(e){ st.err = String(e.message || e); }
    st.busy = false;
  }
window.__sa = {
  hook(slot, u){
    if(window.__saOff) return;
    const seq = playSeq[slot], isFirst = first[slot] !== seq; first[slot] = seq;
    let st = S[slot]; if(st && st.seq !== seq){ stop(slot); st = null; }
    if(!st){
      if(!isFirst) return;
      const L = pmtAudio(u); if(!L || !L.length) return;
      /* se houver AAC/MP3 na PMT, o próprio <video> toca — não mexer */
      const native = L.some(x => x.kind === "aac" || x.kind === "mpa"); if(native) return;
      const tr = L.find(x => x.kind === "ac3" || x.kind === "eac3"); if(!tr || !hlsInst[slot]) return;
      const mode = eac3Mode();
      if(mode === "hw"){
        /* deixa o HLS.js mapear a faixa; o <video> usa o descodificador do sistema */
        log(slot, "E-AC3 por hardware (HLS nativo)", { codec:tr.kind, mediaSource:HW.eac3, eficiente:HW.efficient });
        return;
      }
      /* modo "sw" ou "auto" sem hardware: libav/WASM */
      st = S[slot] = start(slot, tr); if(!st) return;
      log(slot, "E-AC3 por software (libav/WASM)", { codec:tr.kind, sonda:HW.why });
    }
    feed(st, u);
  },
  on: slot => !!S[slot],
  n: slot => S[slot] ? S[slot].n : 0,
  stop,
  hw: () => Object.assign({}, HW)
};
  }catch(e){ console.log("som Dolby", e); }
})();
