

/* v282: Aspeto e layout — escala, meia janela, fps, noite (ids estáticos; chaves localStorage mantidas) */
(() => { try{
  const applyScale = () => {
    const n = +(typeof cfg === "object" && cfg.uiScale) || 100;
    const v = Math.max(90, Math.min(125, n)) / 100;
    try{ document.documentElement.style.setProperty("--ui-scale", String(v)); document.documentElement.style.fontSize = (v * 100) + "%"; }catch(e){}
  };
  const fillAspect = () => {
    try{
      const sc = $("setUiScale"); if(sc) sc.value = String(cfg.uiScale || 100);
      const hf = $("setHalfMode"); if(hf) hf.value = cfg.halfMode || "auto";
      const ni = $("setNightUi"); if(ni) ni.value = cfg.nightUi || "auto";
      const fp = $("setShowFps"); if(fp) fp.checked = !!cfg.showFps;
      const dm = $("setDecode"); if(dm) dm.value = (cfg.decodeMode === "software" || location.protocol === "http:") ? "software" : "webcodecs";
      const mf = $("setMseFilm"); if(mf) mf.value = cfg.mseFilm === false ? "off" : "on";
      const am = $("setAutoMir"); if(am) am.value = cfg.autoMirror === false ? "off" : "on";

      const sm = $("setSmooth"); if(sm) sm.checked = cfg.smoothClock !== false;
      const an = $("setCardAnim"); if(an) an.value = cfg.tvHomeAnim || "suave";
      const th = $("setTvHome"); if(th) th.value = (cfg.tvHome === "classic") ? "classic" : "android";
      const tp = $("setTvHomeTpl"); if(tp) tp.value = cfg.tvHomeTpl || "equilibrado";
    }catch(e){}
  };
  const bind = (id, fn) => { const el = $(id); if(!el || el._v282) return; el._v282 = 1; el.addEventListener("change", fn); };
  /* v442: em http a escolha do motor não tem efeito (sem WebCodecs): esconde-a */
  try{ if(location.protocol === "http:"){ document.querySelectorAll(".decHttpHide").forEach(e => { e.style.display = "none"; }); const n = document.getElementById("decHttpNote"); if(n) n.style.display = "block"; } }catch(e){}
  window.__useSoft = () => location.protocol === "http:" || !!(cfg && cfg.decodeMode === "software");  /* v392: em HTTP (sem WebCodecs) usa sempre o software */
  /* v321: relógio suavizado (no carro já vem ligado; no telemóvel só se a opção estiver marcada) */
  /* v322: ligado por defeito (é o mesmo código que já corre no carro); desligar nas Definições se houver problemas */
  window.__smoothOn = () => !(cfg && cfg.smoothClock === false);
  bind("setUiScale", e => { cfg.uiScale = +e.target.value || 100; saveCfg(); applyScale(); });
  bind("setHalfMode", e => { cfg.halfMode = e.target.value || "auto"; saveCfg(); try{ window.__halfUpd && window.__halfUpd(); }catch(x){} });
  bind("setNightUi", e => { cfg.nightUi = e.target.value || "auto"; saveCfg(); try{ const o=$("nightOpt"); if(o) o.value=cfg.nightUi; window.__night && window.__night(); }catch(x){} });
  bind("setShowFps", e => { cfg.showFps = !!e.target.checked; saveCfg(); });
  /* v311: escolha do motor de descodificação (o caminho WebCodecs ainda não reproduz canais) */
  bind("setSmooth", e => { cfg.smoothClock = !!e.target.checked; saveCfg(); toast(cfg.smoothClock ? "Relógio suavizado ligado (compara com um registo)." : "Relógio suavizado desligado."); });
  bind("setAutoMir", e => { cfg.autoMirror = e.target.value !== "off"; saveCfg(); });
  bind("setMseFilm", e => { cfg.mseFilm = e.target.value !== "off"; saveCfg(); toast(cfg.mseFilm ? "Filmes com som Dolby: um só leitor. Reabre o filme." : "Filmes com som Dolby: leitor do carro + som à parte. Reabre o filme."); });
  bind("setDecode", e => { cfg.decodeMode = e.target.value === "software" ? "software" : "webcodecs"; saveCfg();
    /* v328: reinicia o espelho de cada ecrã para usar o motor escolhido (antes ficava o motor antigo) */
    try{ if(mirrorOn) [0, 1].forEach(sl => { try{ if(MIR[sl]){ cancelAnimationFrame(mirrorRAF[sl]); wcDestroy(sl); MIR[sl] = null; startMirror(sl); } }catch(err){} }); }catch(err){}
    toast(cfg.decodeMode === "software" ? "Motor: software (h264soft.js). Reabre a imagem em andamento." : "Motor: WebCodecs (por defeito). Reabre a imagem em andamento."); });
  /* Teste real: codifica 5 fotogramas com VideoEncoder, descodifica com VideoDecoder e conta os que saem */
  async function wcRoundTrip(){
    if(!window.VideoEncoder || !window.VideoDecoder || !window.VideoFrame) return {ok:false, why:"este browser não tem WebCodecs"};
    const W = 320, H = 180, codec = "avc1.42001f";
    const ecfg = {codec, width:W, height:H, bitrate:500000, framerate:10, hardwareAcceleration:"prefer-hardware"};
    const sup = await VideoEncoder.isConfigSupported(ecfg);
    if(!sup.supported) return {ok:false, why:"codificador H.264 não suportado"};
    const chunks = []; let desc = null, decoded = 0, derr = null;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
    const enc = new VideoEncoder({output:(c, m) => { if(m && m.decoderConfig && !desc) desc = m.decoderConfig; chunks.push(c); }, error:e => { derr = "codificar: " + e.message; }});
    enc.configure(ecfg);
    for(let i = 0; i < 5; i++){ g.fillStyle = "hsl(" + (i * 60) + ",80%,50%)"; g.fillRect(0, 0, W, H); const fr = new VideoFrame(cv, {timestamp: i * 100000}); enc.encode(fr, {keyFrame: i === 0}); fr.close(); }
    await enc.flush(); enc.close();
    const dec = new VideoDecoder({output:f => { decoded++; f.close(); }, error:e => { derr = "descodificar: " + e.message; }});
    dec.configure({codec, codedWidth:W, codedHeight:H, hardwareAcceleration:"prefer-hardware", ...(desc && desc.description ? {description: desc.description} : {})});
    const t0 = performance.now();
    chunks.forEach(c => dec.decode(c));
    await dec.flush(); dec.close();
    if(derr) return {ok:false, why:derr};
    /* v319: também verifica HEVC (hvc1), que os canais de 1080p usam, só para saber se o descodificador o suporta */
    let hevc = "não testado";
    try{ const hs = await VideoDecoder.isConfigSupported({codec:"hvc1.1.6.L93.B0", codedWidth:1920, codedHeight:1080, hardwareAcceleration:"prefer-hardware"}); hevc = hs.supported ? "suportado" : "não suportado"; }catch(e){ hevc = "erro: " + e.message; }
    return {ok: decoded === 5, frames: decoded, ms: Math.round(performance.now() - t0), hevc};
  }
  /* v326: o que a reprodução usa é o descodificador. Testa-o sozinho (H.264 e HEVC), sem depender do codificador */
  async function wcCaps(){
    const dec = async c => { try{ const r = await VideoDecoder.isConfigSupported(c); return r.supported ? "sim" : "não"; }catch(e){ return "erro"; } };
    if(!window.VideoDecoder) return {h264:"sem WebCodecs", hevc:"sem WebCodecs"};
    return { h264: await dec({codec:"avc1.42001f", codedWidth:1280, codedHeight:720, hardwareAcceleration:"prefer-hardware"}),
             hevc: await dec({codec:"hvc1.1.6.L93.B0", codedWidth:1920, codedHeight:1080, hardwareAcceleration:"prefer-hardware"}) };
  }
  /* v332 (só registo): capacidades HEVC deste browser, para o registo de sessão */
  (async () => { try{ const mse = !!(window.MediaSource && MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.6.L150.90"'));
    const wc = window.VideoDecoder ? (await VideoDecoder.isConfigSupported({codec:"hvc1.1.6.L93.B0", codedWidth:1920, codedHeight:1080, hardwareAcceleration:"prefer-hardware"})).supported : false;
    window.__hevcCaps = {msePlay:mse, webcodecsDecode:wc, software:typeof SoftVideoDecoder === "function"}; }catch(e){ window.__hevcCaps = {erro:String(e.message||e)}; } })();
  const wcBtn = $("btnWcTest");
  if(wcBtn && !wcBtn._v311){ wcBtn._v311 = 1; wcBtn.addEventListener("click", async () => {
    toast("A testar WebCodecs…");
    try{ const caps = await wcCaps(); const r = await wcRoundTrip(); const msg = "Descodificador — H.264 720p: " + caps.h264 + " · HEVC 1080p: " + caps.hevc + " | " + (r.ok ? "✅ WebCodecs OK: " + r.frames + "/5 fotogramas em " + r.ms + " ms" : "❌ WebCodecs: " + (r.why || ("só " + r.frames + "/5 fotogramas"))) + " · HEVC 1080p: " + (r.hevc || "—");
      toast(msg, caps.h264 !== "sim"); window.__dbgEv && window.__dbgEv(0, "teste WebCodecs", Object.assign({caps}, r)); }
    catch(e){ toast("❌ WebCodecs: " + e.message, true); }
  }); }
  bind("setCardAnim", e => { cfg.tvHomeAnim = e.target.value; saveCfg(); });
  bind("setTvHome", e => { cfg.tvHome = e.target.value; saveCfg(); });
  bind("setTvHomeTpl", e => { cfg.tvHomeTpl = e.target.value; saveCfg(); });
  applyScale(); fillAspect();
  const _fs = window.fillSettings;
  if(typeof _fs === "function") window.fillSettings = function(){ const r = _fs.apply(this, arguments); try{ fillAspect(); applyScale(); }catch(e){} return r; };
  else window.fillSettings = function(){ try{ fillAspect(); applyScale(); }catch(e){} };
  addEventListener("DOMContentLoaded", () => { try{ fillAspect(); applyScale(); }catch(e){} });
  setTimeout(() => { try{ fillAspect(); applyScale(); }catch(e){} }, 600);
}catch(e){ console.log("aspeto v282", e); } })();

/* ===== Amplificação do som do browser + voz Dolby (Definições → TV e IPTV) =====
   Com a amplificação acima de 100 %, o som dos <video>/<audio> passa por um ganho (Web Audio) e um limitador, e o som Dolby
   por software também sobe. O browser só deixa isto nas fontes do próprio site ou em blob: (HLS/MPEG-TS pelo hls.js e mpegts.js);
   ligações diretas de outro site (sem CORS) ficam como estão. */
(() => { try{
  const pct = () => { const p = +cfg.ampPct; return p >= 100 && p <= 500 ? p : 100; };
  const A = window.__amp = {pct, ctx:null, warned:0, used:0};
  const proxBase = () => [window.PHONE_PROXY && window.PHONE_PROXY.base, cfg.proxy2, cfg.proxy].filter(Boolean).map(x => String(x).replace(/\/+$/, ""));
  const proxied = v => { v = String(v || ""); return proxBase().some(b => v.indexOf(b) === 0); };
  const same = el => { const u = el.currentSrc || el.src || ""; if(!u) return false; if(/^(blob:|data:)/i.test(u)) return true; try{ return new URL(u, location.href).origin === location.origin; }catch(e){ return false; } };
  const safe = el => same(el) || (el.crossOrigin === "anonymous" && !el.error && !!(el.currentSrc || el.src));
  /* v437: no Tesla o som dos filmes e canais passa sempre pela mistura 5.1 → estéreo (mesmo sem amplificação): o leitor do carro deixava as vozes (canal central) de fora */
  const mixWant = el => !!window.__TESLA && /^vid[01]$/.test(el && el.id || "");
  const mix51 = (c, el, src) => {
    const pre = c.createGain(); pre.channelCount = 6; pre.channelCountMode = "explicit"; pre.channelInterpretation = "speakers";
    const sp = c.createChannelSplitter(6), mg = c.createChannelMerger(2), G = {};
    src.connect(pre); pre.connect(sp);
    [[0, [0]], [1, [1]], [2, [0, 1]], [4, [0]], [5, [1]]].forEach(([ch, outs]) => { const g = c.createGain(); sp.connect(g, ch); outs.forEach(o => g.connect(mg, 0, o)); G[ch] = g; });
    const an = [0, 1, 2, 4].map(ch => { const a = c.createAnalyser(); a.fftSize = 2048; sp.connect(a, ch); return a; }), buf = new Float32Array(2048);
    const dB = a => { a.getFloatTimeDomainData(buf); let e = 0; for(let i = 0; i < buf.length; i++) e += buf[i] * buf[i]; return +(10 * Math.log10(e / buf.length + 1e-12)).toFixed(1); };
    const M = el._mix = {multi:false, src:el.currentSrc, logged:0};
    const set = () => { const k = cfg.dolbyVoice == null ? 1 : +cfg.dolbyVoice, vc = k === 0 ? 0.7 : k === 2 ? 1.5 : 1.0, t = c.currentTime;
      const v = M.multi ? {0:0.62, 1:0.62, 2:vc, 4:0.35, 5:0.35} : {0:1, 1:1, 2:vc, 4:0.35, 5:0.35};
      for(const ch in G){ try{ G[ch].gain.setTargetAtTime(v[ch], t, 0.05); }catch(e){ G[ch].gain.value = v[ch]; } } };
    set();
    const tick = setInterval(() => { try{
      if(!el.isConnected){ clearInterval(tick); return; }
      if(el.currentSrc !== M.src){ M.src = el.currentSrc; M.multi = false; M.logged = 0; set(); }
      if(el.paused || el.muted) return;
      const d = an.map(dB), fr = Math.max(d[0], d[1]);
      if(!M.multi && fr > -70 && (d[2] > -70 || d[3] > -70)){ M.multi = true; set();
        dbg(el, "som 5.1 do leitor: mistura com vozes ligada", {dB_L_R_C_Ls:d, voz:cfg.dolbyVoice == null ? 1 : +cfg.dolbyVoice}); M.logged = 1; }
      else if(M.logged < 2 && fr > -70 && Date.now() - (M.at || (M.at = Date.now())) > 6000){ M.logged = 2; if(!M.multi) dbg(el, "som do leitor: estéreo (sem canal central)", {dB_L_R_C_Ls:d}); }
      set(); }catch(e){} }, 1000);
    return mg; };
  /* v282: sampleRate do contexto = taxa do canal (evita som lento/grave em canais a 44,1 kHz no Tesla) */
  const chanSrOf = el => { try{ if(el && el._chanSr) return +el._chanSr; const id = el && el.id; const slot = id === "vid1" ? 1 : id === "vid0" ? 0 : -1; if(slot >= 0 && window.__chanSr && window.__chanSr[slot]) return +window.__chanSr[slot]; if(A.chanSr) return +A.chanSr; }catch(e){} return 0; };
  const ctx = (wantSr) => {
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
    const sr = wantSr && wantSr > 0 ? wantSr : 0;
    if(A.ctx && A.ctx.state !== "closed"){
      if(sr && Math.abs(A.ctx.sampleRate - sr) > 50){
        /* v284: um <video> já ligado a este contexto não pode ser ligado a outro; fechá-lo calava o som (ou dava o som em câmara lenta/grave).
           Enquanto houver elementos ligados, o canal novo fica sem amplificação (som natural) em vez de fechar o contexto. */
        if(A.used > 0) return null;
        try{ A.ctx.close(); }catch(e){}
        A.ctx = null;
      } else return A.ctx;
    }
    try{
      const opts = {latencyHint:"playback"};
      if(sr) opts.sampleRate = sr;
      A.ctx = new AC(opts);
    }catch(e){
      try{ A.ctx = new AC({latencyHint:"playback"}); }catch(e2){ A.ctx = null; }
    }
    return A.ctx;
  };
  const level = (g, c) => { try{ g.gain.setTargetAtTime(pct() / 100, c.currentTime, 0.05); }catch(e){ g.gain.value = pct() / 100; } };
  const dbg = (el, t, d) => { try{ window.__dbgEv && window.__dbgEv(el && el.id === "vid1" ? 1 : 0, t, d); }catch(e){} };
  const apply = el => {
    try{
      if(!(el instanceof HTMLMediaElement) || el._noAmp) return;
      if(el._amp){ level(el._amp.g, A.ctx); try{ if(A.ctx && A.ctx.state === "suspended") A.ctx.resume().catch(() => {}); }catch(e){} return; }
      if((pct() <= 100 && !mixWant(el)) || el._ampBusy || !(el.currentSrc || el.src)) return;
      if(!safe(el)){
        /* ficheiro direto de outro site: o browser não deixa amplificar sem estragar o som; fica como está */
        if(!el._ampNote && !el.paused){ el._ampNote = 1; dbg(el, "amplificação: ficheiro direto, não aplicada", {}); }
        return; }
      const wantSr = chanSrOf(el);
      const c = ctx(wantSr); if(!c) return;
      /* se o contexto ficou a taxa diferente da do canal, não amplificar (ganho 1 / ignorar) */
      if(wantSr && Math.abs(c.sampleRate - wantSr) > 50){
        if(!el._ampSkip){ el._ampSkip = 1; dbg(el, "amplificação ignorada: canal a " + wantSr + " Hz", {ctxHz:c.sampleRate}); }
        return;
      }
      el._ampBusy = true;
      c.resume().catch(() => {}).then(() => { el._ampBusy = false;
        if(c.state !== "running" || el._amp || (pct() <= 100 && !mixWant(el)) || !safe(el)) return;
        if(wantSr && Math.abs(c.sampleRate - wantSr) > 50){ dbg(el, "amplificação ignorada: canal a " + wantSr + " Hz", {ctxHz:c.sampleRate}); return; }
        const src = c.createMediaElementSource(el), g = c.createGain(), cp = c.createDynamicsCompressor();
        /* v284: com 200 % o som do canal já passa de -11 dBFS; o compressor antigo (limiar -6 dB, 12:1, ataque 3 ms) comprimia cada pico de graves e dava um som grave «bombeado» e enlameado.
           Agora é só um limitador de segurança: actua apenas perto de 0 dBFS (limiar -1 dB, 20:1, joelho zero), por isso a dinâmica dos graves fica intacta. */
        cp.threshold.value = -1; cp.knee.value = 0; cp.ratio.value = 20; cp.attack.value = 0.002; cp.release.value = 0.12;
        let head = src; if(mixWant(el)){ try{ head = mix51(c, el, src); }catch(e){ head = src; dbg(el, "mistura 5.1: erro", {erro:String(e && e.message || e)}); } }
        try{ c.destination.channelCount = 2; c.destination.channelInterpretation = "speakers"; }catch(e){}
        head.connect(g); g.connect(cp); cp.connect(c.destination); el._amp = {g}; A.used++; level(g, c);
        dbg(el, "amplificação ligada", {pct:pct(), el:el.id, fonte:/^blob:/.test(el.currentSrc) ? "blob" : "cors", taxaCtx:c.sampleRate, taxaCanal:wantSr || null, mistura51:head !== src, saidaMaxCanais:c.destination.maxChannelCount}); });
    }catch(e){ el._ampBusy = false; }
  };
  const all = () => document.querySelectorAll("video,audio");
  A.refresh = () => { all().forEach(apply); };
  ["playing", "loadeddata"].forEach(ev => document.addEventListener(ev, e => apply(e.target), true));
  document.addEventListener("pointerdown", () => { if(pct() > 100 || window.__TESLA){ const c = ctx(); if(c && c.state === "suspended") c.resume().catch(() => {}); } }, true);
  setTimeout(() => { try{
    const card = [...document.querySelectorAll("#v-settings .setcard")].find(e => ((t => t === "Reprodução" || t === "TV e IPTV")(((e.querySelector("h2") || {}).textContent || "").trim()))); if(!card) return;
    const l1 = document.createElement("label"); l1.className = "f";
    l1.innerHTML = 'Voz nos filmes e canais 5.1<select id="setDolbyVoice"><option value="0">Normal (mistura-padrão)</option><option value="1">Realçada (recomendado)</option><option value="2">Máxima (diálogos muito baixos)</option></select>';
    const l2 = document.createElement("label"); l2.className = "f";
    l2.innerHTML = 'Amplificação do som do browser<select id="setAmp"><option value="100">Desligada (100 %)</option><option value="150">150 %</option><option value="200">200 %</option><option value="300">300 %</option><option value="400">400 %</option></select>';
    card.appendChild(l1); card.appendChild(l2);
    const s1 = $("setDolbyVoice"), s2 = $("setAmp");
    s1.value = String(cfg.dolbyVoice == null ? 1 : cfg.dolbyVoice); s1.onchange = () => { cfg.dolbyVoice = +s1.value; saveCfg(); toast("Voz 5.1: " + s1.options[s1.selectedIndex].text.split(" (")[0]); };
    s2.value = String(pct()); if(s2.value !== String(pct())) s2.value = "100";
    s2.onchange = () => { cfg.ampPct = +s2.value; saveCfg(); A.refresh();
      if(cfg.ampPct <= 100){ toast("Amplificação desligada"); return; }
      setTimeout(() => { const on = [...document.querySelectorAll("video,audio")].filter(e => e._amp && !e.paused), pcm = !!document.querySelector("video") && window.__sa && (window.__sa.on(0) || window.__sa.on(1));
        if(on.length || pcm) toast("Amplificação " + cfg.ampPct + " % ativa (limitador ligado)"); else if(![...document.querySelectorAll("video,audio")].some(e => !e.paused && !e._noAmp)) toast("Amplificação " + cfg.ampPct + " %: aplica-se ao próximo canal ou filme"); }, 2200); };
  }catch(e){} }, 0);
}catch(e){ console.log("amplificação", e); } })();
