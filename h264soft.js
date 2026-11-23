/* Descodificador H.264 (FFmpeg 6.1, só h264) compilado para WebAssembly com SIMD (v222): módulo + interface igual à anterior */
let H264_MOD = null;
function h264Module(){
  if(!H264_MOD){
    const url = new URL("h264soft.wasm" + ((self.location && self.location.search) || ""), (self.location && self.location.href) || "http://localhost/").href;
    H264_MOD = (async () => {
      if(WebAssembly.compileStreaming){ try{ return await WebAssembly.compileStreaming(fetch(url)); }catch(e){} }
      const r = await fetch(url); if(!r.ok) throw new Error("h264soft.wasm " + r.status);
      return await WebAssembly.compile(await r.arrayBuffer());
    })();
    H264_MOD.catch(() => { H264_MOD = null; });
  }
  return H264_MOD;
}
async function H264Mod(binArg){
  const bin = binArg || null;
  let mem = null, v8 = null;
  const heap = () => { if(!v8 || v8.buffer !== mem.buffer) v8 = new Uint8Array(mem.buffer); return v8; };
  const dv = () => new DataView(mem.buffer);
  const wasi = {
    environ_get: () => 0, environ_sizes_get: (a, b) => { const d = dv(); d.setUint32(a, 0, true); d.setUint32(b, 0, true); return 0; },
    clock_time_get: (id, prec, out) => { dv().setBigUint64(out, BigInt(Math.round(performance.now() * 1e6)), true); return 0; },
    fd_close: () => 0, fd_fdstat_get: () => 8, fd_fdstat_set_flags: () => 8, fd_prestat_get: () => 8, fd_prestat_dir_name: () => 8,
    fd_read: (fd, iov, n, out) => { dv().setUint32(out, 0, true); return 0; },
    fd_seek: () => 70, path_open: () => 44,
    fd_write: (fd, iov, n, out) => { const d = dv(); let t = 0; for(let i = 0; i < n; i++){ const p = d.getUint32(iov + i * 8, true), l = d.getUint32(iov + i * 8 + 4, true); t += l; if(l && l < 400){ try{ __ffwarn(heap().subarray(p, p + l)); }catch(x){} } } d.setUint32(out, t, true); return 0; },
    proc_exit: c => { throw new Error("exit " + c); }
  };
  /* v592: o H.264 vem de h264soft.wasm (antes vinha embutido em base64, 2,1 MB a descodificar e compilar de raiz em cada arranque).
     compileStreaming compila enquanto descarrega e deixa o browser guardar o código compilado em cache; se o alojamento não servir application/wasm, compila a partir dos bytes. */
  const imports = {wasi_snapshot_preview1: wasi};
  const instance = bin ? (await WebAssembly.instantiate(bin, imports)).instance : await WebAssembly.instantiate(await h264Module(), imports);
  const x = instance.exports; mem = x.memory;
  const M = {_malloc: x.dec_alloc, _free: x.dec_release, _dec_open: binArg && x.dec_open_codec ? (p, n) => x.dec_open_codec(p, n, 1) : x.dec_open, _dec_close: x.dec_close, _dec_flush: x.dec_flush, _dec_send: x.dec_send, _dec_receive: x.dec_receive,
    _dec_w: x.dec_w, _dec_h: x.dec_h, _dec_rgba: x.dec_rgba, _dec_pts: x.dec_pts, _dec_set_matrix: x.dec_set_matrix,
    _rx: x.dec_receive_yuv, _py: x.dec_py, _pu: x.dec_pu, _pv: x.dec_pv, _ys: x.dec_ys, _us: x.dec_us, _vs: x.dec_vs, _cw: x.dec_cw, _ch: x.dec_ch, _full: x.dec_full, _mid: x.dec_matrix_id, _rel: x.dec_release_held, _conv: x.dec_convert_held, _skip: x.dec_skiploop};
  Object.defineProperty(M, "HEAPU8", {get: heap});
  return M;
}

/* Descodificador H.264 por software (FFmpeg/WASM) para quando o browser não tem WebCodecs (ex.: página em http).
   v176: as mensagens são tratadas por ordem (fila), a conversão para ImageBitmap não pára a descodificação,
   e "drain" despeja as imagens que o FFmpeg retém no fim de um GOP (NAL de fim de sequência), para vários
   Workers poderem descodificar GOPs diferentes em paralelo. */
/* v484: mensagens do FFmpeg (stderr): referências em falta («Could not find ref») dão os quadrados cinzentos; vão para o registo da página (no máximo 1 a cada 2 s) */
let ffN = 0, ffAt = 0, ffTs = 0;
function __ffwarn(u8){
  let s = ""; for(let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  if(!/could not find ref|missing|error|invalid|corrupt/i.test(s)) return;
  ffN++; const now = Date.now(); if(now - ffAt < 2000) return; ffAt = now;
  try{ postMessage({type: "warn", msg: s.trim().slice(0, 120), n: ffN, ts: ffTs, ep}); }catch(x){} ffN = 0;
}
let M = null, M264 = null, MH = null, hevc = false, shift = 0, bob = false, half = 20000, prevTs = null, ready = null, chain = Promise.resolve(), extra = null, opened = false, ep = 0, autoS = -1, useGpu = false, fastOn = false, xts = null;   /* xts: ts da imagem «extra» (a chave do GOP seguinte, enviada só para soltar a última do GOP): a sua própria imagem não se emite, o GOP seguinte já a emite */
function open(){
  let p = 0, n = 0;
  if(extra && extra.byteLength){ n = extra.byteLength; p = M._malloc(n); M.HEAPU8.set(extra, p); }
  if(opened){ try{ M._dec_close(); }catch(x){} }
  const r = M._dec_open(p, n); if(p) M._free(p); opened = r === 0;
  if(opened){ M._dec_set_matrix(hevc ? -1 : 0); if(fastOn) M._skip(1); }   /* H.265: matriz automática (BT.709 em HD) */   /* BT.601 (como o descodificador anterior): as cores ficam iguais */
  return r;
}
function load(){
  if(!ready) ready = new Promise(res => { H264Mod().then(m => { M = M264 = m; res(); }); });
  return ready;
}
/* v222: conversão YUV -> RGB na placa gráfica (WebGL2 num OffscreenCanvas). Tem auto-teste e cai para a conversão em C se algo falhar. */
let G = null, gErr = "";
function gpuState(){ if(G === null) gpuInit(); return G ? "on" : "off(" + gErr + ")"; }
function gpuInit(){
  G = false;
  try{
    if(typeof OffscreenCanvas === "undefined"){ gErr = "sem OffscreenCanvas"; return; }
    const cv = new OffscreenCanvas(16, 16);
    const gl = cv.getContext("webgl2", {alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance"});
    if(!gl){ gErr = "sem webgl2"; return; }
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if(!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, "#version 300 es\nout vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=vec2(p.x,1.0-p.y);gl_Position=vec4(p*2.0-1.0,0.0,1.0);}"));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, "#version 300 es\nprecision highp float;in vec2 uv;out vec4 o;uniform sampler2D ty,tu,tv;uniform vec4 k;uniform vec2 yc;\n" +
      "void main(){float y=(texture(ty,uv).r-yc.x)*yc.y;float u=(texture(tu,uv).r-0.50196)*k.w;float v=(texture(tv,uv).r-0.50196)*k.w;\n" +
      "o=vec4(clamp(vec3(y+k.x*v,y-k.y*u-k.z*v,y+(k.x>1.5?1.8556:1.772)*u),0.0,1.0),1.0);}"));
    gl.linkProgram(pr); if(!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const tex = [];
    for(let i = 0; i < 3; i++){
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      tex.push({t, w: 0, h: 0});
    }
    gl.uniform1i(gl.getUniformLocation(pr, "ty"), 0); gl.uniform1i(gl.getUniformLocation(pr, "tu"), 1); gl.uniform1i(gl.getUniformLocation(pr, "tv"), 2);
    G = {cv, gl, tex, uk: gl.getUniformLocation(pr, "k"), uy: gl.getUniformLocation(pr, "yc"), W: 0, H: 0};
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    /* auto-teste: 8x4, Y=180 U=100 V=160 (limitado, BT.601) -> RGB esperado ~ (221,120,124)... comparado com a conversão de referência abaixo */
    const y = new Uint8Array(32).fill(180), u = new Uint8Array(8).fill(100), v = new Uint8Array(8).fill(160);
    const ok = gpuDraw(8, 4, y, 8, u, 4, v, 4, 4, 2, 0, false, 0);
    const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const yy = (180 - 16) * 1.164383, er = yy + 1.402 * (160 - 128) * 1.138393, eg = yy - 0.344136 * (100 - 128) * 1.138393 - 0.714136 * (160 - 128) * 1.138393, eb = yy + 1.772 * (100 - 128) * 1.138393;
    if(!ok || Math.abs(px[0] - er) > 3 || Math.abs(px[1] - eg) > 3 || Math.abs(px[2] - eb) > 3){ gErr = "auto-teste " + px.join(",") + " vs " + [er, eg, eb].map(Math.round).join(","); G = false; return; }
  }catch(e){ G = false; gErr = String(e && e.message || e).slice(0, 80); }
}
/* desenha um quadro YUV 4:2:0 (arrays com a linha de passo indicada) para o canvas, a metade do tamanho se s = 1 */
function gpuDraw(w, h, Y, ys, U, us, V, vs, cw, ch, s, full, mid){
  const gl = G.gl, ow = (w >> s) & ~1, oh = (h >> s) & ~1;
  if(G.W !== ow || G.H !== oh){ G.cv.width = ow; G.cv.height = oh; G.W = ow; G.H = oh; }
  gl.viewport(0, 0, ow, oh);
  const pl = [[Y, ys, w, h], [U, us, cw, ch], [V, vs, cw, ch]];
  for(let i = 0; i < 3; i++){
    const [d, st, tw, th] = pl[i], T = G.tex[i];
    gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, T.t);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, st);
    if(T.w !== tw || T.h !== th){ gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, tw, th, 0, gl.RED, gl.UNSIGNED_BYTE, d); T.w = tw; T.h = th; }
    else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, tw, th, gl.RED, gl.UNSIGNED_BYTE, d);
  }
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
  const sc = full ? 1 : 255 / 224;
  if(mid === 1) gl.uniform4f(G.uk, 1.5748, 0.187324, 0.468124, sc); else gl.uniform4f(G.uk, 1.402, 0.344136, 0.714136, sc);
  if(full) gl.uniform2f(G.uy, 0, 1); else gl.uniform2f(G.uy, 16 / 255, 255 / 219);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return true;
}
/* v478: HEVC de 10 bits (filmes 4K/HDR): o FFmpeg descodifica, mas a conversão em C só aceita 8 bits e a imagem perdia-se.
   Converte aqui: 10 bits -> RGBA 8 bits (meia resolução com shift), BT.709 ou BT.2020; HDR10 (PQ) com mapeamento de tons para SDR. */
let hdrPQ = false, c10buf = null, C10T = null, c10s = 0;   /* c10s: redução extra pedida pela página quando o ritmo não chega (2 = 1/4) */
function c10Tables(){
  if(C10T) return C10T;
  const m1 = 0.1593017578125, m2 = 78.84375, c1 = 0.8359375, c2 = 18.8515625, c3 = 18.6875, pq = new Float32Array(1024), gm = new Uint8Array(4096);
  for(let i = 0; i < 1024; i++){ const e = Math.pow(i / 1023, 1 / m2); pq[i] = Math.pow(Math.max(e - c1, 0) / (c2 - c3 * e), 1 / m1) * 10000 / 100 * 0.6; }
  /* tabela única: mapeamento de tons (curva ACES) + gama sRGB, indexada pela raiz quadrada do valor linear (precisão nas sombras) */
  for(let i = 0; i < 4096; i++){ const x = (i / 1440) * (i / 1440), t = x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14), v = Math.min(1, Math.max(0, t)); gm[i] = Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); }
  return C10T = {pq, gm};
}
function seiHdr(u){
  for(let i = 0; i + 6 < u.length; i++){
    if(u[i] === 0 && u[i + 1] === 0 && u[i + 2] === 1){ const t = (u[i + 3] >> 1) & 63;
      if(t === 39){ let p = i + 5, pt = 0; while(p < u.length && u[p] === 0xFF){ pt += 255; p++; } pt += u[p]; if(pt === 137 || pt === 144 || pt === 147) return true; }
      else if(t < 32) return false;
      i += 2; } }
  return false;
}
function conv10(w, h, s){
  const B = M.HEAPU8.buffer, py = M._py(), pu = M._pu(), pv = M._pv(), ys = M._ys() >> 1, us = M._us() >> 1, vs = M._vs() >> 1;
  if((py | pu | pv) & 1) return null;
  const ch = M._ch(), Y = new Uint16Array(B, py, ys * (h - 1) + w), U = new Uint16Array(B, pu, us * (ch - 1) + M._cw()), V = new Uint16Array(B, pv, vs * (ch - 1) + M._cw());
  const ow = (w >> s) & ~1, oh = (h >> s) & ~1, n = ow * oh * 4, fy = 1 << s, fc = s ? 1 << (s - 1) : 0;
  if(!c10buf || c10buf.length !== n) c10buf = new Uint8ClampedArray(n);
  const o = c10buf, full = !!M._full(), pq = hdrPQ, b2020 = pq || M._mid() !== 1 && w > 1920;
  const yo = full ? 0 : 64, ys1 = full ? 1 / 1023 : 1 / 876, cs = full ? 1 / 1023 : 1 / 896;
  const kr = b2020 ? 1.4746 : 1.5748, kgb = b2020 ? 0.16455 : 0.187324, kgr = b2020 ? 0.57135 : 0.468124, kb = b2020 ? 1.8814 : 1.8556;
  const T = pq ? c10Tables() : null, P = T && T.pq, G = T && T.gm;
  let w0 = 0;
  for(let j = 0; j < oh; j++){
    const yr = j * fy * ys, cj = s ? j * fc : j >> 1, cr0 = cj * us, vr0 = cj * vs;
    for(let i = 0; i < ow; i++){
      const y = (Y[yr + i * fy] - yo) * ys1, ci = s ? i * fc : i >> 1, cb = (U[cr0 + ci] - 512) * cs, cr = (V[vr0 + ci] - 512) * cs;
      let r = y + kr * cr, g = y - kgb * cb - kgr * cr, b = y + kb * cb;
      if(pq){
        r = P[r <= 0 ? 0 : r >= 1 ? 1023 : (r * 1023 + 0.5) | 0]; g = P[g <= 0 ? 0 : g >= 1 ? 1023 : (g * 1023 + 0.5) | 0]; b = P[b <= 0 ? 0 : b >= 1 ? 1023 : (b * 1023 + 0.5) | 0];
        const R = 1.6605 * r - 0.5876 * g - 0.0728 * b, Gg = -0.1246 * r + 1.1329 * g - 0.0083 * b, Bb = -0.0182 * r - 0.1006 * g + 1.1187 * b;
        const iR = R > 0 ? (Math.sqrt(R) * 1440) | 0 : 0, iG = Gg > 0 ? (Math.sqrt(Gg) * 1440) | 0 : 0, iB = Bb > 0 ? (Math.sqrt(Bb) * 1440) | 0 : 0;
        o[w0] = G[iR > 4095 ? 4095 : iR]; o[w0 + 1] = G[iG > 4095 ? 4095 : iG]; o[w0 + 2] = G[iB > 4095 ? 4095 : iB];
      } else { o[w0] = r * 255; o[w0 + 1] = g * 255; o[w0 + 2] = b * 255; }
      o[w0 + 3] = 255; w0 += 4;
    }
  }
  return {px:o, ow, oh};
}
function pull(nout){
  let n = 0, k;
  /* v189: shift -1 = automatico (imagens com mais de 1280 de largura saem a metade do tamanho) */
  while((k = M._rx())){
    const w = M._dec_w(), h = M._dec_h(), ts = M._dec_pts();
    if(xts !== null && ts === xts){ M._rel(); continue; }   /* v229: não repete a imagem do GOP seguinte */
    if(nout && !(bob && w > 1280 && h > 700)){ M._rel(); n++; continue; }   /* v191: imagem so para referencia (GOP anterior): nem se converte */
    if(shift < 0 && autoS < 0) autoS = w > 1280 ? 1 : 0;
    const s = bob ? 0 : shift < 0 ? autoS : shift;
    /* v222: via placa gráfica (só YUV 4:2:0 de 8 bits, fora do «Bob») */
    if(!bob && useGpu && k === 1){  /* (10 bits: ver conv10) */
      if(G === null) gpuInit();
      if(G){
        try{
          const ys = M._ys(), us = M._us(), vs = M._vs(), cw = M._cw(), ch = M._ch(), H = M.HEAPU8, py = M._py(), pu = M._pu(), pv = M._pv();
          let lm = 0; for(let i = 1; i <= 3; i++) for(let j = 1; j <= 3; j++) lm += H[py + ((h * j / 4) | 0) * ys + ((w * i / 4) | 0)]; lm = lm / 9;   /* v227: luminância média da imagem, para o ecrã verificar que a GPU não devolve preto */
          gpuDraw(w, h, H.subarray(py, py + ys * (h - 1) + w), ys, H.subarray(pu, pu + us * (ch - 1) + cw), us, H.subarray(pv, pv + vs * (ch - 1) + cw), vs, cw, ch, s ? 1 : 0, !!M._full(), M._mid());
          M._rel();
          const bmp = G.cv.transferToImageBitmap(), e0 = ep; n++;
          postMessage({type: "frame", ts, w: bmp.width, h: bmp.height, bmp, ep: e0, lum: lm}, [bmp]);
          continue;
        }catch(x){ G = false; gErr = "execução: " + String(x && x.message || x).slice(0, 60); postMessage({type: "gpuoff", msg: "gpu desligada: " + gErr}); }
      }
    }
    if(k === 2){ const r10 = conv10(w, h, Math.max(s, c10s)); M._rel(); if(!r10){ continue; } n++; const e0 = ep;
      createImageBitmap(new ImageData(r10.px, r10.ow, r10.oh), {premultiplyAlpha: "none", colorSpaceConversion: "none"}).then(bmp => postMessage({type: "frame", ts, w: r10.ow, h: r10.oh, bmp, ep: e0}, [bmp]), () => {});
      continue; }
    if(!M._conv(s)) continue;
    const ptr = M._dec_rgba(), ow = M._dec_w(), oh = M._dec_h();
    /* v216 «Bob» por software: o 1080i entrelaçado sai em dois quadros de 960x540 (1.º campo = linhas pares, 2.º = linhas ímpares, ordem TFF),
       o 2.º meio período depois: 50 imagens/s em vez de 25 com os campos misturados */
    if(bob && ow > 1280 && oh > 700){
      if(prevTs !== null){ const dd = ts - prevTs; if(dd > 8000 && dd < 60000) half = Math.round(half * 0.7 + dd / 2 * 0.3); }
      prevTs = ts;
      if(nout){ n += 2; continue; }
      const w2 = ow >> 1, h2 = oh >> 1, src = new Uint32Array(M.HEAPU8.buffer, ptr, ow * oh), e1 = ep;
      for(let f = 0; f < 2; f++){
        const o = new Uint32Array(w2 * h2);
        for(let r = 0; r < h2; r++){ let si = (2 * r + f) * ow, di = r * w2; for(let x = 0; x < w2; x++, si += 2){ const a = src[si], c = src[si + 1]; o[di + x] = (a & c) + (((a ^ c) & 0xFEFEFEFE) >>> 1); } }
        const fts = ts + f * half;
        createImageBitmap(new ImageData(new Uint8ClampedArray(o.buffer), w2, h2), {premultiplyAlpha: "none", colorSpaceConversion: "none"}).then(bmp => postMessage({type: "frame", ts: fts, w: w2, h: h2, bmp, ep: e1, fld: f}, [bmp]), () => {});
        n++;
      }
      continue;
    }
    const px = new Uint8ClampedArray(M.HEAPU8.buffer, ptr, ow * oh * 4);   /* v220: sem .slice(): o createImageBitmap copia os pixeis na própria chamada */
    n++; const e0 = ep;
    createImageBitmap(new ImageData(px, ow, oh), {premultiplyAlpha: "none", colorSpaceConversion: "none"}).then(bmp => postMessage({type: "frame", ts, w: ow, h: oh, bmp, ep: e0}, [bmp]), () => {});
  }
  return n;
}
function send(u8, ts, key){
  const n = u8.byteLength, p = M._malloc(n);
  M.HEAPU8.set(u8, p); M._dec_send(p, n, ts, key ? 1 : 0); M._free(p);
}
async function handle(d){
  await load();
  if(d.cmd === "open"){
    /* v238: H.265 por software (FFmpeg com hevc, módulo à parte carregado só quando é preciso) */
    try{ if(opened){ M._dec_close(); } }catch(x){}
    opened = false;
    if(d.codec === "hevc"){ if(!MH){ const buf = await (await fetch(d.wasm)).arrayBuffer(); MH = await H264Mod(new Uint8Array(buf)); } M = MH; hevc = true; }
    else { M = M264; hevc = false; }
    hdrPQ = false; c10s = 0; shift = d.shift || 0; bob = !!d.bob; useGpu = d.gpu === true; fastOn = !!d.fast; xts = null; prevTs = null; autoS = -1; extra = d.extra ? new Uint8Array(d.extra) : null; if(d.ep !== undefined) ep = d.ep;
    const r = open();
    postMessage({type: r === 0 ? "ready" : "error", msg: "open " + r + (useGpu ? " gpu:" + (gpuState()) : ""), ver: 2});
  } else if(d.cmd === "warm"){ /* so carrega o FFmpeg (compilar o WebAssembly demora): fica pronto para o proximo canal */
    if(d.wasm && !MH){ try{ const buf = await (await fetch(d.wasm)).arrayBuffer(); MH = await H264Mod(new Uint8Array(buf)); }catch(x){} }   /* v241: H.265 preparado de antemão */
  } else if(d.cmd === "decode"){
    if(d.ep !== undefined) ep = d.ep;
    if(d.xt) xts = d.ts;
    ffTs = d.ts;
    if(hevc && d.key && !hdrPQ){ try{ if(seiHdr(new Uint8Array(d.data))) hdrPQ = true; }catch(x){} }
    const t0 = performance.now();
    send(new Uint8Array(d.data), d.ts, d.key);
    const n = pull(!!d.nout);
    postMessage({type: "done", n, ms: performance.now() - t0, ep: d.ep});
  } else if(d.cmd === "drain"){
    /* fim de sequência (NAL 10): o FFmpeg entrega as imagens que tinha guardadas para reordenar */
    send(hevc ? new Uint8Array([0, 0, 0, 1, 0x48, 0x01]) : new Uint8Array([0, 0, 0, 1, 0x0a]), 0, 0);
    let n = pull();
    /* v189: pacote vazio = fim de dados: o FFmpeg entrega tambem a ultima imagem do GOP (perdia-se uma por GOP -> soluco a cada ~1 s) */
    try{ M._dec_send(0, 0, 0, 0); n += pull(); }catch(x){}
    /* depois do fim de sequência o FFmpeg não retoma bem com SPS/PPS do avcC: abre um descodificador novo (barato) */
    try{ M._dec_close(); }catch(x){} open();
    xts = null;
    postMessage({type: "drained", n, ep: d.ep});
  } else if(d.cmd === "fast"){ fastOn = !!d.on; if(opened) M._skip(fastOn ? 1 : 0);   /* v232: sem filtro de blocos nas imagens B (só quando o processador está apertado) */
  } else if(d.cmd === "shift"){ shift = d.shift | 0; autoS = -1;   /* v230: muda o tamanho de saída a meio (0 = inteiro, -1 = automático) */
  } else if(d.cmd === "c10s"){ c10s = d.s | 0;
  } else if(d.cmd === "gpu"){ useGpu = !!d.on;
  } else if(d.cmd === "bob"){ bob = !!d.on; prevTs = null;
  } else if(d.cmd === "flush"){ xts = null; if(d.ep !== undefined) ep = d.ep; if(opened) M._dec_flush(); }
}
onmessage = e => {
  const d = e.data;
  chain = chain.then(() => handle(d)).catch(err => {
    postMessage({type: "error", msg: String(err && err.message || err)});
    if(d && d.cmd === "decode") postMessage({type: "done", n: 0, ms: 0, ep: d.ep});
    if(d && d.cmd === "drain") postMessage({type: "drained", n: 0, ep: d.ep});
  });
};
