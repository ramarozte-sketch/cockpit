
(function(){
  if(window.ANDROID) return;
  try{
    const de = document.documentElement;
    /* só no Tesla (o resto dos browsers fica igual) */
    const halfWanted = () => {
      const m = (typeof cfg === "object" && cfg.halfMode) || "auto";
      if(m === "on") return true;
      if(m === "off") return false;
      return !!window.__TESLA && innerWidth <= 820;
    };
    const upd = () => { const on = halfWanted(); de.classList.toggle("half", on); if(!on) de.classList.remove("hbOn", "hdrMini"); };
    upd(); addEventListener("resize", upd); window.__halfUpd = upd;

    /* 3. barra fixa do leitor: canal anterior, pausa, seguinte, ecrã total, volume */
    const bar = document.createElement("div"); bar.id = "halfBar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Leitor");
    bar.innerHTML = '<button data-a="prev" aria-label="Canal anterior"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 5L8 12l10 7z" fill="currentColor"/><path d="M5 5v14"/></svg></button><button data-a="play" class="pri" aria-label="Pausa ou continuar"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5v14l7-7z" fill="currentColor"/><path d="M16 6v12M20 6v12"/></svg></button><button data-a="next" aria-label="Canal seguinte"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5l10 7-10 7z" fill="currentColor"/><path d="M19 5v14"/></svg></button><button data-a="full" aria-label="Ecrã total"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button><button data-a="vd" aria-label="Baixar o som"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 12h5"/></svg></button><button data-a="vu" aria-label="Subir o som"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 12h5M18.5 9.5v5"/></svg></button>';
    document.body.appendChild(bar);
    const vidT = () => document.getElementById("vid" + (typeof tvTarget === "number" ? tvTarget : 0));
    const vol = d => { try{ const G = window.__vg, v = document.getElementById("vid" + (typeof audioSlot === "number" ? audioSlot : 0)); let x = (G && G.v != null ? G.v : (v ? v.volume : 1)) + d; x = Math.max(0, Math.min(1, Math.round(x * 10) / 10)); if(G) G.v = x; if(v){ v.muted = false; v.volume = x; } LS.set("tvVol", x); toast("Som " + Math.round(x * 100) + "%"); }catch(e){} };
    bar.addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return; e.stopPropagation();
      const a = b.dataset.a;
      try{
        if(a === "prev" || a === "next"){ if(!zap(a === "next" ? 1 : -1)) toast("Não há outro canal nesta lista."); }
        else if(a === "play"){ const v = vidT(); if(v){ if(v.paused) v.play().catch(() => {}); else v.pause(); } }
        else if(a === "full"){ window.__fsFromHome = currentView === "tvinicio"; if(window.__ah) window.__ah.pass = Date.now() + 3000; show("tv"); setCinema(true); if(window.__goFull) window.__goFull(); }
        else if(a === "vd") vol(-0.1); else if(a === "vu") vol(0.1);
      }catch(x){}
    });
    const hb = () => { try{ const on = de.classList.contains("half") && currentView === "tv" && !!(lastPlayed[0] || lastPlayed[1]) && !document.body.classList.contains("pfull"); de.classList.toggle("hbOn", on); }catch(e){} };
    setInterval(hb, 700); hb();

    /* 4. deslizar na imagem (ecrã total): para a esquerda = canal seguinte, para a direita = anterior */
    const st = document.getElementById("stage");
    if(st){
      let s = null;
      st.addEventListener("pointerdown", e => {
        const full = document.body.classList.contains("pfull") || !!(document.fullscreenElement || document.webkitFullscreenElement);
        if(!full || e.target.closest("button,a,input,select,textarea,.cinebar")) { s = null; return; }
        s = {id:e.pointerId, x:e.clientX, y:e.clientY, t:Date.now()};
      }, true);
      st.addEventListener("pointerup", e => {
        if(!s || e.pointerId !== s.id) return; const dx = e.clientX - s.x, dy = e.clientY - s.y, dt = Date.now() - s.t; s = null;
        if(dt > 900 || Math.abs(dx) < Math.max(80, innerWidth * 0.12) || Math.abs(dx) < Math.abs(dy) * 2) return;
        if(window.__vg && window.__vg.drag) return;   /* era um gesto de brilho/som */
        try{ if(window.__vg) window.__vg.lastGest = Date.now(); }catch(x){}   /* não conta como toque nem duplo toque */
        try{ if(zap(dx < 0 ? 1 : -1)){ const c = lastPlayed[tvTarget]; if(c) toast((dx < 0 ? "▶ " : "◀ ") + c.name); if(window.__ctlPeek) window.__ctlPeek(); } }catch(x){}
      }, true);
      st.addEventListener("pointercancel", () => { s = null; }, true);
    }

    /* 6. cabeçalho encolhe quando se desce na página */
    let mini = false;
    document.addEventListener("scroll", e => {
      if(!de.classList.contains("half")) return;
      const t = e.target; if(!t || t === document || !t.closest || t.closest("#fsCh,dialog,.ahScroll")) return;
      const y = t.scrollTop || 0;
      if(!mini && y > 60){ mini = true; de.classList.add("hdrMini"); }
      else if(mini && y < 12){ mini = false; de.classList.remove("hdrMini"); }
    }, true);
    const _show = window.show; if(typeof _show === "function") window.show = function(){ const r = _show.apply(this, arguments); try{ mini = false; de.classList.remove("hdrMini"); hb(); }catch(e){} return r; };
  }catch(e){ console.log("meia janela", e); }
})();
