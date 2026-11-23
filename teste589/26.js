
(function(){
  try{
  const V = document.getElementById("v-settings"); if(!V) return;
  const key = c => { const h = c.querySelector(":scope > h2"); return h ? h.textContent.trim().slice(0, 40) : ""; };
  let st = {}; try{ st = JSON.parse(localStorage.getItem("ck_setFold2") || "{}") || {}; }catch(e){ st = {}; }
  const save = () => { try{ localStorage.setItem("ck_setFold2", JSON.stringify(st)); }catch(e){} };
  /* por omissão os cartões abrem encolhidos; guarda a escolha de cada um (1 = encolhido, 0 = aberto) */
  const folded = k => st[k] === undefined ? true : !!st[k];
  const apply = c => { const k = key(c); if(!k) return; const f = folded(k); c.classList.toggle("fold", f); const h = c.querySelector(":scope > h2"); if(h){ h.setAttribute("role", "button"); h.setAttribute("aria-expanded", f ? "false" : "true"); h.tabIndex = 0; } };
  const all = () => [...V.querySelectorAll(".setcard")];
  const set = (c, fold) => { const k = key(c); if(!k) return; st[k] = fold ? 1 : 0; apply(c); save(); };
  V.addEventListener("click", e => { const h = e.target.closest(".setcard > h2"); if(!h || !V.contains(h)) return; const c = h.parentElement; set(c, !c.classList.contains("fold")); });
  V.addEventListener("keydown", e => { if(e.key !== "Enter" && e.key !== " ") return; const h = e.target.closest && e.target.closest(".setcard > h2"); if(!h) return; e.preventDefault(); h.click(); });
  /* barra «Encolher tudo / Expandir tudo» por baixo do título */
  const t = V.querySelector("h1");
  if(t){ const b = document.createElement("div"); b.id = "setFoldBar";
    b.innerHTML = '<button class="btn" type="button" id="setFoldAll">Encolher tudo</button><button class="btn" type="button" id="setOpenAll">Expandir tudo</button>';
    t.after(b);
    b.querySelector("#setFoldAll").onclick = () => { all().forEach(c => { const k = key(c); if(k) st[k] = 1; apply(c); }); save(); };
    b.querySelector("#setOpenAll").onclick = () => { all().forEach(c => { const k = key(c); if(k) st[k] = 0; apply(c); }); save(); };
  }
  all().forEach(apply);
  /* guarda a posição onde o utilizador ficou nas Definições e volta a ela quando as reabre */
  const M = document.getElementById("main") || V.parentElement;
  const pos = () => { let n = 0; try{ n = +localStorage.getItem("ck_setScroll") || 0; }catch(e){} return n; };
  const scr = () => (M && M.scrollTop) || window.scrollY || 0;
  let rT = 0, restoring = 0;
  const onScroll = () => { if(V.hidden || restoring) return; clearTimeout(rT); rT = setTimeout(() => { try{ localStorage.setItem("ck_setScroll", String(Math.round(scr()))); }catch(e){} }, 150); };
  if(M) M.addEventListener("scroll", onScroll, {passive:true}); window.addEventListener("scroll", onScroll, {passive:true});
  const restore = () => { const y = pos(); if(!y) return; restoring = 1; [0, 120, 400, 900].forEach(d => setTimeout(() => { if(V.hidden) return; try{ if(M) M.scrollTop = y; else window.scrollTo(0, y); }catch(e){} }, d)); setTimeout(() => { restoring = 0; }, 1000); };
  new MutationObserver(() => { if(!V.hidden) restore(); }).observe(V, {attributes:true, attributeFilter:["hidden"]});
  if(!V.hidden) restore();
  /* cartões acrescentados mais tarde por outros módulos */
  new MutationObserver(ms => { for(const m of ms) for(const n of m.addedNodes){ if(n.nodeType !== 1) continue; if(n.classList && n.classList.contains("setcard")) apply(n); else if(n.querySelectorAll) n.querySelectorAll(".setcard").forEach(apply); } }).observe(V, {childList:true, subtree:true});
  /* se outra parte da app abrir/realçar algo dentro de um cartão encolhido (ex.: ir direto a uma opção), expande-o */
  window.__setOpen = el => { const c = el && el.closest && el.closest(".setcard"); if(c && c.classList.contains("fold")) set(c, false); };
  V.addEventListener("focusin", e => { if(!e.target.closest(".setcard > h2")) window.__setOpen(e.target); });
  }catch(e){ console.log("cartões", e); }
})();
