
/* ===== Registo de canais que não abrem (debug) =====
   Guarda, para cada canal que tentas abrir, o percurso técnico: rota (direto/proxy), qualidades e codecs,
   erros do leitor, códigos HTTP, imagem/som descodificados e as recuperações tentadas.
   NUNCA guarda utilizador, palavra-passe, tokens nem chaves: são apagados dos endereços e de todo o texto antes de gravar.
   Pode ser enviado para um repositório GitHub (privado) para análise posterior. */
(function(){
  if(window.ANDROID) return;
  try{
  const MAX = 40;
  const DBG = window.__dbg = {list:[], cur:[null, null], seq:0, watch:[null, null]};
  try{ DBG.list = (LS.get("dbgLog", []) || []).slice(-MAX); }catch(e){}
  const on = () => cfg.dbgOn !== false;
  const save = () => { try{ LS.set("dbgLog", DBG.list.slice(-MAX)); }catch(e){ try{ DBG.list = DBG.list.slice(-15); LS.set("dbgLog", DBG.list); }catch(x){} } };

  /* --- apagar credenciais --- */
  const secrets = () => [cfg.xu, cfg.xp, cfg.pkey, cfg.pkey2, cfg.token, cfg.vin, LS.get("dbgTok", "")].filter(x => x && String(x).length >= 4).map(String);
  const scrub = t => {
    t = String(t == null ? "" : t);
    t = t.replace(/(\/(?:live|movie|series|timeshift)\/)([^/?#]+)\/([^/?#]+)\//gi, "$1•••/•••/");
    t = t.replace(/([?&](?:username|password|user|pass|pwd|passwd|token|key|k|auth|apikey|api_key|access_token|signature|sig)=)[^&#"\s]*/gi, "$1•••");
    t = t.replace(/(Bearer\s+)[\w.\-]+/gi, "$1•••");
    for(const s of secrets()){ t = t.split(s).join("•••"); try{ const e = encodeURIComponent(s); if(e !== s) t = t.split(e).join("•••"); }catch(x){} }
    return t;
  };
  const red = u => { u = String(u || ""); u = u.replace(/([?&]url=)([^&]+)/i, (m, a, b) => { try{ return a + "[" + scrub(decodeURIComponent(b)) + "]"; }catch(e){ return a + "•••"; } }); return scrub(u); };
  const host = u => { try{ return new URL(u).host; }catch(e){ return ""; } };
  const route = u => { const h = host(u); if(!h) return "?"; if(cfg.proxy && h === host(cfg.proxy)) return "proxy 1"; if(cfg.proxy2 && h === host(cfg.proxy2)) return "proxy 2"; return "direto (" + h + ")"; };
  const now = () => new Date().toISOString();
  const bufStr = v => { try{ const b = v.buffered, o = []; for(let i = 0; i < b.length && i < 6; i++) o.push(b.start(i).toFixed(1) + "-" + b.end(i).toFixed(1)); return o.join(" ") || "vazio"; }catch(e){ return "?"; } };
  window.__bufStr = bufStr;
  const rs = b => { try{ const o = []; for(let i = 0; i < b.length && i < 4; i++) o.push(b.start(i).toFixed(1) + "-" + b.end(i).toFixed(1)); return o.join(" ") || "vazio"; }catch(e){ return "?"; } };
  /* buffer de cada faixa (vídeo / som) dentro do hls.js: se não se sobrepõem, o vídeo fica parado sem erro */
  const trackBuf = h => { try{ const bc = (h.coreComponents || []).find(x => x && x.sourceBuffer && typeof x.sourceBuffer === "object"); if(!bc) return null; const o = {}; for(const k of Object.keys(bc.sourceBuffer)){ const sb = bc.sourceBuffer[k]; if(sb && sb.buffered) o[k] = rs(sb.buffered); } return o; }catch(e){ return null; } };
  window.__trackBuf = trackBuf;
  const ev = (slot, type, data) => { const a = DBG.cur[slot] || DBG.watch[slot]; if(!a) return; if(a.ev.length < (a.res === "em observação" ? 250 : 120)) a.ev.push(Object.assign({t:Math.round(performance.now() - a.t0), e:type}, data || {}));
    /* v253: problemas que valem um registo enviado sozinho (sem esperar que o Rui carregue em «Enviar») */
    try{ if(/^(reinício automático|filme sem dados|sem dados: para|som por software: erro|imagem por software: ainda sem imagens|página esteve parada|canal sem áudio|canal em manutenção)/.test(type)) autoSend(type);
      else if(type === "andamento: imagem" && data && data.fps < 6){ a.lowFps = (a.lowFps || 0) + 1; if(a.lowFps === 2) autoSend("imagem lenta em andamento"); }
      else if(type === "som Dolby: níveis" && data && data.tarde > 100 && !a.lateSent){ a.lateSent = 1; autoSend("som Dolby atrasado"); } }catch(e){} };

  /* --- uma tentativa por canal escolhido --- */
  const start = (c, slot) => {
    if(!on() || !c) return;
    archiveWatch(slot);
    finish(slot, "substituído por outro canal");
    const sid = (/\/(?:live|movie|series)\/[^/]+\/[^/]+\/([\w-]+)\./.exec(c.url || "") || [])[1] || "";
    const ext = ((/\.([a-z0-9]{2,5})(\?|$)/i.exec(c.url || "") || [])[1] || "").toLowerCase();
    DBG.cur[slot] = {n:++DBG.seq, at:now(), t0:performance.now(), slot, ch:{name:c.name, kind:c.kind, group:c.group || "", id:sid, ext, free:!!c.free, intl:!!c.intl, url:red(c.url)}, ev:[], res:""};
  };
  /* depois de «ok», o canal continua em observação: quebras, erros e estado do buffer ficam registados (até 20 min) */
  const archiveWatch = slot => { const w = DBG.watch[slot]; DBG.watch[slot] = null; if(!w) return; delete w.t0; w.res = "ok (observado " + Math.round((Date.now() - w.t00) / 1000) + " s)"; delete w.t00; if(w.ev.length){ DBG.list.push(w); if(DBG.list.length > MAX) DBG.list.splice(0, DBG.list.length - MAX); try{ save(); }catch(e){} } };
  const finish = (slot, res) => {
    const a = DBG.cur[slot]; if(!a) return; DBG.cur[slot] = null;
    const v = $("vid" + slot);
    try{ const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : {};
      a.fim = {res, ms:Math.round(performance.now() - a.t0), w:v.videoWidth, h:v.videoHeight, t:+(v.currentTime || 0).toFixed(1), frames:q.totalVideoFrames || 0, perdidos:q.droppedVideoFrames || 0,
        somBytes:v.webkitAudioDecodedByteCount, videoBytes:v.webkitVideoDecodedByteCount, pronto:v.readyState, rede:v.networkState, pausa:v.paused, buffer:bufStr(v), faixas:hlsInst[slot] ? trackBuf(hlsInst[slot]) : null, erroVideo:v.error ? (v.error.code + " " + scrub(v.error.message || "")) : "", som:{mudo:v.muted, vol:+(v.volume || 0).toFixed(2), bytes:v.webkitAudioDecodedByteCount, andamento:(typeof drivingEff === "function" && drivingEff()), imagemAndamento:(typeof mirrorOn !== "undefined" && mirrorOn)}}; }catch(e){ a.fim = {res}; }
    a.res = res; delete a.t0; delete a.__smp;
    try{ const sm = DBG.sample[slot]; if(sm && sm.n === a.n){ if(res !== "ok" && res !== "substituído por outro canal" || a.ev.some(x => /^parado/.test(x.e))){ DBG.failSample = sm; a.amostra = true; } DBG.sample[slot] = null; } }catch(e){}
    try{ if(window.__tfixLog) a.recuperacoes = window.__tfixLog().slice(-8).map(scrub); }catch(e){}
    DBG.list.push(a); if(DBG.list.length > MAX) DBG.list.splice(0, DBG.list.length - MAX); save();
    if(res === "ok") DBG.watch[slot] = {n:a.n, at:now(), t0:performance.now(), t00:Date.now(), slot, ch:a.ch, ev:[], res:"em observação"};
    if(res !== "ok" && res !== "substituído por outro canal") autoSend("falhou: " + res);
  };
  /* resultado: «ok» quando há imagem a andar; «falhou» se ao fim de 25 s não houver */
  setInterval(() => { [0, 1].forEach(slot => {
    const a = DBG.cur[slot]; if(!a) return; const v = $("vid" + slot), el = performance.now() - a.t0;
    if(!lastPlayed[slot]){ if(el > 2000) finish(slot, a.ev.some(x => x.e === "aviso") ? "falhou" : "parado"); return; }
    const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
    const svOk = !!(window.__sv && window.__sv.frames(slot) > 5);
    if((v.videoWidth > 0 || svOk) && v.currentTime > 0.5 && !v.paused && (!q || q.totalVideoFrames > 5 || svOk)){ if(!a.okAt){ a.okAt = Math.round(el); ev(slot, "a dar", svOk ? Object.assign({modo:"imagem por software"}, window.__sv.size(slot)) : {w:v.videoWidth, h:v.videoHeight}); } if(el > a.okAt + 4000) finish(slot, "ok"); }
    else if(el > 25000) finish(slot, "falhou");
  }); }, 1000);

  /* --- amostra: cópia do 1.º pedaço de vídeo de cada canal (só bytes de vídeo; sem endereço nem credenciais) ---
     Se o canal falhar, a amostra pode ser enviada para o GitHub e analisada (ffprobe) para perceber o que o Tesla rejeita. */
  DBG.sample = [null, null]; DBG.failSample = null; DBG.keep = [];   /* v219: as amostras dos últimos 3 canais (mesmo os que abriram bem) vão no envio manual do registo */
  try{ const _mcl = window.makeCapLoader; if(typeof _mcl === "function") window.makeCapLoader = function(slot){ const B = _mcl.apply(this, arguments);
      return class extends B { load(ctx, cf, cb){ try{ const a = DBG.cur[slot]; if(a && !a.__smp && on() && ctx && /frag/i.test(ctx.type || "frag")){ const os = cb.onSuccess;
          cb = Object.assign({}, cb, {onSuccess:(r, st, cx, n) => { try{ const a2 = DBG.cur[slot], d = r && r.data; if(a2 && !a2.__smp && d && (d.byteLength || 0) > 1000 && d.byteLength < 14e6){ a2.__smp = 1;
                DBG.sample[slot] = {n:a2.n, at:a2.at, name:a2.ch.name, u8:d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength))}; try{ const k = DBG.sample[slot]; DBG.keep = DBG.keep.filter(x => x.name !== k.name); DBG.keep.push(k); while(DBG.keep.length > 3) DBG.keep.shift(); }catch(e){} ev(slot, "amostra guardada", {kB:Math.round(d.byteLength / 1024)});
                /* v250: taxa real do som (cabeçalhos ADTS) e do contexto da amplificação: para perceber som «em câmara lenta» (Sport TV 1, 44,1 kHz) */
                try{ const u = DBG.sample[slot].u8, R = [96000,88200,64000,48000,44100,32000,24000,22050,16000,12000,11025,8000,7350], cnt = {}; let hits = 0;
                  for(let i = 0; i < u.length - 4 && hits < 40; i++){ if(u[i] === 0xFF && (u[i + 1] & 0xF6) === 0xF0){ const si = (u[i + 2] >> 2) & 15, ch = ((u[i + 2] & 1) << 2) | (u[i + 3] >> 6), pr = u[i + 2] >> 6; if(si < 13 && ch > 0 && ch < 8){ const k = R[si] + "|" + ch + "|" + pr; cnt[k] = (cnt[k] || 0) + 1; hits++; } } }
                  const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
                  if(best){ const [hz, ch, pr] = best[0].split("|"); const A = window.__amp, vv = document.getElementById("vid" + slot);
                    try{ window.__chanSr = window.__chanSr || [null,null]; window.__chanSr[slot] = +hz; if(vv) vv._chanSr = +hz; if(A) A.chanSr = +hz; }catch(e){}
                    ev(slot, "som do canal", {Hz:+hz, canais:+ch, perfil:["Main","LC","SSR","LTP"][+pr], amplificacao:!!(vv && vv._amp), ctxAmplificacao_Hz:A && A.ctx ? A.ctx.sampleRate : null, ctxEstado:A && A.ctx ? A.ctx.state : null}); } }catch(e){} } }catch(e){} os(r, st, cx, n); }}); } }catch(e){} return super.load(ctx, cf, cb); } }; }; }catch(e){}
  /* --- ligar aos leitores --- */
  const _pc = window.playChannel;
  window.playChannel = function(c, slot, auto){ try{ const sl = slot == null ? tvTarget : slot;
    /* v393: troca rápida de canais: só arranca a última escolha, com pelo menos 3 s desde o arranque anterior */
    const wait = 3000 - (Date.now() - (window.__lastStartAt || 0));
    if(!auto && wait > 0){ const tk = window.__pcTok = (window.__pcTok || 0) + 1; setTimeout(() => { if(tk === window.__pcTok) window.playChannel(c, slot, auto); }, wait); return; }
    if(!auto) window.__lastStartAt = Date.now();
    if(auto && DBG.cur[sl]) ev(sl, "alternativa", {para:c && c.name, url:red(c && c.url)}); else start(c, sl); }catch(e){} return _pc.apply(this, arguments); };
  const slotOf = el => el && el.id === "vid1" ? 1 : el && el.id === "vid0" ? 0 : -1;
  const wrapHls = () => {
    if(!window.Hls || window.Hls.__dbg) return;
    const H = window.Hls;
    class DH extends H {
      constructor(c){ super(c); const me = this; me.__slot = -1;
        const lv = l => ({h:l.height, w:l.width, kbps:Math.round((l.bitrate || 0) / 1000), v:l.videoCodec || "", a:l.audioCodec || "", fps:l.frameRate || (l.attrs && l.attrs["FRAME-RATE"]) || ""});
        me.on(H.Events.MANIFEST_PARSED, (e, d) => ev(me.__slot, "manifesto", {qualidades:(d.levels || []).map(lv), audio:(me.audioTracks || []).map(t => (t.lang || "") + " " + (t.audioCodec || ""))}));
        me.on(H.Events.LEVEL_SWITCHED, (e, d) => { const l = me.levels && me.levels[d.level]; ev(me.__slot, "qualidade", l ? {h:l.height, kbps:Math.round(l.bitrate / 1000)} : {}); });
        let first = true; me.on(H.Events.FRAG_LOADED, (e, d) => { if(!first) return; first = false; const s = d.frag && d.frag.stats || d.stats || {}; ev(me.__slot, "1.º pedaço", {kB:Math.round(((s.loaded || s.total || 0)) / 1024), ms:s.loading ? Math.round(s.loading.end - s.loading.start) : undefined}); });
        me.on(H.Events.BUFFER_CODECS, (e, d) => { const t = {}; try{ for(const k of Object.keys(d || {})){ const x = d[k]; if(x) t[k] = (x.codec || "") + (x.levelCodec && x.levelCodec !== x.codec ? " (lista " + x.levelCodec + ")" : "") + (x.container ? " " + x.container : "") + (x.metadata && x.metadata.width ? " " + x.metadata.width + "x" + x.metadata.height : "") + (x.metadata && x.metadata.channelCount ? " " + x.metadata.channelCount + "ch" : ""); } }catch(x){} ev(me.__slot, "codecs reais", t); });
        let firstL = true; me.on(H.Events.LEVEL_LOADED, (e, d) => { if(!firstL) return; firstL = false; const dt = d.details || {}; ev(me.__slot, "lista", {alvo:dt.targetduration, pedacos:(dt.fragments || []).length, direto:!!dt.live}); });
        let nB = 0; me.on(H.Events.FRAG_BUFFERED, (e, d) => { if(!me.__fbAt) me.__fbAt = Date.now(); if(++nB > 3) return; const f = d.frag || {}, m = me.media; ev(me.__slot, nB + ".º pedaço no buffer", {tipo:f.type, inicio:+(f.start || 0).toFixed(1), dur:+(f.duration || 0).toFixed(1), faixas:trackBuf(me), junto:m ? bufStr(m) : "", agora:m ? +m.currentTime.toFixed(1) : 0, pronto:m ? m.readyState : -1}); });
        me.on(H.Events.ERROR, (e, d) => { ev(me.__slot, "erro HLS", {tipo:d.type, det:d.details, fatal:!!d.fatal, http:d.response && d.response.code, motivo:scrub(d.reason || (d.error && d.error.message) || ""), url:red((d.frag && d.frag.url) || (d.context && d.context.url) || d.url || "")}); });
      }
      loadSource(u){ ev(this.__slot, "abrir HLS", {rota:route(u), url:red(u)}); this.__u = u; return super.loadSource(u); }
      attachMedia(m){ this.__slot = slotOf(m); if(this.__u) ev(this.__slot, "abrir HLS", {rota:route(this.__u), url:red(this.__u)}); return super.attachMedia(m); }
    }
    DH.__dbg = true; window.Hls = DH;
  };
  if(window.Hls) wrapHls(); else if(window.__hlsP) window.__hlsP.then(wrapHls);
  const wrapTs = () => {
    if(!window.mpegts || window.mpegts.__dbg) return; const M = window.mpegts, cp = M.createPlayer;
    M.createPlayer = function(ds, cf){ const p = cp.apply(this, arguments); try{ const am = p.attachMediaElement.bind(p); let slot = -1;
      p.attachMediaElement = m => { slot = slotOf(m); ev(slot, "abrir .ts", {rota:route(ds.url), url:red(ds.url)}); return am(m); };
      p.on(M.Events.ERROR, (t, d, info) => { const m = info && (info.msg || info.code) || ""; if(/458/.test(String(m))) window.__last458 = Date.now(); ev(slot, "erro .ts", {tipo:t, det:d, info:scrub(m)}); }); }catch(e){} return p; };
    M.__dbg = true;
  };
  setInterval(wrapTs, 2000);
  ["vid0", "vid1"].forEach((id, slot) => { const v = $(id); if(!v) return;
    v.addEventListener("error", () => ev(slot, "erro vídeo", {code:v.error && v.error.code, msg:scrub(v.error && v.error.message || "")}));
    ["stalled", "waiting"].forEach(n => v.addEventListener(n, () => { const a = DBG.cur[slot] || DBG.watch[slot]; if(a && a.ev.filter(x => x.e === n).length < (a.res === "em observação" ? 60 : 5)) ev(slot, n, a.res === "em observação" ? {buf:bufStr(v), agora:+v.currentTime.toFixed(1), pronto:v.readyState} : undefined); }));
    v.addEventListener("playing", () => { const w = DBG.watch[slot]; if(w && w.ev.length && /^(waiting|stalled)$/.test(w.ev[w.ev.length - 1].e)) ev(slot, "retoma", {buf:bufStr(v)}); });
  });
  setInterval(() => { [0, 1].forEach(slot => { const w = DBG.watch[slot]; if(!w) return; const v = $("vid" + slot), el = performance.now() - w.t0;
      if(el > 1200000 || !lastPlayed[slot]) return; try{ const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : {}; const h = hlsInst[slot], l = h && h.latency;
        ev(slot, "estado", {mudo:v.muted, vol:+(v.volume || 0).toFixed(2), somBytes:v.webkitAudioDecodedByteCount, andamento:(typeof drivingEff === "function" && drivingEff()), buf:bufStr(v), agora:+v.currentTime.toFixed(1), perdidos:q.droppedVideoFrames || 0, pronto:v.readyState, pausa:v.paused, atraso:l ? +l.toFixed(1) : undefined, kbps:h && h.bandwidthEstimate ? Math.round(h.bandwidthEstimate / 1000) : undefined, memJS_MB:performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : undefined, memLimite_MB:performance.memory ? Math.round(performance.memory.jsHeapSizeLimit / 1048576) : undefined, softSom:(() => { const m = window.__mka && window.__mka[slot]; if(!m) return null; const nw = performance.now(); return {pacotes:m.pk || 0, vazios:m.vazios || 0, lacing:m.laced || 0, amostraVazios:m.vzLog || null, primeiros:m.pkLog || null, nativoCalado:!!(m.el && m.el._nat), fila:m.aq ? m.aq.length : null, cabeca_menos_agora_s:m.aq && m.aq.length && m.clock ? +(m.aq[0].ts / 1e6 - m.clock.v.currentTime).toFixed(1) : null, ocupado:!!m.abusy, descodificados:m.n, haSemSaida_s:m.lastOut ? +((nw - m.lastOut) / 1000).toFixed(1) : null, erro:m.err || "", ctx:m.clock && m.clock.ctx ? m.clock.ctx.state : null}; })()}); }catch(e){} }); }, 20000);
  /* avisos de erro mostrados ao utilizador */
  try{ const t0 = window.toast; window.toast = toast = function(m, bad){ try{ if(bad){ const sl = DBG.cur[tvTarget] ? tvTarget : (DBG.cur[0] ? 0 : 1); ev(sl, "aviso", {txt:scrub(m).slice(0, 300)}); } }catch(e){} return t0.apply(this, arguments); }; }catch(e){}
  /* conta (sem credenciais): ligações em uso e estado */
  const account = async () => { try{ const a = typeof xAccount === "function" ? await xAccount() : null; return a ? {ligacoes:a.active + "/" + a.max, estado:a.status, expira:a.exp ? a.exp.toISOString().slice(0, 10) : ""} : null; }catch(e){ return null; } };

  /* --- relatório --- */
  const report = async () => {
    /* v315: o tipo vem da estimativa do browser (não é o meio: Wi-Fi ou dados); o débito medido pelos pedidos de vídeo é o que conta */
    let nc = {}; try{ const n = navigator.connection; if(n) nc = {meio:n.type || "o browser não indica", classeVelocidade:n.effectiveType, nota:"classeVelocidade é a estimativa de velocidade do browser (4g = rápida), não o meio", mbps:n.downlink, rtt:n.rtt, medido_mbps: +((+LS.get("bwEst", 0) || 0) / 1e6).toFixed(2)}; }catch(e){}
    const env = {hevcCaps:window.__hevcCaps || "por medir", lista:window.__listErr || null, versao:APP_VERSION, quando:now(), browser:navigator.userAgent, tesla:!!window.__TESLA, toque:navigator.maxTouchPoints || 0, pagina:location.protocol + "//" + location.host,
      ecra:innerWidth + "x" + innerHeight + " @" + (window.devicePixelRatio || 1), comandos:(() => { try{ return {api:!!navigator.getGamepads, seguro:!!window.isSecureContext, ligados:[...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean).map(g => g.id + " [" + g.mapping + "] b" + g.buttons.length + " e" + g.axes.length), hid:!!navigator.hid, usb:!!navigator.usb, bluetooth:!!navigator.bluetooth, visto:window.__gpSeen || null}; }catch(e){ return String(e); } })(), codecs:window.__codecs ? window.__codecs() : "", rede:nc,
      andamento:(DRIVE.state === "moving" ? "sim " + (DRIVE.why || "") : "não"), xtream:host(cfg.xs), m3u:host(cfg.m3u), guia:host(cfg.epg), proxy1:host(cfg.proxy), proxy2:host(cfg.proxy2),
      opcoes:{mp4UmSoLeitor:cfg.mseFilm !== false, qualidadeMax:cfg.maxRes || "1080", ligacaoDireta:!!cfg.directMode, modoAndamento:!!(typeof mirrorOn !== "undefined" && mirrorOn), passageiro:!!cfg.passenger, motorDescodificacao:window.__motorUsado === "h264soft" ? "software" : window.__motorUsado === "webcodecs" ? "webcodecs" : ((window.__useSoft && window.__useSoft()) ? "software (escolhido)" : "webcodecs (escolhido)"), motorEscolhido:(window.__useSoft && window.__useSoft()) ? "software" : "webcodecs", motorUsado:window.__motorUsado || "nenhum ainda"},
      conta:await account(), bw:+LS.get("bwEst", 0) || 0};
    const cur = [0, 1].map(s => DBG.cur[s]).filter(Boolean).map(a => Object.assign({}, a, {res:"a decorrer", t0:undefined})).concat([0, 1].map(s => DBG.watch[s]).filter(w => w && w.ev.length).map(w => Object.assign({}, w, {res:"em observação", t0:undefined, t00:undefined})));
    return JSON.parse(scrub(JSON.stringify({ambiente:env, tentativas:DBG.list.concat(cur)}, null, 1)));
  };
  window.__dbgReport = report;
  window.__dbgEv = ev;
  /* v208: pista para falhas da página («Ah, não! Código de erro: 9»): batimento a cada 4 s; ao abrir, se o anterior não fechou limpo, regista o último estado conhecido */
  try{ const prev = LS.get("hb", null), clean = LS.get("hbClean", true);
    if(prev && !clean && Date.now() - prev.t < 6 * 3600 * 1000) setTimeout(() => { try{ ev(0, "sessão anterior terminou sem fechar (falha da página?)", Object.assign({haSegundos:Math.round((Date.now() - prev.t) / 1000)}, prev, {t:undefined})); }catch(e){} }, 3000);
    LS.set("hbClean", false);
    const beat = () => { try{ const a = typeof lastPlayed !== "undefined" ? lastPlayed : []; const c = a[0] || a[1];
      LS.set("hb", {t:Date.now(), v:APP_VERSION, canal:c ? c.name : "", tipo:c ? c.kind : "", ext:c && c.ext || "", memJS_MB:performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        andamento:(typeof drivingEff === "function" && drivingEff()) || false, workers:(typeof MIR !== "undefined" ? MIR : []).map(m => m && m.decoder && m.decoder.W ? m.decoder.W.length : 0).join("/")}); }catch(e){} };
    setInterval(beat, 4000); beat();
    const ok = () => { try{ LS.set("hbClean", true); }catch(e){} }; window.addEventListener("pagehide", ok); window.addEventListener("beforeunload", ok);
    window.addEventListener("pageshow", () => { try{ LS.set("hbClean", false); }catch(e){} });
  }catch(e){}
  const text = r => { const L = []; (r.tentativas || []).slice().reverse().forEach(a => {
      L.push((a.res === "ok" ? "✓" : a.res === "a decorrer" ? "…" : "✗") + " " + a.at.slice(11, 19) + " " + a.ch.name + " [" + a.ch.kind + (a.ch.ext ? " ." + a.ch.ext : "") + "] " + a.res + (a.fim ? " · " + a.fim.ms + " ms · " + a.fim.w + "x" + a.fim.h : ""));
      a.ev.forEach(x => { const d = Object.assign({}, x); delete d.t; delete d.e; L.push("   " + (x.t / 1000).toFixed(1) + " s  " + x.e + " " + JSON.stringify(d).slice(0, 220)); });
    }); return L.join("\n") || "(ainda sem tentativas)"; };

  /* --- enviar para o GitHub (API REST; o token fica só neste aparelho) --- */
  let sending = false, lastAuto = 0, autoT = 0;
  const upload = async (why) => {
    const tok = LS.get("dbgTok", ""), repo = (cfg.dbgRepo || "ramarozte-sketch/cockpit-logs").trim();
    if(!tok) throw new Error("falta o token do GitHub (Definições → Diagnóstico → Registo de canais)");
    if(sending) throw new Error("já está a enviar"); sending = true;
    try{
      const r = await report(); r.motivo = why || "manual";
      const d = new Date(), pad = n => String(n).padStart(2, "0"), name = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "_" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + "_" + (window.__TESLA ? "tesla" : "browser") + ".json";
      const res = await fetch("https://api.github.com/repos/" + repo + "/contents/logs/" + name, {method:"PUT", headers:{Authorization:"Bearer " + tok, Accept:"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28"},
        body:JSON.stringify({message:"Registo de canais " + name + " (" + (why || "manual") + ")", content:b64utf8(JSON.stringify(r, null, 1))})});
      if(!res.ok){ let m = ""; try{ m = (await res.json()).message; }catch(e){} throw new Error("GitHub " + res.status + (m ? ": " + m : "") + (res.status === 404 ? " (o repositório não existe ou o token não tem acesso)" : res.status === 401 ? " (token inválido ou expirado)" : "")); }
      const sm = DBG.failSample; let extra = "";
      if(sm && sm.u8 && !sm.sent){ try{ const sn = name.replace(/\.json$/, "") + "_amostra_" + String(sm.name || "canal").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) + ".ts";
          let bin = ""; for(let i = 0; i < sm.u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, sm.u8.subarray(i, i + 0x8000));
          const r2 = await fetch("https://api.github.com/repos/" + repo + "/contents/logs/" + sn, {method:"PUT", headers:{Authorization:"Bearer " + tok, Accept:"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28"}, body:JSON.stringify({message:"Amostra de vídeo " + sn, content:btoa(bin)})});
          if(r2.ok){ sm.sent = true; extra = " + amostra de vídeo"; } }catch(e){} }
      /* envio manual: também as amostras dos últimos canais abertos (para analisar formato, entrelaçamento e ritmo com o ffprobe) */
      if(!why || why === "manual"){ let nk = 0;
        for(const k of (DBG.keep || []).slice().reverse()){ if(!k || !k.u8 || k.sent || k === sm || nk >= 3) continue;
          try{ const sn2 = name.replace(/\.json$/, "") + "_amostra_" + String(k.name || "canal").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) + ".ts";
            let bin2 = ""; for(let i = 0; i < k.u8.length; i += 0x8000) bin2 += String.fromCharCode.apply(null, k.u8.subarray(i, i + 0x8000));
            const r3 = await fetch("https://api.github.com/repos/" + repo + "/contents/logs/" + sn2, {method:"PUT", headers:{Authorization:"Bearer " + tok, Accept:"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28"}, body:JSON.stringify({message:"Amostra de vídeo " + sn2, content:btoa(bin2)})});
            if(r3.ok){ k.sent = true; nk++; } }catch(e){} }
        if(nk) extra += " + " + nk + " amostras"; }
      LS.set("dbgSent", Date.now()); return name + extra;
    } finally { sending = false; }
  };
  /* v253: ligado por omissão; espera 20 s para apanhar o que acontece a seguir; no máximo 1 a cada 2 min e 15 por dia */
  let autoWhy = "";
  const autoSend = (why) => {
    if(cfg.dbgAuto === false || !LS.get("dbgTok", "")) return;
    if(!autoWhy) autoWhy = why || "falha";
    clearTimeout(autoT); autoT = setTimeout(() => {
      const w = autoWhy; autoWhy = "";
      if(Date.now() - lastAuto < 120000) return;
      const day = new Date().toISOString().slice(0, 10), cnt = LS.get("dbgAutoDay", {}) || {}; if(cnt.d !== day){ cnt.d = day; cnt.n = 0; } if(cnt.n >= 15) return;
      cnt.n++; LS.set("dbgAutoDay", cnt); lastAuto = Date.now();
      upload("automático: " + w).then(n => toast("Problema registado e enviado para o GitHub (" + w + ").")).catch(e => console.log("dbg", e)); }, 20000);
  };

  /* --- Definições → Diagnóstico --- */
  const o = $("tsDgOut");
  if(o){
    const box = document.createElement("div"); box.id = "dbgBox";
    box.innerHTML = '<h3 style="margin:14px 0 6px">Registo de canais que não abrem</h3>' +
      '<p class="small muted" style="margin:0 0 6px">Guarda o percurso técnico de cada canal que abres (rota, qualidades, codecs, erros, recuperações). Não guarda utilizador, palavra-passe nem chaves.</p>' +
      '<label class="row small"><input type="checkbox" id="dbgOn"> Gravar o registo</label>' +
      '<div class="row" style="flex-wrap:wrap"><button class="btn" id="dbgView">Ver registo</button><button class="btn" id="dbgCopy">Copiar</button><button class="btn" id="dbgFile">Guardar ficheiro</button><button class="btn primary" id="dbgSend">Enviar para o GitHub</button><button class="btn" id="dbgClear">Apagar</button></div>' +
      '<details style="margin-top:6px"><summary class="small" style="cursor:pointer">GitHub (para enviar o registo)</summary>' +
      '<label class="f">Repositório (privado, recomendado)<input type="text" id="dbgRepo" placeholder="ramarozte-sketch/cockpit-logs" autocomplete="off"></label>' +
      '<label class="f">Token do GitHub (só fica neste aparelho)<input type="password" id="dbgTok" placeholder="github_pat_…" autocomplete="off"></label>' +
      '<label class="row small"><input type="checkbox" id="dbgAuto"> Enviar sozinho quando algo falha: canal ou filme que não abre, imagem lenta, som atrasado (no máximo 1 vez a cada 2 min e 15 por dia)</label>' +
      '<p class="small muted" style="margin:0">Cria em github.com → Settings → Developer settings → Fine-grained tokens: acesso só ao repositório dos registos, permissão «Contents: Read and write».</p></details>' +
      '<pre id="dbgOut" class="mono small" hidden style="white-space:pre-wrap;max-height:46vh;overflow:auto;user-select:text"></pre><p class="small muted" id="dbgMsg" style="margin:4px 0 0"></p>';
    o.parentNode.insertBefore(box, o.nextSibling);
    const msg = (t, bad) => { const m = $("dbgMsg"); m.textContent = t; m.style.color = bad ? "#ff8080" : ""; };
    const fill = () => { $("dbgOn").checked = on(); $("dbgRepo").value = cfg.dbgRepo || ""; $("dbgTok").value = LS.get("dbgTok", "") ? "••••••••" : ""; $("dbgAuto").checked = cfg.dbgAuto !== false;
      const s = LS.get("dbgSent", 0); msg(DBG.list.length + " tentativas guardadas" + (s ? " · último envio " + new Date(s).toLocaleString("pt-PT") : "")); };
    $("dbgOn").onchange = e => { cfg.dbgOn = e.target.checked; saveCfg(); };
    $("dbgRepo").onchange = e => { cfg.dbgRepo = e.target.value.trim(); saveCfg(); };
    $("dbgTok").onchange = e => { const v = e.target.value.trim(); if(v && !/^•+$/.test(v)){ LS.set("dbgTok", v); e.target.value = "••••••••"; msg("Token guardado neste aparelho."); } else if(!v){ LS.set("dbgTok", ""); msg("Token apagado."); } };
    $("dbgAuto").onchange = e => { cfg.dbgAuto = e.target.checked; saveCfg(); };
    $("dbgView").onclick = async () => { const out = $("dbgOut"); out.hidden = !out.hidden; if(!out.hidden) out.textContent = text(await report()); };
    $("dbgCopy").onclick = async () => { try{ await navigator.clipboard.writeText(JSON.stringify(await report(), null, 1)); msg("Copiado ✓"); }catch(e){ msg("Não consegui copiar.", true); } };
    $("dbgFile").onclick = async () => { try{ const b = new Blob([JSON.stringify(await report(), null, 1)], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "cockpit-registo-canais.json"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }catch(e){ msg("Não consegui guardar.", true); } };
    $("dbgSend").onclick = async () => { msg("A enviar…"); try{ const n = await upload("manual"); msg("Enviado ✓ logs/" + n); toast("Registo enviado para o GitHub ✓"); }catch(e){ msg(String(e.message || e), true); } };
    $("dbgClear").onclick = () => { DBG.list = []; save(); $("dbgOut").textContent = ""; msg("Registo apagado."); };
    fill();
    const _fs = window.fillSettings; if(typeof _fs === "function") window.fillSettings = function(){ const r = _fs.apply(this, arguments); try{ fill(); }catch(e){} return r; };
  }
  }catch(e){ console.log("registo de canais", e); }
})();
