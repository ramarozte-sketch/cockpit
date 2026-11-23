
(function(){
  if(window.ANDROID) return;
  try{
    const CH = [["robo","Robô"],["gato","Gato DJ"],["pinguim","Pinguim"],["dino","Dinossauro"],["coelho","Coelho"],["polvo","Polvo"],["fantasma","Fantasma"]];
    const PERS = {simpatico:"simpático, caloroso e positivo", divertido:"divertido e brincalhão, com piadas leves", calmo:"calmo e sereno, fala pouco e com suavidade", tecnico:"técnico e direto, adora dados do carro"};
    const D = {on:true, ch:"robo", name:"Kiko", hue:0, size:1, walk:true, trip:true, tripMin:10, pers:"simpatico", pitch:1.1, rate:1.05, voice:"", ai:"cockpit", wake:false, alerts:true, batLow:20, hat:"", glasses:false, scarf:"", react:true};
    const A = Object.assign({}, D, LS.get("avatar", {}) || {});
    const saveA = () => LS.set("avatar", A);
    const box = document.createElement("div"); box.id = "avBox"; box.innerHTML = '<canvas width="300" height="360"></canvas><span id="avName"></span>'; document.body.appendChild(box);
    const say = document.createElement("div"); say.id = "avSay"; document.body.appendChild(say);
    const cv = box.querySelector("canvas");
    const apply = () => { box.classList.toggle("hidden", !A.on); box.style.width = Math.round(150 * A.size) + "px"; box.style.height = Math.round(180 * A.size) + "px"; box.style.filter = A.hue ? "hue-rotate(" + A.hue + "deg)" : ""; document.getElementById("avName").textContent = A.name; };
    apply();

    /* --- passear pela app: anda na margem de baixo, para, acena; pode ser arrastado --- */
    const P = {x:+LS.get("avX", 140) || 140, vx:0, until:0, talk:0, drag:null, wave:0};
    const bounds = () => { const w = box.offsetWidth; const rail = document.querySelector(".rail"); const l = rail ? rail.getBoundingClientRect().right + 6 : 6; return [l, innerWidth - w - 6]; };
    let last = performance.now();
    const loop = now => {
      requestAnimationFrame(loop);
      if(!A.on || document.hidden) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const [l, r] = bounds();
      if(!P.drag && A.walk && !document.body.classList.contains("pfull")){
        if(now > P.until){ if(P.vx){ P.vx = 0; P.until = now + 2500 + Math.random() * 5000; if(Math.random() < 0.3) P.wave = now + 1500; } else { P.vx = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 40); P.until = now + 1500 + Math.random() * 3500; } }
        P.x += P.vx * dt; if(P.x < l){ P.x = l; P.vx = Math.abs(P.vx); } if(P.x > r){ P.x = r; P.vx = -Math.abs(P.vx); }
        if(P.vx) box.classList.toggle("flip", P.vx < 0);
      } else P.x = Math.max(l, Math.min(r, P.x));
      box.style.left = Math.round(P.x) + "px";
      box.style.display = document.body.classList.contains("pfull") ? "none" : "";
      const talking = now < P.talk, walk = !!P.vx;
      const lv = {b:talking ? 0.35 + 0.35 * Math.abs(Math.sin(now / 90)) : walk ? 0.25 + 0.2 * Math.abs(Math.sin(now / 160)) : 0.08 + (now < P.wave ? 0.3 : 0), m:talking ? 0.5 + 0.4 * Math.sin(now / 130) : now < P.wave ? 0.9 : walk ? 0.3 : 0.1, t:talking ? 0.8 : 0.3, spec:null};
      if(P.sleep){ lv.b = 0.02; lv.m = 0.05; }
      if(now < P.party){ lv.b = 0.6 + 0.4 * Math.abs(Math.sin(now / 110)); lv.m = 1; }
      if(window.__visDrawChar) window.__visDrawChar(cv, A.ch, lv, now);
      try{ drawAcc(lv, now); }catch(e){}
      if(say.classList.contains("on")){ const rb = box.getBoundingClientRect(); say.style.left = Math.max(8, Math.min(innerWidth - say.offsetWidth - 8, rb.left + rb.width / 2 - say.offsetWidth / 2)) + "px"; say.style.top = Math.max(8, rb.top - say.offsetHeight - 6) + "px"; }
    };
    requestAnimationFrame(loop);
    /* --- acessórios (por cima da personagem; posição da cabeça de cada uma) --- */
    const HEAD = {robo:[0, -238, -198, -134], gato:[0, -175, -132, -82], pinguim:[0, -162, -120, -75], dino:[24, -178, -150, -100], coelho:[0, -165, -131, -90], polvo:[0, -165, -100, -45], fantasma:[0, -192, -126, -44]};   /* x, topo, olhos, pescoço (unidades da personagem) */
    const CLUB = {benfica:["#e30613", "#ffffff"], sporting:["#008057", "#ffffff"], porto:["#0057b8", "#ffffff"], portugal:["#d4001a", "#046a38"]};
    function drawAcc(lv, now){
      if(!A.hat && !A.glasses && !A.scarf && !P.sleep && !(now < P.scare)) return;
      const g = cv.getContext("2d"), w = cv.width, h = cv.height, sc = Math.min(w / 480, h / 320), cx = w / 2, gy = h * 0.9, H = HEAD[A.ch] || HEAD.robo, jump = (lv.b * 24) * sc;
      const X = cx + H[0] * sc, Y = v => gy - jump + v * sc;
      if(A.scarf && CLUB[A.scarf]){ const c = CLUB[A.scarf]; for(let i = 0; i < 6; i++){ g.fillStyle = c[i % 2]; g.fillRect(X - 48 * sc + i * 16 * sc, Y(H[3]) - 8 * sc, 16 * sc, 16 * sc); } g.fillStyle = c[0]; g.fillRect(X + 24 * sc, Y(H[3]) + 6 * sc, 16 * sc, 36 * sc); g.fillStyle = c[1]; g.fillRect(X + 24 * sc, Y(H[3]) + 18 * sc, 16 * sc, 8 * sc); }
      if(A.glasses){ g.fillStyle = "#111"; const ey = Y(H[2]); g.fillRect(X - 34 * sc, ey - 8 * sc, 28 * sc, 16 * sc); g.fillRect(X + 6 * sc, ey - 8 * sc, 28 * sc, 16 * sc); g.fillRect(X - 6 * sc, ey - 4 * sc, 12 * sc, 4 * sc); g.fillStyle = "#ffffff55"; g.fillRect(X - 30 * sc, ey - 5 * sc, 8 * sc, 4 * sc); g.fillRect(X + 10 * sc, ey - 5 * sc, 8 * sc, 4 * sc); }
      const ty = Y(H[1]);
      if(A.hat === "cartola"){ g.fillStyle = "#1b1b24"; g.fillRect(X - 44 * sc, ty - 6 * sc, 88 * sc, 10 * sc); g.fillRect(X - 28 * sc, ty - 58 * sc, 56 * sc, 54 * sc); g.fillStyle = "#c2185b"; g.fillRect(X - 28 * sc, ty - 18 * sc, 56 * sc, 9 * sc); }
      else if(A.hat === "bone"){ g.fillStyle = "#1e66d0"; g.beginPath(); g.arc(X, ty + 2 * sc, 34 * sc, Math.PI, 0); g.fill(); g.fillRect(X, ty - 4 * sc, 54 * sc, 8 * sc); g.fillStyle = "#fff"; g.beginPath(); g.arc(X, ty - 30 * sc, 5 * sc, 0, Math.PI * 2); g.fill(); }
      else if(A.hat === "coroa"){ g.fillStyle = "#f5c518"; g.beginPath(); g.moveTo(X - 34 * sc, ty + 4 * sc); for(let i = 0; i <= 4; i++){ g.lineTo(X - 34 * sc + i * 17 * sc, ty - (i % 2 ? 18 : 40) * sc); } g.lineTo(X + 34 * sc, ty + 4 * sc); g.fill(); g.fillStyle = "#e53935"; g.beginPath(); g.arc(X, ty - 10 * sc, 5 * sc, 0, Math.PI * 2); g.fill(); }
      else if(A.hat === "natal"){ g.fillStyle = "#d62828"; g.beginPath(); g.moveTo(X - 38 * sc, ty + 2 * sc); g.quadraticCurveTo(X + 10 * sc, ty - 80 * sc, X + 52 * sc, ty - 30 * sc); g.lineTo(X + 38 * sc, ty + 2 * sc); g.fill(); g.fillStyle = "#fff"; g.fillRect(X - 42 * sc, ty - 6 * sc, 84 * sc, 14 * sc); g.beginPath(); g.arc(X + 54 * sc, ty - 30 * sc, 10 * sc, 0, Math.PI * 2); g.fill(); }
      if(P.sleep){ g.fillStyle = "#cfe3ff"; g.font = "bold " + Math.round(26 * sc) + "px system-ui"; const k = (now / 900) % 3; for(let i = 0; i < 3; i++) g.fillText("z", X + (40 + i * 18) * sc, ty - (10 + i * 22 + k * 6) * sc); }
      if(now < P.scare){ g.font = Math.round(60 * sc) + "px system-ui"; g.fillText("🙈", X - 30 * sc, Y(H[2]) + 20 * sc); }
    }
    box.addEventListener("pointerdown", e => { P.drag = {x:e.clientX, x0:P.x, moved:false}; try{ box.setPointerCapture(e.pointerId); }catch(x){} });
    box.addEventListener("pointermove", e => { if(!P.drag) return; const dx = e.clientX - P.drag.x; if(Math.abs(dx) > 8) P.drag.moved = true; P.x = P.drag.x0 + dx; });
    box.addEventListener("pointerup", () => { const d = P.drag; P.drag = null; LS.set("avX", Math.round(P.x)); if(d && !d.moved) openDlg("talk"); });

    /* --- falar --- */
    let sayT = 0;
    /* v260: o browser do Tesla não tem vozes instaladas (speechSynthesis fica calado): usa uma voz online, tocada como áudio */
    const ttsLang = () => cfg.lang === "en" ? "en-GB" : cfg.lang === "fr" ? "fr-FR" : "pt-PT";
    let ttsQ = [], ttsA = null;
    const ttsOnline = (txt, rate, onEnd, deep) => {
      const parts = []; let rest = String(txt).replace(/\s+/g, " ").trim();
      while(rest.length){ let cut = rest.length <= 190 ? rest.length : Math.max(rest.lastIndexOf(". ", 190), rest.lastIndexOf(", ", 190), rest.lastIndexOf(" ", 190)); if(cut < 40) cut = Math.min(190, rest.length); parts.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1).trim(); }
      try{ if(ttsA){ ttsA.onended = ttsA.onerror = null; ttsA.pause(); } }catch(e){}
      ttsQ = parts.slice(); const lang = ttsLang();
      const next = (viaPx) => {
        const t = ttsQ.shift(); if(!t){ onEnd && onEnd(); return; }
        const u = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" + lang + "&q=" + encodeURIComponent(t);
        try{ if(ttsA){ ttsA.onended = ttsA.onerror = null; ttsA.pause(); ttsA.removeAttribute("src"); } }catch(e){}   /* v451: nunca duas vozes ao mesmo tempo */
        const a = ttsA = new Audio(viaPx && typeof px === "function" ? px(u) : u); a._noAmp = true; a.playbackRate = Math.max(0.7, Math.min(1.5, rate || 1));
        /* voz grave sem proxy: toca mais devagar sem manter o tom (fica mais grave e um pouco mais lenta) */
        if(deep){ try{ a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false; }catch(e){} a.playbackRate = Math.max(.7, .84 * (rate || 1)); }
        /* v451: o erro do áudio e a recusa do play() chegavam os dois e cada um lançava a voz pelo proxy: duas vozes desfasadas (eco na navegação). Agora a troca acontece uma só vez */
        let moved = false; const fallback = () => { if(moved || ttsA !== a) return; moved = true; try{ a.onended = a.onerror = null; a.pause(); }catch(e){}
          if(!viaPx && typeof px === "function" && cfg.proxy){ ttsQ.unshift(t); next(true); } else { console.log("voz online indisponível"); onEnd && onEnd(); } };
        a.onended = () => { if(ttsA === a && !moved) next(viaPx); };
        a.onerror = fallback;   /* v272: sem aviso no ecrã (aparecia ao abrir, por cima de outras mensagens) */
        a.play().catch(e => { if(e && e.name === "AbortError") return; fallback(); });
      };
      next(deep ? false : LS.get("ttsViaPx", false));
    };
    /* ---- vozes neurais da Microsoft (Edge “Ler em voz alta”, gratuitas): pt-PT Duarte (masculina) e Raquel (feminina) ---- */
    let ttsGen = 0;
    const edgeTTS = (txt, voice) => new Promise(async res => {
      let done = false; const fin = v => { if(done) return; done = true; try{ ws && ws.close(); }catch(e){} res(v); };
      let ws = null; setTimeout(() => fin(null), 8000);
      try{
        const TOK = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
        let ticks = Math.floor(Date.now() / 1000) + 11644473600; ticks -= ticks % 300;
        const raw = new TextEncoder().encode(ticks + "0000000" + TOK);
        const gec = [...new Uint8Array(await crypto.subtle.digest("SHA-256", raw))].map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
        const id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, "");
        ws = new WebSocket("wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=" + TOK + "&Sec-MS-GEC=" + gec + "&Sec-MS-GEC-Version=1-143.0.3650.75&ConnectionId=" + id);
        ws.binaryType = "arraybuffer"; const chunks = [];
        const ts = () => new Date().toString();
        ws.onopen = () => {
          ws.send("X-Timestamp:" + ts() + "\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n" + '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}');
          const esc2 = s => s.replace(/[<>&"']/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[c]));
          ws.send("X-RequestId:" + id + "\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:" + ts() + "Z\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='pt-PT'><voice name='" + voice + "'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>" + esc2(txt) + "</prosody></voice></speak>");
        };
        ws.onmessage = e => {
          if(typeof e.data === "string"){ if(e.data.includes("Path:turn.end")) fin(chunks.length ? URL.createObjectURL(new Blob(chunks, {type:"audio/mpeg"})) : null); return; }
          const dv = new DataView(e.data), hl = dv.getUint16(0); const head = new TextDecoder().decode(new Uint8Array(e.data, 2, hl));
          if(head.includes("Path:audio")) chunks.push(new Uint8Array(e.data, 2 + hl));
        };
        ws.onerror = () => fin(null); ws.onclose = () => fin(chunks.length ? URL.createObjectURL(new Blob(chunks, {type:"audio/mpeg"})) : null);
      }catch(e){ fin(null); }
    });
    /* reserva para a voz masculina: voz da Google com o tom mais grave (mantém a velocidade). Precisa do proxy para ler o áudio. */
    const deepTTS = async (txt, lang) => {
      try{
        const parts = String(txt).match(/.{1,190}(\s|$)/g) || [txt];
        const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC(); const bufs = [];
        for(const p of parts){
          const u = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" + lang + "&q=" + encodeURIComponent(p.trim());
          let ab = null; for(const url of [typeof px === "function" ? px(u) : null, u].filter(Boolean)){ try{ const r = await fetch(url); if(r.ok){ ab = await r.arrayBuffer(); break; } }catch(e){} }
          if(!ab) return null; bufs.push(await ac.decodeAudioData(ab));
        }
        const sr = bufs[0].sampleRate, len = bufs.reduce((a, b) => a + b.length, 0), x = new Float32Array(len); let o = 0; bufs.forEach(b => { x.set(b.getChannelData(0), o); o += b.length; });
        /* 1) encurta sem mudar o tom (WSOLA)  2) reamostra mais devagar: tom ~4 meios-tons abaixo, mesma duração */
        const R = .8, N = 1024, Hs = 512, Ha = Hs / R, tol = 160, win = new Float32Array(N).map((_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / N));
        const outLen = Math.floor(len * R) + N, y = new Float32Array(outLen), wsum = new Float32Array(outLen);
        let prev = 0;
        for(let k = 0, pos = 0; pos + N + tol < len; k++, pos = Math.round(k * Ha)){
          let best = pos, bv = -Infinity;
          if(k){ for(let d = -tol; d <= tol; d += 4){ const s = pos + d; if(s < 0) continue; let c = 0; for(let i = 0; i < Hs; i += 4) c += x[s + i] * x[prev + Hs + i]; if(c > bv){ bv = c; best = s; } } }
          const op = k * Hs; for(let i = 0; i < N; i++){ y[op + i] += x[best + i] * win[i]; wsum[op + i] += win[i]; }
          prev = best;
        }
        for(let i = 0; i < outLen; i++) if(wsum[i] > 1e-3) y[i] /= wsum[i];
        const fin = Math.floor(outLen / R), z = new Float32Array(fin);
        for(let i = 0; i < fin; i++){ const s = i * R, a = Math.floor(s), f = s - a; z[i] = (y[a] || 0) * (1 - f) + (y[a + 1] || 0) * f; }
        /* WAV */
        const wav = new DataView(new ArrayBuffer(44 + fin * 2)); const W = (o, s) => [...s].forEach((c, i) => wav.setUint8(o + i, c.charCodeAt(0)));
        W(0, "RIFF"); wav.setUint32(4, 36 + fin * 2, true); W(8, "WAVEfmt "); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true); wav.setUint32(24, sr, true); wav.setUint32(28, sr * 2, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true); W(36, "data"); wav.setUint32(40, fin * 2, true);
        for(let i = 0; i < fin; i++) wav.setInt16(44 + i * 2, Math.max(-1, Math.min(1, z[i])) * 32767, true);
        try{ ac.close(); }catch(e){}
        return URL.createObjectURL(new Blob([wav], {type:"audio/wav"}));
      }catch(e){ return null; }
    };
    const playUrl = (url, rate, onEnd, onFail) => {
      try{ if(ttsA){ ttsA.onended = ttsA.onerror = null; ttsA.pause(); } }catch(e){}
      const a = ttsA = new Audio(url); a._noAmp = true; a.playbackRate = Math.max(0.7, Math.min(1.5, rate || 1));
      a.onended = () => { if(ttsA === a){ onEnd && onEnd(); } URL.revokeObjectURL(url); };
      a.onerror = () => { if(ttsA === a) onFail(); };
      a.play().catch(e => { if(e && e.name === "AbortError") return; if(ttsA === a) onFail(); });
    };
    const ttsBase = ttsOnline;
    const ttsGender = (txt, rate, onEnd) => {
      const g = cfg.ttsVoice, lang = ttsLang();
      if(lang !== "pt-PT" || (g !== "m" && g !== "f")) return ttsBase(txt, rate, onEnd);
      const my = ++ttsGen; ttsQ = []; try{ if(ttsA){ ttsA.onended = ttsA.onerror = null; ttsA.pause(); } }catch(e){}
      const google = () => { if(my === ttsGen) ttsBase(txt, rate, onEnd); };
      (async () => {
        const log = m => { try{ window.__dbgEv && window.__dbgEv(0, "voz: " + m, {}); }catch(e){} };
        /* v558: voz masculina alojada no site, gerada no aparelho (sem internet): frase a frase, a seguinte é gerada enquanto a anterior toca */
        const V = window.CockpitVoz;
        if(g === "m" && V){
          try{
            if(V.state !== "ready"){ const c = await V.cached(); if(my !== ttsGen) return; if(c || V.state === "loading") await V.load(); else { V.load().catch(() => {}); throw new Error("ainda a descarregar"); } }
            if(my !== ttsGen) return;
            const ps = V.parts(txt); let nextP = V.wavOne(ps[0]);
            window.__ttsWhich = "local";
            for(let i = 0; i < ps.length; i++){
              const blob = await nextP; if(my !== ttsGen) return;
              if(i + 1 < ps.length) nextP = V.wavOne(ps[i + 1]);
              /* espera o fim desta parte; se outra voz a interromper (pausa), segue em frente em vez de ficar à espera */
              await new Promise(res => { playUrl(URL.createObjectURL(blob), rate, res, res); const a = ttsA; if(a) a.addEventListener("pause", () => { if(!a.ended) setTimeout(res, 50); }); });
              if(my !== ttsGen) return;
            }
            onEnd && onEnd(); return;
          }catch(e){ log("voz do aparelho: " + (e && e.message || e)); if(my !== ttsGen) return; }
        }
        let url = LS.get("ttsEdgeOff", 0) > Date.now() ? null : await edgeTTS(txt, g === "m" ? "Microsoft Server Speech Text to Speech Voice (pt-PT, DuarteNeural)" : "Microsoft Server Speech Text to Speech Voice (pt-PT, RaquelNeural)");
        if(my !== ttsGen) return;
        if(url){ window.__ttsWhich = "edge"; return playUrl(url, rate, onEnd, google); }
        LS.set("ttsEdgeOff", Date.now() + 10 * 60000);   /* não volta a tentar durante 10 min (evita 8 s de espera em cada frase) */
        log("Microsoft sem resposta");
        if(g === "m"){
          if(cfg.proxy || cfg.proxy2){ url = await deepTTS(txt, lang); if(my !== ttsGen) return; if(url){ window.__ttsWhich = "grave"; return playUrl(url, rate, onEnd, google); } log("tom grave via proxy falhou"); }
          window.__ttsWhich = "lenta"; ttsBase(txt, rate, onEnd, true); return;
        }
        window.__ttsWhich = "google"; google();
      })();
    };
    window.__ttsOnline = ttsGender;
    window.__ttsStop = () => { ttsGen++; ttsQ = []; try{ if(ttsA){ ttsA.onended = ttsA.onerror = null; ttsA.pause(); } }catch(e){} };
    const hasVoices = () => { try{ return "speechSynthesis" in window && speechSynthesis.getVoices().length > 0; }catch(e){ return false; } };
    try{ speechSynthesis && speechSynthesis.getVoices(); }catch(e){}
    const speakA = txt => {
      txt = String(txt || "").trim(); if(!txt) return;
      say.textContent = txt; say.classList.add("on"); clearTimeout(sayT); sayT = setTimeout(() => say.classList.remove("on"), Math.min(14000, 2500 + txt.length * 70));
      P.talk = performance.now() + Math.min(12000, 600 + txt.length * 65);
      const done = () => { P.talk = 0; };
      if(A.tts === "online" || !hasVoices()){ ttsOnline(txt, A.rate, done); return; }
      try{ const u = new SpeechSynthesisUtterance(txt); u.lang = ttsLang(); u.pitch = A.pitch; u.rate = A.rate;
        const vs = speechSynthesis.getVoices(); const v = vs.find(x => x.name === A.voice) || vs.find(x => /pt-PT|pt_PT/i.test(x.lang)) || null; if(v) u.voice = v;
        /* v261: só passa à voz online se o browser falhar de verdade (antes, um arranque lento dava as duas vozes ao mesmo tempo) */
        let started = false, fell = false; const fall = () => { if(started || fell) return; fell = true; try{ speechSynthesis.cancel(); }catch(e){} ttsOnline(txt, A.rate, done); };
        u.onstart = () => { started = true; if(fell){ try{ speechSynthesis.cancel(); }catch(e){} } }; u.onend = done; u.onerror = fall;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
        /* v263: sem segunda voz por tempo: no Tesla a voz do browser fala mas não avisa que começou, e a voz online repetia por cima (eco). Só muda de voz se der erro. */
      }catch(e){ ttsOnline(txt, A.rate, done); }
    };
    window.__avatarSay = speakA;

    /* --- cérebro: Grok (chave xAI neste aparelho) ou a IA do Cockpit (proxy) --- */
    const hist = (LS.get("avHist", []) || []).slice(-12);
    const ctxTxt = () => { let c = ""; try{ c += "Hora: " + new Date().toLocaleTimeString("pt-PT", {hour:"2-digit", minute:"2-digit"}) + ". "; }catch(e){} try{ if(typeof carSummary === "function") c += "Carro: " + carSummary() + ". "; }catch(e){} try{ c += "Em andamento: " + ((typeof drivingEff === "function" && drivingEff()) ? "sim" : "não") + ". "; }catch(e){}
      try{ const W = window.__wamp; if(W && W.playing && W.playing() && W.cur) c += "A tocar: " + W.cur.artist + " — " + W.cur.title + ". "; else if(typeof radioCur !== "undefined" && radioCur) c += "Rádio: " + radioCur.name + ". "; }catch(e){} return c; };
    const sys = () => "És o " + A.name + ", o companheiro de viagem do Rui no Tesla, dentro da app Cockpit. Personalidade: " + (PERS[A.pers] || PERS.simpatico) + ". Falas português de Portugal, de forma curta (1 a 3 frases), porque a resposta é lida em voz alta durante a condução. Nunca incentivas o condutor a olhar para o ecrã nem a mexer no telemóvel. " + (MEM().length ? "Coisas que o Rui te pediu para lembrar: " + MEM().join("; ") + ". " : "") + ctxTxt();
    const brain = async (msgs) => {
      if(A.ai === "grok" && LS.get("xaiKey", "")){
        const body = JSON.stringify({model:LS.get("xaiModel", "grok-3-mini"), messages:msgs, max_tokens:220, temperature:0.8});
        const go = async u => { const r = await fetch(u, {method:"POST", headers:{"Content-Type":"application/json", Authorization:"Bearer " + LS.get("xaiKey", "")}, body}); if(!r.ok) throw new Error("Grok " + r.status); const j = await r.json(); return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ""; };
        try{ return await go("https://api.x.ai/v1/chat/completions"); }catch(e){ if(typeof aiCall !== "function") throw e; }
      }
      if(typeof aiCall !== "function" || !cfg.proxy) throw new Error("Para conversar, liga o proxy do Cockpit ou põe a chave do Grok nas definições do avatar.");
      return await aiCall(msgs, {max_tokens:220});
    };
    /* --- comandos: o avatar também faz coisas (carro, rádio, Amp, TV) --- */
    const tryCmd = async q => {
      const n = typeof norm === "function" ? norm(q) : q.toLowerCase();
      let m = n.match(/^(?:toca|poe|mete|ouvir|quero ouvir)\s+(.+?)\s+(?:no|na)\s+(?:amp|winamp|youtube music|youtube)$/) || n.match(/^(?:toca|poe a musica|mete a musica)\s+(.+)$/);
      if(m && !/^radio\b|^canal\b/.test(m[1])){ const W = window.__wamp; const f = document.getElementById("wampForm"); if(W && f){ document.getElementById("wampQ").value = m[1]; if(/youtube/.test(n) && cfg.ytKey) document.getElementById("wampSrc").value = "youtube"; f.requestSubmit(); let k = 0; const t = setInterval(() => { if(++k > 30){ clearInterval(t); return; } if(W.list && W.list.length){ clearInterval(t); const b = document.querySelector('#wampPl [data-i="0"]'); if(b) b.click(); } }, 400); return "A procurar " + m[1] + " no Amp."; } }
      if(typeof VOICE !== "undefined" && VOICE.some(c => c.re.some(r => r.test(n)))){ try{ await (window.__hcOrig || handleCommand)(q); }catch(e){} return "\u200bFeito!"; }
      if(/\b(abre|fecha|liga|desliga|tranca|destranca|aquece|arrefece|temperatura|ventila|carrega|buzina|pisca|descongela)\b/.test(n) && typeof aiOn === "function" && aiOn() && typeof aiCommand === "function"){ try{ if(await aiCommand(q)) return "\u200bTratado."; }catch(e){} }
      return null;
    };
    /* --- memória: «lembra-te que…» fica guardado e entra em todas as conversas --- */
    const MEM = () => LS.get("avMem", []) || [];
    const ask = async (q, silent) => {
      if(!silent){ const mm = String(q).match(/^\s*(?:lembra[- ]te(?: de| que)?|memoriza|não te esqueças(?: de| que)?)\s+(.+)/i); if(mm){ const L = MEM(); L.push(mm[1].trim()); while(L.length > 30) L.shift(); LS.set("avMem", L); addLog("u", q); const a = "Combinado, vou lembrar-me."; addLog("a", a); speakA(a); return a; }
        const c = await tryCmd(q); if(c){ addLog("u", q); const quiet = c.charAt(0) === "\u200b", txt = c.replace(/^\u200b/, ""); addLog("a", txt); if(quiet){ say.textContent = txt; say.classList.add("on"); clearTimeout(sayT); sayT = setTimeout(() => say.classList.remove("on"), 3000); } else speakA(txt); return txt; } }   /* os comandos do Cockpit já respondem em voz: o avatar não repete */
      if(!silent) addLog("u", q);
      hist.push({role:"user", content:q}); while(hist.length > 12) hist.shift();
      try{ const a = (await brain([{role:"system", content:sys()}, ...hist])).replace(/\s+/g, " ").trim(); hist.push({role:"assistant", content:a}); LS.set("avHist", hist.slice(-12)); addLog("a", a); speakA(a); return a; }
      catch(e){ const m = String(e.message || e); addLog("a", "⚠️ " + m); speakA("Hum, não consegui pensar agora."); }
    };
    window.__avatarAsk = ask;

    /* --- conversa em viagem: de X em X minutos diz algo curto sobre a viagem --- */
    let tripAt = Date.now() + 60000;
    setInterval(() => { try{
      if(!A.on || !A.trip || !(typeof drivingEff === "function" && drivingEff())) { tripAt = Math.max(tripAt, Date.now() + 60000); return; }
      if(Date.now() < tripAt) return; tripAt = Date.now() + Math.max(3, +A.tripMin || 10) * 60000;
      const ideias = ["Comenta a viagem de forma curta e simpática.", "Diz uma curiosidade rápida e interessante.", "Pergunta ao Rui como está a correr a viagem.", "Comenta a música que está a tocar, se houver.", "Dá uma dica curta de condução eficiente para o Tesla."];
      ask(ideias[Math.floor(Math.random() * ideias.length)], true);
    }catch(e){} }, 20000);

    /* --- janela: conversar e aparência --- */
    const dlg = document.createElement("div"); dlg.id = "avDlg"; dlg.hidden = true; document.body.appendChild(dlg);
    dlg.innerHTML = '<div class="avTabs"><button data-t="talk" aria-selected="true">💬 Conversar</button><button data-t="look" aria-selected="false">🎨 Aparência</button><button data-t="brain" aria-selected="false">🧠 Cérebro</button><span style="flex:1"></span><button data-x="1" aria-label="Fechar" style="font-size:30px;line-height:1">×</button></div>' +
      '<div data-p="talk"><div id="avLog"></div><div class="row2"><input type="text" id="avIn" placeholder="Escreve ao avatar…" autocomplete="off"><button id="avMic" aria-label="Falar">🎤</button><button id="avSend" class="pri">Enviar</button></div></div>' +
      '<div data-p="look" hidden><label class="f2">Personagem<select id="avChSel"></select></label><div class="row" style="justify-content:center"><canvas id="avChPrev" width="144" height="172" style="width:96px;height:115px"></canvas></div>' +
      '<label class="f2">Nome<input type="text" id="avNm" maxlength="16"></label>' +
      '<label class="f2">Cor <input type="range" id="avHue" min="0" max="359"></label>' +
      '<label class="f2">Tamanho <input type="range" id="avSz" min="70" max="160"></label>' +
      '<label class="f2">Personalidade<select id="avPers"><option value="simpatico">Simpático</option><option value="divertido">Divertido</option><option value="calmo">Calmo</option><option value="tecnico">Técnico</option></select></label>' +
      '<label class="f2">Tom de voz <input type="range" id="avPitch" min="50" max="200"></label><label class="f2">Velocidade da voz <input type="range" id="avRate" min="70" max="150"></label>' +
      '<label class="f2">Voz<select id="avVoice"><option value="">Automática (português)</option></select></label>' +
      '<label class="f2">Motor da voz<select id="avTts"><option value="auto">Automático (voz do browser; se não houver, online)</option><option value="online">Voz online (Google)</option></select></label>' +
      '<label class="row small" style="gap:10px;margin:8px 0"><input type="checkbox" id="avWalk"> Passear pela app</label>' +
      '<label class="row small" style="gap:10px;margin:8px 0"><input type="checkbox" id="avTrip"> Conversar em viagem (diz algo de vez em quando)</label>' +
      '<label class="f2">De quantos em quantos minutos<select id="avTripMin"><option>5</option><option>10</option><option>15</option><option>30</option></select></label>' +
      '<label class="f2">Chapéu<select id="avHat"><option value="">Nenhum</option><option value="cartola">Cartola</option><option value="bone">Boné</option><option value="coroa">Coroa</option><option value="natal">Gorro de Natal</option></select></label>' +
      '<label class="row small" style="gap:10px;margin:8px 0"><input type="checkbox" id="avGl"> Óculos de sol</label>' +
      '<label class="f2">Cachecol<select id="avSc"><option value="">Nenhum</option><option value="benfica">Benfica</option><option value="sporting">Sporting</option><option value="porto">FC Porto</option><option value="portugal">Portugal</option></select></label>' +
      '<label class="row small" style="gap:10px;margin:8px 0"><input type="checkbox" id="avReact"> Reage ao carro (festa no fim do carregamento, susto nas travagens fortes, dorme parado)</label>' +
      '<label class="row small" style="gap:10px;margin:8px 0"><input type="checkbox" id="avAl"> Avisos úteis (bateria baixa, carregamento a acabar ou concluído)</label>' +
      '<label class="f2">Avisar com a bateria abaixo de<select id="avBat"><option>10</option><option>15</option><option>20</option><option>30</option></select></label>' +
      '<label class="row small" style="gap:10px;margin:8px 0"><input type="checkbox" id="avWake"> Ouvir «Olá + nome» sem tocar no ecrã (usa o microfone)</label>' +
      '<button id="avForget" style="width:100%;margin-top:6px">🧹 Esquecer o que lhe pedi para lembrar</button>' +
      '<div class="row2"><button id="avHide">🙈 Esconder o avatar</button><button id="avTest">🔊 Testar a voz</button></div></div>' +
      '<div data-p="brain" hidden><label class="f2">Inteligência<select id="avAi"><option value="cockpit">IA do Cockpit (Workers AI do teu proxy)</option><option value="grok">Grok (xAI)</option></select></label>' +
      '<label class="f2">Chave da API do Grok (fica só neste aparelho)<input type="password" id="avKey" placeholder="xai-…" autocomplete="off"></label>' +
      '<label class="f2">Modelo do Grok<input type="text" id="avModel" placeholder="grok-3-mini"></label>' +
      '<p class="small" style="color:#b9c6d8">Se o Grok não responder (rede ou chave), o avatar usa a IA do Cockpit.</p></div>';
    const $a = id => document.getElementById(id);
    const addLog = (k, t) => { const L = $a("avLog"), d = document.createElement("div"); d.className = "m " + k; d.textContent = t; L.appendChild(d); L.scrollTop = L.scrollHeight; };
    const tab = t => { dlg.querySelectorAll("[data-t]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.t === t))); dlg.querySelectorAll("[data-p]").forEach(p => p.hidden = p.dataset.p !== t); if(t === "look") paintGrid(); };
    const openDlg = t => { dlg.hidden = false; fill(); tab(t || "talk"); if(!$a("avLog").children.length) addLog("a", "Olá Rui! Sou o " + A.name + ". Toca no 🎤 ou escreve. Na aparência podes mudar-me."); };
    window.__avatarOpen = openDlg;
    /* v309: personagens numa lista (dropdown) com pré-visualização, em vez da grelha */
    const paintGrid = () => { const sel = $a("avChSel"); if(!sel.options.length) sel.innerHTML = CH.map(c => '<option value="' + c[0] + '">' + c[1] + '</option>').join("");
      sel.value = A.ch; const c = $a("avChPrev"); if(window.__visDrawChar) window.__visDrawChar(c, A.ch, {b:0.1, m:0.2, t:0.3, spec:null}); c.style.filter = A.hue ? "hue-rotate(" + A.hue + "deg)" : ""; };
    $a("avChSel").onchange = e => { A.ch = e.target.value; saveA(); paintGrid(); };
    const fill = () => { $a("avNm").value = A.name; $a("avHue").value = A.hue; $a("avSz").value = Math.round(A.size * 100); $a("avPers").value = A.pers; $a("avPitch").value = Math.round(A.pitch * 100); $a("avRate").value = Math.round(A.rate * 100);
      $a("avWalk").checked = A.walk; $a("avTrip").checked = A.trip; $a("avTripMin").value = String(A.tripMin); $a("avAi").value = A.ai; $a("avTts").value = A.tts || "auto"; $a("avHat").value = A.hat || ""; $a("avGl").checked = !!A.glasses; $a("avSc").value = A.scarf || ""; $a("avReact").checked = A.react !== false; $a("avAl").checked = A.alerts !== false; $a("avBat").value = String(A.batLow || 20); $a("avWake").checked = !!A.wake; $a("avKey").value = LS.get("xaiKey", "") ? "••••••••" : ""; $a("avModel").value = LS.get("xaiModel", "");
      try{ const sel = $a("avVoice"), vs = (speechSynthesis.getVoices() || []).filter(v => /^pt/i.test(v.lang) || v.name === A.voice); if(sel.options.length <= 1) vs.forEach(v => { const o = document.createElement("option"); o.value = v.name; o.textContent = v.name + " (" + v.lang + ")"; sel.appendChild(o); }); sel.value = A.voice || ""; }catch(e){} };
    dlg.addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return;
      if(b.dataset.t) tab(b.dataset.t); else if(b.dataset.x) dlg.hidden = true;
      else if(b.dataset.c){ A.ch = b.dataset.c; saveA(); paintGrid(); }
      else if(b.id === "avSend"){ const q = $a("avIn").value.trim(); if(q){ $a("avIn").value = ""; ask(q); } }
      else if(b.id === "avHide"){ A.on = false; saveA(); apply(); dlg.hidden = true; toast("Avatar escondido. Volta a mostrá-lo em Definições → Avatar."); }
      else if(b.id === "avTest") speakA("Olá Rui, eu sou o " + A.name + ". Boa viagem!");
      else if(b.id === "avForget"){ LS.set("avMem", []); LS.set("avHist", []); hist.length = 0; toast("Memória do avatar apagada."); }
      else if(b.id === "avMic"){ const mb = document.getElementById("micBtn"); if(mb){ window.__avRoute = Date.now() + 25000; mb.click(); } else listen(); } });
    $a("avIn").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); $a("avSend").click(); } });
    const bind = (id, fn) => $a(id).addEventListener("input", e => { fn(e.target); saveA(); apply(); });
    bind("avNm", t => A.name = t.value.trim() || "Kiko"); bind("avHue", t => { A.hue = +t.value; paintGrid(); }); bind("avSz", t => A.size = +t.value / 100); bind("avPers", t => A.pers = t.value);
    bind("avPitch", t => A.pitch = +t.value / 100); bind("avRate", t => A.rate = +t.value / 100); bind("avVoice", t => A.voice = t.value);
    $a("avWalk").onchange = e => { A.walk = e.target.checked; saveA(); }; $a("avTrip").onchange = e => { A.trip = e.target.checked; saveA(); }; $a("avTripMin").onchange = e => { A.tripMin = +e.target.value; saveA(); };
    $a("avAi").onchange = e => { A.ai = e.target.value; saveA(); };
    $a("avTts").onchange = e => { A.tts = e.target.value; saveA(); };
    $a("avHat").onchange = e => { A.hat = e.target.value; saveA(); }; $a("avGl").onchange = e => { A.glasses = e.target.checked; saveA(); }; $a("avSc").onchange = e => { A.scarf = e.target.value; saveA(); };
    $a("avReact").onchange = e => { A.react = e.target.checked; saveA(); }; $a("avAl").onchange = e => { A.alerts = e.target.checked; saveA(); }; $a("avBat").onchange = e => { A.batLow = +e.target.value; saveA(); };
    $a("avWake").onchange = e => { A.wake = e.target.checked; saveA(); if(A.wake){ wakeStart(); toast("A ouvir «Olá " + A.name + "». Se o browser pedir, autoriza o microfone."); } else wakeStop(); };
    $a("avKey").addEventListener("change", e => { const v = e.target.value.trim(); if(v && !/^•+$/.test(v)){ LS.set("xaiKey", v); e.target.value = "••••••••"; toast("Chave do Grok guardada neste aparelho."); } else if(!v) LS.set("xaiKey", ""); });
    $a("avModel").addEventListener("change", e => LS.set("xaiModel", e.target.value.trim()));

    /* --- ouvir (reconhecimento de voz do browser, se existir) --- */
    function listen(){
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(!SR){ toast("Este browser não reconhece voz aqui: escreve a pergunta (ou usa o botão do microfone do Cockpit)."); $a("avIn").focus(); return; }
      try{ const r = new SR(); r.lang = cfg.lang === "en" ? "en-GB" : "pt-PT"; r.interimResults = false; r.maxAlternatives = 1; $a("avMic").textContent = "👂";
        r.onresult = ev => { const q = ev.results[0][0].transcript; if(q) ask(q); }; r.onend = () => { $a("avMic").textContent = "🎤"; }; r.onerror = () => { $a("avMic").textContent = "🎤"; toast("Não percebi. Tenta outra vez."); }; r.start(); }catch(e){ toast("Não consegui ligar o microfone."); }
    }

    /* --- avisos úteis e reações ao carro --- */
    P.party = 0; P.scare = 0; P.sleep = false; let lastAct = Date.now(), batWarned = false, chgPrev = "", nearWarned = false, lastKmh = null, lastKmhAt = 0;
    ["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); if(P.sleep){ P.sleep = false; } }, true));
    const react = (k) => { if(!A.react) return; const n = performance.now(); if(k === "party"){ P.party = n + 4000; P.wave = n + 4000; } else if(k === "scare"){ P.scare = n + 2200; } };
    setInterval(() => { try{
      if(!A.on) return;
      const c = typeof car !== "undefined" ? car : null, cs = c && c.charge_state || {};
      if(A.alerts && cs.battery_level != null){ const b = Math.round(cs.battery_level); if(b <= A.batLow && !batWarned && cs.charging_state !== "Charging"){ batWarned = true; speakA("Atenção Rui: a bateria está nos " + b + "%. Convém planear um carregamento."); } if(b > A.batLow + 3) batWarned = false; }
      if(cs.charging_state){ if(A.alerts && cs.charging_state === "Charging" && cs.minutes_to_full_charge != null && cs.minutes_to_full_charge <= 5 && cs.minutes_to_full_charge > 0 && !nearWarned){ nearWarned = true; speakA("O carregamento acaba dentro de " + cs.minutes_to_full_charge + " minutos."); }
        if(chgPrev === "Charging" && cs.charging_state === "Complete"){ react("party"); if(A.alerts) speakA("Carregamento concluído! " + Math.round(cs.battery_level || 0) + "% de bateria. Já podes tirar o carro do posto."); nearWarned = false; }
        chgPrev = cs.charging_state; }
      const moving = typeof drivingEff === "function" && drivingEff();
      P.sleep = A.react && !moving && Date.now() - lastAct > 10 * 60000;
      const kmh = c && c.drive_state && c.drive_state.speed != null ? c.drive_state.speed * (typeof MI !== "undefined" ? MI : 1.609) : null;
      if(kmh != null){ const t = Date.now(); if(lastKmh != null && t - lastKmhAt < 4000 && lastKmh - kmh >= 25) react("scare"); lastKmh = kmh; lastKmhAt = t; }
    }catch(e){} }, 3000);
    /* travagem forte pelo GPS do browser (só em https), mais rápido que os dados do carro */
    try{ if(window.isSecureContext && navigator.geolocation){ let pk = null, pt = 0; navigator.geolocation.watchPosition(pos => { const sp = pos.coords.speed; if(sp == null) return; const k = sp * 3.6, t = pos.timestamp || Date.now(); if(pk != null && t - pt <= 2500 && pk - k >= 18) react("scare"); pk = k; pt = t; }, () => {}, {enableHighAccuracy:true, maximumAge:1000}); } }catch(e){}
    window.__avatarReact = react;

    /* --- palavra de ativação: «Olá <nome>» --- */
    let wakeR = null;
    const wakeStart = () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SR || !A.wake || !A.on || wakeR) return;
      try{ const r = new SR(); wakeR = r; r.lang = cfg.lang === "en" ? "en-GB" : "pt-PT"; r.continuous = true; r.interimResults = false;
        r.onresult = ev => { const t = ev.results[ev.results.length - 1][0].transcript || ""; const nm = (typeof norm === "function" ? norm(A.name) : A.name.toLowerCase()), tn = typeof norm === "function" ? norm(t) : t.toLowerCase();
          const i = tn.indexOf(nm); if(i < 0) return; const rest = t.slice(i + A.name.length).replace(/^[\s,.!?]+/, "").trim();
          if(rest.length > 2) ask(rest); else { speakA("Diz, Rui."); setTimeout(() => { try{ r.stop(); }catch(e){} wakeR = null; listen(); }, 1200); } };
        r.onend = () => { wakeR = null; setTimeout(wakeStart, 800); }; r.onerror = () => {}; r.start(); }catch(e){ wakeR = null; }
    };
    const wakeStop = () => { try{ wakeR && wakeR.stop(); }catch(e){} wakeR = null; };
    setTimeout(wakeStart, 4000);

    /* --- v262: o microfone do Cockpit fala com o avatar quando a conversa está aberta (ou depois de tocar no 🎤 do avatar) --- */
    try{ const _hc = window.handleCommand; if(typeof _hc === "function"){ window.__hcOrig = _hc; window.handleCommand = async function(raw){
        const toAv = A.on && (!dlg.hidden || (window.__avRoute && Date.now() < window.__avRoute));
        if(toAv && String(raw || "").trim()){ window.__avRoute = 0; if(dlg.hidden) openDlg("talk"); try{ const h = document.getElementById("heard"); if(h) h.textContent = "“" + raw + "”"; }catch(e){} return ask(String(raw).trim()); }
        return _hc.apply(this, arguments); }; } }catch(e){}

    /* --- Definições: cartão para voltar a mostrar e configurar --- */
    setTimeout(() => { try{
      const bindAv = () => { const b = document.getElementById("avShow"); if(!b || b._avBound) return; b._avBound = 1; b.onclick = () => { A.on = true; saveA(); apply(); openDlg("look"); }; };
      bindAv(); setTimeout(bindAv, 800);
    }catch(e){} }, 400);
    /* cumprimenta uma vez quando abre a app */
    setTimeout(() => { try{ if(A.on && !sessionStorage.getItem("avHi")){ sessionStorage.setItem("avHi", "1"); const h = new Date().getHours(); speakA((h < 12 ? "Bom dia" : h < 20 ? "Boa tarde" : "Boa noite") + ", Rui! Toca em mim para conversarmos."); } }catch(e){} }, 6500);
  }catch(e){ console.log("avatar", e); }
})();
