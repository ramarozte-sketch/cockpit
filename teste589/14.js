
/* ===== Tesla: sinopse traduzida para a língua da app (com cache) ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const UL = () => { try{ return uiLang() || "pt"; }catch(e){ return "pt"; } };
  const hash = t => { let h = 5381; for(let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + t.length; };
  const chunks = (t, max) => { const out = []; let cur = ""; String(t).split(/(?<=[.!?…])\s+/).forEach(sn => { while(sn.length > max){ if(cur){ out.push(cur); cur = ""; } out.push(sn.slice(0, max)); sn = sn.slice(max); } if((cur + " " + sn).length > max){ if(cur) out.push(cur); cur = sn; } else cur = cur ? cur + " " + sn : sn; }); if(cur) out.push(cur); return out; };
  async function one(q, tl){
    const g = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + tl + "&dt=t&q=" + encodeURIComponent(q);
    const rd = async r => { if(!r || !r.ok) return null; const j = await r.json(); const o = (j[0] || []).map(x => x[0]).join(""); return o || null; };
    try{ const o = await rd(await fetch(g)); if(o) return o; }catch(e){}
    try{ if(typeof HASPX === "function" && HASPX()){ const o = await rd(await fetchPx(g)); if(o) return o; } }catch(e){}
    try{ const r = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q.slice(0, 480)) + "&langpair=Autodetect|" + tl); if(r.ok){ const j = await r.json(); const o = j && j.responseData && j.responseData.translatedText; if(o && !/MYMEMORY WARNING|INVALID/i.test(o)) return o; } }catch(e){}
    return null;
  }
  async function tr(text){
    text = String(text || "").trim(); const tl = UL(); if(!text) return null;
    const key = "trc|" + tl + "|" + hash(text);
    try{ const c = localStorage.getItem(key); if(c) return c; }catch(e){}
    const out = []; for(const q of chunks(text, 1200)){ const o = await one(q, tl); if(o == null) return null; out.push(o); }
    const res = out.join(" ");
    try{ localStorage.setItem(key, res); }catch(e){}
    return res;
  }
  window.__trText = tr;
  const _sm = window.showMovieInfo;
  if(typeof _sm !== "function") return;
  let tk = 0;
  window.showMovieInfo = function(c){
    const my = ++tk, r = _sm.apply(this, arguments);
    const pl = $("mvPlot"); if(!pl) return r;
    let tag = $("mvTr"); if(!tag){ tag = document.createElement("div"); tag.id = "mvTr"; tag.className = "mvtr"; pl.parentNode.insertBefore(tag, pl.nextSibling); }
    tag.textContent = "";
    Promise.resolve(r).then(async () => {
      if(my !== tk) return;
      const orig = pl.textContent; if(!orig || /^(A carregar|Sem sinopse)/.test(orig)) return;
      tag.textContent = "A traduzir…";
      const t = await tr(orig); if(my !== tk || $("mvDlg").hidden) return;
      if(!t || t.trim() === orig.trim()){ tag.textContent = ""; return; }
      let showOrig = false;
      const paint = () => { pl.textContent = showOrig ? orig : t; tag.innerHTML = (showOrig ? "Texto original · " : "Traduzido automaticamente · ") + '<a id="mvTrT">' + (showOrig ? "Ver tradução" : "Ver original") + "</a>"; $("mvTrT").onclick = () => { showOrig = !showOrig; paint(); }; };
      paint();
      /* género também traduzido */
      try{ const mt = $("mvMeta"); const parts = mt.innerHTML.split(/(<b class="mvrate">.*?<\/b>\s*)/); const tail = parts[parts.length - 1]; const tt = await tr(mt.textContent.replace(/⭐\s*[\d.,]+\/10\s*/, "")); if(tt && my === tk) mt.innerHTML = parts.slice(0, -1).join("") + esc(tt); }catch(e){}
    }).catch(() => { tag.textContent = ""; });
    return r;
  };
  }catch(e){ console.log("tradução", e); }
})();
