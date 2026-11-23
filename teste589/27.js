
/* Media: painéis (Rádio, YouTube, Vídeo por link, Favoritos) encolhem e expandem ao tocar no título; lembra a escolha */
(function(){
  try{
  const V = document.getElementById("v-media"); if(!V) return;
  const panels = () => [...V.querySelectorAll(":scope > .panel, :scope > .grid2 > .panel")];
  const headOf = p => { const h = p.querySelector(":scope > h2, :scope > .row > h2"); return h ? (h.matches(":scope > h2") ? h : h.parentElement) : null; };
  const keyOf = p => { const h = p.querySelector(":scope > h2, :scope > .row > h2"); return h ? (p.id || h.textContent.trim().slice(0, 40)) : ""; };
  let st = {}; try{ st = JSON.parse(localStorage.getItem("ck_mediaFold") || "{}") || {}; }catch(e){ st = {}; }
  const save = () => { try{ localStorage.setItem("ck_mediaFold", JSON.stringify(st)); }catch(e){} };
  const keyP = p => p.id || keyOf(p);
  const applyDet = (p, k, dt) => { const f = !!st[k]; p.classList.add("mpanel"); dt.open = !f; if(!dt.dataset.mf){ dt.dataset.mf = "1"; dt.addEventListener("toggle", () => { const kk = keyP(p); if(kk){ st[kk] = dt.open ? 0 : 1; save(); } }); } };
  const apply = p => { const k = keyP(p); if(!k) return; const dt = p.querySelector(":scope > details"); if(dt && !headOf(p)){ applyDet(p, k, dt); return; } const hd = headOf(p); if(!hd) return; p.classList.add("mpanel"); hd.classList.add("mhead"); const f = !!st[k]; p.classList.toggle("mfold", f); const h = hd.querySelector("h2"); if(h){ h.setAttribute("role", "button"); h.setAttribute("aria-expanded", f ? "false" : "true"); h.tabIndex = 0; } };
  const set = (p, fold) => { const k = keyP(p); if(!k) return; st[k] = fold ? 1 : 0; apply(p); save(); };
  V.addEventListener("click", e => { const hd = e.target.closest(".mpanel > .mhead"); if(!hd || !V.contains(hd)) return; if(e.target.closest("button, input, select, textarea, a, form, .tabs, .tab")) return; const p = hd.parentElement; set(p, !p.classList.contains("mfold")); });
  V.addEventListener("keydown", e => { if(e.key !== "Enter" && e.key !== " ") return; const h = e.target.closest && e.target.closest(".mpanel > .mhead h2"); if(!h) return; e.preventDefault(); h.closest(".mpanel > .mhead").click(); });
  const t = V.querySelector("h1");
  if(t){ const b = document.createElement("div"); b.id = "mFoldBar";
    b.innerHTML = '<button class="btn" type="button" id="mFoldAll">Encolher tudo</button><button class="btn" type="button" id="mOpenAll">Expandir tudo</button>';
    t.after(b);
    b.querySelector("#mFoldAll").onclick = () => { panels().forEach(p => { const k = keyP(p); if(k) st[k] = 1; apply(p); }); save(); };
    b.querySelector("#mOpenAll").onclick = () => { panels().forEach(p => { const k = keyP(p); if(k) st[k] = 0; apply(p); }); save(); };
  }
  panels().forEach(apply);
  /* painéis criados mais tarde (ex.: Animações, Cockpit Amp) */
  new MutationObserver(() => panels().forEach(apply)).observe(V, {childList:true});
  }catch(e){ console.log("media cartões", e); }
})();
