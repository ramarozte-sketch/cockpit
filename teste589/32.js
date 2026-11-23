
/* ===== Listas horizontais (filmes, séries, canais do Início): setas e arrastar com o rato =====
   No Chrome de computador as filas não têm barra e a roda do rato só anda na vertical, por isso não dava para ir para a direita. */
(() => { try{
  const SEL = ".ahScroll,.atvscroll";
  const upd = sc => { const h = sc.parentElement; if(!h) return; const l = h.querySelector(":scope > .rowArrow.l"), r = h.querySelector(":scope > .rowArrow.r"); if(!l || !r) return;
    const max = sc.scrollWidth - sc.clientWidth; l.classList.toggle("on", sc.scrollLeft > 4); r.classList.toggle("on", sc.scrollLeft < max - 4); };
  const enh = sc => {
    if(sc._rowEnh) return; sc._rowEnh = 1; const h = sc.parentElement; if(!h) return;
    h.classList.add("rowHost"); if(getComputedStyle(h).position === "static") h.style.position = "relative";
    const mk = (cls, txt, dir) => { const b = document.createElement("button"); b.type = "button"; b.className = "rowArrow " + cls; b.textContent = txt; b.setAttribute("aria-label", dir < 0 ? "Para a esquerda" : "Para a direita");
      b.addEventListener("click", e => { e.stopPropagation(); sc.scrollBy({left:dir * Math.max(240, sc.clientWidth * 0.8), behavior:"smooth"}); }); h.appendChild(b); return b; };
    mk("l", "‹", -1); mk("r", "›", 1);
    sc.addEventListener("scroll", () => upd(sc), {passive:true}); new ResizeObserver(() => upd(sc)).observe(sc);
    new MutationObserver(() => upd(sc)).observe(sc, {childList:true}); upd(sc);
    /* Shift+roda já anda na horizontal; a roda do rato sobre a fila também, quando a página não tem para onde descer com ela */
    sc.addEventListener("wheel", e => { if(e.ctrlKey) return; const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0); if(dx){ sc.scrollLeft += dx; e.preventDefault(); } }, {passive:false});
    /* arrastar com o rato */
    let d = null;
    sc.addEventListener("pointerdown", e => { if(e.pointerType !== "mouse" || e.button !== 0) return; d = {x:e.clientX, l:sc.scrollLeft, moved:false}; });
    window.addEventListener("pointermove", e => { if(!d || !(e.buttons & 1)) { if(d && !(e.buttons & 1)) d = null; return; } const dx = e.clientX - d.x; if(!d.moved && Math.abs(dx) > 6){ d.moved = true; sc.classList.add("mdrag"); } if(d.moved){ sc.scrollLeft = d.l - dx; } });
    window.addEventListener("pointerup", () => { if(d && d.moved){ const was = d; setTimeout(() => sc.classList.remove("mdrag"), 0); sc._noClick = Date.now(); } d = null; });
    sc.addEventListener("click", e => { if(sc._noClick && Date.now() - sc._noClick < 250){ e.stopPropagation(); e.preventDefault(); } }, true);
  };
  const scan = root => { (root || document).querySelectorAll(SEL).forEach(enh); };
  scan();
  new MutationObserver(ms => { for(const m of ms) for(const n of m.addedNodes){ if(n.nodeType !== 1) continue; if(n.matches && n.matches(SEL)) enh(n); else if(n.querySelectorAll) n.querySelectorAll(SEL).forEach(enh); } }).observe(document.body, {childList:true, subtree:true});
  window.__rowScan = scan;
}catch(e){ console.log("filas", e); } })();
