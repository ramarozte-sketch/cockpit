

/* v512: Waze do telemóvel no ecrã do carro, pelo Cast que já existe (app Cockpit Cast + janela «Cast do ecrã») */
function wazeCast(){
  try{ show("desktop"); }catch(e){}
  toast("No telemóvel: abre o Waze e, na app Cockpit Cast, escreve o código que aparece no ecrã do carro.");
  setTimeout(() => { try{ dkCast(); }catch(e){ toast("Não consegui abrir o Cast: " + e.message, true); } }, 400);
}
["hWazeCast","navWazeCast"].forEach(id => { const b = document.getElementById(id); if(b) b.addEventListener("click", wazeCast); });
/* ===== Tesla: vídeo entrelaçado (1080i, ex.: Sport TV, Eurosport) por software =====
   O leitor de vídeo do Tesla (descodificação por hardware) não aceita vídeo 1080i: o som entra, a imagem nunca.
   Aqui o hls.js passa a tratar só do som (a faixa de vídeo é escondida da tabela PMT do pedaço) e a imagem é
   descodificada à parte com WebCodecs por software e desenhada num canvas, acertada pelo relógio do som.
   Desentrelaçamento (WebGL): «Bob» mostra cada campo à vez, 50 imagens/s, com interpolação linear entre linhas;
   «Linear» mistura as linhas vizinhas (25 imagens/s, sem dentes de pente); «Desligado» mostra a imagem tal como vem. */
(function(){
  /* no Tesla: 1080i e MPEG-2; nos outros browsers só o HEVC em MPEG-TS, e só se não o descodificarem */
  if(window.ANDROID || (!window.__TESLA && HEVC_OK())) return;
  try{
  /* v188: numa página em http (cockpit.page.gd) o browser esconde o WebCodecs (só existe em https). Era por isso que os
     canais 1080i (Sport TV, Benfica TV…) deixaram de dar imagem desde a mudança para o InfinityFree: o som entrava, a imagem
     nunca. Sem WebCodecs, o 1080i passa a ser descodificado pelo FFmpeg em WebAssembly (o mesmo da imagem em andamento),
     com vários Workers em paralelo e a imagem reduzida a 960×540 (o que já mistura os dois campos, sem dentes de pente). */
  const NATIVE = typeof VideoDecoder === "function" && typeof EncodedVideoChunk === "function";
  const SOFT = !NATIVE && !!window.__TESLA && typeof SoftVideoDecoder === "function" && typeof Worker === "function" && typeof WebAssembly === "object" && typeof createImageBitmap === "function";
  if(!NATIVE && !SOFT) return;
  const S = {}, firstSeq = {};
  const deint = () => cfg.deint || "bob";
  const log = (slot, t, d) => { try{ if(typeof slot === "number") window.__dbgEv && window.__dbgEv(slot, t, d); }catch(e){} };
  const crc32 = (d, a, b) => { let c = 0xffffffff; for(let i = a; i < b; i++){ c ^= d[i] << 24; for(let k = 0; k < 8; k++) c = (c & 0x80000000) ? ((c << 1) ^ 0x04c11db7) : (c << 1); c >>>= 0; } return c >>> 0; };
  const pidOf = (d, o) => ((d[o + 1] & 0x1f) << 8) | d[o + 2];
  const payStart = (d, o) => { const afc = (d[o + 3] >> 4) & 3; if(!(afc & 1)) return -1; let p = o + 4; if(afc & 2) p += 1 + d[o + 4]; return p < o + 188 ? p : -1; };
  const findPids = d => {
    let pmt = -1, vpid = -1, vtype = 0, apid = -1;
    for(let o = 0; o + 188 <= d.length && vpid < 0; o += 188){
      if(d[o] !== 0x47 || !(d[o + 1] & 0x40)) continue;
      const pid = pidOf(d, o); let p = payStart(d, o); if(p < 0) continue; p += 1 + d[p];
      if(pid === 0 && pmt < 0){ const sl = ((d[p + 1] & 0xf) << 8) | d[p + 2]; for(let i = p + 8; i < p + 3 + sl - 4; i += 4){ if((d[i] << 8) | d[i + 1]){ pmt = ((d[i + 2] & 0x1f) << 8) | d[i + 3]; break; } } }
      else if(pid === pmt){ const sl = ((d[p + 1] & 0xf) << 8) | d[p + 2], pil = ((d[p + 10] & 0xf) << 8) | d[p + 11]; for(let i = p + 12 + pil; i < p + 3 + sl - 4;){ const il = ((d[i + 3] & 0xf) << 8) | d[i + 4]; if((d[i] === 0x1b || d[i] === 0x02 || d[i] === 0x24) && vpid < 0){ vtype = d[i]; vpid = ((d[i + 1] & 0x1f) << 8) | d[i + 2]; } else if([0x0f, 0x11, 0x03, 0x04, 0x81, 0x87, 0x06].includes(d[i]) && apid < 0) apid = ((d[i + 1] & 0x1f) << 8) | d[i + 2]; i += 5 + il; } }
    }
    return {pmt, vpid, vtype, apid};
  };
  const hideVideo = (d, pmt, vpid) => {
    for(let o = 0; o + 188 <= d.length; o += 188){
      if(d[o] !== 0x47 || pidOf(d, o) !== pmt || !(d[o + 1] & 0x40)) continue;
      let p = payStart(d, o); if(p < 0) continue; p += 1 + d[p];
      const sl = ((d[p + 1] & 0xf) << 8) | d[p + 2], end = p + 3 + sl; if(end > o + 188 || d[p] !== 2) continue;
      const pil = ((d[p + 10] & 0xf) << 8) | d[p + 11];
      for(let i = p + 12 + pil; i < end - 4;){ const ep = ((d[i + 1] & 0x1f) << 8) | d[i + 2], il = ((d[i + 3] & 0xf) << 8) | d[i + 4]; if(ep === vpid && (d[i] === 0x1b || d[i] === 0x24)) d[i] = 0x80; i += 5 + il; }
      const c = crc32(d, p, end - 4); d[end - 4] = c >>> 24; d[end - 3] = (c >>> 16) & 255; d[end - 2] = (c >>> 8) & 255; d[end - 1] = c & 255;
    }
  };
  const pesList = (d, vpid, hevc) => {
    const out = []; let cur = null;
    const close = () => { if(!cur) return; let b; if(cur.parts.length === 1) b = cur.parts[0]; else { let L = 0; cur.parts.forEach(x => L += x.length); b = new Uint8Array(L); let k = 0; cur.parts.forEach(x => { b.set(x, k); k += x.length; }); }
      if(b.length > 14 && b[0] === 0 && b[1] === 0 && b[2] === 1 && (b[7] & 0x80)){ const q = b.subarray(9, 14), pts = ((q[0] >> 1) & 7) * 1073741824 + q[1] * 4194304 + (q[2] >> 1) * 32768 + q[3] * 128 + (q[4] >> 1);
        const data = b.slice(9 + b[8]); let key = false; for(let i = 0; i + 4 < Math.min(data.length, 400); i++){ if(data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1){ if(hevc){ const nt = (data[i + 3] >> 1) & 0x3f; if((nt >= 32 && nt <= 34) || (nt >= 16 && nt <= 21)){ key = true; break; } } else if((data[i + 3] & 0x1f) === 7 || data[i + 3] === 0xB3){ key = true; break; } i += 2; } }
        out.push({pts, data, key}); }
      cur = null; };
    for(let o = 0; o + 188 <= d.length; o += 188){
      if(d[o] !== 0x47 || pidOf(d, o) !== vpid) continue;
      if(d[o + 1] & 0x40){ close(); cur = {parts:[]}; }
      const p = payStart(d, o); if(cur && p >= 0) cur.parts.push(d.subarray(p, o + 188));
    }
    close(); return out;
  };
  /* 1.º PTS de uma faixa no pedaço */
  const firstPts = (d, pid) => { for(let o = 0; o + 188 <= d.length; o += 188){ if(d[o] !== 0x47 || pidOf(d, o) !== pid || !(d[o + 1] & 0x40)) continue; const p = payStart(d, o); if(p < 0 || p + 14 > o + 188) continue; if(d[p] !== 0 || d[p + 1] !== 0 || d[p + 2] !== 1 || !(d[p + 7] & 0x80)) continue; const q = p + 9; return ((d[q] >> 1) & 7) * 1073741824 + d[q + 1] * 4194304 + (d[q + 2] >> 1) * 32768 + d[q + 3] * 128 + (d[q + 4] >> 1); } return null; };
  const codecOf = data => { for(let i = 0; i + 7 < data.length; i++){ if(data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1 && (data[i + 3] & 0x1f) === 7){ const h = x => x.toString(16).padStart(2, "0"); return "avc1." + h(data[i + 4]) + h(data[i + 5]) + h(data[i + 6]); } } return "avc1.640028"; };

  /* --- desentrelaçador WebGL --- */
  const VS = "attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
  const FS = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 uv;uniform sampler2D t;uniform float H,par,mode;" +
    "vec4 row(float r){return texture2D(t,vec2(uv.x,(clamp(r,0.,H-1.)+.5)/H));}" +
    "void main(){float y=uv.y*H-.5;" +
    "if(mode<.5){float f=(y-par)/2.;float f0=floor(f);float w=f-f0;float r0=2.*f0+par;gl_FragColor=mix(row(r0),row(r0+2.),w);}" +   /* bob: só as linhas do campo, interpolação linear */
    "else if(mode<1.5){float r=floor(y+.5);gl_FragColor=row(r)*.5+row(r-1.)*.25+row(r+1.)*.25;}" +                               /* linear: mistura das linhas vizinhas */
    "else{gl_FragColor=row(floor(y+.5));}}";
  function mkGl(){
    try{
      const cv = document.createElement("canvas"), gl = cv.getContext("webgl", {premultipliedAlpha:false, preserveDrawingBuffer:true, antialias:false}); if(!gl) return null;
      const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if(!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      const bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const lp = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const U = {H:gl.getUniformLocation(pr, "H"), par:gl.getUniformLocation(pr, "par"), mode:gl.getUniformLocation(pr, "mode")};
      let lastF = null;
      return {cv, render(f, field, mode, ow, oh){
        if(cv.width !== ow || cv.height !== oh){ cv.width = ow; cv.height = oh; }
        gl.viewport(0, 0, ow, oh);
        if(lastF !== f){ gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, f); lastF = f; }
        gl.uniform1f(U.H, f.displayHeight || f.height); gl.uniform1f(U.par, field); gl.uniform1f(U.mode, mode === "bob" ? 0 : mode === "linear" ? 1 : 2);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); return cv;
      }, probe(){ const w = cv.width, h = cv.height, b = new Uint8Array(4); let t = 0; for(let i = 1; i <= 3; i++) for(let j = 1; j <= 3; j++){ gl.readPixels(Math.floor(w * i / 4), Math.floor(h * j / 4), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b); t += (b[0] + b[1] + b[2]) / 3; } return t / 9; },
      drop(){ lastF = null; }};
    }catch(e){ console.log("desentrelaçar", e); return null; }
  }

  /* key: 0/1 (ecrãs da TV) ou "prev" (pré-visualização do Início). o = {h, v, out(src, w, h), ow, oh} */
  function start(key, o){
    const st = {key, o, seq:o.seq, pend:[], frames:[], shown:null, init:null, dec:null, cfg:null, needKey:true, nf:0, errs:0, w:0, hh:0, raf:0, on:true, pids:null, gl:mkGl(), last:"", dur:40000, wasMoving:false};
    try{ st.url = typeof key === "number" && lastPlayed[key] ? lastPlayed[key].url : ""; }catch(e){}
    try{ o.h.on(Hls.Events.INIT_PTS_FOUND, (e, d) => { if(d && d.id === "main" && st.init == null && d.timescale) st.init = d.initPTS / d.timescale; }); }catch(e){}
    const mk = () => {
      try{ if(st.dec && st.dec.state !== "closed") st.dec.close(); }catch(e){}
      if(!NATIVE){ st.soft = true;
        st.dec = new SoftVideoDecoder({backlog:() => st.frames.length,
          output:f => { st.nf++; st.w = f.displayWidth; st.hh = f.displayHeight; const q = st.frames, ts = f.timestamp; let i = q.length; while(i > 0 && q[i - 1].timestamp > ts) i--;
            if(i > 0 && q[i - 1].timestamp === ts){ try{ q[i - 1].close(); }catch(e){} q[i - 1] = f; return; }   /* repetida: fica a mais recente (a do Worker seguinte, com os dois campos) */
            q.splice(i, 0, f); while(q.length > (st.bobOn ? 100 : 70)) q.pop().close(); },
          error:e => { st.errs++; log(key, "erro na imagem por software (WASM)", {msg:String(e && e.message || e).slice(0, 160)}); if(st.errs > 12){ stop(key); if(key !== "prev") toast("Este canal não deu imagem nem por software. Fica só o som.", true); } }});
        return; }
      st.dec = new VideoDecoder({output:f => { st.nf++; st.w = f.displayWidth; st.hh = f.displayHeight; st.frames.push(f); if(st.frames.length > 12) st.frames.shift().close(); },
        error:e => { st.errs++; st.needKey = true; log(key, "erro na imagem por software", {msg:String(e && e.message || e).slice(0, 160)}); if(st.errs > 6){ stop(key); if(key !== "prev") toast("Este canal não deu imagem nem por software. Fica só o som.", true); return; } setTimeout(() => { if(st.on){ mk(); if(st.cfg) try{ st.dec.configure(st.cfg); }catch(x){} } }, 300); }});
    };
    st.mpeg2 = !!o.mpeg2; st.hevc = !!o.hevc; st.prog = st.hevc;
    if(st.mpeg2){
      /* MPEG-2: nenhum browser o descodifica; usa o libav (FFmpeg em WebAssembly) */
      st.mk = () => {};
      (window.__libav ? window.__libav(st.hevc ? "hevc" : "dolby") : Promise.reject(new Error("sem libav"))).then(async L => { if(!st.on) return; st.L = L; st.ldec = await L.ff_init_decoder(st.hevc ? "hevc" : "mpeg2video"); log(key, st.hevc ? "HEVC: descodificador libav pronto" : "MPEG-2: descodificador libav pronto", {}); })
        .catch(e => { log(key, (st.hevc ? "HEVC" : "MPEG-2") + ": libav falhou", {msg:String(e.message || e)}); if(st.hevc){ hevcMark(st.url); } if(key !== "prev") toast(st.hevc ? "Este canal é HEVC e o descodificador por software não carregou." : "Este canal é MPEG-2 e o descodificador por software não carregou.", true); stop(key); });
    } else { st.mk = mk; mk(); }
    const loop = () => {
      if(!st.on) return;
      if(!o.alive()){ stop(key); return; }
      try{ pump(st); draw(st); }catch(e){}
      /* HEVC por software: se o processador não segue o ritmo do vídeo, desiste e passa a uma versão que o browser descodifique */
      try{ if(st.hevc && st.nf > 0){ const tn = performance.now();
          if(!st.g0) st.g0 = {t:tn, n:st.nf + (st.sk || 0)};
          else if(tn - st.g0.t > 5000){ const fps = (st.nf + (st.sk || 0) - st.g0.n) / ((tn - st.g0.t) / 1000), want = 1e6 / (st.pdur || st.dur || 40000);
            log(key, "HEVC por software: ritmo", {fps:+fps.toFixed(1), preciso:+want.toFixed(0), w:st.w, h:st.hh, leve:!!st.lite, saltadas:st.sk || 0});
            st.g0 = {t:tn, n:st.nf + (st.sk || 0)};
            if(fps < want * 0.85 && !st.gaveUp){ st.gaveUp = 1; hevcSlow(key, st, fps); return; } } } }catch(e){}
      try{ const tn = performance.now(); if(!st.t0) st.t0 = tn; if(st.nf < 3 && tn - (st.diagT || st.t0) > 5000){ st.diagT = tn; const v0 = o.v;
          /* v223: o fornecedor envia só vídeo, sem áudio (relógio do vídeo nunca arranca): explica em vez de ficar a preto em silêncio */
          if(st.init == null && st.nf === 0 && tn - st.t0 > 9000 && !st.noAud){ st.noAud = 1; log(key, "canal sem áudio do fornecedor: o relógio do vídeo não arranca", {pendentes:st.pend.length}); try{ if(key !== "prev") toast("Este canal está a chegar sem áudio do fornecedor e fica sem imagem. Experimenta outra versão do canal.", true); }catch(e){} }
          log(key, "imagem por software: ainda sem imagens", {imagens:st.nf, pendentes:st.pend.length, fila:st.dec ? st.dec.decodeQueueSize : -1, estado:st.dec ? st.dec.state : (st.ldec ? "libav" : "-"), init:st.init != null, chave:!st.needKey, cfg:st.cfg ? st.cfg.codec : "", agora:v0 ? +v0.currentTime.toFixed(1) : 0, primeiro:st.pend.length && st.init != null ? +(st.pend[0].pts / 90000 - (st.vOff || 0) - st.init).toFixed(1) : null, erros:st.errs}); } }catch(e){}
      st.raf = requestAnimationFrame(loop);
    };
    st.raf = requestAnimationFrame(loop);
    log(key, o.hevc ? "vídeo HEVC: imagem por software" : o.mpeg2 ? "vídeo MPEG-2: imagem por software" : "vídeo 1080i: imagem por software", {desentrelacar:st.soft ? (wantBob(st) ? "960×540 Bob (50 imagens/s)" : "960×540 (campos misturados)") : deint(), webgl:!!st.gl, motor:st.soft ? "FFmpeg/WASM (página http)" : "WebCodecs"});
    /* v248: em andamento o 1080i por software fica em 18–21 imagens/s: se o mesmo canal tiver outra versão que ainda não se saiba ser 1080i, abre-a (720p é mais fluido) */
    try{ if(!o.hevc && !o.mpeg2 && typeof key === "number") window.__i1080(key); }catch(e){}
    return st;
  }
  /* o processador não aguenta este HEVC: lembra o canal e abre outra versão, se houver */
  function hevcSlow(key, st, fps){
    const want = 1e6 / (st.pdur || st.dur || 40000); if(fps < want * 0.5) hevcMark(st.url); else hevcSess.add(st.url);
    const c = typeof key === "number" ? lastPlayed[key] : null; stop(key);
    if(key === "prev" || !c) return;
    const alt = altQuality(c, autoTried[key]) || (window.__altFor && window.__altFor(c, autoTried[key]));
    if(alt && alt.url !== c.url){ autoTried[key].add(c.url); toast(`${c.name}: este computador só faz ${fps.toFixed(0)} imagens/s em HEVC. A abrir ${alt.name}…`); playChannel(alt, key, true); }
    else toast(`${c.name}: o HEVC por software está lento neste computador (${fps.toFixed(0)} imagens/s) e não há outra versão do canal.`, true);
  }
  function stop(key){
    const st = S[key]; if(!st) return; delete S[key]; st.on = false; cancelAnimationFrame(st.raf);
    try{ st.frames.forEach(f => f.close()); if(st.shown) st.shown.close(); }catch(e){}
    try{ if(st.dec && st.dec.state !== "closed") st.dec.close(); }catch(e){}
    try{ if(st.ldec && st.L) st.L.ff_free_decoder(st.ldec[1], st.ldec[2], st.ldec[3]); }catch(e){}
    try{ st.o.end && st.o.end(); }catch(e){}
  }
  const usOf = (st, pts) => Math.round((pts / 90000 - (st.vOff || 0) - st.init) * 1e6);
  /* MPEG-2 via libav: descodifica à frente (até ~0,9 s) e converte cada imagem YUV 4:2:0 num VideoFrame */
  const toVideoFrame = (f, us) => {
    const w = f.width, h = f.height; if(!w || !h) return null;
    const cw = (w + 1) >> 1, ch = (h + 1) >> 1, out = new Uint8Array(w * h + cw * ch * 2);
    const planeRows = (pl, i, pw, ph) => {   /* aceita: lista de linhas, plano com passo (linesize) ou tudo junto com layout */
      let o = i === 0 ? 0 : i === 1 ? w * h : w * h + cw * ch;
      if(Array.isArray(pl)){ for(let y = 0; y < ph && y < pl.length; y++){ out.set(pl[y].subarray(0, pw), o); o += pw; } return; }
      const ls = (f.linesize && f.linesize[i]) || (f.layout && f.layout[i] && f.layout[i].stride) || pw, off0 = (f.layout && f.layout[i] && f.layout[i].offset) || 0;
      for(let y = 0; y < ph; y++){ out.set(pl.subarray(off0 + y * ls, off0 + y * ls + pw), o); o += pw; } };
    if(f.data instanceof Uint8Array && f.layout){ [0, 1, 2].forEach(i => planeRows(f.data, i, i ? cw : w, i ? ch : h)); }
    else if(Array.isArray(f.data)){ [0, 1, 2].forEach(i => { const pl = f.data[i]; if(pl) planeRows(pl, i, i ? cw : w, i ? ch : h); }); }
    else return null;
    let dw = w; const sar = f.sample_aspect_ratio; if(Array.isArray(sar) && sar[0] > 0 && sar[1] > 0) dw = Math.round(w * sar[0] / sar[1]); else if(w === 720 && (h === 576 || h === 480)) dw = Math.round(h * 16 / 9);
    try{ return new VideoFrame(out, {format:"I420", codedWidth:w, codedHeight:h, displayWidth:dw, displayHeight:h, timestamp:us}); }catch(e){ return null; }
  };
  /* HEVC: tipo e camada temporal da primeira fatia da imagem (Annex B) */
  const hevcInfo = d => { const n = Math.min(d.length - 5, 8192); for(let i = 0; i < n; i++){ if(d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 1){ const t = (d[i + 3] >> 1) & 0x3f; if(t < 32) return {t, tid:(d[i + 4] & 7) - 1}; i += 2; } } return null; };
  async function pumpLibav(st){
    const v = st.o.v; if(st.busy || st.init == null || !v || !st.ldec) return; st.busy = true;
    try{
      const now = v.currentTime * 1e6, p = st.pend, [, c, pkt, frame] = st.ldec;
      if(p.length && usOf(st, p[0].pts) < now - 3000000){ let k = -1; for(let i = 0; i < p.length && usOf(st, p[i].pts) <= now; i++) if(p[i].key) k = i; if(k > 0) p.splice(0, k); }
      const batch = [];
      while(p.length && batch.length < 4 && st.frames.length < 24 && usOf(st, p[0].pts) <= now + 1600000){   /* lotes pequenos e muita antecedência: absorvem as oscilações do processador */ const x = p.shift();
        /* modo leve (processador lento): não descodifica as imagens que nenhuma outra usa como referência — ritmo mais baixo mas certo, em vez de saltos */
        if(st.hevc){ const inf = hevcInfo(x.data); if(inf){ if(inf.tid > (st.maxTid || 0)) st.maxTid = inf.tid;
            if(st.lite && !x.key && inf.t < 16 && (inf.t & 1) === 0 && inf.tid >= (st.maxTid || 0) && usOf(st, x.pts) < now + 450000){   /* só quando já está atrasado em relação à imagem */ st.sk = (st.sk || 0) + 1; continue; } } }
        if(st.hevc){ const pw = st.pw || (st.pw = []); pw.push(x.pts); if(pw.length >= 24){ const q = pw.slice().sort((m, n) => m - n); let mn = 0; for(let i = 1; i < q.length; i++){ const dd = Math.round((q[i] - q[i - 1]) / 90 * 1000); if(dd >= 8000 && dd <= 90000 && (!mn || dd < mn)) mn = dd; } if(mn) st.pdur = mn; st.pw = []; } }   /* intervalo real entre imagens (50p = 20 ms), mesmo com B-frames */
        const ms = Math.round(usOf(st, x.pts) / 1000); batch.push({data:x.data, pts:ms, ptshi:0}); }
      if(batch.length){
        const t0d = performance.now(); const out = await st.L.ff_decode_multi(c, pkt, frame, batch, {ignoreErrors:true});
        /* v325 (só medição): tempo gasto a descodificar e blocos processados, para comparar com o tempo real do som */
        window.__dolDec = {ms:(window.__dolDec ? window.__dolDec.ms : 0) + (performance.now() - t0d), n:(window.__dolDec ? window.__dolDec.n : 0) + batch.length};
        const nowU = v.currentTime * 1e6;
        for(const f of out){ if(f.format != null && f.format !== 0){ st.errs++; continue; } const vf = toVideoFrame(f, (f.pts != null ? f.pts : 0) * 1000);
          if(vf && st.hevc){ const tn = performance.now(); if(!st.lw0) st.lw0 = tn;
            if(tn - st.lw0 > 4000){ /* os primeiros segundos chegam sempre atrasados (arranque): só conta depois */
              const w = st.lw || (st.lw = {t:tn, n:0, late:0}); w.n++; if(nowU - vf.timestamp > 120000) w.late++;
              if(tn - w.t > 2000){ const bad = w.n >= 10 && w.late / w.n > .25; st.lbad = bad ? (st.lbad || 0) + 1 : 0; if(bad && !st.lite) log(st.key, "HEVC por software: atrasado", {atrasadas:w.late, de:w.n});
                if(!st.lite && st.lbad >= 2){ st.lite = true; log(st.key, "HEVC por software: modo leve", {atrasadas:w.late, de:w.n}); try{ toast("HEVC por software a custo: a saltar imagens não essenciais para ficar fluido."); }catch(e){} } st.lw = null; } } }
          if(vf){ st.nf++; st.w = vf.displayWidth; st.hh = vf.displayHeight; st.frames.push(vf); if(st.frames.length > 40) st.frames.shift().close(); } }
      }
    }catch(e){ st.errs++; log(st.key, "MPEG-2: erro", {msg:String(e.message || e).slice(0, 120)}); }
    st.busy = false;
  }
  /* Bob por software: só com «Bob» escolhido, imagem entrelaçada de 1080 e carro parado (em andamento poupa o processador) */
  const wantBob = st => { try{ if(st.noBob || st.prog || cfg.bobSw !== true || deint() !== "bob") return false; return DRIVE.state !== "moving"; }catch(e){ return !st.noBob; } };
  function pump(st){
    if(st.mpeg2){ pumpLibav(st); return; }
    const v = st.o.v; if(st.init == null || !v) return;
    const now = v.currentTime * 1e6, p = st.pend;
    if(st.soft){
      if(!st.cfg){ if(!p.some(x => x.key)) return; st.cfg = {codec:codecOf(p.find(x => x.key).data), autoShift:true, bob:wantBob(st)}; try{ st.dec.configure(st.cfg); }catch(e){ log(st.key, "imagem por software (WASM): configurar falhou", {msg:String(e.message || e).slice(0, 160)}); stop(st.key); return; }
        log(st.key, "imagem por software: configurar", {codec:st.cfg.codec, motor:"FFmpeg/WASM", workers:st.dec.nW}); }
      while(p.length){ const c = p.shift(); if(st.needKey && !c.key) continue; st.needKey = false;
        try{ st.dec.decode({type:c.key ? "key" : "delta", timestamp:usOf(st, c.pts), data:c.data}); }catch(e){} }
      try{ const wb = wantBob(st); if(st.bobOn !== wb){ st.bobOn = wb; st.dec.setBob(wb); log(st.key, wb ? "1080i por software: Bob (50 imagens/s)" : "1080i por software: 25 imagens/s", {}); } }catch(e){}
      /* v230: Bob na placa gráfica: com a cor na GPU a funcionar, o worker entrega a imagem inteira e o desentrelaçador WebGL da página faz o Bob (nítido e 50 imagens/s, também em andamento) */
      try{ const gb = !st.noGb && !st.prog && !wantBob(st) && deint() === "bob" && LS.get("gpuColor", "0") === "1" && !window.__gpuBad && /gpu:on/.test(window.__gpuMsg || "");
        if(!!st.gb !== gb){ st.gb = gb; st.dec.setFull(gb); log(st.key, gb ? "1080i: Bob na placa gráfica (imagem inteira, 50 imagens/s)" : "1080i: volta a 960×540 (campos misturados)", {}); } }catch(e){}
      try{ st.dec.pump(now); }catch(e){}
      /* medição a cada 10 s: imagens/s mostradas e atraso face ao som */
      const tn = performance.now(); if(!st.mT) st.mT = {t:tn, n:st.nf};
      else if(tn - st.mT.t > 10000){ log(st.key, "1080i por software: ritmo", Object.assign({fps:+((st.nf - st.mT.n) / ((tn - st.mT.t) / 1000)).toFixed(1), fila:st.frames.length, desvio_ms:st.shown ? Math.round((st.shown.timestamp - now) / 1000) : null}, (() => { try{ return st.dec.info(); }catch(e){ return {}; } })())); 
        /* Bob pesado: se o processador do carro não chega perto das 50 imagens/s em duas medições seguidas, volta aos 25/s neste canal */
        try{ const fpsB = (st.nf - st.mT.n) / ((tn - st.mT.t) / 1000); if(st.bobOn && st.nf > 0){ st.bobSlow = fpsB < 38 ? (st.bobSlow || 0) + 1 : 0; if(st.bobSlow >= 2){ st.noBob = true; log(st.key, "1080i por software: Bob pesado, volta a 25 imagens/s", {fps:+fpsB.toFixed(1)}); } } }catch(e){}
        try{ const fpsG = (st.nf - st.mT.n) / ((tn - st.mT.t) / 1000); if(st.gb && st.nf > 0){ st.gbSlow = fpsG < (st.gbLin ? 18 : 20) ? (st.gbSlow || 0) + 1 : 0;
          /* 1.º passo: Bob → Linear na placa gráfica (imagem inteira, 25 imagens/s, gasta menos); 2.º passo: volta ao 960×540 */
          if(st.gbSlow >= 2){ st.gbSlow = 0; if(!st.gbLin){ st.gbLin = 1; log(st.key, "1080i: Bob na placa gráfica pesado, passa a Linear (imagem inteira, 25 imagens/s)", {fps:+fpsG.toFixed(1)}); } else { st.noGb = true; log(st.key, "1080i: placa gráfica não chega ao ritmo, volta a 960×540", {fps:+fpsG.toFixed(1)}); } } } }catch(e){}
        st.mT = {t:tn, n:st.nf}; }
      return;
    }
    if(!st.cfg){ const k = p.find(x => x.key); if(!k){ if(!st.noKeyLog && p.length > 60){ st.noKeyLog = 1; log(st.key, "imagem por software: sem imagem-chave", {pedacos:p.length}); } return; }
      st.cfg = {codec:codecOf(k.data), hardwareAcceleration:"prefer-software", optimizeForLatency:true};
      VideoDecoder.isConfigSupported(st.cfg).then(r => log(st.key, "imagem por software: configurar", {codec:st.cfg && st.cfg.codec, suportado:!!(r && r.supported)})).catch(() => {});
      try{ st.dec.configure(st.cfg); }catch(e){ log(st.key, "imagem por software: configurar falhou", {codec:st.cfg.codec, msg:String(e.message || e).slice(0, 160)}); st.cfg = null; stop(st.key); return; } }
    if(st.dec.state === "closed"){ st.mk(); try{ st.dec.configure(st.cfg); }catch(e){} st.needKey = true; }
    if(st.dec.state !== "configured") return;
    if(p.length && usOf(st, p[0].pts) < now - 2000000){ let k = -1; for(let i = 0; i < p.length && usOf(st, p[i].pts) <= now; i++) if(p[i].key) k = i; if(k > 0){ p.splice(0, k); try{ st.dec.reset(); st.dec.configure(st.cfg); }catch(e){} st.needKey = true; } }
    let n = 0;
    while(p.length && st.dec.decodeQueueSize < 6 && st.frames.length < 8 && n < 12){
      const c = p[0]; if(!st.needKey && usOf(st, c.pts) > now + 900000) break;
      p.shift(); n++;
      if(st.needKey && !c.key) continue;
      try{ st.dec.decode(new EncodedVideoChunk({type:st.needKey ? "key" : "delta", timestamp:usOf(st, c.pts), data:c.data})); st.needKey = false; }catch(e){ st.needKey = true; }
    }
  }
  function draw(st){
    const v = st.o.v; if(!v) return;
    const now = v.currentTime * 1e6 + 10000; let pick = -1;
    st.frames.sort((a, b) => a.timestamp - b.timestamp);
    for(let i = 0; i < st.frames.length; i++) if(st.frames[i].timestamp <= now) pick = i;
    if(pick >= 0){
      const f = st.frames[pick], old = st.frames.splice(0, pick + 1); old.pop(); old.forEach(x => x.close());
      if(st.shown){ const d = f.timestamp - st.shown.timestamp; if(d > 15000 && d < 90000) st.dur = d; st.shown.close(); }
      st.shown = f; if(st.gl) st.gl.drop();
    }
    const f = st.shown; if(!f) return;
    /* por software: o 1080i sai a 960×540 (os campos já vêm misturados); o SD (576i) sai inteiro e é desentrelaçado aqui */
    let mode = st.prog || (st.soft && (f.displayHeight || 0) <= 544 && (f.displayWidth || 0) >= 900) ? "off" : deint();
    /* em andamento: Linear (25 imagens/s) em vez de Bob, para poupar o processador do carro; volta ao Bob parado */
    const moving = (() => { try{ return DRIVE.state === "moving"; }catch(e){ return false; } })();
    if(mode === "bob" && (st.slow || st.gbLin || (moving && !st.gb))) mode = "linear";   /* v233: sem Bob na GPU (ou com a GPU apertada) o Linear dá 25 imagens/s nítidas */
    if(moving !== st.wasMoving){ st.wasMoving = moving; if(deint() === "bob") log(st.key, moving ? "em andamento: Bob → Linear" : "parado: volta ao Bob", {}); }
    /* Bob: 1.º campo (linhas de cima) na primeira metade da imagem, 2.º campo na segunda → 50 imagens/s */
    const field = mode === "bob" && now - f.timestamp >= st.dur / 2 ? 1 : 0;
    const tag = f.timestamp + ":" + field + ":" + mode; if(tag === st.last) return; st.last = tag;
    let src = f;
    const t0 = performance.now();
    if(f.bmp) src = f.bmp;
    if(st.gl && mode !== "off"){ try{ const dm = st.o.dims ? st.o.dims(f) : [f.displayWidth, f.displayHeight]; src = st.gl.render(src, field, mode, dm[0], dm[1]);
        /* v227: cor na placa gráfica ligada: de vez em quando confirma que o ecrã não ficou preto com a imagem a chegar clara; se ficar, desliga a GPU e volta à conversão no processador */
        if(f.lum > 40 && !((st.nChk = (st.nChk || 0) + 1) % 30)){ const pl = st.gl.probe(); if(pl < 6){ st.blk = (st.blk || 0) + 1; if(st.blk >= 2 && !window.__gpuBad){ window.__gpuBad = 1; window.__gpuMsg = "desligada: ecrã preto"; log(st.key, "ecrã preto com a cor na placa gráfica: volta à conversão no processador", {lum:+f.lum.toFixed(0), ecra:+pl.toFixed(1)}); try{ for(const W of st.dec.W) W.w.postMessage({cmd:"gpu", on:false}); }catch(x){} } } else st.blk = 0; }
      }catch(e){ src = f.bmp || f; } }
    st.o.out(src, f.displayWidth, f.displayHeight);
    /* se o processador não aguenta 50 imagens/s, passa sozinho para «Linear» (25/s) neste canal */
    if(mode === "bob"){ const dt = performance.now() - t0; st.avg = st.avg == null ? dt : st.avg * 0.95 + dt * 0.05; st.nr = (st.nr || 0) + 1;
      if(st.nr > 60 && st.avg > 14 && !st.slow){ st.slow = true; log(st.key, "desentrelaçar: Bob pesado, passa a Linear", {ms:+st.avg.toFixed(1)}); } }
  }
  const hookCore = (key, u, r, mk) => {
    if(window.__svOff) return;
    let st = S[key];
    const seq = mk.seq(), first = firstSeq[key] !== seq; firstSeq[key] = seq;
    if(st && st.seq !== seq){ stop(key); st = null; }
    if(!st){
      if(!first) return;
      const pp = findPids(u), mp2 = pp.vtype === 0x02, hv = pp.vtype === 0x24 && !HEVC_OK() && window.__hevcSw !== false;   /* HEVC em MPEG-TS só por software, e só em browsers sem HEVC */
      if(!window.__TESLA && !hv) return;
      if(!mp2 && !hv && !(r && r.interlaced)) return;
      if(!NATIVE && (mp2 || hv)) return;   /* MPEG-2/HEVC por software precisam de VideoFrame (só em https) */
      const o = mk.make(); if(!o) return; o.seq = seq; o.mpeg2 = mp2 || hv; o.hevc = hv; st = S[key] = start(key, o); st.pids = pp;
      /* alguns canais (ex.: Sport TV 2) trazem o vídeo com relógio (PTS) desfasado do som em dezenas de segundos:
         alinha pelo que chega junto no mesmo pedaço */
      try{ const vp = firstPts(u, pp.vpid), ap = pp.apid >= 0 ? firstPts(u, pp.apid) : null; if(vp != null && ap != null){ const df = (vp - ap) / 90000; st.vOff = Math.abs(df) > 3 ? df : 0; if(st.vOff) log(key, "imagem por software: relógio do vídeo desfasado do som", {segundos:+df.toFixed(2)}); } }catch(e){}
    }
    if(!st.pids || st.pids.vpid < 0) st.pids = findPids(u);
    if(st.pids.vpid < 0) return;
    for(const x of pesList(u, st.pids.vpid, st.hevc)) st.pend.push(x);
    if(st.pend.length > 3000) st.pend.splice(0, st.pend.length - 3000);
    if(!st.mpeg2 || st.hevc) hideVideo(u, st.pids.pmt, st.pids.vpid);
  };
  window.__sv = {
    /* ecrãs da TV (chamado pelo carregador de pedaços do leitor principal) */
    hook(slot, u, r){
      hookCore(slot, u, r, {seq:() => playSeq[slot], make:() => {
        const h = hlsInst[slot]; if(!h) return null;
        const dims = f => { const box = slotBox(slot), dpr = Math.min(window.devicePixelRatio || 1, 2); let w = Math.max(320, Math.min(f.displayWidth, Math.round((box.clientWidth || 960) * dpr))); try{ if(DRIVE.state === "moving") w = Math.min(w, 1280); }catch(e){}   /* em andamento: imagem até 1280 de largura, menos trabalho para o processador */
          return [w, Math.round(w * f.displayHeight / f.displayWidth)]; };
        return {h, v:$("vid" + slot), dims, alive:() => S[slot] && S[slot].seq === playSeq[slot] && hlsInst[slot] === h,
          out:(src, w, hh) => { const box = slotBox(slot); if(!box.classList.contains("mirroring")) box.classList.add("mirroring"); mirDraw(slot, src, w, hh); window.__svLast = window.__svLast || {}; window.__svLast[slot] = src; },
          end:() => { try{ if(!(typeof mirrorOn !== "undefined" && mirrorOn)) slotBox(slot).classList.remove("mirroring"); }catch(e){} }};
      }});
    },
    /* pré-visualização do Início */
    hookPrev(P, u, r){
      hookCore("prev", u, r, {seq:() => P.seqN || 0, make:() => {
        if(!P.h || !P.v) return null; const h = P.h, a = P.v.parentElement;
        const cv = document.createElement("canvas"); cv.className = "ahPrev on"; cv.width = 480; cv.height = 270; a.appendChild(cv); const g = cv.getContext("2d");
        return {h, v:P.v, dims:() => [960, 540], alive:() => P.h === h && cv.isConnected,
          out:src => { try{ g.drawImage(src, 0, 0, 480, 270); a.classList.add("prev"); }catch(e){} },
          end:() => { try{ cv.remove(); }catch(e){} }};
      }});
    },
    on: k => !!S[k],
    frames: k => S[k] ? S[k].nf : 0,
    size: k => S[k] ? {w:S[k].w, h:S[k].hh} : {},
    /* última imagem desenhada (para a pré-visualização copiar sem abrir outra ligação) */
    last: k => S[k] && S[k].gl && S[k].shown ? S[k].gl.cv : (S[k] && S[k].shown) || null,
    stop
  };
  /* Definições → TV: modo de desentrelaçar */
/* ===== Sonda: este dispositivo descodifica E-AC3/AC-3 por hardware? =====
   MediaSource.isTypeSupported("ec-3") só devolve true se o Chromium tiver um descodificador
   registado no sistema (TVs Android e telemóveis com Dolby licenciado). WebCodecs e
   mediaCapabilities confirmam o mesmo e dizem se é "powerEfficient" (hardware).
   Resultado guardado na sessão — não muda enquanto a app estiver aberta. */
const HW = { done:false, ac3:false, eac3:false, efficient:false, why:"" };
async function probeHardwareEac3(){
  if(HW.done) return HW;
  const sup = t => { try{ return !!(window.MediaSource && MediaSource.isTypeSupported(t)); }catch(e){ return false; } };
  HW.ac3  = sup('audio/mp4; codecs="ac-3"');
  HW.eac3 = sup('audio/mp4; codecs="ec-3"');
  try{
    if(window.AudioDecoder && AudioDecoder.isConfigSupported){
      const r = await AudioDecoder.isConfigSupported({ codec:"ec-3", sampleRate:48000, numberOfChannels:6, bitrate:384000 });
      if(r && r.supported){ HW.eac3 = true; HW.efficient = true; }
    }
  }catch(e){}
  try{
    if(navigator.mediaCapabilities && navigator.mediaCapabilities.decodingInfo){
      const r = await navigator.mediaCapabilities.decodingInfo({ type:"file", audio:{ contentType:'audio/mp4; codecs="ec-3"', channels:"6", samplerate:48000, bitrate:384000 } });
      if(r && r.supported){ HW.eac3 = true; if(r.powerEfficient) HW.efficient = true; }
    }
  }catch(e){}
  HW.done = true;
  HW.why = !HW.eac3 ? "sem descodificador E-AC3 no sistema"
        : HW.efficient ? "descodificador de hardware"
        : "descodificador presente (software ou não confirmado)";
  try{ window.__dbgEv && window.__dbgEv(0, "sonda E-AC3", { ac3:HW.ac3, eac3:HW.eac3, eficiente:HW.efficient, motivo:HW.why }); }catch(e){}
  return HW;
}
/* modo: "auto" (hardware se existir), "hw" (forçar), "sw" (libav/WASM) */
function eac3Mode(){
  const m = cfg.eac3Mode || "auto";
  if(m === "sw") return "sw";
  /* v442: a escolha «sempre por hardware» saiu (no Tesla não há Dolby por hardware e ficava sem som); um valor antigo «hw» vale como automático */
  return HW.eac3 ? "hw" : "sw";
}
probeHardwareEac3();
/* v200: estes nomes são usados noutros blocos da página (escolha da faixa de som e som Dolby): ficam globais */
try{ window.HW = HW; window.eac3Mode = eac3Mode; window.probeHardwareEac3 = probeHardwareEac3; }catch(e){}
  setTimeout(() => { try{
    if(!window.__TESLA) return;
    const card = [...document.querySelectorAll("#v-settings .setcard")].find(e => ((t => t === "Reprodução" || t === "TV e IPTV")(((e.querySelector("h2") || {}).textContent || "").trim()))); if(!card) return;
    const l = document.createElement("label"); l.className = "f";
    l.innerHTML = 'Canais em 1080i no Tesla (Sport TV, Eurosport…): desentrelaçar<select id="setDeint"><option value="bob">Bob — mais fluido (50 imagens/s; em andamento passa a Linear)</option><option value="linear">Linear — mistura as linhas (25 imagens/s, gasta menos)</option><option value="off">Desligado (imagem tal como vem)</option></select>';
    const l2 = document.createElement("label"); l2.className = "f";
    l2.innerHTML = 'Bob por software no 1080i (50 imagens/s, página http; experimental, pesa no processador do carro)<select id="setBobSw"><option value="off">Desligado (25 imagens/s, mais estável)</option><option value="on">Ligado (só com o carro parado)</option></select>';
    card.appendChild(l2); const sb = $("setBobSw"); sb.value = cfg.bobSw === true ? "on" : "off"; sb.onchange = () => { cfg.bobSw = sb.value === "on"; saveCfg(); toast("Bob por software: " + (cfg.bobSw ? "ligado (vale no próximo canal)" : "desligado")); };
    const l3 = document.createElement("label"); l3.className = "f";
    l3.innerHTML = 'Cor do vídeo por software na placa gráfica (página http; experimental, poupa processador se a placa do carro ajudar)<select id="setGpuC"><option value="0">Desligado (conversão no processador)</option><option value="1">Ligado (vale no próximo canal)</option></select>';
    card.appendChild(l3); const sg = $("setGpuC"); sg.value = LS.get("gpuColor", "0") === "1" ? "1" : "0"; sg.onchange = () => { LS.set("gpuColor", sg.value); toast("Cor na placa gráfica: " + (sg.value === "1" ? "ligada (vale no próximo canal)" : "desligada")); };
    card.appendChild(l); const sel = $("setDeint"); sel.value = deint(); sel.onchange = () => { cfg.deint = sel.value; saveCfg(); toast("Desentrelaçar: " + sel.options[sel.selectedIndex].text.split(" —")[0]); };
  }catch(e){} }, 0);
  }catch(e){ console.log("vídeo por software", e); }
})();
