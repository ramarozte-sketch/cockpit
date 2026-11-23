
/* v192 — (1) a lista de origem é escolhida antes de qualquer outro embrulho do playChannel (instalado depois de todos, incluindo o do ecrã nativo do Android)
          (2) posição do ecrã guardada por separador: cada zona com scroll (página, lista de canais, filas do Início) volta onde a deixaste, também depois de fechar a app */
(function(){
  setTimeout(() => { try{ const _pc = window.playChannel; window.playChannel = function(c, slot, auto){ try{ if(!auto) window.__srcPick(c, slot); }catch(e){} return _pc.apply(this, arguments); }; }catch(e){} }, 3200);
  try{
    let POS = {}; try{ POS = JSON.parse(localStorage.getItem("ck_scrollPos") || "{}") || {}; }catch(e){ POS = {}; }
    let saveT = 0, restoring = 0;
    const ctx = () => { try{ return currentView + (currentView === "tv" ? "|" + tvKind + "|" + (($("tvGroup") || {}).value || "") : ""); }catch(e){ return "?"; } };
    const keyOf = el => {
      if(el === document.scrollingElement || el === document.documentElement || el === document.body) return ctx() + "|doc";
      if(!el || !el.closest || el.tagName === "MAIN") return null;
      if(el.closest("#fsCh,.gdlist,.gdsched,dialog,[role=dialog],.trkbox,.mvtx")) return null;   /* listas temporárias: não guarda */
      const view = el.closest(".view"); if(!view && el.tagName !== "MAIN") return null;
      let id = el.id;
      if(!id){ const host = el.parentElement && el.parentElement.closest("[id]"); const sib = host ? [...host.querySelectorAll("." + [...el.classList].join("."))].indexOf(el) : -1; const h2 = el.closest(".ahRow,.thRow"); const t = h2 && h2.querySelector("h2,h3"); id = (host ? host.id : "") + ">" + [...el.classList].join(".") + (t ? ":" + t.textContent.trim().slice(0, 40) : ":" + sib); }
      return ctx() + "|" + id;
    };
    const save = () => { saveT = 0; try{ const ks = Object.keys(POS); if(ks.length > 300) ks.slice(0, ks.length - 300).forEach(k => delete POS[k]); localStorage.setItem("ck_scrollPos", JSON.stringify(POS)); }catch(e){} };
    document.addEventListener("scroll", e => {
      if(restoring > Date.now()) return;
      const el = e.target === document ? document.scrollingElement : e.target; const k = keyOf(el); if(!k) return;
      const v = [Math.round(el.scrollTop || 0), Math.round(el.scrollLeft || 0)]; delete POS[k]; POS[k] = v;
      if(!saveT) saveT = setTimeout(save, 600);
    }, true);
    const restore = () => {
      const c = ctx(), pre = c + "|"; restoring = Date.now() + 400;
      Object.keys(POS).forEach(k => {
        if(!k.startsWith(pre)) return; const id = k.slice(pre.length), v = POS[k];
        let el = null;
        if(id === "doc") el = document.scrollingElement;
        else if(!id.includes(">")) el = document.getElementById(id);
        else { const [hid, rest] = id.split(">"); const host = hid ? document.getElementById(hid) : document; if(!host || !rest) return; const [cls, tag] = rest.split(":");
          const cand = [...host.querySelectorAll("." + cls)]; el = cand.find(x => { const h = x.closest(".ahRow,.thRow"); const t = h && h.querySelector("h2,h3"); return t && t.textContent.trim().slice(0, 40) === tag; }) || cand[+tag] || null; }
        if(el && v){ try{ if(el.scrollHeight > el.clientHeight) el.scrollTop = v[0]; if(el.scrollWidth > el.clientWidth) el.scrollLeft = v[1]; }catch(e){} }
      });
      /* a área principal da app (main) */
      try{ const m = document.querySelector("main"); const v = POS[c + "|main"]; if(m && v) m.scrollTop = v[0]; }catch(e){}
    };
    /* «main» não tem id: dá-lhe uma chave própria */
    document.addEventListener("scroll", e => { if(e.target && e.target.tagName === "MAIN" && restoring <= Date.now()){ POS[ctx() + "|main"] = [Math.round(e.target.scrollTop), 0]; if(!saveT) saveT = setTimeout(save, 600); } }, true);
    const later = () => { [60, 400, 1200].forEach(ms => setTimeout(restore, ms)); };
    const _sh = window.show; window.show = function(v){ const r = _sh.apply(this, arguments); try{ later(); }catch(e){} return r; };
    let lastK = ""; const _rt = window.renderTvList;
    if(typeof _rt === "function") window.renderTvList = function(){ const r = _rt.apply(this, arguments); try{ const k = ctx(); if(k !== lastK){ lastK = k; later(); } }catch(e){} return r; };
    window.addEventListener("pagehide", save); document.addEventListener("visibilitychange", () => { if(document.hidden) save(); });
    setTimeout(later, 1500);
  }catch(e){ console.log("posição do ecrã", e); }
})();
