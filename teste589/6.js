
(function(){
  if(window.ANDROID) return;
  /* ===== Guia: cabeçalho compacto, filtros lado a lado, pesquisa de programas escondida ===== */
  try{
    document.body.classList.add("gdNew");
    const box = document.querySelector("#gdDlg .gdbox"), top = box.firstElementChild;
    top.classList.add("gdtop");
    const h = top.querySelector("h2"); if(h){ h.removeAttribute("style"); h.textContent = "📅 Guia"; }
    const cat = document.createElement("span"); cat.className = "gdcat"; top.insertBefore(cat, top.querySelector(".spacer"));
    const pb = document.createElement("button"); pb.className = "btn"; pb.id = "gdProgBtn"; pb.textContent = "🔎 Programas"; pb.setAttribute("aria-pressed", "false");
    top.insertBefore(pb, $("gdClose"));
    const side = box.querySelector(".gdside"), f = document.createElement("div"); f.className = "gdfilt";
    side.insertBefore(f, side.firstChild); f.appendChild($("gdGroup")); f.appendChild($("gdSearch"));
    const pr = $("gdProgQ").closest(".row"); pr.id = "gdProgRow"; pr.hidden = true;
    pb.onclick = () => { const o = pr.hidden; pr.hidden = !o; pb.setAttribute("aria-pressed", String(o)); if(o) setTimeout(() => { try{ $("gdProgQ").focus(); }catch(e){} }, 30); else { $("gdProgQ").value = ""; try{ gdSearchClear(); }catch(e){} } };
    const upd = () => { const g = $("gdGroup").value, n = (GD.list || []).length; cat.textContent = (g || "Todas as categorias") + " · " + n + " canais"; };
    $("gdGroup").addEventListener("change", () => setTimeout(upd, 0)); $("gdSearch").addEventListener("input", () => setTimeout(upd, 0));
    const _rl = window.gdRenderList; window.gdRenderList = function(){ const r = _rl.apply(this, arguments); try{ upd(); }catch(e){} return r; };
  }catch(e){ console.log("guia", e); }

  /* ===== Ecrã total / modo cinema: deslizar à esquerda = brilho, à direita = som ===== */
  try{
    const st = $("stage"), tag = document.createElement("div"); tag.id = "vGest"; tag.innerHTML = '<span class="ic"></span><span class="tr"><i></i></span><span class="vl"></span>'; st.appendChild(tag);
    const G = window.__vg = {b:+LS.get("tvBright", 1) || 1, v:LS.get("tvVol", 1)};
    if(!(G.v >= 0 && G.v <= 1)) G.v = 1;
    const vids = () => [$("vid0"), $("vid1")];
    const full = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || $("v-tv").classList.contains("cinema");
    const bri = document.createElement("div"); bri.id = "vBri"; st.appendChild(bri);
    vids().forEach(v => { if(v) v.style.filter = ""; });
    let briUp = null;
    const applyB = () => { const b = G.b;
      if(Math.abs(b - 1) < 0.01){ bri.style.opacity = "0"; return; }
      const up = b > 1; if(up !== briUp){ briUp = up; bri.style.background = up ? "#fff" : "#000"; bri.style.mixBlendMode = up ? "soft-light" : "normal"; }
      bri.style.opacity = up ? Math.min(1, (b - 1) * 0.9).toFixed(3) : Math.min(0.85, 1 - b).toFixed(3); };
    const applyV = () => { try{ const v = $("vid" + audioSlot); if(v && !v.muted) v.volume = G.v; }catch(e){} };
    applyB();
    vids().forEach(v => v && ["playing", "loadeddata"].forEach(ev => v.addEventListener(ev, applyV)));
    let hideT = 0;
    const tIc = tag.querySelector(".ic"), tBar = tag.querySelector(".tr i"), tVl = tag.querySelector(".vl"); let tKind = "", tIco = "", tTxt = "";
    const show = (kind, val, txt) => {
      const ico = kind === "b" ? "☀️" : val === 0 ? "🔇" : "🔊"; if(ico !== tIco){ tIco = ico; tIc.textContent = ico; }
      tBar.style.height = Math.round(Math.min(1, val / (kind === "b" ? 2 : 1)) * 100) + "%";
      if(txt !== tTxt){ tTxt = txt; tVl.textContent = txt; }
      if(kind !== tKind){ tKind = kind; tag.style.left = kind === "b" ? "24px" : ""; tag.style.right = kind === "b" ? "" : "24px"; }
      if(!tag.classList.contains("on")) tag.classList.add("on"); clearTimeout(hideT); hideT = setTimeout(() => tag.classList.remove("on"), 900);
    };
    const sync = () => document.body.classList.toggle("vgOn", full() && currentView === "tv");
    document.addEventListener("fullscreenchange", sync); new MutationObserver(sync).observe($("v-tv"), {attributes:true, attributeFilter:["class"]});
    let s = null;
    st.addEventListener("pointerdown", e => {
      if(!full() || e.target.closest("button,a,input,select,textarea,.cinebar")) return;
      const r = st.getBoundingClientRect();
      if(e.clientY > r.bottom - Math.min(64, r.height * 0.16)) return;   /* barra de controlos do vídeo */
      s = {id:e.pointerId, x:e.clientX, y:e.clientY, h:r.height, side:(e.clientX - r.left) < r.width / 2 ? "b" : "v", b0:G.b, v0:G.v, on:false};
    });
    st.addEventListener("pointermove", e => {
      if(!s || e.pointerId !== s.id) return;
      const dy = s.y - e.clientY, dx = e.clientX - s.x;
      if(!s.on){ if(Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx) * 1.2) return; s.on = true; G.drag = true; try{ st.setPointerCapture(e.pointerId); }catch(x){} }
      e.preventDefault();
      const k = dy / (s.h * 0.75);
      if(s.side === "b") G.b = Math.max(0.3, Math.min(2, s.b0 + k * 1.7)); else G.v = Math.max(0, Math.min(1, s.v0 + k));
      /* v197: vários movimentos do dedo por imagem do ecrã → aplica só uma vez, na imagem seguinte */
      if(!s.raf){ const side = s.side; s.raf = requestAnimationFrame(() => { if(s) s.raf = 0;
        if(side === "b"){ applyB(); show("b", G.b, Math.round(G.b * 100) + "%"); } else { applyV(); show("v", G.v, Math.round(G.v * 100) + "%"); } }); }
    });
    const end = e => { if(!s || (e && e.pointerId !== s.id)) return; if(s.on){ try{ if(s.raf) cancelAnimationFrame(s.raf); applyB(); applyV(); }catch(x){} LS.set("tvBright", +G.b.toFixed(2)); LS.set("tvVol", +G.v.toFixed(2)); G.lastGest = Date.now(); } s = null; setTimeout(() => { G.drag = false; }, 50); };
    st.addEventListener("pointerup", end, true); st.addEventListener("pointercancel", end);
    /* um gesto não conta como toque/duplo toque para sair do ecrã total */
    st.addEventListener("pointerup", e => { if(G.lastGest && Date.now() - G.lastGest < 60){ e.stopImmediatePropagation(); } }, true);
    st.addEventListener("dblclick", e => { if(G.lastGest && Date.now() - G.lastGest < 500){ e.stopImmediatePropagation(); } }, true);
    let hinted = LS.get("vgHint", 0);
    document.addEventListener("fullscreenchange", () => { if(document.fullscreenElement && !hinted){ hinted = 1; LS.set("vgHint", 1); setTimeout(() => toast("Desliza para cima ou para baixo: à esquerda muda o brilho, à direita o som."), 1600); } });
    $("btnCinema").addEventListener("click", () => { if(!hinted && $("v-tv").classList.contains("cinema")){ hinted = 1; LS.set("vgHint", 1); setTimeout(() => toast("Desliza no vídeo para cima ou para baixo: à esquerda muda o brilho, à direita o som."), 1600); } });
  }catch(e){ console.log("gestos", e); }

  /* ===== Início da TV: zoom com dois dedos (afastar = maior, juntar = menor) ===== */
  try{
    const sec = $("v-tvinicio"); if(!sec) return;
    const tag = document.createElement("div"); tag.id = "ahZoomTag"; document.body.appendChild(tag);
    let z = +cfg.tvHomeZoom || 1, p = null, tT = 0;
    const apply = () => { sec.style.zoom = Math.abs(z - 1) < 0.01 ? "" : String(z); };
    const say = () => { tag.textContent = "Zoom " + Math.round(z * 100) + "%"; tag.classList.add("on"); clearTimeout(tT); tT = setTimeout(() => tag.classList.remove("on"), 900); };
    const save = () => { cfg.tvHomeZoom = +z.toFixed(2); saveCfg(); const r = $("ahSetZoom"); if(r) r.textContent = Math.round(z * 100) + "%"; };
    apply();
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    sec.addEventListener("touchstart", e => { if(e.touches.length === 2){ p = {d:dist(e.touches), z}; e.preventDefault(); } }, {passive:false});
    sec.addEventListener("touchmove", e => {
      if(!p || e.touches.length !== 2) return; e.preventDefault();
      const nz = Math.max(0.6, Math.min(1.8, p.z * dist(e.touches) / p.d));
      if(Math.abs(nz - z) > 0.01){ z = nz; apply(); say(); }
    }, {passive:false});
    sec.addEventListener("touchend", e => { if(p && e.touches.length < 2){ p = null; save(); } });
    /* rato/trackpad: Ctrl + roda */
    sec.addEventListener("wheel", e => { if(!e.ctrlKey) return; e.preventDefault(); z = Math.max(0.6, Math.min(1.8, z * (e.deltaY < 0 ? 1.06 : 1 / 1.06))); apply(); say(); clearTimeout(sec._zs); sec._zs = setTimeout(save, 300); }, {passive:false});
    /* Definições: mostrar e repor */
    const w = $("ahSet");
    if(w){ const d = document.createElement("div"); d.className = "row"; d.style.marginTop = "6px";
      d.innerHTML = '<span class="small">Zoom do Início (dois dedos no ecrã): <b id="ahSetZoom">' + Math.round(z * 100) + '%</b></span><button class="btn" id="ahSetZoomR">Repor 100%</button>';
      w.appendChild(d); $("ahSetZoomR").onclick = () => { z = 1; apply(); save(); toast("Zoom do Início reposto ✓"); }; }
  }catch(e){ console.log("zoom", e); }
})();
