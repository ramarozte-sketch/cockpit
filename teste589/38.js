
(function(){
  if(window.ANDROID) return;
  try{
    const media = document.getElementById("v-media"), rp = document.getElementById("radioPanel"); if(!media || !rp) return;
    const AVA = [["robo","🤖 Robô"],["gato","🐱 Gato DJ"],["pinguim","🐧 Pinguim"],["dino","🦖 Dinossauro"],["coelho","🐰 Coelho"],["polvo","🐙 Polvo"],["fantasma","👻 Fantasma"]];
    const FX = [["barras","📊 Barras"],["ondas","〰️ Ondas"],["circulo","⭕ Círculo"],["estrelas","✨ Estrelas"],["luzes","🪩 Discoteca"],["tunel","🌀 Túnel"],["fogo","🎆 Fogo de artifício"],["aurora","🌌 Aurora"]];
    const STY = AVA.concat(FX);
    const SRC = [["radio","📻 Rádio / Amp"],["mic","🎤 Colunas do carro"],["auto","🎵 Ritmo simulado"]];
    const box = document.createElement("div"); box.className = "panel"; box.id = "visPanel";
    box.innerHTML = '<details class="visDd"><summary class="visSum">Animações</summary><div class="visTop"><span class="spacer" style="flex:1"></span><label class="row small" style="gap:8px"><input type="checkbox" id="visOn"> Ligado</label></div>' +
      '<div class="visGrp"><span class="visGl">Avatares</span><div class="visSty" role="group" aria-label="Avatares">' + AVA.map(s => '<button type="button" data-s="' + s[0] + '">' + s[1] + '</button>').join("") + '</div></div>' +
      '<div class="visGrp"><span class="visGl">Efeitos visuais</span><div class="visSty" role="group" aria-label="Efeitos visuais">' + FX.map(s => '<button type="button" data-s="' + s[0] + '">' + s[1] + '</button>').join("") + '</div></div>' +
      '<div class="visSrc" role="group" aria-label="Som" style="margin-top:8px">' + SRC.map(s => '<button type="button" data-src="' + s[0] + '">' + s[1] + '</button>').join("") + '</div>' +
      '<div id="visWrap" hidden><canvas id="visCv"></canvas><div class="visHint" id="visHint"></div><button type="button" class="visFs" id="visFs" aria-label="Ecrã total">⛶</button><button type="button" class="visFs" id="visParty" style="right:66px" aria-label="Modo festa">🎉</button><div id="visBpm"></div><div id="visKar"><div class="k1"></div><div class="k2"></div></div><div id="visBig"><b></b><small></small></div></div>';
    box.innerHTML += '</details>';
    rp.after(box);
    const S = {on:LS.get("visOn", true), sty:LS.get("visSty", "robo"), src:LS.get("visSrc", "radio"), an:null, ctx:null, mic:null, data:null, wave:null, raf:0, t0:performance.now(), avgB:0.2, beat:0, lastBeat:0, parts:[], stars:[], blink:0, hint:"", corsTried:new WeakSet(), corsBad:new Set()};
    const $v = id => document.getElementById(id), cv0 = $v("visCv"), g0 = cv0.getContext("2d"), wrap = $v("visWrap");
    let cv = cv0, g = g0;   /* trocados por momentos para desenhar também no quadro do vídeo do YouTube Music */
    const paintBtns = () => { box.querySelectorAll("[data-s]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.s === S.sty))); box.querySelectorAll("[data-src]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.src === S.src))); $v("visOn").checked = !!S.on; wrap.hidden = !S.on; };
    paintBtns();

    /* --- som: analisador ligado à rádio (sem estragar o som) ou ao microfone --- */
    const AC = window.AudioContext || window.webkitAudioContext;
    const mkAn = c => { const a = c.createAnalyser(); a.fftSize = 1024; a.smoothingTimeConstant = 0.78; S.data = new Uint8Array(a.frequencyBinCount); S.wave = new Uint8Array(a.fftSize); return a; };
    const radioEl = () => $v("radioAud");
    window.__visWantsAn = () => !!S.on && S.src === "radio";
    /* v297: diagnóstico do avatar no log (a cada 6 s enquanto há música): de onde vem o som, se o analisador lê níveis e porquê o ritmo é simulado */
    setInterval(() => { try{
      if(!S.on || !window.__dbgEv) return;
      const el = radioEl(), WA = window.__wamp, ampOn = !!(WA && WA.playing && WA.playing()), radioOn = !!(el && !el.paused && (el.currentSrc || el.src));
      if(!ampOn && !radioOn && !S.mic) return;
      let mx = 0; if(S.data) for(let i = 0; i < S.data.length; i += 2) if(S.data[i] > mx) mx = S.data[i];
      let host = ""; try{ host = new URL(el.currentSrc || el.src, location.href).host; }catch(e){}
      window.__dbgEv(0, "avatar: estado", {fonte:S.src, amp:ampOn, radio:radioOn, rádio_host:host, crossOrigin:el && el.crossOrigin || "", ligadoWebAudio:!!(el && el._visAn), ctx:(window.__amp && window.__amp.ctx) ? window.__amp.ctx.state : (S.ctx ? S.ctx.state : null), semCORS:S.corsBad.size, mic:!!S.mic, nivelMax:mx, bpm:S.bpm || null, dica:S.hint || ""});
    }catch(e){} }, 6000);
    const safeSrc = el => { const u = el.currentSrc || el.src || ""; if(!u) return false; if(/^(blob:|data:)/i.test(u)) return true; try{ return new URL(u, location.href).origin === location.origin || el.crossOrigin === "anonymous"; }catch(e){ return false; } };
    const tapRadio = () => {
      const el = radioEl(); if(!el || el.paused || !(el.currentSrc || el.src)) { S.hint = "Liga uma rádio em cima (ou escolhe «Colunas do carro»)."; return null; }
      try{
        const A = window.__amp;
        if(el._amp && el._amp.g && A && A.ctx){ if(!el._visAn){ el._visAn = mkAn(A.ctx); el._amp.g.connect(el._visAn); } S.hint = ""; return el._visAn; }
        if(el._visAn){ S.hint = ""; return el._visAn; }
        if(!safeSrc(el)){
          /* rádio de outro site: só se pode ouvir o som se o servidor autorizar (CORS); tenta uma vez, sem cortar a rádio se falhar */
          const u = el.currentSrc || el.src;
          if(!S.corsBad.has(u) && !S.corsTried.has(el)){ S.corsTried.add(el); const t = el.currentTime;
            el.crossOrigin = "anonymous"; const back = () => { el.removeEventListener("error", back);
              S.corsBad.add(u); el.removeAttribute("crossorigin"); el.src = u; el.play().catch(() => {}); };
            el.addEventListener("error", back, {once:true}); el.src = u; el.play().catch(() => {}); try{ if(t) el.currentTime = t; }catch(e){} }
          S.hint = S.corsBad.has(u) ? "Esta rádio não deixa ler o som: uso o ritmo simulado (ou escolhe «Colunas do carro»)." : ""; return null;
        }
        const c = (A && A.ctx && A.ctx.state !== "closed") ? A.ctx : (S.ctx || (S.ctx = new AC({latencyHint:"playback"})));
        if(A && !A.ctx) A.ctx = c;
        if(c.state !== "running"){ c.resume().catch(() => {}); S.hint = ""; return null; }   /* v295: com o contexto parado a rádio ficava muda: só liga quando já está a correr */
        const src = c.createMediaElementSource(el), gn = c.createGain(), cp = c.createDynamicsCompressor();
        /* v296: mesma cadeia do Amplificador (ganho + limitador de segurança); antes o ganho do Amp (até 200 %) ia direto à saída: som altíssimo e distorcido */
        cp.threshold.value = -1; cp.knee.value = 0; cp.ratio.value = 20; cp.attack.value = 0.002; cp.release.value = 0.12;
        try{ gn.gain.value = A && A.pct ? A.pct() / 100 : 1; }catch(e){}
        src.connect(gn); gn.connect(cp); cp.connect(c.destination); el._amp = {g:gn}; if(A) A.used = (A.used || 0) + 1; el._visAn = mkAn(c); gn.connect(el._visAn);
        S.hint = ""; return el._visAn;
      }catch(e){ S.hint = "Não consegui ler o som desta rádio: uso o ritmo simulado."; return null; }
    };
    const tapMic = async () => {
      if(S.mic) return S.mic.an;
      try{
        const st = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:true}});
        const c = S.ctx || (S.ctx = new AC()); c.resume().catch(() => {});
        const an = mkAn(c); an.smoothingTimeConstant = 0.7; an.minDecibels = -105; an.maxDecibels = -35; c.createMediaStreamSource(st).connect(an);
        S.mic = {st, an}; S.hint = ""; return an;
      }catch(e){ S.hint = "Sem acesso ao microfone. Autoriza o microfone no browser do carro."; S.src = "auto"; paintBtns(); return null; }
    };
    const stopMic = () => { try{ if(S.mic){ S.mic.st.getTracks().forEach(t => t.stop()); S.mic = null; } }catch(e){} };

    /* v563: tempo (BPM) por autocorrelação da força das entradas de som */
    /* núcleo: x = força das entradas a R Hz → BPM ou 0 */
    function bpmAC(x, R){
      const N = x.length; let e0 = 0; for(let i = 0; i < N; i++) e0 += x[i] * x[i]; if(!e0) return [0, 0];
      const L0 = Math.floor(R * 60 / 185), L1 = Math.ceil(R * 60 / 65), s = new Float32Array(L1 + 2);
      for(let L = L0; L <= L1 + 1; L++){ let v = 0; for(let i = L; i < N; i++) v += x[i] * x[i - L]; s[L] = v / (N - L); }
      let bl = 0, best = 0; for(let L = L0 + 1; L <= L1; L++){ if(s[L] < s[L - 1] || s[L] < s[L + 1]) continue; const bp = 60 * R / L, w = Math.exp(-0.5 * Math.pow(Math.log2(bp / 120) / 1.0, 2)); if(s[L] * w > best){ best = s[L] * w; bl = L; } }
      if(!bl) return [0, 0];
      const a = s[bl - 1], b = s[bl], c = s[bl + 1], den = a - 2 * b + c, off = den ? Math.max(-.5, Math.min(.5, .5 * (a - c) / den)) : 0;
      let bp = 60 * R / (bl + off); while(bp < 78) bp *= 2; while(bp > 165) bp /= 2;   /* intervalo habitual dos DJs */
      return [bp, s[bl] / (e0 / N)];
    }
    /* --- níveis: graves, médios, agudos e batida --- */
    const levels = (now) => {
      let an = null;
      const WA = window.__wamp;
      if(S.src === "radio" && WA && WA.playing && WA.playing()){ an = WA.cur && WA.cur.yt ? null : WA.an; if(an && (!S.data || an.frequencyBinCount !== S.data.length)){ S.data = new Uint8Array(an.frequencyBinCount); S.wave = new Uint8Array(an.fftSize); } if(!an) S.hint = WA.cur && WA.cur.yt ? "YouTube Music: o som não pode ser lido, a dança segue um ritmo simulado." : "A música do Amp não deixa ler o som: ritmo simulado."; else S.hint = ""; }
      else if(S.src === "radio"){ an = tapRadio();
        /* v292: rádio que não deixa ler o som nem pelo proxy: se o microfone já está autorizado, o avatar segue o som das colunas */
        if(!an && S.corsBad.size){ if(S.mic) an = S.mic.an; else if(!S.autoMicTried){ S.autoMicTried = true; try{ navigator.permissions && navigator.permissions.query({name:"microphone"}).then(r => { if(r.state === "granted") tapMic(); }).catch(() => {}); }catch(e){} } } }
      else if(S.src === "mic") an = S.mic ? S.mic.an : null;
      let b, m, t, spec;
      if(an){ an.getByteFrequencyData(S.data); an.getByteTimeDomainData(S.wave);
        /* v293: analisador «mudo» (o servidor da música não deixa ler o som: tudo zero) → depois de 2 s passa ao microfone ou ao ritmo simulado, em vez de ficar parado */
        { let mx = 0; const dd = S.data; for(let i = 0; i < dd.length; i += 3) if(dd[i] > mx) mx = dd[i];
          if(mx === 0 && an !== (S.mic && S.mic.an)){ S.zero = (S.zero || 0) + 1; if(S.zero > 120){ S.deadHint = true; if(S.mic){ an = S.mic.an; an.getByteFrequencyData(S.data); an.getByteTimeDomainData(S.wave); } else { if(!S.autoMicTried){ S.autoMicTried = true; try{ navigator.permissions && navigator.permissions.query({name:"microphone"}).then(r => { if(r.state === "granted") tapMic(); }).catch(() => {}); }catch(e){} } an = null; } } }
          else if(mx > 0) S.zero = 0; }
      }
      if(an){ const d = S.data, n = d.length;
        const avg = (a, z) => { let s = 0; for(let i = a; i < z; i++) s += d[i]; return s / (z - a) / 255; };
        b = avg(1, 8); m = avg(8, 60); t = avg(60, 200); spec = d;
        /* v293: o microfone apanha as colunas baixinho (e o carro tira-lhe o som que ele próprio toca): ganho automático para a batida ser detetada na mesma */
        if(S.mic && an === S.mic.an){ S.pk = Math.max((S.pk || 0.05) * 0.997, b, m, t); const k = Math.min(6, 0.45 / Math.max(S.pk, 0.04)); b = Math.min(1, b * k); m = Math.min(1, m * k); t = Math.min(1, t * k); }
      } else if(S.src !== "auto"){   /* v563: sem som (rádio parada ou sem acesso ao som): tudo parado, sem batida inventada */
        b = 0; m = 0; t = 0; if(!S.zeroSpec) S.zeroSpec = new Uint8Array(512); spec = S.zeroSpec;
        if(!S.wave) S.wave = new Uint8Array(1024); S.wave.fill(128);
      } else {   /* ritmo simulado (só quando escolhido): 118 batidas por minuto */
        const ph = (now / 1000) * (118 / 60), k = ph % 1; b = Math.max(0, 1 - k * 2.6) * 0.85 + 0.12; m = 0.35 + 0.25 * Math.sin(ph * Math.PI); t = 0.25 + 0.2 * Math.sin(ph * 4.1);
        spec = null; if(!S.fake) S.fake = new Uint8Array(512); for(let i = 0; i < 512; i++){ const f = i / 512; S.fake[i] = 255 * Math.max(0, (b * (1 - f) * 0.9 + m * Math.sin(f * 9 + ph) * 0.3 + t * f * 0.4) * (0.75 + 0.25 * Math.sin(i * 0.7 + now / 300))); } spec = S.fake;
        if(!S.wave) S.wave = new Uint8Array(1024); for(let i = 0; i < 1024; i++) S.wave[i] = 128 + 90 * b * Math.sin(i / 1024 * Math.PI * 6 + now / 120) * Math.sin(i / 1024 * Math.PI);
      }
      /* v563: BPM a sério: força das «entradas» de som nos graves/médios (fluxo espectral) dos últimos 8 s e autocorrelação
         entre 70 e 180 BPM (com leve preferência perto de 120); só aparece com confiança e desaparece em silêncio */
      if(an){
        const d = S.data, lim = Math.min(d.length, 48); if(!S.prevD || S.prevD.length !== lim) S.prevD = new Uint8Array(lim);
        let fl = 0, en = 0; for(let i = 1; i < lim; i++){ const df = d[i] - S.prevD[i]; if(df > 0) fl += df; en += d[i]; S.prevD[i] = d[i]; }
        (S.onH = S.onH || []).push([now, fl]); while(S.onH.length && now - S.onH[0][0] > 8000) S.onH.shift();
        if(en < lim * 6){ S.quiet = (S.quiet || 0) + 1; if(S.quiet > 90){ S.bpm = 0; S.onH = []; S.ivs = []; } } else S.quiet = 0;
        if(S.onH.length > 120 && now - S.onH[0][0] > 5000 && (!S.acAt || now - S.acAt > 1000)){
          S.acAt = now; const R = 100, t0 = S.onH[0][0], N = Math.floor((now - t0) / 1000 * R), x = new Float32Array(N); let j = 0;
          for(let i = 0; i < N; i++){ const tt = t0 + i * 1000 / R; while(j < S.onH.length - 2 && S.onH[j + 1][0] < tt) j++; const A1 = S.onH[j], B1 = S.onH[j + 1] || A1, k = B1[0] > A1[0] ? Math.max(0, Math.min(1, (tt - A1[0]) / (B1[0] - A1[0]))) : 0; x[i] = A1[1] + (B1[1] - A1[1]) * k; }
          let mu = 0; for(let i = 0; i < N; i++) mu += x[i]; mu /= N; for(let i = 0; i < N; i++) x[i] = Math.max(0, x[i] - mu);
          const [bp, conf] = bpmAC(x, R); if(bp && conf > 0.18) S.bpm = Math.round(S.bpm ? S.bpm * 0.5 + bp * 0.5 : bp);
        }
      }
      S.avgB = S.avgB * 0.94 + b * 0.06;
      if(b > S.avgB * 1.35 && b > 0.18 && now - S.lastBeat > 260){
        const iv = now - S.lastBeat; if(iv > 280 && iv < 1500){ (S.ivs = S.ivs || []).push(iv); if(S.ivs.length > 12) S.ivs.shift(); }
        S.lastBeat = now; S.beat = 1; S.beatN = (S.beatN || 0) + 1; } else S.beat *= 0.9;
      /* batidas por minuto: mediana dos últimos intervalos, dobrada/meia para ficar entre 70 e 180 */
      if(!an && S.src === "auto" && S.ivs && S.ivs.length >= 5 && (!S.bpmAt || now - S.bpmAt > 1000)){ S.bpmAt = now; const so = S.ivs.slice().sort((x, y) => x - y); let bpm = 60000 / so[so.length >> 1]; while(bpm < 70) bpm *= 2; while(bpm > 180) bpm /= 2; S.bpm = Math.round(S.bpm ? S.bpm * 0.6 + bpm * 0.4 : bpm); }
      if(!an){ S.bpm = S.src === "auto" ? 118 : 0; S.onH = []; }
      return {b, m, t, spec};
    };

    /* --- desenhos --- */
    const W = () => cv.width, H = () => cv.height;
    const hue = now => (now / 40) % 360;
    function drawBarras(L, now){ const w = W(), h = H(), n = 48, d = L.spec, bw = w / n;
      for(let i = 0; i < n; i++){ const v = d ? d[Math.floor(Math.pow(i / n, 1.6) * d.length * 0.7)] / 255 : 0; const bh = Math.max(4, v * h * 0.85);
        g.fillStyle = "hsl(" + ((hue(now) + i * 6) % 360) + ",90%," + (45 + v * 25) + "%)"; const x = i * bw + 2; g.beginPath(); g.roundRect ? g.roundRect(x, h - bh, bw - 4, bh, 6) : g.rect(x, h - bh, bw - 4, bh); g.fill();
        g.fillStyle = "#ffffff22"; g.fillRect(x, h - bh - 8, bw - 4, 3); } }
    function drawOndas(L, now){ const w = W(), h = H(), d = S.wave; for(let k = 0; k < 3; k++){ g.beginPath(); g.lineWidth = 4 - k; g.strokeStyle = "hsla(" + ((hue(now) + k * 50) % 360) + ",90%,65%," + (0.9 - k * 0.25) + ")";
        for(let i = 0; i < d.length; i += 4){ const x = i / d.length * w, y = h / 2 + ((d[i] - 128) / 128) * h * 0.42 * (1 + k * 0.25) * (k % 2 ? -1 : 1); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }
    function drawCirculo(L, now){ const w = W(), h = H(), cx = w / 2, cy = h / 2, r0 = Math.min(w, h) * 0.18 * (1 + L.b * 0.35), d = L.spec, n = 90;
      g.save(); g.translate(cx, cy); g.rotate(now / 4000);
      for(let i = 0; i < n; i++){ const v = d ? d[Math.floor(i / n * d.length * 0.6)] / 255 : 0, a = i / n * Math.PI * 2, len = 10 + v * Math.min(w, h) * 0.3;
        g.strokeStyle = "hsl(" + ((hue(now) + i * 4) % 360) + ",95%,62%)"; g.lineWidth = 4; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len)); g.stroke(); }
      g.restore(); g.fillStyle = "hsla(" + hue(now) + ",90%,60%," + (0.25 + S.beat * 0.5) + ")"; g.beginPath(); g.arc(cx, cy, r0 * 0.8, 0, Math.PI * 2); g.fill(); }
    function drawEstrelas(L, now){ const w = W(), h = H();
      if(S.stars.length < 160) for(let i = 0; i < 160; i++) S.stars.push({x:Math.random() - 0.5, y:Math.random() - 0.5, z:Math.random()});
      const sp = 0.004 + L.b * 0.03 + S.beat * 0.02;
      for(const s of S.stars){ s.z -= sp; if(s.z <= 0.02){ s.x = Math.random() - 0.5; s.y = Math.random() - 0.5; s.z = 1; }
        const x = w / 2 + s.x / s.z * w * 0.6, y = h / 2 + s.y / s.z * h * 0.6, r = (1 - s.z) * 3.5 + L.t * 2;
        g.fillStyle = "hsla(" + ((hue(now) + s.z * 200) % 360) + ",80%,80%," + (1 - s.z) + ")"; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      if(S.beat > 0.95) for(let i = 0; i < 18; i++) S.parts.push({x:w / 2, y:h / 2, vx:(Math.random() - 0.5) * 9, vy:(Math.random() - 0.5) * 9, l:1, h:hue(now) + Math.random() * 80});
      drawParts(); }
    function drawParts(){ S.parts = S.parts.filter(p => (p.l -= 0.02) > 0); for(const p of S.parts){ p.x += p.vx; p.y += p.vy; p.vy += 0.08; g.fillStyle = "hsla(" + p.h + ",90%,65%," + p.l + ")"; g.beginPath(); g.arc(p.x, p.y, 3 + p.l * 3, 0, Math.PI * 2); g.fill(); } }
    function drawLuzes(L, now){ const w = W(), h = H();
      for(let k = 0; k < 6; k++){ const a = now / (900 + k * 170) + k, x = w / 2 + Math.sin(a) * w * 0.4, hh = (hue(now) + k * 60) % 360;
        const gr = g.createLinearGradient(w / 2, -20, x, h); gr.addColorStop(0, "hsla(" + hh + ",100%,70%," + (0.15 + L.b * 0.5) + ")"); gr.addColorStop(1, "hsla(" + hh + ",100%,60%,0)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2 - 10, -20); g.lineTo(x - 60 - L.m * 60, h); g.lineTo(x + 60 + L.m * 60, h); g.lineTo(w / 2 + 10, -20); g.fill(); }
      const r = Math.min(w, h) * 0.12; g.save(); g.translate(w / 2, h * 0.22); g.rotate(now / 1500);
      for(let i = 0; i < 40; i++){ const a = i / 40 * Math.PI * 2; g.fillStyle = "hsla(" + ((hue(now) + i * 9) % 360) + ",60%," + (55 + 30 * Math.sin(now / 200 + i)) + "%,.9)"; g.fillRect(Math.cos(a) * r * 0.8 - 5, Math.sin(a) * r * 0.8 - 5, 10, 10); }
      g.restore(); g.fillStyle = "#cfd8e8"; g.beginPath(); g.arc(w / 2, h * 0.22, r * 0.55, 0, Math.PI * 2); g.fill(); }

    /* robô fofinho: salta com os graves, abana os braços com os médios, a antena brilha com os agudos, a boca é um equalizador */
    function drawRobo(L, now){
      const w = W(), h = H(), s = Math.min(w / 480, h / 320) * 1.0, cx = w / 2, gy = h * 0.9, tt = now / 1000 * ((S.bpm || 118) / 118), bn = S.beatN || 0;
      const jump = L.b * 26 * s + S.beat * 10 * s, sq = 1 + S.beat * 0.08, lean = Math.sin(tt * 2.2) * 0.12 + (bn % 2 ? 0.08 : -0.08) * S.beat;
      /* chão com sombra e luzes */
      g.fillStyle = "#0008"; g.beginPath(); g.ellipse(cx, gy, 90 * s * (1 - L.b * 0.25), 14 * s, 0, 0, Math.PI * 2); g.fill();
      for(let i = 0; i < 9; i++){ g.fillStyle = "hsla(" + ((hue(now) + i * 40) % 360) + ",90%,60%," + (0.25 + (bn + i) % 3 * 0.25 * S.beat + 0.15) + ")"; g.fillRect(cx - 220 * s + i * 50 * s, gy + 14 * s, 40 * s, 6 * s); }
      g.save(); g.translate(cx, gy - jump); g.rotate(lean); g.scale(1 / sq, sq);
      const body = "#8fd3ff", dark = "#2a3b55", acc = "hsl(" + hue(now) + ",90%,62%)";
      /* pernas */
      const legK = Math.sin(tt * 6) * 10 * s * (0.3 + L.b);
      g.strokeStyle = dark; g.lineWidth = 14 * s; g.lineCap = "round";
      g.beginPath(); g.moveTo(-26 * s, -40 * s); g.lineTo(-30 * s - legK * 0.3, -14 * s + Math.max(0, legK)); g.lineTo(-34 * s, 0); g.stroke();
      g.beginPath(); g.moveTo(26 * s, -40 * s); g.lineTo(30 * s + legK * 0.3, -14 * s + Math.max(0, -legK)); g.lineTo(34 * s, 0); g.stroke();
      g.fillStyle = dark; g.beginPath(); g.ellipse(-36 * s, 2 * s, 18 * s, 8 * s, 0, 0, Math.PI * 2); g.ellipse(36 * s, 2 * s, 18 * s, 8 * s, 0, 0, Math.PI * 2); g.fill();
      /* braços */
      /* braços para fora e para cima com os médios; alternam o braço mais alto em cada batida */
      const wave = L.m * 1.8 + 0.25, up = bn % 2 ? 1 : 0;
      const aL = 0.35 + wave * (up ? 1.5 : 0.6) + Math.sin(tt * 5) * 0.25, aR = 0.35 + wave * (up ? 0.6 : 1.5) + Math.sin(tt * 5 + 1.3) * 0.25;
      const arm = (x, a) => { g.save(); g.translate(x, -122 * s); g.rotate(a); g.strokeStyle = body; g.lineWidth = 13 * s; g.lineCap = "round"; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 46 * s); g.stroke(); g.fillStyle = acc; g.beginPath(); g.arc(0, 52 * s, 10 * s, 0, Math.PI * 2); g.fill(); g.restore(); };
      /* corpo */
      g.fillStyle = body; rr(-52 * s, -140 * s, 104 * s, 104 * s, 26 * s); g.fill();
      arm(-50 * s, aL); arm(50 * s, -aR);
      g.fillStyle = "#ffffff55"; rr(-40 * s, -132 * s, 30 * s, 10 * s, 5 * s); g.fill();
      /* coração no peito a bater */
      const hb = 1 + S.beat * 0.35; g.save(); g.translate(0, -88 * s); g.scale(hb * s, hb * s); g.fillStyle = "#ff6b9a"; g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-16, -6, -8, -18, 0, -8); g.bezierCurveTo(8, -18, 16, -6, 0, 8); g.fill(); g.restore();
      /* cabeça */
      g.save(); g.translate(0, -150 * s); g.rotate(Math.sin(tt * 3.1) * 0.12 + S.beat * 0.06 * (bn % 2 ? 1 : -1));
      g.fillStyle = body; rr(-62 * s, -92 * s, 124 * s, 92 * s, 30 * s); g.fill();
      g.fillStyle = "#13203a"; rr(-50 * s, -80 * s, 100 * s, 66 * s, 22 * s); g.fill();
      /* olhos (piscam e fecham de alegria na batida forte) */
      if(now > S.blink){ S.blink = now + 2500 + Math.random() * 3000; S.blinkUntil = now + 140; }
      const happy = S.beat > 0.8, closed = now < (S.blinkUntil || 0);
      g.strokeStyle = g.fillStyle = "#9ff3ff"; g.lineWidth = 5 * s;
      [-22, 22].forEach(ex => { if(happy || closed){ g.beginPath(); g.arc(ex * s, -48 * s, 10 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
        else { g.beginPath(); g.ellipse(ex * s, -50 * s, 10 * s, 13 * s, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(ex * s + 3 * s, -55 * s, 3.5 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = "#9ff3ff"; } });
      g.fillStyle = "#ff8fb366"; g.beginPath(); g.ellipse(-36 * s, -30 * s, 9 * s, 5 * s, 0, 0, Math.PI * 2); g.ellipse(36 * s, -30 * s, 9 * s, 5 * s, 0, 0, Math.PI * 2); g.fill();
      /* boca = equalizador */
      const d = L.spec; for(let i = 0; i < 7; i++){ const v = d ? d[2 + i * 9] / 255 : 0.2; const bh = 3 * s + v * 14 * s; g.fillStyle = "hsl(" + ((hue(now) + i * 25) % 360) + ",95%,65%)"; g.fillRect(-21 * s + i * 6.5 * s, -24 * s - bh / 2, 4.5 * s, bh); }
      /* antena */
      g.strokeStyle = dark; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(0, -92 * s); g.quadraticCurveTo(Math.sin(tt * 7) * 12 * s, -112 * s, Math.sin(tt * 6) * 8 * s, -124 * s); g.stroke();
      g.fillStyle = "hsl(" + ((hue(now) + 180) % 360) + ",100%," + (55 + L.t * 40) + "%)"; g.shadowColor = g.fillStyle; g.shadowBlur = 10 + L.t * 30; g.beginPath(); g.arc(Math.sin(tt * 6) * 8 * s, -126 * s, (7 + L.t * 5) * s, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
      g.restore(); g.restore();
      /* notas musicais a voar na batida */
      if(S.beat > 0.95 && Math.random() < 0.8) S.parts.push({x:cx + (Math.random() - 0.5) * 120 * s, y:gy - 220 * s, vx:(Math.random() - 0.5) * 2, vy:-2 - Math.random() * 2, l:1, h:hue(now), note:Math.random() < 0.5 ? "♪" : "♫"});
      S.parts = S.parts.filter(p => (p.l -= 0.012) > 0); for(const p of S.parts){ p.x += p.vx; p.y += p.vy; g.fillStyle = "hsla(" + p.h + ",90%,70%," + p.l + ")"; g.font = (22 * s) + "px sans-serif"; g.fillText(p.note || "•", p.x, p.y); }
    }
    /* outros dançarinos: gato DJ, pinguim e dinossauro (mesmo ritmo do robô; a velocidade da dança segue as batidas por minuto) */
    function drawBicho(L, now, kind){
      const w = W(), h = H(), s = Math.min(w / 480, h / 320), cx = w / 2, gy = h * 0.9, sp = (S.bpm || 118) / 118, tt = now / 1000 * sp, bn = S.beatN || 0;
      const jump = L.b * 22 * s + S.beat * 8 * s, sw = Math.sin(tt * Math.PI * 2 * (118 / 60) / 2) * 0.16;
      g.fillStyle = "#0008"; g.beginPath(); g.ellipse(cx, gy, 80 * s, 12 * s, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(cx, gy - jump); g.rotate(sw); const sq = 1 + S.beat * 0.07; g.scale(1 / sq, sq);
      const eye = (x, y, r, happy) => { if(happy){ g.strokeStyle = "#222"; g.lineWidth = 4 * s; g.beginPath(); g.arc(x, y + 2 * s, r, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } else { g.fillStyle = "#1a1a2a"; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x + r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2); g.fill(); } };
      if(now > S.blink){ S.blink = now + 2500 + Math.random() * 3000; S.blinkUntil = now + 140; }
      const hap = S.beat > 0.8 || now < (S.blinkUntil || 0), armA = 0.4 + L.m * 1.6;
      if(kind === "gato"){
        const fur = "#f2a65a", dk = "#c9773a";
        g.fillStyle = fur; g.beginPath(); g.ellipse(0, -60 * s, 46 * s, 58 * s, 0, 0, Math.PI * 2); g.fill();   /* corpo */
        g.strokeStyle = fur; g.lineWidth = 10 * s; g.lineCap = "round"; g.beginPath(); g.moveTo(40 * s, -30 * s); g.quadraticCurveTo(90 * s, -40 * s + Math.sin(tt * 6) * 20 * s, 70 * s, -100 * s); g.stroke();   /* cauda */
        g.save(); g.translate(0, -130 * s); g.rotate(Math.sin(tt * 4) * 0.15);
        g.fillStyle = fur; g.beginPath(); g.arc(0, 0, 44 * s, 0, Math.PI * 2); g.fill();
        [[-1], [1]].forEach(([k]) => { g.beginPath(); g.moveTo(k * 40 * s, -14 * s); g.lineTo(k * 30 * s, -58 * s + (k > 0 ? S.beat * 6 * s : 0)); g.lineTo(k * 10 * s, -38 * s); g.fill(); });
        g.fillStyle = "#222"; g.fillRect(-46 * s, -10 * s, 92 * s, 6 * s); g.beginPath(); g.arc(-46 * s, 0, 14 * s, 0, Math.PI * 2); g.arc(46 * s, 0, 14 * s, 0, Math.PI * 2); g.fill();   /* auscultadores */
        g.fillStyle = "hsl(" + hue(now) + ",90%,60%)"; g.beginPath(); g.arc(-46 * s, 0, 8 * s, 0, Math.PI * 2); g.arc(46 * s, 0, 8 * s, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#111"; g.fillRect(-30 * s, -12 * s, 26 * s, 12 * s); g.fillRect(4 * s, -12 * s, 26 * s, 12 * s); g.fillRect(-4 * s, -9 * s, 8 * s, 3 * s);   /* óculos de sol */
        g.fillStyle = "#ff8fa3"; g.beginPath(); g.moveTo(-5 * s, 8 * s); g.lineTo(5 * s, 8 * s); g.lineTo(0, 14 * s); g.fill();
        g.strokeStyle = "#7a4a22"; g.lineWidth = 2 * s; [[-1], [1]].forEach(([k]) => { g.beginPath(); g.moveTo(k * 12 * s, 14 * s); g.lineTo(k * 38 * s, 10 * s); g.stroke(); });
        g.restore();
        /* mesa de DJ com disco a rodar e pata a fazer scratch */
        g.fillStyle = "#2b2f3d"; rr(-70 * s, -48 * s, 140 * s, 34 * s, 8 * s); g.fill();
        g.save(); g.translate(-28 * s, -52 * s); g.scale(1, 0.35); g.rotate(tt * 6); g.fillStyle = "#111"; g.beginPath(); g.arc(0, 0, 26 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = "hsl(" + hue(now) + ",80%,55%)"; g.beginPath(); g.arc(0, 0, 8 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.fillRect(0, -2 * s, 20 * s, 4 * s); g.restore();
        g.fillStyle = dk; g.beginPath(); g.arc(-28 * s + Math.sin(tt * 9) * 10 * s * (0.4 + L.b), -60 * s, 11 * s, 0, Math.PI * 2); g.fill();
        g.save(); g.translate(40 * s, -80 * s); g.rotate(-armA); g.strokeStyle = fur; g.lineWidth = 12 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -42 * s); g.stroke(); g.fillStyle = dk; g.beginPath(); g.arc(0, -46 * s, 10 * s, 0, Math.PI * 2); g.fill(); g.restore();
      } else if(kind === "pinguim"){
        const bk = "#1d2333", wh = "#f4f6fb", or = "#ffa22b";
        g.fillStyle = or; g.beginPath(); g.ellipse(-22 * s + Math.sin(tt * 8) * 3 * s, 0, 18 * s, 8 * s, 0, 0, Math.PI * 2); g.ellipse(22 * s - Math.sin(tt * 8) * 3 * s, 0, 18 * s, 8 * s, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = bk; g.beginPath(); g.ellipse(0, -80 * s, 56 * s, 80 * s, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = wh; g.beginPath(); g.ellipse(0, -66 * s, 40 * s, 62 * s, 0, 0, Math.PI * 2); g.fill();
        [[-1, armA * 1.2], [1, armA * (bn % 2 ? 1.4 : 0.6)]].forEach(([k, an]) => { g.save(); g.translate(k * 50 * s, -100 * s); g.rotate(k * (0.3 + an)); g.fillStyle = bk; g.beginPath(); g.ellipse(0, 30 * s, 12 * s, 36 * s, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
        eye(-18 * s, -120 * s, 9 * s, hap); eye(18 * s, -120 * s, 9 * s, hap);
        g.fillStyle = or; g.beginPath(); g.moveTo(-10 * s, -104 * s); g.lineTo(10 * s, -104 * s); g.lineTo(0, -92 * s + S.beat * 4 * s); g.fill();
        g.fillStyle = "#ff8fb366"; g.beginPath(); g.ellipse(-32 * s, -100 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2); g.ellipse(32 * s, -100 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "hsl(" + hue(now) + ",90%,55%)"; g.beginPath(); g.moveTo(0, -60 * s); g.lineTo(-18 * s, -70 * s); g.lineTo(-18 * s, -50 * s); g.moveTo(0, -60 * s); g.lineTo(18 * s, -70 * s); g.lineTo(18 * s, -50 * s); g.fill();   /* laço */
      } else if(kind === "coelho"){
        const wh = "#f5f1ff", pk = "#ffb3cf";
        g.fillStyle = wh; g.beginPath(); g.ellipse(-20 * s, 0, 18 * s, 9 * s, 0, 0, Math.PI * 2); g.ellipse(20 * s, 0, 18 * s, 9 * s, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(0, -55 * s, 42 * s, 52 * s, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(-38 * s, -30 * s, 12 * s, 0, Math.PI * 2); g.fill();
        [[-1], [1]].forEach(([k]) => { g.save(); g.translate(k * 40 * s, -80 * s); g.rotate(k * (0.4 + armA)); g.fillStyle = wh; g.beginPath(); g.ellipse(0, 22 * s, 10 * s, 24 * s, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
        g.save(); g.translate(0, -125 * s); g.rotate(Math.sin(tt * 4) * 0.14);
        [[-1, 0.25 + S.beat * 0.3], [1, -0.15 - L.t * 0.6]].forEach(([k, r]) => { g.save(); g.translate(k * 16 * s, -30 * s); g.rotate(k * 0.15 + r); g.fillStyle = wh; g.beginPath(); g.ellipse(0, -36 * s, 12 * s, 40 * s, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = pk; g.beginPath(); g.ellipse(0, -36 * s, 6 * s, 30 * s, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
        g.fillStyle = wh; g.beginPath(); g.arc(0, 0, 38 * s, 0, Math.PI * 2); g.fill();
        eye(-14 * s, -6 * s, 7 * s, hap); eye(14 * s, -6 * s, 7 * s, hap);
        g.fillStyle = pk; g.beginPath(); g.arc(0, 8 * s, 4 * s, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(-24 * s, 10 * s, 7 * s, 4 * s, 0, 0, Math.PI * 2); g.ellipse(24 * s, 10 * s, 7 * s, 4 * s, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#fff"; g.fillRect(-4 * s, 14 * s, 8 * s, 6 * s + L.b * 3 * s); g.restore();
      } else if(kind === "polvo"){
        const pu = "#b27bff", dk = "#8a55e0";
        for(let i = 0; i < 6; i++){ const x0 = (-50 + i * 20) * s; g.strokeStyle = i % 2 ? pu : dk; g.lineWidth = 12 * s; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, -50 * s);
          for(let k = 1; k <= 6; k++){ const yy = -50 * s + k * 9 * s, xx = x0 + Math.sin(tt * 4 + i + k * 0.7) * (6 + L.m * 18) * s * (k / 6) + (i - 2.5) * k * 2 * s; g.lineTo(xx, yy); } g.stroke(); }
        g.fillStyle = pu; g.beginPath(); g.ellipse(0, -100 * s, 58 * s, 62 * s * (1 + S.beat * 0.05), 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffffff33"; g.beginPath(); g.ellipse(-22 * s, -130 * s, 14 * s, 9 * s, -0.4, 0, Math.PI * 2); g.fill();
        eye(-20 * s, -100 * s, 10 * s, hap); eye(20 * s, -100 * s, 10 * s, hap);
        g.strokeStyle = "#4a2a80"; g.lineWidth = 4 * s; g.beginPath(); g.arc(0, -82 * s, 10 * s + L.b * 4 * s, 0.2, Math.PI - 0.2); g.stroke();
        g.fillStyle = "#ff8fb366"; g.beginPath(); g.ellipse(-36 * s, -86 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2); g.ellipse(36 * s, -86 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2); g.fill();
        for(let i = 0; i < 3; i++){ const by = ((now / 1000 * 30 + i * 40) % 120); g.strokeStyle = "rgba(180,220,255," + (1 - by / 120) + ")"; g.lineWidth = 2; g.beginPath(); g.arc(50 * s + i * 8 * s, -170 * s - by * s, 5 * s, 0, Math.PI * 2); g.stroke(); }
      } else if(kind === "fantasma"){
        const wh = "rgba(240,245,255," + (0.82 + L.t * 0.18) + ")", fl = Math.sin(tt * 3) * 10 * s;
        g.translate(0, -fl - 20 * s);
        g.shadowColor = "hsl(" + hue(now) + ",90%,70%)"; g.shadowBlur = 20 + L.b * 30;
        g.fillStyle = wh; g.beginPath(); g.moveTo(-50 * s, -40 * s); g.arc(0, -100 * s, 50 * s, Math.PI, 0); g.lineTo(50 * s, -10 * s);
        for(let k = 0; k < 5; k++){ const x = 50 * s - (k + 1) * 20 * s, y = -10 * s + (k % 2 ? -12 : 4) * s + Math.sin(tt * 6 + k) * 5 * s; g.lineTo(x, y); } g.closePath(); g.fill(); g.shadowBlur = 0;
        [[-1, armA], [1, armA * (bn % 2 ? 1.4 : 0.6)]].forEach(([k, an]) => { g.save(); g.translate(k * 46 * s, -70 * s); g.rotate(k * (0.6 + an)); g.fillStyle = wh; g.beginPath(); g.ellipse(0, 18 * s, 9 * s, 20 * s, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
        eye(-17 * s, -104 * s, 9 * s, hap); eye(17 * s, -104 * s, 9 * s, hap);
        g.fillStyle = "#2a2f45"; g.beginPath(); g.ellipse(0, -80 * s, 7 * s, 5 * s + L.b * 9 * s, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ff8fb366"; g.beginPath(); g.ellipse(-30 * s, -88 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2); g.ellipse(30 * s, -88 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2); g.fill();
      } else {
        const gr = "#6ccf6a", dk = "#3f9a45";
        g.strokeStyle = gr; g.lineWidth = 22 * s; g.lineCap = "round"; g.beginPath(); g.moveTo(-30 * s, -40 * s); g.quadraticCurveTo(-90 * s, -20 * s, -120 * s + Math.sin(tt * 5) * 14 * s, -30 * s); g.stroke();   /* cauda */
        g.lineWidth = 16 * s; g.beginPath(); g.moveTo(-18 * s, -30 * s); g.lineTo(-22 * s, 0); g.moveTo(18 * s, -30 * s); g.lineTo(22 * s - Math.sin(tt * 8) * 6 * s, 0); g.stroke();
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, -70 * s, 48 * s, 56 * s, -0.15, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#cfeec0"; g.beginPath(); g.ellipse(8 * s, -62 * s, 28 * s, 40 * s, -0.15, 0, Math.PI * 2); g.fill();
        g.fillStyle = dk; for(let i = 0; i < 5; i++){ g.beginPath(); g.moveTo(-40 * s + i * 4 * s, -110 * s + i * 18 * s); g.lineTo(-58 * s + i * 4 * s, -104 * s + i * 18 * s); g.lineTo(-44 * s + i * 4 * s, -96 * s + i * 18 * s); g.fill(); }
        g.save(); g.translate(30 * s, -96 * s); g.rotate(-armA * 0.6); g.strokeStyle = gr; g.lineWidth = 8 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(18 * s, -14 * s); g.stroke(); g.restore();
        g.save(); g.translate(14 * s, -140 * s); g.rotate(Math.sin(tt * 4) * 0.18 - S.beat * 0.1);
        g.fillStyle = gr; g.beginPath(); g.ellipse(10 * s, 0, 46 * s, 34 * s, 0, 0, Math.PI * 2); g.fill();
        eye(10 * s, -12 * s, 8 * s, hap); eye(34 * s, -10 * s, 7 * s, hap);
        g.strokeStyle = "#1e4d22"; g.lineWidth = 4 * s; g.beginPath(); g.arc(30 * s, 8 * s, 14 * s + L.b * 6 * s, 0.1, Math.PI - 0.4); g.stroke();
        g.fillStyle = "#ff8fb366"; g.beginPath(); g.ellipse(0, 6 * s, 7 * s, 4 * s, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.restore();
      if(S.beat > 0.95 && Math.random() < 0.8) S.parts.push({x:cx + (Math.random() - 0.5) * 140 * s, y:gy - 220 * s, vx:(Math.random() - 0.5) * 2, vy:-2 - Math.random() * 2, l:1, h:hue(now), note:Math.random() < 0.5 ? "♪" : "♫"});
      S.parts = S.parts.filter(p => (p.l -= 0.012) > 0); for(const p of S.parts){ p.x += p.vx; p.y += p.vy; g.fillStyle = "hsla(" + p.h + ",90%,70%," + p.l + ")"; g.font = (22 * s) + "px sans-serif"; g.fillText(p.note || "•", p.x, p.y); }
    }
    function drawTunel(L, now){ const w = W(), h = H(), cx = w / 2 + Math.sin(now / 1300) * w * 0.08, cy = h / 2 + Math.cos(now / 1700) * h * 0.08, n = 18, z0 = (now / 1000 * (0.6 + L.b * 2)) % 1;
      for(let i = n; i > 0; i--){ const z = (i - z0) / n, r = Math.pow(1 - z, 2.2) * Math.max(w, h) * 0.9 + 6, v = L.spec ? L.spec[Math.floor(i / n * 120)] / 255 : 0.4;
        g.strokeStyle = "hsla(" + ((hue(now) + i * 20) % 360) + ",90%," + (40 + v * 35) + "%," + (0.25 + (1 - z) * 0.75) + ")"; g.lineWidth = 2 + (1 - z) * 10 * (0.5 + L.b);
        g.save(); g.translate(cx, cy); g.rotate(now / 3000 + i * 0.12); g.beginPath(); for(let k = 0; k <= 6; k++){ const a = k / 6 * Math.PI * 2; k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); g.restore(); } }
    function drawFogo(L, now){ const w = W(), h = H();
      if(S.beat > 0.95 || (!S.fw || now - S.fw > 1400)){ S.fw = now; const x = w * (0.15 + Math.random() * 0.7), y = h * (0.15 + Math.random() * 0.4), hh = Math.random() * 360, n = 50 + Math.round(L.b * 60);
        for(let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 4.5 * (0.6 + L.m); S.parts.push({x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, l:1, h:hh + Math.random() * 30, fw:1}); } }
      S.parts = S.parts.filter(p => (p.l -= 0.013) > 0); for(const p of S.parts){ p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.05; g.fillStyle = "hsla(" + p.h + ",100%," + (55 + p.l * 20) + "%," + p.l + ")"; g.beginPath(); g.arc(p.x, p.y, 1.5 + p.l * 2.5, 0, Math.PI * 2); g.fill(); } }
    function drawAurora(L, now){ const w = W(), h = H();
      for(let k = 0; k < 4; k++){ const hh = (hue(now) + k * 50) % 360, amp = h * (0.08 + L.m * 0.18), base = h * (0.3 + k * 0.12);
        const gr = g.createLinearGradient(0, base - amp, 0, h); gr.addColorStop(0, "hsla(" + hh + ",90%,60%," + (0.18 + L.b * 0.3) + ")"); gr.addColorStop(1, "hsla(" + hh + ",90%,40%,0)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, h); for(let x = 0; x <= w; x += 12){ const y = base + Math.sin(x / w * Math.PI * (2 + k) + now / (900 + k * 300)) * amp + Math.sin(x / 70 + now / 400) * amp * 0.25; g.lineTo(x, y); } g.lineTo(w, h); g.fill(); }
      for(let i = 0; i < 40; i++){ const x = (i * 97 % 100) / 100 * w, y = (i * 53 % 100) / 100 * h * 0.5; g.fillStyle = "rgba(255,255,255," + (0.3 + 0.7 * Math.abs(Math.sin(now / 600 + i)) * L.t) + ")"; g.fillRect(x, y, 2, 2); } }
    function rr(x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    const DRAW = {tunel:drawTunel, fogo:drawFogo, aurora:drawAurora, coelho:(L, n) => drawBicho(L, n, "coelho"), polvo:(L, n) => drawBicho(L, n, "polvo"), fantasma:(L, n) => drawBicho(L, n, "fantasma"), gato:(L, n) => drawBicho(L, n, "gato"), pinguim:(L, n) => drawBicho(L, n, "pinguim"), dino:(L, n) => drawBicho(L, n, "dino"), robo:drawRobo, barras:drawBarras, ondas:drawOndas, circulo:drawCirculo, estrelas:drawEstrelas, luzes:drawLuzes};

    /* v258: o avatar usa as mesmas personagens (desenhadas no canvas dele) */
    window.__visDrawChar = (canvas, st, lv, now) => { const c0 = cv, gg = g; try{ cv = canvas; g = canvas.getContext("2d"); g.clearRect(0, 0, canvas.width, canvas.height); (DRAW[st] || drawRobo)(lv, now || performance.now()); }catch(e){} cv = c0; g = gg; };
    /* --- ciclo: só desenha com a página Media à vista e o quadro ligado --- */
    let lastHint = "";
    const frame = now => {
      S.raf = 0;
      if((!S.on && !ytNeed()) || currentView !== "media" || document.hidden){ return; }
      const r = wrap.getBoundingClientRect(), dpr = Math.min(1.5, window.devicePixelRatio || 1), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
      if(cw && (cv0.width !== cw || cv0.height !== ch)){ cv0.width = cw; cv0.height = ch; }
      const L = levels(now);
      g.fillStyle = S.sty === "estrelas" || S.sty === "robo" ? "rgba(5,7,13,.35)" : "rgba(5,7,13,.28)"; g.fillRect(0, 0, cv.width, cv.height);
      const chars = ["robo", "gato", "pinguim", "dino", "coelho", "polvo", "fantasma"];
      if(S.on){ if(chars.includes(S.sty)){ g.clearRect(0, 0, cv.width, cv.height); } try{ (DRAW[S.sty] || drawRobo)(L, now); }catch(e){} }
      /* YouTube Music em andamento: o Tesla tapa o vídeo; a animação aparece nesse quadro */
      try{ const yc = $v("wampYtCv"); if(yc){ const need = ytNeed(); yc.hidden = !need;
          if(need){ const r2 = yc.getBoundingClientRect(), d2 = Math.min(2, window.devicePixelRatio || 1); if(r2.width && (yc.width !== Math.round(r2.width * d2) || yc.height !== Math.round(r2.height * d2))){ yc.width = Math.round(r2.width * d2); yc.height = Math.round(r2.height * d2); }
            const yg = yc.getContext("2d"), st = S.on ? S.sty : "robo"; cv = yc; g = yg; g.fillStyle = "#05070d"; g.fillRect(0, 0, yc.width, yc.height);
            try{ (DRAW[st] || drawRobo)(L, now); }catch(e){} cv = cv0; g = g0; } } }catch(e){ cv = cv0; g = g0; }
      const hn = S.hint || (S.src === "auto" ? "Ritmo simulado (sem ouvir o som)." : ""); if(hn !== lastHint){ lastHint = hn; $v("visHint").textContent = hn; }
      try{ const bt = S.bpm ? "♩ " + S.bpm + " BPM" + (S.src === "auto" ? " (simulado)" : "") : ""; if(bt !== S.bpmTxt){ S.bpmTxt = bt; $v("visBpm").textContent = bt; } }catch(e){}
      try{ const WA = window.__wamp, ly = WA && WA.lyricNow ? WA.lyricNow() : null, k1 = ly ? ly.cur : "", k2 = ly ? ly.next : "";
        if(k1 !== S.k1 || k2 !== S.k2){ S.k1 = k1; S.k2 = k2; const K = $v("visKar"); K.querySelector(".k1").textContent = k1; K.querySelector(".k2").textContent = k2; K.classList.toggle("on", !!(k1 || k2)); K.classList.remove("pop"); void K.offsetWidth; if(k1) K.classList.add("pop"); } }catch(e){}
      if(wrap.classList.contains("party")){ try{ const WA = window.__wamp; let t1 = "", t2 = "";
          if(WA && WA.playing && WA.playing() && WA.cur){ t1 = WA.cur.title; t2 = WA.cur.artist; } else if(typeof radioCur !== "undefined" && radioCur){ t1 = radioCur.name; t2 = "Rádio"; } else { t1 = "Modo festa"; t2 = "liga uma rádio ou uma música"; }
          if(t1 !== S.pt1 || t2 !== S.pt2){ S.pt1 = t1; S.pt2 = t2; const B = $v("visBig"); B.querySelector("b").textContent = t1; B.querySelector("small").textContent = t2; }
          $v("visBig").style.transform = "translate(-50%,0) scale(" + (1 + S.beat * 0.06).toFixed(3) + ")"; }catch(e){} }
      S.raf = requestAnimationFrame(frame);
    };
    const ytNeed = () => { try{ const WA = window.__wamp; return !!(WA && WA.cur && WA.cur.yt && WA.playing && WA.playing() && typeof drivingEff === "function" && drivingEff()); }catch(e){ return false; } };
    const kick = () => { if(!S.raf && (S.on || ytNeed()) && currentView === "media") S.raf = requestAnimationFrame(frame); };
    setInterval(kick, 800); document.addEventListener("visibilitychange", kick);

    /* ecrã total: o quadro passa para o <body> (dentro da página há contentores que prendem o position:fixed) */
    const setFs = (on, party) => { wrap.classList.toggle("fs", on); wrap.classList.toggle("party", on && party); if(on){ if(wrap.parentNode !== document.body) document.body.appendChild(wrap); } else if(wrap.parentNode !== box) box.appendChild(wrap); $v("visFs").textContent = on ? "×" : "⛶"; S.pt1 = S.pt2 = null; kick(); };
    wrap.addEventListener("click", e => { const b = e.target.closest("button"); if(!b || box.contains(wrap)) return; if(b.id === "visFs") setFs(false); else if(b.id === "visParty") setFs(!wrap.classList.contains("party"), true); });
    try{ const _sh = window.show; window.show = function(v){ if(v !== "media" && wrap.classList.contains("fs")) setFs(false); return _sh.apply(this, arguments); }; }catch(e){}
    box.addEventListener("click", async e => {
      const b = e.target.closest("button"); if(!b) return;
      if(b.dataset.s){ S.sty = b.dataset.s; LS.set("visSty", S.sty); S.parts = []; paintBtns(); }
      else if(b.dataset.src){ S.src = b.dataset.src; LS.set("visSrc", S.src); if(S.src === "mic") await tapMic(); else stopMic(); S.hint = ""; paintBtns(); }
      else if(b.id === "visFs"){ setFs(!wrap.classList.contains("fs"), false); }
      else if(b.id === "visParty"){ setFs(!wrap.classList.contains("party"), true); }
      kick();
    });
    $v("visOn").onchange = e => { S.on = e.target.checked; LS.set("visOn", S.on); if(!S.on){ stopMic(); setFs(false); } else if(S.src === "mic") tapMic(); paintBtns(); kick(); };
    if(S.on && S.src === "mic"){ const once = () => { document.removeEventListener("pointerdown", once, true); if(S.src === "mic") tapMic(); }; document.addEventListener("pointerdown", once, true); }
    kick();
  }catch(e){ console.log("animações media", e); }
})();
