
(function(){
  if(window.ANDROID) return;
  try{
    const V = document.getElementById("v-media"); if(!V) return;
    const h1 = V.querySelector("h1"); const NAMES = {wampPanel:"Cockpit Amp", radioPanel:"Rádio", visPanel:"Animações", mediaLinks:"YouTube e links", ytPanel:"YouTube na app", lockSndPanel:"Sons de trancar"};
    const wins = () => [...V.children].filter(e => e.classList.contains("panel") || e.classList.contains("grid2"));
    wins().forEach(e => { if(!e.id){ e.id = e.classList.contains("grid2") ? "mediaLinks" : (/Lock|trancar/i.test(e.textContent.slice(0, 80)) ? "lockSndPanel" : "mWin" + Math.random().toString(36).slice(2, 7)); } e.classList.add("mWin");
      const bar = document.createElement("div"); bar.className = "mBar"; bar.innerHTML = '<span class="nm">' + (NAMES[e.id] || "Janela") + '</span><button data-m="up" aria-label="Subir">▲</button><button data-m="down" aria-label="Descer">▼</button><button data-m="hide" aria-label="Mostrar ou esconder">👁</button>'; e.appendChild(bar); });
    const save = () => { LS.set("mediaOrder", wins().map(e => e.id)); LS.set("mediaHidden", wins().filter(e => e.classList.contains("mHid")).map(e => e.id)); };
    const apply = () => { const ord = LS.get("mediaOrder", []) || [], hid = LS.get("mediaHidden", []) || [];
      const all = wins(), anchor = all[0] && all[0].previousElementSibling;
      const sorted = all.slice().sort((a, b) => { const ia = ord.indexOf(a.id), ib = ord.indexOf(b.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
      let ref = anchor; sorted.forEach(e => { if(ref) ref.after(e); else V.appendChild(e); ref = e; e.classList.toggle("mHid", hid.includes(e.id)); }); };
    apply();
    const btn = document.createElement("button"); btn.id = "mediaOrgBtn"; btn.type = "button"; btn.textContent = "🧩 Organizar"; btn.setAttribute("aria-pressed", "false");
    const row = document.createElement("div"); row.style.cssText = "display:flex;align-items:center;gap:12px;flex-wrap:wrap"; h1.before(row); row.appendChild(h1); h1.style.margin = "0"; const sp = document.createElement("span"); sp.style.flex = "1"; row.appendChild(sp); row.appendChild(btn);
    const reset = document.createElement("button"); reset.id = "mediaOrgReset"; reset.type = "button"; reset.className = "btn"; reset.textContent = "Repor"; reset.hidden = true; row.appendChild(reset);
    btn.onclick = () => { const on = !V.classList.contains("org"); V.classList.toggle("org", on); btn.setAttribute("aria-pressed", String(on)); btn.textContent = on ? "✓ Concluído" : "🧩 Organizar"; reset.hidden = !on; };
    reset.onclick = () => { LS.set("mediaOrder", []); LS.set("mediaHidden", []); location.reload(); };
    V.addEventListener("click", e => { const b = e.target.closest(".mBar [data-m]"); if(!b) return; e.stopPropagation(); const w = b.closest(".mWin"), m = b.dataset.m;
      if(m === "up"){ const p = w.previousElementSibling; if(p && p.classList.contains("mWin")) p.before(w); }
      else if(m === "down"){ const n = w.nextElementSibling; if(n && n.classList.contains("mWin")) n.after(w); }
      else if(m === "hide") w.classList.toggle("mHid");
      save(); try{ w.scrollIntoView({block:"nearest", behavior:"smooth"}); }catch(x){} }, true);
  }catch(e){ console.log("organizar media", e); }
})();
