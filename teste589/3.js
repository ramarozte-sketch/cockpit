
/* Ecrã de arranque (corre antes do resto da app para aparecer logo). Só usa a Web Audio e um canvas. */
(function(){
  const boot = document.getElementById("boot"); if(!boot) return;
  const rd = () => { try{ return JSON.parse(localStorage.getItem("ck_cfg") || "{}") || {}; }catch(e){ return {}; } };
  if(rd().boot === false || rd().passenger){ boot.hidden = true; return; }
  const cv = document.getElementById("bootCv"), g = cv.getContext("2d"), bar = document.getElementById("bootBar"), logEl = document.getElementById("bootLog"), logoEl = document.getElementById("bootLogo"), sub = document.getElementById("bootSub"), hint = document.getElementById("bootSnd");
  const TOTAL = 4000, WORD = "COCKPIT", GL = "TESLA0123456789ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ<>/\\=+*", FS = 20;
  const LOG = [[.15,"NÚCLEO ............. <b>OK</b>"],[.9,"BARRAMENTO CAN ..... <b>OK</b>"],[1.5,"LIGAÇÃO AO CARRO ... <b>OK</b>"],[2.1,"NAVEGAÇÃO E MEDIA .. <b>OK</b>"],[2.7,"ENERGIA SOLAR ...... <b>OK</b>"],[3.3,"<b>SISTEMA PRONTO</b>"]];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0, t0 = 0, last = 0, cols = [], W = 0, H = 0, acc = "#7cc4ff", done = false, actx = null, soundOn = false, soundDone = false, spans = [];
  const accent = () => { try{ const v = getComputedStyle(boot).getPropertyValue("--accent").trim(); if(v) acc = v; }catch(e){} };
  function size(){ W = cv.width = Math.ceil(innerWidth); H = cv.height = Math.ceil(innerHeight); cols = Array.from({length:Math.ceil(W/FS)}, () => ({y:-Math.random()*H/FS, v:.5 + Math.random()*.9})); g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
  function mkWord(){ logoEl.innerHTML = [...WORD].map(() => '<span class="s">' + GL[(Math.random()*GL.length)|0] + "</span>").join(""); spans = [...logoEl.children]; }
  /* ---- som futurista: subida de graves, varrimento, bips digitais, acorde final e "ping" ---- */
  function sound(ctx){
    const v0 = rd().uiVol, vol = (v0 != null && v0 !== "" ? +v0 : 60)/100 * .6; if(vol <= 0) return;
    const t = ctx.currentTime + .05, comp = ctx.createDynamicsCompressor(), M = ctx.createGain(); M.gain.value = vol; M.connect(comp); comp.connect(ctx.destination);
    const dl = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain(); dl.delayTime.value = .21; fb.gain.value = .4; lp.type = "lowpass"; lp.frequency.value = 3000; wet.gain.value = .5;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(M);
    const out = ctx.createGain(); out.connect(M); out.connect(dl);
    const osc = (type, f, a, b) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t + a); o.start(t + a); o.stop(t + b); return o; };
    const env = (node, pts) => { node.gain.setValueAtTime(0.0001, t); pts.forEach(([tt, v]) => node.gain.linearRampToValueAtTime(Math.max(.0001, v), t + tt)); };
    // 1) grave que sobe
    { const o = osc("sine", 42, 0, 3.2), gn = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(120, t + 2.6); env(gn, [[1.4,.5],[2.6,.55],[3.2,0]]); o.connect(gn); gn.connect(out); }
    // 2) varrimento (riser) com filtro a abrir
    { const bp = ctx.createBiquadFilter(), gn = ctx.createGain(); bp.type = "bandpass"; bp.Q.value = 5; bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(6200, t + 2.5); env(gn, [[1.2,.16],[2.45,.22],[2.7,0]]);
      [0, 7].forEach(dt => { const o = osc("sawtooth", 110, 0, 2.8); o.detune.value = dt; o.frequency.exponentialRampToValueAtTime(880, t + 2.5); o.connect(bp); }); bp.connect(gn); gn.connect(out); }
    // 3) bips digitais durante a chuva
    const sc = [1318, 1568, 1760, 2093, 2637, 3136, 3520];
    for(let i = 0; i < 22; i++){ const a = .2 + i*.1 + Math.random()*.04, f = sc[(Math.random()*sc.length)|0], o = osc(i % 3 ? "sine" : "square", f, a, a + .08), gn = ctx.createGain(); gn.gain.setValueAtTime(.0001, t + a); gn.gain.linearRampToValueAtTime(i % 3 ? .05 : .025, t + a + .004); gn.gain.exponentialRampToValueAtTime(.0001, t + a + .07); o.connect(gn); gn.connect(out); }
    // 4) acorde de "ligação" + sopro
    { const lpf = ctx.createBiquadFilter(), gn = ctx.createGain(); lpf.type = "lowpass"; lpf.frequency.setValueAtTime(5200, t + 2.55); lpf.frequency.exponentialRampToValueAtTime(700, t + 3.9); gn.gain.setValueAtTime(.0001, t + 2.55); gn.gain.linearRampToValueAtTime(.3, t + 2.58); gn.gain.exponentialRampToValueAtTime(.0001, t + 4);
      [110, 164.8, 220, 329.6, 440].forEach((f, i) => { const o = osc("sawtooth", f, 2.55, 4.05); o.detune.value = (i - 2)*5; o.connect(lpf); }); lpf.connect(gn); gn.connect(out); }
    { const n = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; n.buffer = b; n.loop = true;
      const hp = ctx.createBiquadFilter(), gn = ctx.createGain(); hp.type = "highpass"; hp.frequency.setValueAtTime(1500, t + 2.5); hp.frequency.exponentialRampToValueAtTime(9000, t + 3.4); gn.gain.setValueAtTime(.0001, t + 2.5); gn.gain.linearRampToValueAtTime(.12, t + 2.56); gn.gain.exponentialRampToValueAtTime(.0001, t + 3.4); n.connect(hp); hp.connect(gn); gn.connect(out); n.start(t + 2.5); n.stop(t + 3.5); }
    // 5) "ping" final
    [[2349, .16, 1.3], [1175, .1, 1.6], [3520, .05, .9]].forEach(([f, v, dur]) => { const o = osc("sine", f, 2.78, 2.78 + dur), gn = ctx.createGain(); gn.gain.setValueAtTime(.0001, t + 2.78); gn.gain.linearRampToValueAtTime(v, t + 2.79); gn.gain.exponentialRampToValueAtTime(.0001, t + 2.78 + dur); o.connect(gn); gn.connect(out); });
  }
  function startSound(){
    if(soundDone || rd().bootSnd === false) return; soundDone = true;
    try{ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return; actx = new AC();
      const go = () => { if(actx && actx.state === "running"){ hint.hidden = true; soundOn = true; sound(actx); } else { soundDone = false; hint.hidden = false; } };
      actx.resume ? actx.resume().then(() => setTimeout(go, 30)).catch(go) : go();
    }catch(e){}
  }
  function unlock(){ if(!done && soundDone === false && rd().bootSnd !== false) startSound(); }
  /* ---- animação ---- */
  function frame(ts){
    if(done) return; if(!t0){ t0 = ts; last = ts; }
    const el = ts - t0, dt = Math.min(60, ts - last); 
    if(ts - last < 30){ raf = requestAnimationFrame(frame); return; } last = ts;
    if((el|0) % 8 === 0) accent();
    // chuva
    g.fillStyle = "rgba(0,0,0,.085)"; g.fillRect(0, 0, W, H); g.font = FS + "px ui-monospace,Menlo,Consolas,monospace";
    for(let i = 0; i < cols.length; i++){
      const c = cols[i]; c.y += c.v*dt/33*(el < 400 ? .6 : 1); const x = i*FS, y = c.y*FS;
      if(y > 0 && y < H + FS){ g.fillStyle = acc; g.globalAlpha = .75; g.fillText(GL[(Math.random()*GL.length)|0], x, y - FS); g.globalAlpha = 1; g.fillStyle = "#eaf6ff"; g.fillText(GL[(Math.random()*GL.length)|0], x, y); }
      if(y > H + 40 && Math.random() > .975) { c.y = -Math.random()*20; c.v = .5 + Math.random()*.9; }
    }
    // palavra: letras trocadas que se resolvem
    const rt = el - 900;
    spans.forEach((sp, i) => { if(rt > i*140 + 250){ if(sp.className){ sp.className = ""; sp.textContent = WORD[i]; if(i === WORD.length - 1){ logoEl.classList.add("glitch"); } } } else if(rt > 0) sp.textContent = GL[(Math.random()*GL.length)|0]; });
    if(rt > 0 && !sub.textContent) sub.textContent = "A iniciar";
    if(el > 2700) sub.textContent = el > 3300 ? "Bem-vindo a bordo" : "A ligar";
    // progresso e registo
    const p = Math.min(1, el/(TOTAL - 500)); bar.style.width = (p < .5 ? 2*p*p : 1 - 2*(1 - p)*(1 - p))*100 + "%";
    const lines = LOG.filter(l => el/1000 >= l[0]).slice(-5).map(l => l[1]); logEl.innerHTML = lines.join("\n");
    if(el >= TOTAL) return finish();
    raf = requestAnimationFrame(frame);
  }
  function finish(){
    if(done) return; done = true; cancelAnimationFrame(raf); bar.style.width = "100%";
    boot.classList.add("go"); setTimeout(() => { boot.hidden = true; try{ if(actx){ actx.close(); actx = null; } }catch(e){} }, 750);
    removeEventListener("keydown", onKey);
  }
  function onKey(e){ if(!soundOn && !soundDone && rd().bootSnd !== false) startSound(); else finish(); }
  boot.addEventListener("pointerdown", () => { if(!soundOn && rd().bootSnd !== false && hint.hidden === false){ startSound(); } else finish(); });
  function start(){
    done = false; t0 = 0; soundOn = false; soundDone = false; hint.hidden = true; boot.classList.remove("go"); boot.hidden = false; logoEl.classList.remove("glitch"); sub.textContent = ""; logEl.textContent = ""; bar.style.width = "0";
    mkWord(); size(); accent(); addEventListener("keydown", onKey);
    if(reduce){ spans.forEach((sp, i) => { sp.className = ""; sp.textContent = WORD[i]; }); bar.style.width = "100%"; sub.textContent = "Bem-vindo a bordo"; setTimeout(finish, 1200); return; }
    startSound(); raf = requestAnimationFrame(frame);
  }
  addEventListener("resize", () => { if(!done) size(); });
  window.BOOT = {replay(){ cancelAnimationFrame(raf); start(); }};
  start();
})();
