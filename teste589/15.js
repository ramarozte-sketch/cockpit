
/* ===== Tesla: barra para andar no tempo do filme em ecrã total ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const b2 = $("cinebar2"); if(!b2) return;
  const w = document.createElement("div"); w.id = "vSeek";
  w.innerHTML = '<span id="vSeekC">0:00</span><input type="range" id="vSeekR" min="0" max="1000" step="1" value="0" aria-label="Posição no vídeo"><span id="vSeekD">0:00</span><span id="vAcBox" style="display:none;align-items:center;gap:6px;flex:none"><button id="vAcM" class="btn" aria-label="Acertar o som 100 ms mais cedo">🔈 −0,1 s</button><span id="vAcT" class="muted small" style="min-width:80px;text-align:center">Som 0 ms</span><button id="vAcP" class="btn" aria-label="Acertar o som 100 ms mais tarde">🔊 +0,1 s</button></span>';
  b2.insertBefore(w, b2.firstChild);
  const R = $("vSeekR"); let drag = false;
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  const vid = () => $("vid" + tvTarget);
  const vod = () => { try{ const c = lastPlayed[tvTarget], v = vid(); return c && (c.kind === "movie" || c.kind === "episode") && v && isFinite(v.duration) && v.duration > 0 ? v : null; }catch(e){ return null; } };
  setInterval(() => {
    const v = vod();
    document.body.classList.toggle("mirOn", !!(typeof mirrorOn !== "undefined" && mirrorOn));
    /* v430: com som por software (em andamento o elemento de vídeo pode não ter duração) os botões do acerto aparecem na mesma */
    const ac = window.__mseAcerto, acOn = !!(ac && ac.alive && ac.alive() && ac.slot === tvTarget && (v || ac.soft));
    w.classList.toggle("on", !!v || acOn);
    /* v495: a barra do tempo encolhe para não ficar por cima da lista de filmes à esquerda */
    try{ const L = $("fsCh"), ls = L && getComputedStyle(L); let ml = 0;
      /* v496: a barra de baixo começava no canto esquerdo e tapava os últimos filmes da lista (não se conseguiam escolher): passa a começar à direita da lista */
      const lv = !!(L && ls.display !== "none" && L.style.display !== "none" && L.childElementCount && document.body.classList.contains("pfull"));
      const bl = lv ? Math.round(L.getBoundingClientRect().right) + "px" : ""; if(b2.style.left !== bl) b2.style.left = bl;
      if(L && ls.display !== "none" && L.style.display !== "none" && L.childElementCount){ const lr = L.getBoundingClientRect().right, wl = w.getBoundingClientRect().left - (parseFloat(w.style.marginLeft) || 0); ml = Math.max(0, Math.round(lr - wl + 8)); }
      const mv = ml ? ml + "px" : ""; if(w.style.marginLeft !== mv){ w.style.marginLeft = mv; w.style.flexBasis = ml ? "calc(100% - " + ml + "px)" : ""; w.style.maxWidth = ml ? "calc(100% - " + ml + "px)" : ""; } }catch(e){}
    const box = $("vAcBox"); if(box) box.style.display = acOn ? "flex" : "none";
    if(acOn){ $("vAcT").textContent = "Som " + ac.ms() + " ms"; }
    if(!v || drag) return;
    R.value = String(Math.round(v.currentTime / v.duration * 1000)); $("vSeekC").textContent = fmt(v.currentTime); $("vSeekD").textContent = "-" + fmt(v.duration - v.currentTime);
  }, 500);
  const acAdj = d => { const ac = window.__mseAcerto; if(ac && ac.alive && ac.alive()){ ac.adj(d); try{ toast("Som " + ac.ms() + " ms (guardado para este filme)"); }catch(e){} } };
  $("vAcM") && ($("vAcM").onclick = () => acAdj(-100)); $("vAcP") && ($("vAcP").onclick = () => acAdj(100));
  const keep = () => { try{ window.__ctlPeek ? window.__ctlPeek() : document.body.classList.add("ctlOn"); }catch(e){} };
  R.addEventListener("input", () => { const v = vod(); if(!v) return; drag = true; keep(); $("vSeekC").textContent = fmt(R.value / 1000 * v.duration); });
  R.addEventListener("change", () => { const v = vod(); drag = false; if(!v) return; try{ v.currentTime = R.value / 1000 * v.duration; }catch(e){} });
  ["pointerdown", "touchstart"].forEach(t => R.addEventListener(t, keep, {passive:true}));
  }catch(e){ console.log("barra do tempo", e); }
})();
