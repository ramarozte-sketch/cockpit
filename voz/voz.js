/* Cockpit: voz masculina pt-PT alojada no próprio site (Piper «tugão», licença CC0), gerada no browser.
   Sem serviços externos: o modelo, o motor ONNX e o fonetizador (espeak-ng, só português) vêm desta pasta.
   Ficheiros grandes vêm em partes < 9 MB (limite do alojamento) e ficam guardados no IndexedDB depois da 1.ª vez.
   API: CockpitVoz.state ("off" | "loading" | "ready" | "error"), CockpitVoz.progress (0..1),
        CockpitVoz.load(onProgress) → Promise, CockpitVoz.wav(texto) → Promise<Blob WAV>, CockpitVoz.cached() → Promise<bool> */
(function(){
  "use strict";
  const BASE = (function(){ try{ const s = document.currentScript && document.currentScript.src; if(s) return s.replace(/[^/]*$/, ""); }catch(e){} return "voz/"; })();
  const DB = "ckvoz", ST = "f", VER = "tugao-1";
  const V = window.CockpitVoz = {state:"off", progress:0, err:"", base:BASE};
  let man = null, ort = null, sess = null, phon = null, phonOut = null, loading = null;

  function idb(){ return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function iget(k){ try{ const d = await idb(); return await new Promise(res => { const q = d.transaction(ST).objectStore(ST).get(VER + ":" + k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }catch(e){ return null; } }
  async function iput(k, v){ try{ const d = await idb(); await new Promise(res => { const t = d.transaction(ST, "readwrite"); t.objectStore(ST).put(v, VER + ":" + k); t.oncomplete = t.onerror = t.onabort = () => res(); }); }catch(e){} }
  function script(src){ return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("não carregou " + src)); document.head.appendChild(s); }); }

  /* junta as partes de um ficheiro (com progresso) e guarda o resultado */
  async function bigFile(key, parts, size, prog, w0, w1){
    const have = await iget(key);
    if(have && have.byteLength === size){ prog(w1); return have; }
    const out = new Uint8Array(size); let off = 0;
    for(const p of parts){
      const r = await fetch(BASE + p, {cache:"force-cache"}); if(!r.ok) throw new Error("HTTP " + r.status + " em " + p);
      const rd = r.body && r.body.getReader ? r.body.getReader() : null;
      if(rd){ for(;;){ const x = await rd.read(); if(x.done) break; out.set(x.value, off); off += x.value.length; prog(w0 + (w1 - w0) * off / size); } }
      else { const b = new Uint8Array(await r.arrayBuffer()); out.set(b, off); off += b.length; prog(w0 + (w1 - w0) * off / size); }
    }
    if(off !== size) throw new Error("ficheiro incompleto (" + key + ")");
    await iput(key, out.buffer);
    return out.buffer;
  }
  async function smallFile(key, name){
    const have = await iget(key); if(have) return have;
    const r = await fetch(BASE + name); if(!r.ok) throw new Error("HTTP " + r.status + " em " + name);
    const b = await r.arrayBuffer(); await iput(key, b); return b;
  }

  V.cached = async () => { try{ if(!man) man = await (await fetch(BASE + "voz.json", {cache:"no-cache"})).json(); const m = await iget("model"); return !!(m && m.byteLength === man.modelSize); }catch(e){ return false; } };

  V.load = function(onProgress){
    if(V.state === "ready") return Promise.resolve();
    if(loading) return loading;
    V.state = "loading"; V.err = "";
    const prog = f => { V.progress = Math.max(V.progress, Math.min(1, f)); try{ onProgress && onProgress(V.progress); }catch(e){} try{ V.onprogress && V.onprogress(V.progress); }catch(e){} };
    loading = (async () => {
      man = man || await (await fetch(BASE + "voz.json", {cache:"no-cache"})).json();
      /* motor ONNX (WebAssembly, 1 thread: o Tesla não tem isolamento entre origens) */
      if(!window.ort) await script(BASE + "ort.wasm.min.js");
      ort = window.ort;
      const wasm = await bigFile("ortwasm", man.ortWasm, man.ortWasmSize, prog, 0, .12);
      const wurl = URL.createObjectURL(new Blob([wasm], {type:"application/wasm"}));
      ort.env.wasm.numThreads = 1; ort.env.wasm.simd = true; ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = {"ort-wasm-simd.wasm": wurl, "ort-wasm.wasm": wurl};
      /* fonetizador espeak-ng (só os dados de português) */
      const pjs = await smallFile("phonjs", "piper_phonemize.js"), pwasm = await smallFile("phonwasm", "piper_phonemize.wasm"), pdata = await smallFile("phondata", "piper_phonemize.data");
      prog(.16);
      if(!window.createPiperPhonemize){ const u = URL.createObjectURL(new Blob([pjs], {type:"text/javascript"})); await script(u); }
      const wU = URL.createObjectURL(new Blob([pwasm], {type:"application/wasm"})), dU = URL.createObjectURL(new Blob([pdata]));
      phon = await window.createPiperPhonemize({
        print: d => { try{ phonOut = JSON.parse(d).phoneme_ids; }catch(e){} },
        printErr: () => {},
        locateFile: u => u.endsWith(".wasm") ? wU : u.endsWith(".data") ? dU : u
      });
      /* modelo da voz (63 MB, guardado no aparelho) */
      const model = await bigFile("model", man.model, man.modelSize, prog, .18, .97);
      sess = await ort.InferenceSession.create(new Uint8Array(model), {executionProviders:["wasm"], graphOptimizationLevel:"all"});
      prog(1); V.state = "ready";
    })().catch(e => { V.state = "error"; V.err = String(e && e.message || e); loading = null; throw e; });
    return loading;
  };

  /* números e símbolos que o espeak lê mal ficam como texto */
  function prep(t){
    return String(t).replace(/\s+/g, " ").replace(/(\d)\s*%/g, "$1 por cento").replace(/(\d)\s*km\/h/gi, "$1 quilómetros por hora")
      .replace(/(\d)\s*km\b/gi, "$1 quilómetros").replace(/(\d)\s*°C/g, "$1 graus").replace(/€/g, " euros").trim();
  }
  function chunks(t){
    const out = []; let rest = prep(t);
    while(rest.length){ let cut = rest.length <= 220 ? rest.length : Math.max(rest.lastIndexOf(". ", 220), rest.lastIndexOf("? ", 220), rest.lastIndexOf("! ", 220), rest.lastIndexOf(", ", 220), rest.lastIndexOf(" ", 220)); if(cut < 30) cut = Math.min(220, rest.length); out.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1).trim(); }
    return out.filter(Boolean);
  }
  async function pcmOf(text){
    phonOut = null;
    phon.callMain(["-l", man.voice, "--input", JSON.stringify([{text}]), "--espeak_data", "/espeak-ng-data"]);
    const ids = phonOut; if(!ids || !ids.length) return new Float32Array(0);
    const inf = man.inference, rate = V.rate || 1;
    const feeds = {
      input: new ort.Tensor("int64", BigInt64Array.from(ids, x => BigInt(x)), [1, ids.length]),
      input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)])),
      /* v559: menos «ruído» na geração = pronúncia mais estável e nítida (valores do modelo: 0,667 / 0,8) */
      scales: new ort.Tensor("float32", Float32Array.from([V.clear === false ? inf.noise_scale : .5, inf.length_scale / rate, V.clear === false ? inf.noise_w : .6]))
    };
    if(man.speakers) feeds.sid = new ort.Tensor("int64", BigInt64Array.from([0n]));
    const r = await sess.run(feeds);
    return V.clear === false ? r.output.data : clarity(r.output.data, man.rate);
  }
  /* v559: nitidez para os altifalantes do carro: corta graves surdos (< 90 Hz), realça a presença da voz (3 kHz)
     e o brilho (> 6 kHz), compressão suave e volume normalizado. Filtros biquad (RBJ) aplicados à amostra gerada. */
  function biquad(x, sr, type, f0, q, gainDb){
    const A = Math.pow(10, gainDb / 40), w = 2 * Math.PI * f0 / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if(type === "hp"){ b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if(type === "peak"){ b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
    else { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cs + s); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - s); a0 = (A + 1) - (A - 1) * cs + s; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - s; }
    const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for(let i = 0; i < x.length; i++){ const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  }
  function clarity(pcm, sr){
    let y = biquad(pcm, sr, "hp", 90, .707, 0);
    y = biquad(y, sr, "peak", 3000, 1.0, 4.5);
    y = biquad(y, sr, "shelf", 6500, .707, 2.5);
    /* compressão suave (acima de 0,35) e normalização a 0,95 */
    let mx = 0; for(let i = 0; i < y.length; i++){ let v = y[i], a = Math.abs(v); if(a > .35) v = Math.sign(v) * (.35 + (a - .35) * .45); y[i] = v; if(Math.abs(v) > mx) mx = Math.abs(v); }
    const g = mx > 0 ? .95 / mx : 1; for(let i = 0; i < y.length; i++) y[i] *= g;
    return y;
  }
  function wav(pcm, sr){
    const n = pcm.length, dv = new DataView(new ArrayBuffer(44 + n * 2)), W = (o, s) => { for(let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    W(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); W(8, "WAVEfmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); W(36, "data"); dv.setUint32(40, n * 2, true);
    for(let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
    return new Blob([dv], {type:"audio/wav"});
  }
  /* uma frase de cada vez: cada parte em WAV (a 1.ª toca enquanto a seguinte é gerada) */
  V.parts = chunks;
  V.wavOne = async text => { if(V.state !== "ready") await V.load(); return wav(await pcmOf(text), man.rate); };
  V.wav = async text => {
    if(V.state !== "ready") await V.load();
    const ps = chunks(text), pcs = []; let len = 0;
    const gap = new Float32Array(Math.round(man.rate * .12));
    for(const p of ps){ const x = await pcmOf(p); pcs.push(x, gap); len += x.length + gap.length; }
    const all = new Float32Array(len); let o = 0; for(const x of pcs){ all.set(x, o); o += x.length; }
    return wav(all, man.rate);
  };
})();
