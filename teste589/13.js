
/* ===== Tesla: funções vindas da app Android (retomar, episódio seguinte, detalhes, países, parental, fonte alternativa, favoritos, arranque rápido) ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const AH = window.__ah || {};
  const sx = s => esc(s);
  const fmt = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  const isVod = c => c && (c.kind === "movie" || c.kind === "episode");

  /* ---------- barra de avisos sobre o vídeo (retomar / episódio seguinte / saltar intro) ---------- */
  const bar = document.createElement("div"); bar.id = "nxBar"; bar.hidden = true;
  bar.innerHTML = '<span id="nxTx"></span><button class="btn" id="nxGo">OK</button><button class="btn" id="nxNo">Cancelar</button>';
  document.body.appendChild(bar);
  const NX = {act:null, no:null, key:"", off:new Set(), t:0};
  const nxHide = () => { bar.hidden = true; NX.act = NX.no = null; NX.key = ""; };
  const nxShow = (key, txt, go, act, no, onNo) => { NX.key = key; NX.act = act; NX.no = onNo || null; $("nxTx").textContent = txt; $("nxGo").textContent = go; $("nxNo").textContent = no || "Cancelar"; bar.hidden = false; };
  $("nxGo").onclick = e => { e.stopPropagation(); const a = NX.act; NX.off.add(NX.key); nxHide(); if(a) a(); };
  $("nxNo").onclick = e => { e.stopPropagation(); const a = NX.no; NX.off.add(NX.key); nxHide(); if(a) a(); };

  /* ---------- 1. Continuar a ver ---------- */
  const RES = window.RES = {
    all(){ return LS.get("resume", {}) || {}; },
    at(url){ const e = RES.all()[url]; return e && e.p > 30 && e.d > 0 && e.p < e.d * 0.95 ? Math.max(0, e.p - 5) : 0; },
    save(c, p, d){
      if(!isVod(c) || !(d > 300) || !(p >= 0)) return;
      const a = RES.all();
      if(p > d * 0.95) delete a[c.url];
      else if(p > 20){ let logo = c.logo || ""; try{ if(!logo && window.EPL && EPL.series && c.group === EPL.series.name) logo = EPL.series.logo || ""; }catch(e){}
        a[c.url] = {name:c.name, logo, url:c.url, kind:c.kind, group:c.group || "", id:c.id || "", sid:(window.EPL && EPL.series && EPL.series.sid) || c.sid || "", p:Math.round(p), d:Math.round(d), t:Date.now()}; }
      else return;
      Object.keys(a).sort((x, y) => a[y].t - a[x].t).slice(40).forEach(k => delete a[k]);
      LS.set("resume", a);
    },
    drop(url){ const a = RES.all(); delete a[url]; LS.set("resume", a); },
    list(kind){ return Object.values(RES.all()).filter(e => e.p > 30 && e.p < e.d * 0.95 && (kind === "movie" ? e.kind === "movie" : e.kind === "episode")).sort((x, y) => y.t - x.t); }
  };
  setInterval(() => { for(const s of [0, 1]){ try{ const c = lastPlayed[s], v = $("vid" + s); if(c && v && !v.paused && isFinite(v.duration)) RES.save(c, v.currentTime, v.duration); }catch(e){} } }, 5000);
  ["vid0", "vid1"].forEach((id, s) => { const v = $(id); if(v) v.addEventListener("pause", () => { try{ const c = lastPlayed[s]; if(c && isFinite(v.duration)) RES.save(c, v.currentTime, v.duration); }catch(e){} }); });
  let pend = null;
  const _pc = window.playChannel;
  window.playChannel = function(c, slot){
    try{ const sl = slot == null ? tvTarget : slot; const at = isVod(c) ? RES.at(c.url) : 0; pend = at ? {url:c.url, t:at, s:sl} : null; }catch(e){ pend = null; }
    return _pc.apply(this, arguments);
  };
  const tryResume = s => {
    if(!pend || pend.s !== s) return; const v = $("vid" + s), c = lastPlayed[s];
    if(!c || c.url !== pend.url || !(v.duration > pend.t + 10)) return;
    const t = pend.t, u = c.url; pend = null;
    try{ v.currentTime = t; }catch(e){ return; }
    /* o leitor HLS pode voltar ao início ao arrancar: insiste durante uns segundos */
    let n = 0; const again = () => { if(++n > 16 || !lastPlayed[s] || lastPlayed[s].url !== u) return; if(Math.abs(v.currentTime - t) > 8 && v.currentTime < t){ try{ v.currentTime = t; }catch(e){} } setTimeout(again, 500); }; setTimeout(again, 500);
    nxShow("res|" + c.url, "A retomar em " + fmt(t), "OK", null, "Recomeçar", () => { try{ v.currentTime = 0; }catch(e){} });
    setTimeout(() => { if(NX.key === "res|" + c.url) nxHide(); }, 9000);
  };
  ["vid0", "vid1"].forEach((id, s) => { const v = $(id); if(v){ v.addEventListener("loadedmetadata", () => tryResume(s)); v.addEventListener("durationchange", () => tryResume(s)); v.addEventListener("canplay", () => tryResume(s)); } });

  /* ---------- 2. Episódio seguinte + saltar intro ---------- */
  setInterval(() => {
    const c = lastPlayed && lastPlayed[tvTarget], v = $("vid" + tvTarget);
    if(!c || c.kind !== "episode" || !v || !isFinite(v.duration) || currentView !== "tv"){ if(!bar.hidden && /^(nx|in)\|/.test(NX.key)) nxHide(); return; }
    const L = window.EPL && EPL.list, i = L ? L.findIndex(e => e.url === c.url) : -1, left = v.duration - v.currentTime;
    if(i >= 0 && L[i + 1] && v.duration > 120 && left <= 15){
      const key = "nx|" + c.url; if(NX.off.has(key)) return;
      const nx = L[i + 1];
      nxShow(key, "Episódio seguinte em " + Math.max(0, Math.ceil(left)) + " s", "Ver agora", () => window.playChannel(nx), "Cancelar");
      if(left <= 1.2 || v.ended){ NX.off.add(key); nxHide(); window.playChannel(nx); }
      return;
    }
    if(v.currentTime > 4 && v.currentTime < 180 && v.duration > 600){
      const key = "in|" + c.url; if(NX.off.has(key)) return;
      if(NX.key !== key) nxShow(key, "Saltar a intro?", "Saltar 85 s", () => { try{ v.currentTime = Math.min(v.duration - 5, v.currentTime + 85); }catch(e){} }, "Não");
      return;
    }
    if(!bar.hidden && /^(nx|in)\|/.test(NX.key)) nxHide();
  }, 1000);

  /* ---------- 3. Detalhes ao tocar num filme ou série ---------- */
  const detOn = () => cfg.tvDetails !== false;
  const openDet = c => { try{ if(typeof window.showMovieInfo === "function"){ window.showMovieInfo(c); return true; } }catch(e){} return false; };
  /* «Ver agora» do ecrã de detalhes mostra «Continuar» quando há ponto guardado */
  try{ const _sm = window.showMovieInfo; if(typeof _sm === "function") window.showMovieInfo = function(c){ const r = _sm.apply(this, arguments); try{ const at = c && c.kind !== "series" ? RES.at(c.url) : 0; if(at) $("mvGo").textContent = "▶ Continuar (" + fmt(at) + ")"; }catch(e){} return r; }; }catch(e){}

  /* ---------- 7. Toque longo nos cartões do Início: favoritos, ordem, remover ---------- */
  let lpAt = 0;
  const favSave = () => { try{ LS.set("tvfavs", [...favs]); }catch(e){} };
  window.__favOrd = () => LS.get("favOrd", []) || [];
  const rowTitle = el => { const r = el.closest(".ahRow"), h = r && r.querySelector("h3 span"); return h ? h.textContent : ""; };
  const menu = document.createElement("div"); menu.id = "ahMenu"; menu.hidden = true; document.body.appendChild(menu);
  const closeMenu = () => { menu.hidden = true; menu.innerHTML = ""; };
  menu.addEventListener("click", e => { if(e.target === menu) closeMenu(); });
  const openMenu = (el, c) => {
    const rt = rowTitle(el), isFav = favs.has(c.url), inFavRow = /Favoritos/.test(rt), inRec = /recentemente/.test(rt), inRes = /Continuar/.test(rt);
    const it = [];
    if(c.kind !== "episode") it.push(["fav", isFav ? "⭐ Tirar dos favoritos" : "⭐ Adicionar aos favoritos"]);
    if(inFavRow){ it.push(["up", "◀ Mover para antes"]); it.push(["dn", "Mover para depois ▶"]); }
    if(inRec) it.push(["rec", "🗑 Tirar dos vistos recentemente"]);
    if(inRes) it.push(["res", "🗑 Tirar de «Continuar a ver»"]);
    if(c.kind === "movie" || c.kind === "series") it.push(["det", "ℹ Detalhes"]);
    it.push(["x", "Cancelar"]);
    menu.innerHTML = '<div class="box"><b>' + sx(c.name) + '</b>' + it.map(([k, t]) => '<button class="btn" data-m="' + k + '">' + t + '</button>').join("") + '</div>';
    menu.hidden = false;
    menu.querySelectorAll("[data-m]").forEach(b => b.onclick = () => {
      const k = b.dataset.m; closeMenu();
      if(k === "fav"){ isFav ? favs.delete(c.url) : favs.add(c.url); favSave(); toast(isFav ? "Tirado dos favoritos." : "Adicionado aos favoritos ⭐"); }
      else if(k === "up" || k === "dn"){
        const cur = [...(AH.favList ? AH.favList(AH.kind) : [])].map(x => x.url); const i = cur.indexOf(c.url), j = i + (k === "up" ? -1 : 1);
        if(i >= 0 && j >= 0 && j < cur.length){ cur.splice(j, 0, cur.splice(i, 1)[0]); const rest = window.__favOrd().filter(u => cur.indexOf(u) < 0); LS.set("favOrd", cur.concat(rest)); }
      }
      else if(k === "rec"){ LS.set("tvRecent", (LS.get("tvRecent", []) || []).filter(x => x.url !== c.url)); if(AH.recSnap) AH.recSnap = AH.recSnap.filter(x => x.url !== c.url); }
      else if(k === "res"){ RES.drop(c.url); }
      else if(k === "det"){ openDet(c); return; }
      else return;
      try{ AH.render && AH.render(true); }catch(e){}
    });
  };
  window.__ahResList = RES.list;
  const rows = $("ahRows");
  if(rows){
    let tm = 0, sx0 = 0, sy0 = 0;
    rows.addEventListener("pointerdown", e => { const b = e.target.closest(".ahCard[data-k]"); if(!b) return; sx0 = e.clientX; sy0 = e.clientY; clearTimeout(tm); tm = setTimeout(() => { const c = AH.flat && AH.flat[+b.dataset.k]; if(c){ lpAt = Date.now(); openMenu(b, c); } }, 550); });
    rows.addEventListener("pointermove", e => { if(tm && Math.hypot(e.clientX - sx0, e.clientY - sy0) > 12){ clearTimeout(tm); tm = 0; } });
    ["pointerup", "pointercancel", "pointerleave"].forEach(t => rows.addEventListener(t, () => { clearTimeout(tm); tm = 0; }));
    rows.addEventListener("contextmenu", e => { const b = e.target.closest(".ahCard[data-k]"); if(!b) return; e.preventDefault(); if(Date.now() - lpAt > 900){ const c = AH.flat && AH.flat[+b.dataset.k]; if(c){ lpAt = Date.now(); openMenu(b, c); } } });
  }
  /* cliques: depois de um toque longo não faz nada; filmes e séries abrem os detalhes (antes do ecrã total) */
  window.addEventListener("click", e => {
    const t = e.target; if(!t || !t.closest) return;
    const card = t.closest("#ahRows .ahCard[data-k]");
    if(card && Date.now() - lpAt < 900){ e.stopImmediatePropagation(); e.preventDefault(); return; }
    if(!detOn()) return;
    if(card){
      const c = AH.flat && AH.flat[+card.dataset.k];
      if(c && (c.kind === "movie" || c.kind === "series") && !/Continuar/.test(rowTitle(card)) && openDet(c)){ e.stopImmediatePropagation(); e.preventDefault(); }
      return;
    }
    const li = t.closest("#tvList [data-play]");
    if(li && !t.closest("[data-fav]")){
      const c = (window.__tvShown || [])[+li.dataset.play];
      if(c && (c.kind === "movie" || c.kind === "series") && openDet(c)){ e.stopImmediatePropagation(); e.preventDefault(); }
    }
  }, true);

  /* ---------- 4/5. Países e controlo parental ---------- */
  const C = window.__cty, P = window.__par;
  if(C && P){
    const _og = window.orgGroupList;
    window.orgGroupList = function(kind, names, withHidden){
      let l = _og.apply(this, arguments);
      const pos = new Map(l.map((n, i) => [n, i]));
      l = l.slice().sort((a, b) => (C.rank(a) - C.rank(b)) || (pos.get(a) - pos.get(b)));
      return withHidden ? l : l.filter(n => !C.hidden(n));
    };
    const _oc = window.orgChannels;
    window.orgChannels = function(list, kind){ const l = _oc.apply(this, arguments); return Array.isArray(l) ? l.filter(c => !(kind !== "free" && kind !== "intl" && C.hiddenItem(c))) : l; };
    window.__parHide = c => P.blocks(c);
  }

  /* ---------- 6. Fonte alternativa (mesmo canal noutro grupo ou noutra qualidade) ---------- */
  const nzn = n => String(n || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/^[\s\W_]*(pt|br|es|uk|fr|us|portugal)\b[\s|:\-\/\]\)]*/i, "").replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/\b(fhd|uhd|hd|sd|4k|8k|hevc|h ?265|raw|plus|backup|alt|1080p?|720p?|50fps|60fps)\b/g, " ").replace(/[^a-z0-9]+/g, "");
  window.__altFor = (c, tried) => {
    try{
      if(!c || c.kind !== "live") return null; const k = nzn(c.name); if(!k) return null;
      return channels.find(x => x && x.kind === "live" && x.url !== c.url && !(tried && tried.has(x.url)) && !hevcSkip(x.url) && nzn(x.name) === k && !(P && P.blocks(x))) || null;
    }catch(e){ return null; }
  };

  /* ---------- 8. Arranque rápido: guia (XMLTV) guardado 3 h; lista renovada em segundo plano ao fim de 12 h ---------- */
  try{
    const _le = window.loadEpg;
    window.loadEpg = async function(){
      try{ if(cfg.epg){ const c = await IDB.get("epgC"); if(c && c.m && c.u === cfg.epg && Date.now() - c.t < 3 * 3600e3){ epg = c.m; return; } } }catch(e){}
      await _le.apply(this, arguments);
      try{ if(cfg.epg && epg && Object.keys(epg).length) IDB.set("epgC", {t:Date.now(), u:cfg.epg, m:epg}); }catch(e){}
    };
    const _li = window.loadIptv;
    window.loadIptv = async function(force){ const r = await _li.apply(this, arguments); if(force) LS.set("chT", Date.now()); return r; };
    let rTries = 0;
    const renew = () => {
      try{
        const t = LS.get("chT", 0); if(!t){ LS.set("chT", Date.now()); return; }
        if(Date.now() - t < 12 * 3600e3 || !((cfg.xs && cfg.xu && cfg.xp) || cfg.m3u)) return;
        /* v196: em andamento não descarrega a lista inteira (competia com o vídeo pela rede): tenta de minuto a minuto até parar */
        if(drivingEff()){ if(++rTries < 240) setTimeout(renew, 60000); return; }
        LS.set("chT", Date.now());
        Promise.resolve(window.loadIptv(true)).catch(() => {}).finally(() => { try{ AH.render && AH.render(true); }catch(e){} });
      }catch(e){}
    };
    setTimeout(renew, 15000);
  }catch(e){}

  /* ---------- Definições: cartão «Países e controlo parental» + opção de detalhes ---------- */
  try{
    const w = $("ahSet");
    if(w){ const l = document.createElement("label"); l.className = "row small"; l.style.marginTop = "6px";
      l.innerHTML = '<input type="checkbox" id="ahSetDet"> Ao tocar num filme ou série, mostrar primeiro os detalhes (sinopse, nota, trailer)';
      w.appendChild(l); const cb = $("ahSetDet"); cb.checked = detOn(); cb.onchange = () => { cfg.tvDetails = cb.checked; saveCfg(); }; }
    const tvc = [...document.querySelectorAll("#v-settings .setcard")].find(e => ((t => t === "Reprodução" || t === "TV e IPTV")(((e.querySelector("h2") || {}).textContent || "").trim())));
    if(tvc && C && P){
      const card = document.createElement("div"); card.className = "panel setcard"; card.id = "ctyCard";
      /* v352: os países passaram para o cartão «Mostrar e ocultar» (um só sítio: país → categorias → canais); aqui fica só o controlo parental */
      card.innerHTML = '<h2>Controlo parental</h2><p class="small muted setsub" style="margin:0">Protege os conteúdos para adultos com um PIN.</p>' +
        '<p class="small muted" id="parSt" style="margin:8px 0 6px"></p>' +
        '<div class="row"><input type="password" inputmode="numeric" id="parPin" maxlength="8" placeholder="PIN (4 a 8 algarismos)" style="max-width:220px"><button class="btn primary" id="parSet">Guardar PIN</button><button class="btn" id="parOff">Desligar</button><button class="btn" id="parUnlock">Desbloquear agora</button></div>';
      { const pinCard = [...document.querySelectorAll("#v-settings .setcard")].find(e => ((e.querySelector("h2") || {}).textContent || "").trim() === "PIN de proteção");
        if(pinCard) pinCard.parentNode.insertBefore(card, pinCard.nextSibling); else tvc.parentNode.insertBefore(card, tvc.nextSibling); }
      /* v344: mostrar e ocultar canais, filmes e séries (mesma lógica da app Android: categorias por tipo e canais individuais) */
      const vis = document.createElement("div"); vis.className = "panel setcard"; vis.id = "visCard";
      const KN = {live:"Ao vivo", movie:"Filmes", series:"Séries"};
      const kindOfUrl = u => { const c = channels.find(x => x.url === u); return c ? c.kind : ""; };
      const visRender = () => {
        const rows = ["live","movie","series"].map(k => { const gh = ((TVORG.grpHide || {})[k] || []).length, hc = (TVORG.chHide || []).filter(u => kindOfUrl(u) === k).length;
          return '<div class="row" style="margin:6px 0"><span class="nm" style="flex:1">' + KN[k] + ' <small class="muted">· ' + gh + ' categorias e ' + hc + ' canais ocultos</small></span><button class="btn" data-vg="' + k + '">Gerir</button><button class="btn" data-vs="' + k + '">Mostrar todos</button></div>'; }).join("");
        vis.querySelector(".visList").innerHTML = rows;
        vis.querySelectorAll("[data-vg]").forEach(b => b.onclick = () => { tvKind = b.dataset.vg; try{ orgOpen(); }catch(e){ toast("Não consegui abrir a organização.", true); } });
        vis.querySelectorAll("[data-vs]").forEach(b => b.onclick = () => { const k = b.dataset.vs; TVORG.grpHide = TVORG.grpHide || {}; TVORG.grpHide[k] = []; TVORG.chHide = (TVORG.chHide || []).filter(u => kindOfUrl(u) !== k); orgSave(); try{ orgRefreshMain(); }catch(e){} visRender(); toast(KN[k] + ": tudo visível."); });
      };
      vis.innerHTML = '<h2>Mostrar e ocultar</h2><p class="small muted setsub" style="margin:0">Um só sítio para países, categorias, canais, filmes e séries: escolhe o país, depois as categorias e os títulos.</p>' +
        '<h3 style="margin:12px 0 6px">1. Países</h3><p class="small muted" style="margin:0 0 6px">Ordena (▲▼), esconde um país inteiro ou toca em «Gerir» para ver as categorias e os canais dele.</p><div id="ctyList" class="ctyList" style="max-height:45vh;overflow:auto"></div>' +
        '<div class="row" style="margin-top:6px"><button class="btn" id="ctyReset">Repor países (mostrar todos)</button></div>' +
        '<h3 style="margin:14px 0 6px">2. Categorias do país</h3><div class="row"><select id="visCty" style="max-width:320px"></select><button class="btn" id="visCatAll">Mostrar todas</button><button class="btn" id="visCatNone">Ocultar todas</button></div><div id="visCats" style="margin-top:6px;max-height:45vh;overflow:auto"></div>' +
        '<h3 style="margin:14px 0 6px">3. Canais e títulos do país</h3><div class="row"><input type="search" id="visQ" placeholder="Pesquisar canal ou título" style="max-width:320px"></div><div id="visItems" style="margin-top:6px;max-height:50vh;overflow:auto"></div>' +
        '<h3 style="margin:14px 0 6px">Resumo por tipo</h3><p class="small muted" style="margin:0 0 6px">«Gerir» abre o organizador completo desse tipo (ordenar, selecionar vários, pesquisar).</p><div class="visList"></div>';
      const visItemsRender = () => {
        const sel = $("visCty"), box = $("visItems"), q = (($("visQ") && $("visQ").value) || "").trim().toLowerCase(); if(!sel || !box) return;
        const pick = sel.value; const hid = new Set(TVORG.chHide || []);
        const list = channels.filter(c => KN[c.kind] && C.ctyOfItem(c) === pick && (!q || String(c.name || "").toLowerCase().includes(q)));
        const shown = list.slice(0, 150);
        box.innerHTML = (list.length ? '' : '<p class="small muted">Nada encontrado.</p>') + shown.map(c => '<label class="row small" style="margin:2px 0"><input type="checkbox" data-vci="' + encodeURIComponent(c.url) + '"' + (hid.has(c.url) ? "" : " checked") + '> <span class="muted">' + KN[c.kind] + ' · </span>' + String(c.name || "").replace(/[<&>]/g, "") + '</label>').join("") + (list.length > shown.length ? '<p class="small muted">A mostrar ' + shown.length + ' de ' + list.length + '. Escreve na pesquisa para afinar.</p>' : "");
        box.querySelectorAll("[data-vci]").forEach(cb => cb.onchange = () => {
          const u = decodeURIComponent(cb.dataset.vci); const h = (TVORG.chHide || []).filter(x => x !== u);
          if(!cb.checked) h.push(u); TVORG.chHide = h; orgSave(); try{ orgRefreshMain(); }catch(e){} visRender();
        });
      };
      const visCatsRender = () => {
        const sel = $("visCty"), box = $("visCats"); if(!sel || !box) return;
        const cur = sel.value; const cnt = new Map();
        channels.forEach(c => { if(!KN[c.kind]) return; const k = C.ctyOfItem(c); cnt.set(k, (cnt.get(k) || 0) + 1); });
        const keys = [...cnt.keys()].sort((a, b) => (C.rank(a) - C.rank(b)) || (cnt.get(b) - cnt.get(a)));
        sel.innerHTML = keys.map(k => '<option value="' + k + '">' + C.flag(k) + " " + C.name(k) + " · " + cnt.get(k) + "</option>").join("");
        if(cur && keys.includes(cur)) sel.value = cur;
        const pick = sel.value; if(!pick){ box.innerHTML = ""; return; }
        let html = "";
        for(const k of ["live","movie","series"]){
          const groups = [...new Set(channels.filter(c => c.kind === k && C.ctyOfItem(c) === pick).map(c => c.group))].sort((a, b) => String(a).localeCompare(String(b)));
          if(!groups.length) continue;
          const hid = new Set((TVORG.grpHide || {})[k] || []);
          html += '<div style="margin:8px 0 4px"><b>' + KN[k] + '</b></div>' + groups.map(g => '<label class="row small" style="margin:3px 0"><input type="checkbox" data-vgc="' + k + '" data-vgn="' + encodeURIComponent(g) + '"' + (hid.has(g) ? "" : " checked") + '> ' + String(g).replace(/[<&>]/g, "") + '</label>').join("");
        }
        box.innerHTML = html || '<p class="small muted">Este país não tem categorias.</p>';
        visItemsRender();
        box.querySelectorAll("[data-vgc]").forEach(cb => cb.onchange = () => {
          const k = cb.dataset.vgc, g = decodeURIComponent(cb.dataset.vgn); TVORG.grpHide = TVORG.grpHide || {}; const h = (TVORG.grpHide[k] || []).filter(x => x !== g);
          if(!cb.checked) h.push(g); TVORG.grpHide[k] = h; orgSave(); try{ orgRefreshMain(); }catch(e){} visRender();
        });
      };

      { const grp = tvc.parentNode, hd = grp.previousElementSibling, h3 = document.createElement("h3"), box = document.createElement("div");
        h3.className = "setgrp"; h3.textContent = "Conteúdos: mostrar e ocultar"; box.className = "setcards"; box.appendChild(vis);
        const ref = hd && hd.classList && hd.classList.contains("setgrp") ? hd : grp; ref.parentNode.insertBefore(h3, ref); ref.parentNode.insertBefore(box, ref); }
      visRender(); $("visCty").onchange = () => { visCatsRender(); }; $("visQ").oninput = () => visItemsRender(); visCatsRender();
      const visCatBulk = show => { const pick = $("visCty").value; if(!pick) return; TVORG.grpHide = TVORG.grpHide || {};
        for(const k of ["live","movie","series"]){ const groups = new Set(channels.filter(c => c.kind === k && C.ctyOfItem(c) === pick).map(c => c.group)); if(!groups.size) continue;
          const h = (TVORG.grpHide[k] || []).filter(g => !groups.has(g)); if(!show) groups.forEach(g => h.push(g)); TVORG.grpHide[k] = h; }
        orgSave(); try{ orgRefreshMain(); }catch(e){} visRender(); visCatsRender(); toast(C.name(pick) + (show ? ": todas as categorias visíveis." : ": todas as categorias ocultas.")); };
      $("visCatAll").onclick = () => visCatBulk(true); $("visCatNone").onclick = () => visCatBulk(false);
      const S = C.state;
      const render = () => {
        const cnt = new Map();
        channels.forEach(c => { const k = C.ctyOfItem(c); cnt.set(k, (cnt.get(k) || 0) + 1); });
        const st = S(); const keys = [...cnt.keys()].sort((a, b) => { const ia = st.order.indexOf(a), ib = st.order.indexOf(b); return (ia < 0 ? (a === "PT" ? -1 : 1e3) : ia) - (ib < 0 ? (b === "PT" ? -1 : 1e3) : ib) || cnt.get(b) - cnt.get(a); }).slice(0, 60);
        $("ctyList").innerHTML = keys.length ? keys.map((k, i) => { const off = st.hide.indexOf(k) >= 0; return '<div class="orgrow' + (off ? " off" : "") + '"><span class="nm">' + C.flag(k) + " " + sx(C.name(k)) + ' <small class="muted">' + cnt.get(k) + '</small></span><button class="btn" data-cu="' + i + '">▲</button><button class="btn" data-cd="' + i + '">▼</button><button class="btn" data-ch="' + i + '">' + (off ? "Mostrar" : "Esconder") + '</button><button class="btn" data-cg="' + i + '">Gerir</button></div>'; }).join("") : '<p class="small muted">Carrega primeiro a tua lista IPTV.</p>';
        const apply = () => { C.save(); render(); try{ if(typeof fillGroups === "function") fillGroups(); if(currentView === "tv") renderTvList(); }catch(e){} try{ AH.rr = null; }catch(e){} };
        const fix = () => { const s2 = S(); s2.order = keys.slice(); return s2; };
        $("ctyList").querySelectorAll("[data-cu]").forEach(b => b.onclick = () => { const s2 = fix(), i = +b.dataset.cu; if(i > 0){ s2.order.splice(i - 1, 0, s2.order.splice(i, 1)[0]); apply(); } });
        $("ctyList").querySelectorAll("[data-cd]").forEach(b => b.onclick = () => { const s2 = fix(), i = +b.dataset.cd; if(i < s2.order.length - 1){ s2.order.splice(i + 1, 0, s2.order.splice(i, 1)[0]); apply(); } });
        $("ctyList").querySelectorAll("[data-cg]").forEach(b => b.onclick = () => { const k = keys[+b.dataset.cg], sel = $("visCty"); if(!sel) return; if(![...sel.options].some(o => o.value === k)){ toast("Este país não tem categorias para gerir."); return; } sel.value = k; visCatsRender(); try{ sel.scrollIntoView({block:"start", behavior:"smooth"}); }catch(e){} });
        $("ctyList").querySelectorAll("[data-ch]").forEach(b => b.onclick = () => { const s2 = S(), k = keys[+b.dataset.ch], j = s2.hide.indexOf(k); if(j >= 0) s2.hide.splice(j, 1); else s2.hide.push(k); apply(); });
        $("parSt").textContent = P.on() ? (P.unlocked ? "Ligado — desbloqueado até fechares a app." : "Ligado — conteúdos para adultos escondidos.") : "Desligado.";
      };
      $("ctyReset").onclick = () => { const s2 = S(); s2.order = []; s2.hide = []; C.save(); render(); try{ if(typeof fillGroups === "function") fillGroups(); }catch(e){} };
      $("parSet").onclick = () => { const v = $("parPin").value.trim(); if(!/^\d{4,8}$/.test(v)){ toast("O PIN tem de ter 4 a 8 algarismos.", true); return; } if(P.on() && !P.unlocked){ toast("Desbloqueia primeiro com o PIN atual.", true); return; } try{ localStorage.setItem("ck_parPin", v); }catch(e){} P.unlocked = false; $("parPin").value = ""; render(); toast("Controlo parental ligado ✓"); };
      $("parUnlock").onclick = () => { const v = $("parPin").value.trim(); let pin = ""; try{ pin = localStorage.getItem("ck_parPin") || ""; }catch(e){} if(!pin){ toast("O controlo parental está desligado."); return; } if(v !== pin){ toast("PIN errado.", true); return; } P.unlocked = true; $("parPin").value = ""; render(); toast("Desbloqueado até fechares a app."); };
      $("parOff").onclick = () => { const v = $("parPin").value.trim(); let pin = ""; try{ pin = localStorage.getItem("ck_parPin") || ""; }catch(e){} if(pin && v !== pin && !P.unlocked){ toast("Escreve o PIN atual para desligar.", true); return; } try{ localStorage.removeItem("ck_parPin"); }catch(e){} P.unlocked = false; $("parPin").value = ""; render(); toast("Controlo parental desligado."); };
      render();
      const _fs = window.fillSettings; if(typeof _fs === "function") window.fillSettings = function(){ const r = _fs.apply(this, arguments); try{ render(); const d = $("ahSetDet"); if(d) d.checked = detOn(); }catch(e){} return r; };
    }
  }catch(e){ console.log("países", e); }
  }catch(e){ console.log("funções Android", e); }
})();
