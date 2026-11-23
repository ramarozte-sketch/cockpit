
/* ======================= v563: DJ — dois decks, mesa de mistura e gravação ======================= */
(function(){
  const V = document.getElementById("v-dj"); if(!V) return;
  const $d = s => V.querySelector(s);
  let ac = null, master = null, mAn = null, recDest = null;
  const ensure = () => {
    if(ac) { if(ac.state === "suspended") ac.resume(); return ac; }
    const AC = window.AudioContext || window.webkitAudioContext; ac = new AC();
    master = ac.createGain(); master.gain.value = .9;
    const lim = ac.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .1;
    mAn = ac.createAnalyser(); mAn.fftSize = 1024;
    master.connect(lim); lim.connect(mAn); mAn.connect(ac.destination);
    recDest = ac.createMediaStreamDestination(); lim.connect(recDest);
    D.forEach(dk => dk.build());
    return ac;
  };
  /* ---------- tempo de um ficheiro (mesma ideia da animação: entradas de som + autocorrelação) ---------- */
  function trackBpm(buf){
    try{
      /* entradas de som em 3 bandas (graves, médios, agudos), somadas; depois pontuação de cada tempo pela repetição
         na batida, em 2, 4, 8 e 16 batidas (compassos), com leve preferência por 80–130 BPM */
      const sr = buf.sampleRate, ch = buf.getChannelData(0), hop = Math.round(sr / 100), tot = Math.floor(ch.length / hop), N = Math.min(tot, 6000), st = Math.floor((tot - N) / 2);
      const envs = [new Float32Array(N), new Float32Array(N), new Float32Array(N)], prev = [0, 0, 0];
      let l1 = 0, l2 = 0; const a1 = Math.exp(-2 * Math.PI * 200 / sr), a2 = Math.exp(-2 * Math.PI * 2000 / sr);
      for(let i = 0; i < N; i++){ const e = [0, 0, 0], o = (st + i) * hop;
        for(let k = 0; k < hop; k++){ const s = ch[o + k]; l1 = a1 * l1 + (1 - a1) * s; l2 = a2 * l2 + (1 - a2) * s; e[0] += l1 * l1; e[1] += (l2 - l1) * (l2 - l1); e[2] += (s - l2) * (s - l2); }
        for(let b = 0; b < 3; b++){ const v = Math.log(1 + 1000 * Math.sqrt(e[b] / hop)), d = v - prev[b]; envs[b][i] = d > 0 ? d : 0; prev[b] = v; } }
      const env = new Float32Array(N); for(const E of envs){ let mx = 0; for(let i = 0; i < N; i++) if(E[i] > mx) mx = E[i]; if(mx) for(let i = 0; i < N; i++) env[i] += E[i] / mx; }
      let mu = 0; for(let i = 0; i < N; i++) mu += env[i]; mu /= N; for(let i = 0; i < N; i++) env[i] = Math.max(0, env[i] - mu);
      const R = 100, memo = {}, A = L => { const k = Math.round(L); if(k >= N - 10) return 0; if(memo[k] != null) return memo[k]; let v = 0; for(let i = k; i < N; i++) v += env[i] * env[i - k]; return memo[k] = v / (N - k); };
      let best = 0, bb = 0;
      for(let bpm = 70; bpm <= 180; bpm += .25){ const L = R * 60 / bpm, sc = A(L) + .8 * A(2 * L) + A(4 * L) + .6 * A(8 * L) + .5 * A(16 * L), w = Math.exp(-.5 * Math.pow(Math.log2(bpm / 105), 2)); if(sc * w > best){ best = sc * w; bb = bpm; } }
      return Math.round(bb * 10) / 10;
    }catch(e){ return 0; }
  }
  /* primeira batida forte (para o loop e o sync começarem no sítio certo) */
  function firstBeat(buf){ const ch = buf.getChannelData(0), sr = buf.sampleRate, lim = Math.min(ch.length, sr * 20); let mx = 0; for(let i = 0; i < lim; i += 64) mx = Math.max(mx, Math.abs(ch[i])); for(let i = 0; i < lim; i += 64) if(Math.abs(ch[i]) > mx * .5) return i / sr; return 0; }
  /* ---------- batidas originais geradas na app ---------- */
  const LOOPS = [{n:"House", bpm:124, k:"house"}, {n:"Techno", bpm:128, k:"techno"}, {n:"Hip-hop", bpm:90, k:"hiphop"}, {n:"Funk", bpm:110, k:"funk"}, {n:"Drum & bass", bpm:172, k:"dnb"}, {n:"Reggaeton", bpm:96, k:"regg"}];
  async function makeLoop(L){
    const sr = 44100, beat = 60 / L.bpm, bars = 16, len = bars * 4 * beat, oc = new OfflineAudioContext(2, Math.ceil(sr * len), sr), out = oc.createGain(); out.gain.value = .8; out.connect(oc.destination);
    const noise = oc.createBuffer(1, sr, sr); { const d = noise.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const kick = t => { const o = oc.createOscillator(), g = oc.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .12); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(.001, t + .35); o.connect(g); g.connect(out); o.start(t); o.stop(t + .4); };
    const nz = (t, d, f, v, type) => { const s = oc.createBufferSource(), b = oc.createBiquadFilter(), g = oc.createGain(); s.buffer = noise; b.type = type || "highpass"; b.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(b); b.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + d + .02); };
    const snare = t => { nz(t, .18, 1500, .5, "bandpass"); const o = oc.createOscillator(), g = oc.createGain(); o.frequency.value = 190; g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g); g.connect(out); o.start(t); o.stop(t + .15); };
    const hat = (t, open) => nz(t, open ? .22 : .05, 7000, open ? .22 : .16);
    const clap = t => { for(const d of [0, .012, .024]) nz(t + d, .1, 1200, .35, "bandpass"); };
    const roots = {house:[45, 45, 48, 43], techno:[40, 40, 40, 43], hiphop:[38, 41, 36, 43], funk:[40, 43, 45, 43], dnb:[38, 38, 41, 36], regg:[45, 41, 48, 43]}[L.k];
    const bass = (t, m, d) => { const o = oc.createOscillator(), f = oc.createBiquadFilter(), g = oc.createGain(); o.type = "sawtooth"; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + d); g.gain.setValueAtTime(.32, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + d + .02); };
    const stab = (t, m) => { for(const iv of [0, 3, 7]){ const o = oc.createOscillator(), g = oc.createGain(), f = oc.createBiquadFilter(); o.type = "square"; o.frequency.value = 440 * Math.pow(2, (m + 24 + iv - 69) / 12); f.type = "lowpass"; f.frequency.value = 2200; g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + .3); } };
    for(let bar = 0; bar < bars; bar++){
      const r = roots[bar % 4], b0 = bar * 4 * beat, intro = bar < 2;
      for(let q = 0; q < 16; q++){
        const t = b0 + q * beat / 4, k = L.k;
        if(k === "house" || k === "techno"){ if(q % 4 === 0) kick(t); if(!intro && q % 4 === 2) hat(t, k === "house"); if(!intro && (q === 4 || q === 12)) clap(t); if(k === "techno" && q % 2 === 1 && !intro) hat(t, false); if(!intro && (q === 2 || q === 6 || q === 10 || q === 14)) bass(t, r, beat * .45); if(k === "house" && !intro && (q === 3 || q === 11)) stab(t, r); }
        else if(k === "hiphop"){ if(q === 0 || q === 7 || q === 10) kick(t); if(q === 4 || q === 12) snare(t); if(q % 2 === 0) hat(t, false); if(!intro && (q === 0 || q === 10)) bass(t, r, beat * 1.2); }
        else if(k === "funk"){ if(q === 0 || q === 6 || q === 10) kick(t); if(q === 4 || q === 12) snare(t); hat(t, q === 14); if(!intro && q % 3 === 0) bass(t, r + (q % 6 ? 12 : 0), beat * .3); if(!intro && (q === 2 || q === 9)) stab(t, r); }
        else if(k === "dnb"){ if(q === 0 || q === 10) kick(t); if(q === 4 || q === 12) snare(t); if(q % 2 === 0) hat(t, false); if(!intro && (q === 0 || q === 8)) bass(t, r, beat * 1.6); }
        else if(k === "regg"){ if(q % 4 === 0) kick(t); if(q === 3 || q === 6 || q === 11 || q === 14) snare(t); if(q % 2 === 0) hat(t, false); if(!intro && (q === 0 || q === 8)) bass(t, r, beat * 1.4); }
      }
    }
    return oc.startRendering();
  }
  /* ---------- deck ---------- */
  /* v588: tonalidade: cromagrama por Goertzel (2.º a 5.º oitavas) em 48 segmentos, comparado com os perfis de Krumhansl; devolve notação Camelot */
  function keyOf(buf){ try{ const d = buf.getChannelData(0), sr = buf.sampleRate, N = 8192, SEG = 48, total = d.length; if(total < N) return null;
      const NM = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"], CM = [8,3,10,5,12,7,2,9,4,11,6,1], Cn = [5,12,7,2,9,4,11,6,1,8,3,10];
      const MAJ = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88], MIN = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
      const freqs = []; for(let oct = 2; oct <= 5; oct++) for(let pc = 0; pc < 12; pc++){ freqs.push({pc, c: 2 * Math.cos(2 * Math.PI * 440 * Math.pow(2, (12 * (oct + 1) + pc - 69) / 12) / sr)}); }
      const win = new Float64Array(N); for(let i = 0; i < N; i++) win[i] = .5 - .5 * Math.cos(2 * Math.PI * i / (N - 1));
      const hop = Math.max(N, Math.floor((total - N) / SEG)), chroma = new Float64Array(12);
      for(let sg = 0; sg < SEG; sg++){ const st = sg * hop; if(st + N > total) break;
        for(const f of freqs){ let s1 = 0, s2 = 0; for(let i = 0; i < N; i++){ const x = d[st + i] * win[i]; const s0 = x + f.c * s1 - s2; s2 = s1; s1 = s0; } chroma[f.pc] += Math.max(0, s1 * s1 + s2 * s2 - f.c * s1 * s2); } }
      if(!(chroma.reduce((a, b) => a + b, 0) > 0)) return null;
      const corr = (a, b) => { let ma = 0, mb = 0; for(let i = 0; i < 12; i++){ ma += a[i]; mb += b[i]; } ma /= 12; mb /= 12; let num = 0, da = 0, db = 0; for(let i = 0; i < 12; i++){ const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; } return num / Math.sqrt(da * db || 1); };
      let best = {r: -2};
      for(let t = 0; t < 12; t++){ for(const [prof, maj] of [[MAJ, true], [MIN, false]]){ const rot = []; for(let i = 0; i < 12; i++) rot.push(prof[(i - t + 12) % 12]); const r = corr(chroma, rot); if(r > best.r) best = {r, t, maj}; } }
      return {name: best.maj ? NM[best.t] : NM[best.t] + "m", cam: best.maj ? CM[best.t] + "B" : Cn[best.t] + "A", r: best.r}; }catch(e){ return null; } }
  /* v585: nivelamento: ganho que leva o volume médio da faixa a um nível comum (RMS sobre amostras espaçadas) */
  function levelGain(buf){ try{ const d = buf.getChannelData(0), st = Math.max(1, Math.floor(d.length / 400000)); let s2 = 0, n = 0; for(let i = 0; i < d.length; i += st){ s2 += d[i] * d[i]; n++; } const rms = Math.sqrt(s2 / Math.max(1, n)); if(!(rms > 1e-5)) return 1; return Math.min(2, Math.max(.25, .12 / rms)); }catch(e){ return 1; } }
  class Deck {
    constructor(i){ this.i = i; this.el = V.querySelector('.deck[data-d="' + i + '"]'); this.buf = null; this.src = null; this.playing = false; this.pos = 0; this.t0 = 0; this.p0 = 0; this.rate = 1; this.pitch = 0; this.bend = 0; this.cue = 0; this.hot = [null, null, null, null]; this.loop = 0; this.bpm = 0; this.beat0 = 0; this.name = ""; this.vol = .85; this.render(); }
    render(){
      const L = "AB"[this.i];
      /* v570: disposição compacta para o ecrã do Tesla: prato ao lado dos comandos principais; EQ, efeitos e loops em separadores */
      this.el.innerHTML = '<div class="dhead"><span class="dlet">' + L + '</span><div class="dtit"><b data-r="tit">Sem música</b><small data-r="time">0:00 / 0:00</small></div>' +
          '<button class="dbtn sm" data-a="tap" title="Toca 4 vezes no ritmo">TAP</button><button class="dbtn sm" data-a="half">½</button><button class="dbtn sm" data-a="dbl">×2</button><div class="dbpm"><span data-r="bpm">—</span><small>BPM</small></div></div>' +
        '<span class="small muted" data-r="tapH" style="display:none"></span>' +
        '<canvas class="wf" data-r="wf" width="800" height="110"></canvas><div class="ytbox" data-r="ytbox" hidden></div>' +
        '<div class="dmain"><div class="jogw"><canvas class="jog" data-r="jog" width="440" height="440" aria-label="Prato do deck ' + L + ': arrasta no centro para scratch, na borda para acertar o ritmo"></canvas></div>' +
          '<div class="dtr"><button class="dbtn big" data-a="play">▶</button><button class="dbtn big" data-a="cue">CUE</button><button class="dbtn" data-a="sync">SYNC</button><button class="dbtn on" data-a="nivel" title="Nivelar o volume de cada faixa">Nivelar</button><button class="dbtn" data-a="load">⏏ Carregar</button></div></div>' +
        '<div class="pitch"><button class="dbtn sm" data-a="bdn">−</button><span>Tempo</span><input type="range" min="-80" max="80" value="0" data-r="pitch" aria-label="Tempo do deck ' + L + '"><output data-r="pv">0,0 %</output><button class="dbtn sm" data-a="bup">+</button></div>' +
        '<div class="dtabs"><button class="dtab on" data-tab="loop">Pontos e loops</button><button class="dtab" data-tab="eq">EQ</button><button class="dtab" data-tab="fx">Efeitos</button></div>' +
        '<div class="dpan" data-pan="loop"><div class="drow">' + [1, 2, 3, 4].map(n => '<button class="dbtn hc" data-hc="' + (n - 1) + '">' + n + '</button>').join("") + '<span class="spacer" style="flex:1"></span><button class="dbtn" data-lp="4" title="Loop de 4 batidas"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="vertical-align:-2px"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>4</button><button class="dbtn" data-lp="8" title="Loop de 8 batidas"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="vertical-align:-2px"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>8</button><button class="dbtn" data-a="lhalf" title="Loop a metade">½</button><button class="dbtn" data-a="ldbl" title="Loop a dobrar">×2</button></div>' +
          '<div class="drow"><button class="dbtn" data-a="jb" title="Saltar 4 batidas para trás">⏮ 4</button><button class="dbtn" data-a="jf" title="Saltar 4 batidas para a frente">4 ⏭</button><span class="spacer" style="flex:1"></span><span class="small muted" style="margin:0 2px">Roll</span><button class="dbtn" data-roll=".25">¼</button><button class="dbtn" data-roll=".5">½</button><button class="dbtn" data-roll="1">1</button></div></div>' +
        '<div class="dpan" data-pan="eq" hidden><div class="knobs">' + [["gain", "Ganho", -12, 12, 0], ["hi", "Agudos", -26, 6, 0], ["mid", "Médios", -26, 6, 0], ["lo", "Graves", -26, 6, 0], ["flt", "Filtro", -100, 100, 0]].map(k => '<label class="kn"><span>' + k[1] + '</span><input type="range" min="' + k[2] + '" max="' + k[3] + '" value="' + k[4] + '" data-k="' + k[0] + '"><output data-o="' + k[0] + '">0</output></label>').join("") + '</div><div class="drow"><button class="dbtn" data-a="kill-hi" title="Cortar os agudos">✂ Agudos</button><button class="dbtn" data-a="kill-mid" title="Cortar os médios">✂ Médios</button><button class="dbtn" data-a="kill-lo" title="Cortar os graves">✂ Graves</button></div></div>' +
        '<div class="dpan" data-pan="fx" hidden><div class="fxrow"><select class="fx" data-r="fx" aria-label="Efeito"><option value="echo">Eco ½ batida</option><option value="rev">Reverb</option><option value="fla">Flanger</option><option value="crush">Bitcrusher</option></select><label class="kn"><span>Efeito</span><input type="range" min="0" max="100" value="0" data-k="echo"><output data-o="echo">0</output></label><button class="dbtn" data-a="kill" title="Cortar os graves">✂ Graves</button></div></div>';
      this.el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { this.el.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("on", x === b)); this.el.querySelectorAll("[data-pan]").forEach(p => p.hidden = p.dataset.pan !== b.dataset.tab); if(window.__djFit) window.__djFit(); });
      this.r = k => this.el.querySelector('[data-r="' + k + '"]');
      this.el.addEventListener("click", e => this.onClick(e));
      this.el.querySelectorAll("[data-k]").forEach(x => x.oninput = () => this.knob(x.dataset.k, +x.value));
      this.r("pitch").oninput = e => { this.setPitch(+e.target.value / 1000); };
      this.r("fx").onchange = e => this.setFx(e.target.value);
      /* roll: enquanto carregas, repete ¼, ½ ou 1 batida; ao largar a música segue onde estaria */
      this.el.querySelectorAll("[data-roll]").forEach(b => { b.addEventListener("pointerdown", e => { e.preventDefault(); this.rollOn(+b.dataset.roll, b); }); const off = () => this.rollOff(b); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("pointerleave", off); });
      this.r("pitch").ondblclick = () => { this.r("pitch").value = 0; this.setPitch(0); };
      /* pontos: toque longo apaga */
      this.el.querySelectorAll("[data-hc]").forEach(b => { let tm = null; b.addEventListener("pointerdown", () => { tm = setTimeout(() => { tm = "long"; this.hot[+b.dataset.hc] = null; this.paintHot(); }, 700); }); b.addEventListener("pointerup", () => { if(tm !== "long") clearTimeout(tm); }); });
      /* onda: toca para saltar */
      const wf = this.r("wf"); wf.addEventListener("pointerdown", e => { if(!this.buf) return; const rc = wf.getBoundingClientRect(); this.seek((e.clientX - rc.left) / rc.width * this.buf.duration); });
      /* prato: no centro faz scratch (a música anda com o dedo, também para trás); na borda, com a música a tocar, acelera ou trava um pouco para acertar */
      const jg = this.r("jog"); this.ang = 0;
      const angOf = e => { const rc = jg.getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2; return {a:Math.atan2(e.clientY - cy, e.clientX - cx), r:Math.hypot(e.clientX - cx, e.clientY - cy) / (rc.width / 2)}; };
      jg.addEventListener("pointerdown", e => { if(!this.buf) return; ensure(); e.preventDefault(); try{ jg.setPointerCapture(e.pointerId); }catch(x){} const g = angOf(e); jg.classList.add("hold");
        this.jog = {a:g.a, t:performance.now(), edge:g.r > .74 && this.playing, was:this.playing, pos:this.curPos()};
        if(!this.jog.edge){ if(this.playing){ this.killSrc(); this.playing = false; } this.pos = this.jog.pos; } });
      jg.addEventListener("pointermove", e => { const j = this.jog; if(!j) return; const g = angOf(e), now = performance.now(); let da = g.a - j.a; if(da > Math.PI) da -= 2 * Math.PI; if(da < -Math.PI) da += 2 * Math.PI; const dt = Math.max(1, now - j.t) / 1000; j.a = g.a; j.t = now;
        this.ang += da;
        if(j.edge){ this.rebase(); this.bend = Math.max(-.12, Math.min(.12, da / dt / 12)); this.rebase(); clearTimeout(this.bendT); this.bendT = setTimeout(() => { this.rebase(); this.bend = 0; this.rebase(); }, 120); return; }
        /* uma volta = 1,8 s de música (disco a 33⅓ rpm) */
        const ds = da / (2 * Math.PI) * 1.8; this.pos = Math.max(0, Math.min(this.buf.duration - .02, this.pos + ds)); this.grain(ds, dt); });
      const up = () => { const j = this.jog; if(!j) return; this.jog = null; jg.classList.remove("hold"); if(!j.edge && j.was) this.startAt(this.pos); };
      jg.addEventListener("pointerup", up); jg.addEventListener("pointercancel", up); jg.addEventListener("lostpointercapture", up);
    }
    /* bocadinho de som ao mexer o prato: para a frente ou para trás (cópia invertida da música), à velocidade do dedo */
    grain(ds, dt){
      if(!this.buf || Math.abs(ds) < .0005) return;
      if(ds < 0 && !this.rev){ const b = this.buf, r = ac.createBuffer(b.numberOfChannels, b.length, b.sampleRate); for(let c = 0; c < b.numberOfChannels; c++){ const s = b.getChannelData(c), d = r.getChannelData(c), n = s.length; for(let i = 0; i < n; i++) d[i] = s[n - 1 - i]; } this.rev = r; }
      const sp = Math.max(.05, Math.min(4, Math.abs(ds) / dt)), s = ac.createBufferSource(), g = ac.createGain(), now = ac.currentTime, dur = Math.min(.12, dt * 1.6);
      s.buffer = ds > 0 ? this.buf : this.rev; s.playbackRate.value = sp;
      const off = ds > 0 ? this.pos - ds : this.buf.duration - (this.pos - ds);
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + .005); g.gain.setValueAtTime(1, now + dur - .01); g.gain.linearRampToValueAtTime(0, now + dur);
      s.connect(g); g.connect(this.gain); s.start(now, Math.max(0, Math.min(this.buf.duration - .01, off)), dur * sp + .01); s.stop(now + dur + .02);
    }
    drawJog(){
      const cv = this.r("jog"); if(!cv) return; const x = cv.getContext("2d"), w = cv.width, c = w / 2, R = c - 6, col = this.i ? "#ff5ca8" : "#5cf2ff";
      if(this.playing && !this.jog){ const now = performance.now(); this.ang += ((now - (this.lastJ || now)) / 1000) * (2 * Math.PI / 1.8) * this.rateNow(); this.lastJ = now; } else this.lastJ = performance.now();
      x.clearRect(0, 0, w, w);
      const g0 = x.createRadialGradient(c, c, R * .2, c, c, R); g0.addColorStop(0, "#1b1b22"); g0.addColorStop(1, "#050507"); x.fillStyle = g0; x.beginPath(); x.arc(c, c, R, 0, 7); x.fill();
      x.strokeStyle = "#ffffff10"; x.lineWidth = 1; for(let r = R * .4; r < R * .96; r += 5){ x.beginPath(); x.arc(c, c, r, 0, 7); x.stroke(); }
      x.save(); x.translate(c, c); x.rotate(this.ang);
      const sh = x.createLinearGradient(-R, -R, R, R); sh.addColorStop(.35, "#ffffff00"); sh.addColorStop(.5, "#ffffff14"); sh.addColorStop(.65, "#ffffff00"); x.fillStyle = sh; x.beginPath(); x.arc(0, 0, R * .96, 0, 7); x.fill();
      x.fillStyle = col; x.beginPath(); x.arc(0, 0, R * .34, 0, 7); x.fill(); x.fillStyle = "#03121a"; x.font = "800 " + Math.round(R * .2) + "px system-ui"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("AB"[this.i], 0, 0);
      x.fillStyle = "#fff"; x.fillRect(-3, -R * .95, 6, R * .22);
      x.fillStyle = "#03121a"; x.beginPath(); x.arc(0, 0, R * .04, 0, 7); x.fill(); x.restore();
      x.strokeStyle = this.jog ? col : "#ffffff33"; x.lineWidth = this.jog ? 8 : 4; x.beginPath(); x.arc(c, c, R, 0, 7); x.stroke();
    }
    build(){
      const c = ac; this.gain = c.createGain(); this.hi = c.createBiquadFilter(); this.mid = c.createBiquadFilter(); this.lo = c.createBiquadFilter(); this.flt = c.createBiquadFilter();
      this.hi.type = "highshelf"; this.hi.frequency.value = 4000; this.mid.type = "peaking"; this.mid.frequency.value = 1000; this.mid.Q.value = .8; this.lo.type = "lowshelf"; this.lo.frequency.value = 220;
      this.flt.type = "allpass"; this.ch = c.createGain(); this.xf = c.createGain(); this.an = c.createAnalyser(); this.an.fftSize = 512;
      this.dly = c.createDelay(2); this.fb = c.createGain(); this.wet = c.createGain(); this.wet.gain.value = 0; this.fb.gain.value = .45;
      this.gain.connect(this.lo); this.lo.connect(this.mid); this.mid.connect(this.hi); this.hi.connect(this.flt); this.flt.connect(this.ch);
      this.flt.connect(this.dly); this.dly.connect(this.fb); this.fb.connect(this.dly); this.dly.connect(this.wet); this.wet.connect(this.ch);
      /* v566: mais efeitos (mesmo botão de quantidade): reverb, flanger e bitcrusher */
      const sr = c.sampleRate, ir = c.createBuffer(2, sr * 2.2, sr); for(let ch = 0; ch < 2; ch++){ const d = ir.getChannelData(ch); for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); }
      this.rev = c.createConvolver(); this.rev.buffer = ir; this.revG = c.createGain(); this.revG.gain.value = 0; this.flt.connect(this.rev); this.rev.connect(this.revG); this.revG.connect(this.ch);
      this.fla = c.createDelay(.05); this.fla.delayTime.value = .004; this.flaFb = c.createGain(); this.flaFb.gain.value = .6; this.flaG = c.createGain(); this.flaG.gain.value = 0; this.lfo = c.createOscillator(); this.lfo.frequency.value = .25; this.lfoG = c.createGain(); this.lfoG.gain.value = .003; this.lfo.connect(this.lfoG); this.lfoG.connect(this.fla.delayTime); this.lfo.start();
      this.flt.connect(this.fla); this.fla.connect(this.flaFb); this.flaFb.connect(this.fla); this.fla.connect(this.flaG); this.flaG.connect(this.ch);
      this.crush = c.createWaveShaper(); { const n = 4096, cv = new Float32Array(n), st = 1 / 6; for(let i = 0; i < n; i++){ const x = i / (n - 1) * 2 - 1; cv[i] = Math.round(x / st) * st; } this.crush.curve = cv; }
      this.crushG = c.createGain(); this.crushG.gain.value = 0; this.flt.connect(this.crush); this.crush.connect(this.crushG); this.crushG.connect(this.ch);
      this.fxSel = "echo"; this.fxAmt = 0;
      this.ch.connect(this.xf); this.xf.connect(master); this.ch.connect(this.an); this.ch.gain.value = this.vol; this.applyX();
    }
    async load(buf, name, known){
      this.ytOff(); this.stop(); this.buf = buf; this.rev = null; this.name = name; this.pos = 0; this.cue = 0; this.hot = [null, null, null, null]; this.loop = 0;
      this.r("tit").textContent = name; this.r("bpm").textContent = "…"; this.drawWave(); this.paintHot(); this.paintLoop();
      await new Promise(r => setTimeout(r, 20));
      this.key = keyOf(buf);
      this.bpm = known || trackBpm(buf); this.beat0 = known ? 0 : firstBeat(buf); this.showBpm();
      this.lvl = levelGain(buf); this.applyLvl();
      this.dly.delayTime.value = this.bpm ? Math.min(2, 30 / this.bpm) : .25;
    }
    /* v566: deck em modo YouTube Music (leitor oficial do YouTube: play, posição, tempo e volume pelo crossfader) */
    async loadYT(t){
      this.ytOff(); this.stop(); this.buf = null; this.peaks = null; this.name = (t.artist ? t.artist + " — " : "") + t.title; this.lvl = 1; this.applyLvl(); this.key = null; this.bpm = 0; this.pitch = 0; this.r("pitch").value = 0; this.showBpm();
      this.r("tit").textContent = this.name; this.el.classList.add("yt"); const box = this.r("ytbox"); box.hidden = false; this.r("wf").hidden = true; box.innerHTML = '<div></div>';
      await ytApi();
      this.ytDur = t.dur || 0;
      this.ytp = new YT.Player(box.firstChild, {videoId:t.yt, width:"100%", height:"70", playerVars:{playsinline:1, controls:0, rel:0, modestbranding:1, disablekb:1},
        events:{onReady:() => { this.ytVol(); this.ytDur = this.ytp.getDuration() || this.ytDur; }, onStateChange:e => { this.playing = e.data === 1; this.paintPlay(); if(e.data === 1) try{ if(typeof radioStop === "function" && typeof radioCur !== "undefined" && radioCur) radioStop(); }catch(x){} }}});
      this.r("tapH").textContent = "YouTube: usa TAP para o BPM";
    }
    ytOff(){ if(this.ytp){ try{ this.ytp.destroy(); }catch(e){} this.ytp = null; } this.el.classList.remove("yt"); const b = this.r && this.r("ytbox"); if(b){ b.hidden = true; b.innerHTML = ""; this.r("wf").hidden = false; } }
    ytVol(){ if(!this.ytp || !this.ytp.setVolume) return; const v = this.vol * (this.xg == null ? 1 : this.xg) * (master ? master.gain.value : .9); try{ this.ytp.setVolume(Math.round(Math.max(0, Math.min(1, v)) * 100)); }catch(e){} }
    curPos(){ if(this.ytp){ try{ return this.ytp.getCurrentTime() || 0; }catch(e){ return 0; } }
      if(!this.playing) return this.pos; const p = this.p0 + (ac.currentTime - this.t0) * this.rateNow(); if(this.loop && this.loopEnd > this.loopStart){ const L = this.loopEnd - this.loopStart; if(p > this.loopEnd) return this.loopStart + ((p - this.loopStart) % L); } return Math.min(p, this.buf ? this.buf.duration : 0); }
    rateNow(){ return (1 + this.pitch) * (1 + this.bend); }
    startAt(p){ if(!this.buf) return; ensure(); this.killSrc(); const s = ac.createBufferSource(); s.buffer = this.buf; s.playbackRate.value = this.rateNow();
      if(this.loop){ s.loop = true; s.loopStart = this.loopStart; s.loopEnd = this.loopEnd; }
      s.connect(this.gain); s.start(0, Math.max(0, Math.min(p, this.buf.duration - .01))); s.onended = () => { if(this.src === s && !s.loop){ this.playing = false; this.pos = 0; this.paintPlay(); } };
      this.src = s; this.t0 = ac.currentTime; this.p0 = p; this.playing = true; this.paintPlay();
      try{ if(typeof radioStop === "function" && typeof radioCur !== "undefined" && radioCur) radioStop(); }catch(e){} }
    killSrc(){ if(this.src){ try{ this.src.onended = null; this.src.stop(); }catch(e){} this.src = null; } }
    play(){ if(this.ytp){ try{ const s = this.ytp.getPlayerState(); if(s === 1) this.ytp.pauseVideo(); else this.ytp.playVideo(); }catch(e){} return; }
      if(!this.buf){ openSrc(this.i); return; } if(this.playing){ this.pos = this.curPos(); this.killSrc(); this.playing = false; this.paintPlay(); } else this.startAt(this.pos); }
    stop(){ if(this.playing){ this.killSrc(); this.playing = false; } this.paintPlay(); }
    seek(p){ if(this.ytp){ try{ this.ytp.seekTo(Math.max(0, p), true); }catch(e){} return; } p = Math.max(0, Math.min(p, this.buf ? this.buf.duration - .05 : 0)); if(this.loop && (p < this.loopStart || p > this.loopEnd)) { this.loop = 0; this.paintLoop(); } if(this.playing) this.startAt(p); else this.pos = p; }
    rebase(){ if(this.playing){ const p = this.curPos(); this.p0 = p; this.t0 = ac.currentTime; this.src.playbackRate.setValueAtTime(this.rateNow(), ac.currentTime); } }
    setPitch(v){ if(this.ytp){ const R = [.75, 1, 1.25], want = 1 + v, near = R.reduce((a, b) => Math.abs(b - want) < Math.abs(a - want) ? b : a); try{ this.ytp.setPlaybackRate(near); }catch(e){} this.pitch = near - 1; this.r("pv").textContent = (this.pitch >= 0 ? "+" : "") + Math.round(this.pitch * 100) + " % (YouTube)"; this.showBpm(); return; }
      this.rebase(); this.pitch = v; this.rebase(); this.r("pv").textContent = (v >= 0 ? "+" : "") + (v * 100).toFixed(1).replace(".", ",") + " %"; this.showBpm(); }
    showBpm(){ this.r("bpm").textContent = this.bpm ? (this.bpm * (1 + this.pitch)).toFixed(1).replace(".", ",") : "—";
      let kb = this.el.querySelector('[data-kbadge]'); if(!kb){ kb = document.createElement("span"); kb.dataset.kbadge = "1"; kb.className = "small"; kb.style.cssText = "margin-left:6px;opacity:.85;white-space:nowrap"; this.r("bpm").parentElement.appendChild(kb); }
      kb.textContent = this.key ? this.key.cam + " · " + this.key.name : ""; }
    lvlNow(){ return this.nivelOn !== false && this.lvl ? this.lvl : 1; }
    applyLvl(){ if(!this.gain) return; const kn = this.el.querySelector('[data-k="gain"]'), db = kn ? +kn.value : 0; this.gain.gain.setTargetAtTime(Math.pow(10, db / 20) * this.lvlNow(), ac.currentTime, .05); }
    knob(k, v){ ensure(); const o = this.el.querySelector('[data-o="' + k + '"]');
      if(k === "gain"){ this.gain.gain.value = Math.pow(10, v / 20) * this.lvlNow(); o.textContent = (v > 0 ? "+" : "") + v + " dB"; }
      else if(k === "hi" || k === "mid" || k === "lo"){ this[k].gain.value = v; o.textContent = (v > 0 ? "+" : "") + v; if(k === "lo") this.el.querySelector('[data-a="kill"]').classList.toggle("on", v <= -26); const kb = this.el.querySelector('[data-a="kill-' + k + '"]'); if(kb) kb.classList.toggle("on", v <= -26); }
      else if(k === "flt"){ const f = this.flt; if(Math.abs(v) < 4){ f.type = "allpass"; o.textContent = "—"; } else if(v < 0){ f.type = "lowpass"; f.frequency.value = 20000 * Math.pow(150 / 20000, -v / 100); f.Q.value = 1.2; o.textContent = "LP"; } else { f.type = "highpass"; f.frequency.value = 20 * Math.pow(6000 / 20, v / 100); f.Q.value = 1.2; o.textContent = "HP"; } }
      else if(k === "echo"){ this.fxAmt = v / 100; this.applyFx(); o.textContent = v ? v + " %" : "0"; }
    }
    setFx(f){ ensure(); this.fxSel = f; this.applyFx(); }
    applyFx(){ if(!this.wet) return; const a = this.fxAmt, f = this.fxSel, T = ac.currentTime, s = (g, v) => g.gain.setTargetAtTime(v, T, .03);
      s(this.wet, f === "echo" ? a * .9 : 0); s(this.revG, f === "rev" ? a * 1.2 : 0); s(this.flaG, f === "fla" ? a : 0); s(this.crushG, f === "crush" ? a : 0);
      if(f === "crush") s(this.ch, this.vol * (1 - a * .7)); else s(this.ch, this.vol); if(this.bpm) this.lfo.frequency.value = this.bpm / 60 / 8; }
    rollOn(beats, b){ if(!this.buf || !this.playing || this.rolling) return; const bl = (this.bpm ? 60 / this.bpm : .5) * beats, p = this.curPos(), st = this.beat0 + Math.floor((p - this.beat0) / bl) * bl;
      this.rolling = {p, t:ac.currentTime, rate:this.rateNow(), loop:this.loop, ls:this.loopStart, le:this.loopEnd}; this.loop = 99; this.loopStart = Math.max(0, st); this.loopEnd = this.loopStart + bl; this.startAt(this.loopStart); b.classList.add("on"); }
    rollOff(b){ const r = this.rolling; if(!r) return; this.rolling = null; b.classList.remove("on"); this.loop = r.loop; this.loopStart = r.ls; this.loopEnd = r.le; this.startAt(Math.min(this.buf.duration - .05, r.p + (ac.currentTime - r.t) * r.rate)); }
    applyX(){ if(!ac) return; const x = +$d("#djX").value / 100; let g; if(xCurve === "corte"){ const k = this.i === 0 ? 1 - x : x; g = Math.min(1, k * 12); } else g = this.i === 0 ? Math.cos(x * Math.PI / 2) : Math.sin(x * Math.PI / 2); this.xg = g; this.xf.gain.setTargetAtTime(g, ac.currentTime, .01); this.ytVol(); }
    sync(){ const o = D[1 - this.i]; if(!this.bpm || !o.bpm){ toast("Para sincronizar, os dois decks precisam de ter o tempo (BPM) detetado.", true); return; }
      const target = o.bpm * (1 + o.pitch); let p = target / this.bpm - 1; if(p > .16 || p < -.16){ /* meio/dobro do tempo */ const half = target / 2 / this.bpm - 1, dbl = target * 2 / this.bpm - 1; p = Math.abs(half) < Math.abs(dbl) ? half : dbl; }
      p = Math.max(-.16, Math.min(.16, p)); this.r("pitch").min = -160; this.r("pitch").max = 160; this.r("pitch").value = Math.round(p * 1000); this.setPitch(p);
      /* fase: alinha a batida deste deck com a do outro */
      if(this.playing && o.playing){ const bl = 60 / this.bpm, ob = 60 / o.bpm; const ph = ((o.curPos() - o.beat0) / ob) % 1, mine = ((this.curPos() - this.beat0) / bl) % 1; let d = (ph - mine); if(d > .5) d -= 1; if(d < -.5) d += 1; this.startAt(this.curPos() + d * bl); }
      this.el.querySelector('[data-a="sync"]').classList.add("on"); setTimeout(() => this.el.querySelector('[data-a="sync"]').classList.remove("on"), 600); }
    setLoop(beats){ if(!this.buf) return; if(this.loop === beats){ this.loop = 0; const p = this.curPos(); if(this.playing) this.startAt(p); this.paintLoop(); return; }
      const bl = this.bpm ? 60 / this.bpm : .5, p = this.curPos(), n = Math.floor((p - this.beat0) / bl); this.loopStart = Math.max(0, this.beat0 + n * bl); this.loopEnd = Math.min(this.buf.duration, this.loopStart + beats * bl); this.loop = beats;
      if(this.playing) this.startAt(p < this.loopEnd ? Math.max(p, this.loopStart) : this.loopStart); this.paintLoop(); }
    onClick(e){ const b = e.target.closest("button"); if(!b) return; ensure();
      const a = b.dataset.a;
      if(a === "load") openSrc(this.i);
      else if(a === "play") this.play();
      else if(a === "cue"){ if(!this.buf) return; if(this.playing){ this.stop(); this.pos = this.cue; } else if(Math.abs(this.pos - this.cue) < .05){ this.startAt(this.cue); } else { this.cue = this.pos; toast("Ponto CUE guardado (" + fmt(this.cue) + ")."); } }
      else if(a === "nivel"){ this.nivelOn = this.nivelOn === false; this.el.querySelector('[data-a="nivel"]').classList.toggle("on", this.nivelOn !== false); this.applyLvl(); }
      else if(a === "sync") this.sync();
      else if(a === "jb" || a === "jf"){ if(!this.buf) return; const bl = this.bpm ? 60 / this.bpm : .5; if(this.ytp){ this.ytp.seekTo(Math.max(0, this.curPos() + (a === "jf" ? 4 : -4) * bl), true); return; } this.seek(this.curPos() + (a === "jf" ? 4 : -4) * bl); }
      else if(a === "lhalf" || a === "ldbl"){ if(!this.loop || this.loop === 99) return; const L = (this.loopEnd - this.loopStart) * (a === "lhalf" ? .5 : 2); if(L < .05 || this.loopStart + L > this.buf.duration) return; this.loopEnd = this.loopStart + L; this.loop = Math.max(1, Math.round(this.loop * (a === "lhalf" ? .5 : 2))); const p = this.curPos(); if(this.playing) this.startAt(p > this.loopEnd ? this.loopStart : p); this.paintLoop(); }
      else if(a === "half" || a === "dbl"){ if(!this.bpm) return; this.bpm = Math.round(this.bpm * (a === "half" ? .5 : 2) * 10) / 10; this.showBpm(); this.dly.delayTime.value = Math.min(2, 30 / this.bpm); }
      else if(a === "tap"){ const now = performance.now(); this.taps = (this.taps || []).filter(x => now - x < 3000); this.taps.push(now);
        if(this.taps.length >= 4){ const iv = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1); this.bpm = Math.round(60000 / iv / (1 + this.pitch) * 10) / 10; this.showBpm(); this.dly.delayTime.value = Math.min(2, 30 / this.bpm); if(this.playing) this.beat0 = this.curPos() % (60 / this.bpm); this.r("tapH").textContent = "tempo acertado à mão"; toast("Deck " + "AB"[this.i] + ": tempo acertado à mão (" + this.bpm + " BPM)."); }
        else { this.r("tapH").textContent = "toca mais " + (4 - this.taps.length) + "×"; this.el.querySelector('[data-a="tap"]').textContent = "TAP " + this.taps.length; setTimeout(() => { const b = this.el.querySelector('[data-a="tap"]'); if(b) b.textContent = "TAP"; }, 3000); } }
      else if(a === "bup" || a === "bdn"){ this.rebase(); this.bend = a === "bup" ? .04 : -.04; this.rebase(); setTimeout(() => { this.rebase(); this.bend = 0; this.rebase(); }, 350); }
      else if(a && a.indexOf("kill-") === 0){ const b = a.slice(5); const kn = this.el.querySelector('[data-k="' + b + '"]'); if(kn){ kn.value = +kn.value <= -26 ? 0 : -26; this.knob(b, +kn.value); } }
      else if(a === "kill"){ const k = this.el.querySelector('[data-k="lo"]'); k.value = +k.value <= -26 ? 0 : -26; this.knob("lo", +k.value); }
      else if(b.dataset.hc != null){ const i = +b.dataset.hc; if(!this.buf) return; if(this.hot[i] == null){ this.hot[i] = this.curPos(); this.paintHot(); } else { if(this.playing) this.startAt(this.hot[i]); else { this.pos = this.hot[i]; this.startAt(this.pos); } } }
      else if(b.dataset.lp) this.setLoop(+b.dataset.lp);
    }
    paintPlay(){ const b = this.el.querySelector('[data-a="play"]'); b.textContent = this.playing ? "❚❚" : "▶"; b.classList.toggle("on", this.playing); }
    paintHot(){ this.el.querySelectorAll("[data-hc]").forEach(b => b.classList.toggle("set", this.hot[+b.dataset.hc] != null)); }
    paintLoop(){ this.el.querySelectorAll("[data-lp]").forEach(b => b.classList.toggle("on", +b.dataset.lp === this.loop)); }
    drawWave(){ const cv = this.r("wf"), x = cv.getContext("2d"), w = cv.width, h = cv.height; x.clearRect(0, 0, w, h); if(!this.buf) return;
      const d = this.buf.getChannelData(0), st = Math.floor(d.length / w), col = this.i ? "#ff5ca8" : "#5cf2ff"; this.peaks = new Float32Array(w);
      for(let i = 0; i < w; i++){ let m = 0; for(let k = i * st, e = k + st; k < e; k += 16){ const v = Math.abs(d[k]); if(v > m) m = v; } this.peaks[i] = m; }
      this.wfImg = null; }
    frame(){ if(this.ytp){ const d = this.ytDur || (this.ytp.getDuration ? this.ytp.getDuration() : 0); this.r("time").textContent = fmt(this.curPos()) + " / " + fmt(d) + " · YouTube"; return; }
      const cv = this.r("wf"), x = cv.getContext("2d"), w = cv.width, h = cv.height; if(!this.buf || !this.peaks) return;
      const col = this.i ? "#ff5ca8" : "#5cf2ff", p = this.curPos() / this.buf.duration;
      x.clearRect(0, 0, w, h);
      for(let i = 0; i < w; i++){ const v = this.peaks[i] * h * .46; x.fillStyle = i / w < p ? col : col + "55"; x.fillRect(i, h / 2 - v, 1, v * 2 || 1); }
      if(this.loop){ x.fillStyle = "#ffffff22"; x.fillRect(this.loopStart / this.buf.duration * w, 0, (this.loopEnd - this.loopStart) / this.buf.duration * w, h); }
      /* v586: grelha de batidas: linhas fortes a cada 4 batidas (compasso) e fracas a cada batida, se couberem no ecrã */
      if(this.bpm && this.beat0 != null){ const bl = 60 / this.bpm, pps = w / this.buf.duration, dur = this.buf.duration; const beatPx = bl * pps;
        for(let t = this.beat0 % (4 * bl), n = 0; t < dur; t += bl, n++){ const bx = t * pps; if(n % 4 === 0){ x.fillStyle = "#ffffff55"; x.fillRect(bx, 0, 1, h); } else if(beatPx >= 4){ x.fillStyle = "#ffffff1c"; x.fillRect(bx, 0, 1, h); } } }
      x.fillStyle = "#ffcc33"; x.fillRect(this.cue / this.buf.duration * w - 1, 0, 2, h);
      this.hot.forEach((t, i) => { if(t == null) return; x.fillStyle = "#fff"; x.font = "bold 22px system-ui"; x.fillText(i + 1, t / this.buf.duration * w + 3, 22); x.fillRect(t / this.buf.duration * w, 0, 2, 26); });
      x.fillStyle = "#fff"; x.fillRect(p * w - 1.5, 0, 3, h);
      this.r("time").textContent = fmt(this.curPos()) + " / " + fmt(this.buf.duration) + (this.playing ? "" : " · parado");
    }
  }
  let xCurve = LS.get("djCurve", "suave");
  let ytLoad = null; const ytApi = () => window.YT && YT.Player ? Promise.resolve() : (ytLoad = ytLoad || new Promise(res => { const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { try{ prev && prev(); }catch(e){} res(); }; const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s); }));
  const fmt = s => { s = Math.max(0, s || 0); return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); };
  const D = [new Deck(0), new Deck(1)];
  /* ---------- mesa ---------- */
  $d("#djX").oninput = () => D.forEach(d => d.applyX());
  $d("#djXc").onclick = () => { $d("#djX").value = 50; D.forEach(d => d.applyX()); };
  V.querySelectorAll("[data-ch]").forEach(x => x.oninput = () => { const d = D[+x.dataset.ch]; d.vol = Math.pow(+x.value / 100, 1.5); if(d.ch) d.applyFx(); d.ytVol(); });
  $d("#djMaster").oninput = e => { ensure(); master.gain.value = +e.target.value / 100; $d("#djMasterV").textContent = e.target.value + " %"; D.forEach(d => d.ytVol()); };
  /* v566: curva do crossfader, auto-mistura, disposição */
  $d("#djCurve").onclick = e => { xCurve = xCurve === "suave" ? "corte" : "suave"; LS.set("djCurve", xCurve); e.target.textContent = "Curva: " + xCurve; D.forEach(d => d.applyX()); };
  $d("#djCurve").textContent = "Curva: " + xCurve;
  let autoT = null;
  $d("#djAuto").onclick = () => { ensure(); const x = $d("#djX"), from = D[0].playing !== D[1].playing ? (D[0].playing ? 0 : 1) : (+x.value <= 50 ? 0 : 1), to = 1 - from, A = D[from], B = D[to];
    if(autoT){ cancelAnimationFrame(autoT); autoT = null; $d("#djAuto").classList.remove("on"); return; }
    if(!B.buf && !B.ytp){ toast("Carrega uma música no deck " + "AB"[to] + " para a auto-mistura.", true); return; }
    if(B.bpm && A.bpm && !B.ytp && !A.ytp){ if(!B.playing) B.startAt(B.cue || 0); B.sync(); } else if(!B.playing) B.play();
    const beats = 16, secs = (A.bpm ? 60 / (A.bpm * (1 + A.pitch)) : .5) * beats, v0 = +x.value, v1 = to ? 100 : 0, t0 = performance.now(); $d("#djAuto").classList.add("on");
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 1000 / secs); x.value = v0 + (v1 - v0) * k; D.forEach(d => d.applyX()); if(k < 1) autoT = requestAnimationFrame(step); else { autoT = null; $d("#djAuto").classList.remove("on"); if(A.playing) A.play(); } };
    autoT = requestAnimationFrame(step); toast("Auto-mistura para o deck " + "AB"[to] + " em " + beats + " batidas."); };
  /* v570: cabe sempre no ecrã (Tesla em ecrã inteiro ou meia janela): se a altura não chega, reduz tudo por igual */
  const fit = () => { const inner = $d(".djfit"); if(!inner || V.hidden) return; inner.style.transform = ""; inner.style.width = ""; V.style.height = "";
    const top = V.getBoundingClientRect().top, avail = innerHeight - Math.max(0, top) - 12; let h = inner.scrollHeight, s = Math.min(1, avail / h);
    if(s < 1){ for(let k = 0; k < 3; k++){ inner.style.width = (100 / s) + "%"; h = inner.scrollHeight; s = Math.max(.55, Math.min(1, avail / h)); } inner.style.transform = "scale(" + s + ")"; V.style.height = Math.ceil(h * s) + "px"; V.style.overflow = "hidden"; } else { V.style.overflow = ""; } };
  window.__djFit = () => requestAnimationFrame(fit);
  addEventListener("resize", () => window.__djFit());
  const setLay = m => { LS.set("djLay", m); const v = m === "v" || (m === "auto" && (innerWidth < 1050 || innerWidth / innerHeight < 1.25)); V.classList.toggle("lay-v", v); V.classList.toggle("lay-h", !v); V.querySelectorAll("[data-lay]").forEach(b => b.classList.toggle("on", b.dataset.lay === (v ? "v" : "h"))); window.__djFit(); };
  V.querySelectorAll("[data-lay]").forEach(b => b.onclick = () => setLay(b.dataset.lay));
  setLay(LS.get("djLay", "auto")); addEventListener("resize", () => { if(LS.get("djLay", "auto") === "auto") setLay("auto"); });
  /* gravação da mistura (WebM/Opus), descarrega no fim */
  let rec = null, chunks = [];
  $d("#djRec").onclick = () => { ensure();
    if(rec){ rec.stop(); return; }
    try{ chunks = []; rec = new MediaRecorder(recDest.stream); rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => { const b = new Blob(chunks, {type:rec.mimeType || "audio/webm"}), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "mistura-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".webm"; document.body.appendChild(a); a.click(); a.remove(); rec = null; $d("#djRec").textContent = "⏺ Gravar mistura"; $d("#djRec").classList.remove("on"); toast("Mistura gravada e descarregada."); };
      rec.start(1000); $d("#djRec").textContent = "⏹ Parar gravação"; $d("#djRec").classList.add("on"); toast("A gravar a mistura…");
    }catch(e){ rec = null; toast("Este browser não deixa gravar: " + e.message, true); } };
  /* ---------- carregar música ---------- */
  let srcDeck = 0;
  const openSrc = i => { srcDeck = i; $d("#djSrcT").textContent = "Carregar no deck " + "AB"[i]; $d("#djSrc").hidden = false; if(window.__libRender) window.__libRender(); };
  $d("#djSrcX").onclick = () => $d("#djSrc").hidden = true;
  $d("#djLoops").innerHTML = LOOPS.map((l, i) => '<button data-l="' + i + '">' + l.n + '<small>' + l.bpm + ' BPM · 16 compassos</small></button>').join("");
  const decode = async ab => { ensure(); return await new Promise((res, rej) => { const p = ac.decodeAudioData(ab.slice(0), res, rej); if(p && p.then) p.then(res, rej); }); };
  /* v587: biblioteca: faixas com link direto ficam guardadas com o BPM analisado, para voltar a carregar e filtrar */
  const libGet = () => { try{ return LS.get("djLib", {}) || {}; }catch(e){ return {}; } };
  const libAdd = (name, u, bpm, cam) => { if(!u || !bpm) return; const L = libGet(); L[name] = {u, b: Math.round(bpm * 10) / 10, c: cam || "", t: Date.now()}; const ks = Object.keys(L); if(ks.length > 200){ ks.sort((a, b) => L[a].t - L[b].t).slice(0, ks.length - 200).forEach(k => delete L[k]); } LS.set("djLib", L); };
  const fetchBuf = async u => { let r = null; for(const x of [u, typeof px === "function" && typeof HASPX === "function" && HASPX() ? px(u) : null].filter(Boolean)){ try{ r = await fetch(x); if(r.ok) break; }catch(e){ r = null; } } if(!r || !r.ok) throw new Error("o servidor não deixa ler o ficheiro"); return decode(await r.arrayBuffer()); };
  const loadInto = async (i, getBuf, name, known, url) => { $d("#djSrc").hidden = true; const d = D[i]; d.r("tit").textContent = "A carregar " + name + "…";
    try{ const buf = await getBuf(); await d.load(buf, name, known); libAdd(name, url, d.bpm, d.key && d.key.cam); }catch(e){ d.r("tit").textContent = d.name || "Sem música"; toast("Não consegui abrir «" + name + "»: " + (e && e.message || e), true); } };
  $d("#djLoops").addEventListener("click", e => { const b = e.target.closest("[data-l]"); if(!b) return; ensure(); const L = LOOPS[+b.dataset.l]; loadInto(srcDeck, () => makeLoop(L), L.n + " " + L.bpm, L.bpm); });
  $d("#djFile").onchange = e => { const f = e.target.files && e.target.files[0]; if(!f) return; e.target.value = ""; loadInto(srcDeck, async () => decode(await f.arrayBuffer()), f.name.replace(/\.[a-z0-9]+$/i, "")); };
  $d("#djUrl").onclick = () => { const u = prompt("Link direto para um ficheiro de som (.mp3, .m4a, .ogg, .wav)"); if(!u || !/^https?:\/\//i.test(u)) return;
    loadInto(srcDeck, async () => { let r = null; for(const x of [u, typeof px === "function" && typeof HASPX === "function" && HASPX() ? px(u) : null].filter(Boolean)){ try{ r = await fetch(x); if(r.ok) break; }catch(e){ r = null; } } if(!r || !r.ok) throw new Error("o servidor não deixa ler o ficheiro"); return decode(await r.arrayBuffer()); }, decodeURIComponent(u.split("?")[0].split("/").pop()).replace(/\.[a-z0-9]+$/i, "")); };
  /* v566: procurar música: Audius (músicas completas e livres), iTunes (amostras de 30 s) ou YouTube Music (leitor do YouTube) */
  const getJ = async u => { try{ const r = await fetch(u); if(r.ok) return await r.json(); throw new Error(r.status); }catch(e){ if(typeof px === "function" && typeof HASPX === "function" && HASPX()){ const r2 = await fetch(px(u)); if(r2.ok) return await r2.json(); } throw e; } };
  let audHost = "", djRes = [];
  const search = async (q, src) => {
    if(src === "itunes"){ const j = await getJ("https://itunes.apple.com/search?media=music&entity=song&limit=40&country=PT&term=" + encodeURIComponent(q)); return (j.results || []).filter(x => x.previewUrl).map(x => ({title:x.trackName, artist:x.artistName, dur:30, url:x.previewUrl, src})); }
    if(src === "youtube"){ if(!cfg.ytKey) throw new Error("Para o YouTube Music falta a chave da API do YouTube (Definições › YouTube).");
      const j = await (await fetch("https://www.googleapis.com/youtube/v3/search?" + new URLSearchParams({part:"snippet", type:"video", videoCategoryId:"10", videoEmbeddable:"true", maxResults:"30", regionCode:"PT", q, key:cfg.ytKey}))).json(); if(j.error) throw new Error(j.error.message || "YouTube");
      return (j.items || []).filter(x => x.id && x.id.videoId).map(x => { const raw = String(x.snippet.title || "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s*[\(\[](official|oficial|lyric|lyrics|audio|video|vídeo|hd|4k)[^\)\]]*[\)\]]/gi, ""), k = raw.indexOf(" - "); return {title:k > 0 ? raw.slice(k + 3) : raw, artist:k > 0 ? raw.slice(0, k) : String(x.snippet.channelTitle || "").replace(/\s*-\s*Topic$/i, ""), yt:x.id.videoId, src}; }); }
    if(!audHost){ try{ const j = await getJ("https://api.audius.co"); audHost = (j.data || [])[0] || "https://discoveryprovider.audius.co"; }catch(e){ audHost = "https://discoveryprovider.audius.co"; } }
    const j = await getJ(audHost + "/v1/tracks/search?app_name=CockpitTesla&query=" + encodeURIComponent(q));
    return (j.data || []).filter(x => x && x.id && x.is_streamable !== false).slice(0, 40).map(x => ({title:x.title, artist:(x.user && x.user.name) || "", dur:x.duration || 0, url:audHost + "/v1/tracks/" + x.id + "/stream?app_name=CockpitTesla", src}));
  };
  $d("#djQs").value = LS.get("djQs", "audius");
  const doSearch = async () => { const q = $d("#djQ").value.trim(), src = $d("#djQs").value; if(!q) return; LS.set("djQs", src); const box = $d("#djRes"); box.innerHTML = '<span class="small muted">A procurar…</span>';
    try{ djRes = await search(q, src); box.innerHTML = djRes.length ? djRes.map((r, i) => '<button data-sr="' + i + '">' + esc(r.title) + '<small>' + esc(r.artist) + (r.dur ? " · " + fmt(r.dur) : "") + (r.yt ? " · YouTube" : r.src === "itunes" ? " · 30 s" : "") + '</small></button>').join("") : '<span class="small muted">Nada encontrado.</span>'; }
    catch(e){ box.innerHTML = '<span class="small muted">' + esc(e && e.message || String(e)) + '</span>'; } };
  $d("#djQgo").onclick = doSearch; $d("#djQ").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); doSearch(); } });
  $d("#djRes").addEventListener("click", e => { const b = e.target.closest("[data-sr]"); if(!b) return; const r = djRes[+b.dataset.sr]; ensure();
    if(r.yt){ $d("#djSrc").hidden = true; D[srcDeck].loadYT(r); return; }
    loadInto(srcDeck, async () => { let res = null; for(const u of [r.url, typeof px === "function" && typeof HASPX === "function" && HASPX() ? px(r.url) : null].filter(Boolean)){ try{ res = await fetch(u); if(res.ok) break; }catch(x){ res = null; } } if(!res || !res.ok) throw new Error("o servidor da música não deixa ler o som"); return decode(await res.arrayBuffer()); }, (r.artist ? r.artist + " — " : "") + r.title, 0, r.url); });
  /* v587: lista da biblioteca com filtro de BPM e modo «compatíveis» (±6 % do BPM do outro deck) */
  let libComp = false;
  const renderLib = () => { const box = $d("#djLib"); if(!box) return; const L = libGet(), lo = +$d("#djBmin").value || 0, hi = +$d("#djBmax").value || 9999;
    let tgt = 0; if(libComp){ const o = D[1 - srcDeck]; tgt = o && o.bpm ? o.bpm * (1 + o.pitch) : (D[srcDeck] && D[srcDeck].bpm) || 0; }
    const oc = libComp ? (D[1 - srcDeck] && D[1 - srcDeck].key ? D[1 - srcDeck].key.cam : "") : "";
    const camOk = (a, b) => { if(!a || !b) return true; const na = parseInt(a, 10), nb = parseInt(b, 10), df = Math.abs(na - nb); return a.slice(-1) === b.slice(-1) ? Math.min(df, 12 - df) <= 1 : df === 0; };
    const ks = Object.keys(L).filter(k => { const b = L[k].b; if(b < lo || b > hi) return false; if(libComp && tgt && Math.abs(b - tgt) / tgt > .06) return false; if(libComp && !camOk(oc, L[k].c)) return false; return true; }).sort((a, b) => L[b].t - L[a].t);
    box.innerHTML = ks.length ? ks.map(k => '<button data-lb="' + esc(k) + '">' + esc(k) + '<small>' + L[k].b.toFixed(1).replace(".", ",") + ' BPM' + (L[k].c ? ' · ' + L[k].c : '') + '</small></button>').join("") : '<span class="small muted">Ainda não há faixas com link analisadas' + (libComp ? ' compatíveis' : '') + '.</span>';
    $d("#djBcomp").classList.toggle("on", libComp); $d("#djBall").classList.toggle("on", !libComp); };
  window.__libRender = renderLib;
  $d("#djBall").onclick = () => { libComp = false; renderLib(); };
  $d("#djBcomp").onclick = () => { libComp = true; renderLib(); };
  $d("#djBmin").addEventListener("input", renderLib); $d("#djBmax").addEventListener("input", renderLib);
  $d("#djLib").addEventListener("click", e => { const b = e.target.closest("[data-lb]"); if(!b) return; const k = b.dataset.lb, L = libGet(), it = L[k]; if(!it) return; ensure(); loadInto(srcDeck, () => fetchBuf(it.u), k, it.b, it.u); });
  /* pasta MEGA de música (link guardado só neste aparelho) */
  const megaLib = () => window.mega ? Promise.resolve(window.mega) : new Promise((res, rej) => { const s = document.createElement("script"); s.src = "emu/megajs.min.js"; s.onload = () => res(window.mega); s.onerror = () => rej(new Error("não carreguei o leitor do MEGA")); document.head.appendChild(s); });
  let megaTracks = null;
  const megaAsk = () => { const u = prompt("Link da tua pasta MEGA com música (https://mega.nz/folder/…#chave). Fica guardado só neste aparelho.", LS.get("djMega", "") || ""); if(u == null) return false; if(!/^https:\/\/mega\.(nz|co\.nz)\/(folder|file)\//i.test(u.trim()) || !u.includes("#")){ toast("Esse link não parece uma pasta MEGA (tem de ter #chave no fim).", true); return false; } LS.set("djMega", u.trim()); megaTracks = null; return true; };
  const megaLoad = async () => { let u = LS.get("djMega", ""); if(!u){ if(!megaAsk()) return; u = LS.get("djMega", ""); }
    const box = $d("#djMegaList"); box.innerHTML = '<span class="small muted">A ler a pasta…</span>';
    try{ if(!megaTracks){ const M = await megaLib(), root = M.File.fromURL(u); await root.loadAttributes(); const out = [], walk = n => { if(n.directory || n.children){ (n.children || []).forEach(walk); return; } if(/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i.test(n.name)) out.push(n); }; walk(root); megaTracks = out.sort((a, b) => a.name.localeCompare(b.name)); }
      box.innerHTML = megaTracks.length ? megaTracks.map((f, i) => '<button data-mt="' + i + '">' + esc(f.name.replace(/\.[a-z0-9]+$/i, "")) + '<small>' + Math.round(f.size / 1048576 * 10) / 10 + ' MB</small></button>').join("") : '<span class="small muted">Não encontrei músicas (.mp3, .m4a, .ogg, .wav, .flac) nesta pasta.</span>';
    }catch(e){ box.innerHTML = '<span class="small muted">Não consegui ler a pasta: ' + esc(e && e.message || String(e)) + '</span>'; } };
  $d("#djMega").onclick = megaLoad; $d("#djMegaL").onclick = () => { if(megaAsk()) megaLoad(); };
  $d("#djMegaList").addEventListener("click", e => { const b = e.target.closest("[data-mt]"); if(!b) return; const f = megaTracks[+b.dataset.mt]; ensure(); loadInto(srcDeck, async () => { const x = await f.downloadBuffer(); return decode(x.buffer ? x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength) : x); }, f.name.replace(/\.[a-z0-9]+$/i, "")); });
  /* ---------- desenho ---------- */
  const vuData = new Uint8Array(512), spD = new Uint8Array(512);
  const drawSpec = () => { const cv = $d("#djSpec"); if(!cv || !mAn) return; const x = cv.getContext("2d"), w = cv.width, h = cv.height; mAn.getByteFrequencyData(spD); x.clearRect(0, 0, w, h); const n = 42, bw = w / n;
    for(let i = 0; i < n; i++){ const v = spD[Math.floor(Math.pow(i / n, 1.7) * 380)] / 255, bh = Math.max(2, v * h * .95), g = x.createLinearGradient(0, h, 0, h - bh); g.addColorStop(0, "#5cf2ff"); g.addColorStop(1, "#ff5ca8"); x.fillStyle = g; x.fillRect(i * bw + 1, h - bh, bw - 2, bh); }
    /* fase: diferença entre as batidas dos dois decks */
    const A = D[0], B = D[1], ph = $d("#djPh"); if(ph){ if(A.playing && B.playing && A.bpm && B.bpm){ const pa = ((A.curPos() - A.beat0) / (60 / (A.bpm * (1 + A.pitch)) * (1 + A.pitch))) % 1, pb = ((B.curPos() - B.beat0) / (60 / (B.bpm * (1 + B.pitch)) * (1 + B.pitch))) % 1; let d = pa - pb; if(d > .5) d -= 1; if(d < -.5) d += 1; ph.style.left = (50 + d * 100) + "%"; ph.style.background = Math.abs(d) < .06 ? "#3ddc97" : Math.abs(d) < .15 ? "#ffcc33" : "#ff4d6d"; } else { ph.style.left = "50%"; ph.style.background = "#ffffff44"; } } };
  const loop = () => { requestAnimationFrame(loop); if(V.hidden) return; drawSpec();
    D.forEach((d, i) => { d.frame(); d.drawJog(); const el = document.getElementById("djVu" + i); if(!el) return; let lv = 0; if(d.an && d.playing){ d.an.getByteTimeDomainData(vuData); let s = 0; for(let k = 0; k < vuData.length; k++){ const v = (vuData[k] - 128) / 128; s += v * v; } lv = Math.min(1, Math.sqrt(s / vuData.length) * 3.2); } d.vu = Math.max(lv, (d.vu || 0) * .9); el.style.height = Math.round(d.vu * 100) + "%"; });
  };
  requestAnimationFrame(loop);
  window.__dj = {D, makeLoop, trackBpm, ensure};
})();
