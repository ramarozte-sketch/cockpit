
/* ===== Tesla: Início da TV ao estilo Android TV ===== */
(function(){
  if(window.ANDROID) return;   /* a app Android tem o seu próprio Início */
  try{
  const TPL = [["equilibrado", "Equilibrado"], ["cinema", "Cinema"], ["compacto", "Compacto"], ["grelha", "Grelha"], ["netflix", "Estilo Netflix"]];
  const ANS = [["livro", "Livro (virar página)"], ["suave", "Suave"], ["cascata", "Cascata"], ["zoom", "Zoom"], ["nenhuma", "Sem animação"]];
  /* v253: efeito «Livro» passa a ser o escolhido (uma vez); depois fica o que o Rui escolher nas Definições */
  try{ if(!LS.get("anLivro1", 0)){ LS.set("anLivro1", 1); cfg.tvHomeAnim = "livro"; saveCfg(); } }catch(e){}
  const on = () => cfg.tvHome !== "classic";
  const AH = window.__ah = {flat:[], kind:(LS.get("ahKind", "live") || "live"), lim:{}, pass:0, hh:null, rr:null, n:-1};
  const sx = s => esc(s);
  const img = u => { try{ return typeof imgSrc === "function" ? imgSrc(u) : u; }catch(e){ return u; } };

  /* vista */
  const sec = document.createElement("section"); sec.className = "view"; sec.id = "v-tvinicio"; sec.hidden = true;
  sec.innerHTML = '<div class="ahTop"><h1>TV</h1><span class="spacer"></span><button class="btn mirBtn" id="tMirror" aria-pressed="false" aria-label="Imagem em andamento (ligar ou desligar)" title="Imagem em andamento: ligar ou desligar (funciona com o carro em movimento)">🖼 Andamento</button><button class="btn" data-go="explore">🔎 Explorar lista</button><button class="btn" data-go="guide">📅 Guia</button></div><div id="ahStick"><div class="ahHero" id="ahHero"></div><div class="ahKinds" id="ahKindsBar"></div></div><div id="ahRows"></div>';
  try{ const tb = sec.querySelector("#tMirror"); if(tb){ tb.onclick = toggleMirror; syncMirrorBtns(); } }catch(e){}
  $("v-tv").parentNode.insertBefore(sec, $("v-tv"));
  const srch = document.createElement("div"); srch.id = "ahSrch"; srch.hidden = true;
  srch.innerHTML = '<div class="box"><div class="top"><input id="ahSrIn" type="text" placeholder="Pesquisar canais, filmes, séries…" autocomplete="off"><button class="ahBtn" id="ahSrX"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="vertical-align:-2px"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg> Fechar</button></div><div class="top" id="ahSrK"><button class="ahBtn" data-sk="all">🔎 Tudo</button><button class="ahBtn" data-sk="live">📺 Canais</button><button class="ahBtn" data-sk="movie">🎬 Filmes</button><button class="ahBtn" data-sk="series">🍿 Séries</button></div><div class="small" id="ahSrN" style="opacity:.7"></div><div class="res" id="ahSrRes"></div></div>';
  document.body.appendChild(srch);

  /* botão para voltar ao Início a partir da lista */
  const back = document.createElement("button"); back.className = "btn"; back.id = "btnTvHome"; back.textContent = "🏠 Início";
  const tvRow = $("v-tv").querySelector(".row"); if(tvRow) tvRow.insertBefore(back, tvRow.querySelector(".spacer") || tvRow.firstChild);
  back.onclick = () => show("tvinicio");
  const syncBack = () => { back.hidden = !on(); };

  /* recentes */
  const recents = () => LS.get("tvRecent", []) || [];
  const pushRecent = c => { try{ const a = recents().filter(x => x.url !== c.url); a.unshift({name:c.name, logo:c.logo || "", url:c.url, kind:c.kind, group:c.group, id:c.id, free:c.free, intl:c.intl, sid:c.sid}); LS.set("tvRecent", a.slice(0, 24)); }catch(e){} };

  /* abrir um canal ou filme a partir do Início: a lista normal mostra o vídeo */
  const _pc = window.playChannel;
  window.playChannel = function(c){ AH.pass = Date.now() + 3000; try{ if(c && c.url && c.kind !== "series") pushRecent(c); }catch(e){} return _pc.apply(this, arguments); };
  const _os = window.openSeries;
  if(typeof _os === "function") window.openSeries = function(c){ AH.pass = Date.now() + 3000; try{ if(c && c.url) pushRecent(c); }catch(e){} if(currentView !== "tv") show("tv"); return _os.apply(this, arguments); };

  /* «TV» no menu abre o Início; dentro da TV, a lista continua acessível */
  const _show = window.show;
  window.show = function(v){
    if(v === "tv" && on() && Date.now() > AH.pass && currentView !== "tv") v = "tvinicio";
    if(v === "tvinicio" && !on()) v = "tv";
    const wasHome = currentView === "tvinicio";
    if(wasHome && v !== "tvinicio"){ try{ const m = $("main"); AH.sy = Math.max(m ? m.scrollTop : 0, window.scrollY || 0); }catch(e){} }   /* lembra onde ficaste no Início */
    const r = _show.apply(this, [v].concat([].slice.call(arguments, 1)));
    if(v === "tvinicio"){
      if(!wasHome && AH.sy > 0){ const y = AH.sy; [0, 150, 500, 1100].forEach(d => setTimeout(() => { if(currentView !== "tvinicio") return; try{ const m = $("main"); if(m) m.scrollTop = y; window.scrollTo(0, y); }catch(e){} }, d)); }
      if(!wasHome) AH.recSnap = recents();
      document.querySelectorAll('.nav[data-view="tv"]').forEach(b => b.setAttribute("aria-current", "page"));
      try{ if(typeof tvLockUi === "function") tvLockUi(); }catch(e){}
      ensureData(); render(true); replay();
    }
    return r;
  };

  /* dados */
  let dataTried = false;
  const ensureData = () => {
    if(dataTried) return; dataTried = true;
    try{ if(!channels.length && typeof ensureFree === "function") ensureFree().then(() => render(true)).catch(() => {}); }catch(e){}
  };
  setInterval(() => { try{ if(currentView !== "tvinicio") return; const n = channels.length + freeChans.length; if(n !== AH.n){ AH.n = n; render(true); } }catch(e){} }, 2000);

  const uniq = l => { const s = new Set(); return l.filter(c => c && c.url && !s.has(c.url) && s.add(c.url)); };
  const groupsOf = kind => { const m = new Map(); channels.filter(c => c.kind === kind).forEach(c => { const g = c.group || "Outros"; if(!m.has(g)) m.set(g, []); m.get(g).push(c); }); return m; };
  const isPoster = c => c.kind === "movie" || c.kind === "series";
  const subOf = c => { let s = c._sub || c.group || ""; try{ if(!c._sub && c.kind === "live"){ const nn = nowNext(c); if(nn && nn.now) s = hm(nn.now.start) + " " + nn.now.title; } }catch(e){} return s; };
  /* ===== Capas de filmes e séries: se a lista não as traz (ou o endereço falha), pede-as ao servidor Xtream ===== */
  const CV = {map:(function(){ try{ return LS.get("ahCovers", {}) || {}; }catch(e){ return {}; } })(), q:[], busy:0, tried:new Set(), stat:{ok:0, fail:0, none:0}};
  window.__ahCovers = CV;
  const vodId = c => (/\/movie\/[^/]+\/[^/]+\/(\d+)\./.exec(c.url || "") || [])[1];
  const cvSave = () => { try{ const k = Object.keys(CV.map); if(k.length > 900) k.slice(0, k.length - 900).forEach(x => delete CV.map[x]); LS.set("ahCovers", CV.map); }catch(e){} };
  async function cvFetch(c){
    if(!(cfg.xs && cfg.xu && cfg.xp) || typeof xApi !== "function") return "";
    let i = {};
    if(c.kind === "series" && c.sid) i = (await xApi("get_series_info", "&series_id=" + c.sid)).info || {};
    else { const id = vodId(c); if(!id) return ""; i = (await xApi("get_vod_info", "&vod_id=" + id)).info || {}; }
    const u = i.movie_image || i.cover_big || i.cover || (Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : "") || "";
    return /^https?:\/\//i.test(u) && u !== c.logo ? u : "";
  }
  const cvPump = () => {
    while(CV.busy < 3 && CV.q.length){
      const el = CV.q.shift(); const c = AH.flat[+el.dataset.k]; if(!c || CV.tried.has(c.url)) continue;
      CV.tried.add(c.url); CV.busy++;
      cvFetch(c).then(u => {
        if(!u){ CV.stat.none++; return; }
        CV.map[c.url] = u; cvSave(); CV.stat.ok++;
        sec.querySelectorAll('.ahCard[data-k]').forEach(b => { const x = AH.flat[+b.dataset.k]; if(!x || x.url !== c.url) return;
          const art = b.querySelector(".ahArt"); let im = art.querySelector("img"); if(!im){ im = document.createElement("img"); im.alt = ""; art.insertBefore(im, art.firstChild); }
          im.referrerPolicy = "no-referrer"; im.onerror = () => im.remove(); im.src = img(u); });
      }).catch(() => { CV.stat.fail++; }).finally(() => { CV.busy--; cvPump(); });
    }
  };
  const cvNeed = el => { const c = AH.flat[+el.dataset.k]; if(c && isPoster(c) && !CV.tried.has(c.url)){ CV.q.push(el); cvPump(); } };
  window.__ahImgErr = im => { const b = im.closest(".ahCard"); im.remove(); if(b) cvNeed(b); };
  let cvIo = null;
  const cvScan = () => {
    try{ if(cvIo) cvIo.disconnect(); }catch(e){}
    if(typeof IntersectionObserver !== "function") return;
    cvIo = new IntersectionObserver(es => es.forEach(e => { if(!e.isIntersecting) return; cvIo.unobserve(e.target); if(!e.target.querySelector(".ahArt img")) cvNeed(e.target); }), {rootMargin:"300px"});
    sec.querySelectorAll("#ahRows .ahCard.poster[data-k]").forEach(b => cvIo.observe(b));
  };
  function card(c, k){
    const ini = sx(gdIni(c.name));
    const lg = (isPoster(c) && CV.map[c.url]) || c.logo;
    return '<button class="ahCard' + (isPoster(c) ? " poster" : "") + '" data-k="' + k + '"><span class="ahArt">' + (c._pct ? '<span class="ahBar"><i style="width:' + c._pct + '%"></i></span>' : "") + (lg ? '<img src="' + sx(img(lg)) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="window.__ahImgErr && window.__ahImgErr(this)">' : "") + '<b class="ahInit">' + ini + '</b></span><span class="ahMeta"><b title="' + sx(c.name) + '">' + sx(c.name) + '</b><small>' + (window.__h265Tag && window.__h265Tag(c) ? '<i class="h265">H.265 · só parado</i> ' : "") + sx(subOf(c)) + '</small></span></button>';
  }
  function row(title, list, total, lm, cls, extra){
    list = uniq(list).filter(c => !(window.__parHide && window.__parHide(c))); if(!list.length) return "";
    const k0 = AH.flat.length; list.forEach(c => AH.flat.push(c));
    const more = lm && total > list.length ? '<button class="ahCard ahMore" data-lm="' + sx(lm) + '">Carregar mais 25<br><small>' + list.length + ' de ' + total + '</small></button>' : "";
    return '<div class="ahRow' + (cls ? " " + cls : "") + '"><h3><span>' + title + '</span>' + (extra || "") + '<em>' + (total || list.length) + '</em></h3><div class="ahScroll">' + list.map((c, i) => card(c, k0 + i)).join("") + more + '</div></div>';
  }
  const favList = kind => { try{ const ord = LS.get("favOrd", []) || [], rk = c => { const i = ord.indexOf(c.url); return i < 0 ? 1e6 : i; }; return uniq([...channels, ...freeChans].filter(c => favs.has(c.url) && (kind === "live" ? !isPoster(c) && c.kind !== "episode" : c.kind === kind))).sort((a, b) => rk(a) - rk(b)); }catch(e){ return []; } };
  AH.favList = favList;

  function render(force){
    if(currentView !== "tvinicio") return;
    sec.classList.remove(...TPL.map(t => "ah-" + t[0])); sec.classList.add("ah-" + (cfg.tvHomeTpl || "equilibrado"));
    AH.flat = [];
    const cur = (lastPlayed && (lastPlayed[0] || lastPlayed[1])) || recents()[0] || null;
    let hero;
    if(cur){
      AH.flat.push(cur);
      hero = '<div class="ahHeroArt">' + (cur.logo ? '<img src="' + sx(img(cur.logo)) + '" alt="" onerror="this.remove()">' : '<b>' + sx(gdIni(cur.name)) + '</b>') + '</div><div class="ahHeroTx"><small>Continuar a ver</small><h2>' + sx(cur.name) + '</h2><p>' + sx(subOf(cur)) + '</p><div class="ahHeroBt"><button class="ahBtn pri" data-k="0">▶ Ver agora</button><button class="ahBtn" data-go="explore">🔎 Explorar</button></div></div>';
    } else {
      hero = '<div class="ahHeroTx"><small>Cockpit TV</small><h2>Bem-vindo</h2><p>' + (channels.length ? "Escolhe um canal em baixo para começar." : "Os canais abertos portugueses já estão disponíveis. Para ver mais, adiciona a tua lista IPTV nas Definições.") + '</p><div class="ahHeroBt"><button class="ahBtn pri" data-go="explore">🔎 Explorar canais</button><button class="ahBtn" data-go="settings">⚙ Definições</button></div></div>';
    }
    if(AH.hh !== hero || !$("ahHero").firstChild){ $("ahHero").innerHTML = hero; AH.hh = hero; try{ window.__ahStageHome && window.__ahStageHome(); }catch(e){} }
    const K = [["live", "📺 Canais"], ["movie", "🎬 Filmes"], ["series", "🍿 Séries"]];
    const kb = K.map(([k, t]) => '<button class="ahBtn ahKind" data-kind="' + k + '" aria-pressed="' + (AH.kind === k) + '">' + t + '</button>').join("") + '<button class="ahBtn" data-srch="1">🔎 Pesquisar</button>';
    if(AH.kb !== kb || !$("ahKindsBar").firstChild){ const had = $("ahKindsBar").contains(document.activeElement) ? (document.activeElement.dataset.kind || "srch") : ""; $("ahKindsBar").innerHTML = kb; AH.kb = kb; if(had){ const el = $("ahKindsBar").querySelector(had === "srch" ? "[data-srch]" : '[data-kind="' + had + '"]'); if(el) el.focus({preventScroll:true}); } }
    let rows = "";
    if(AH.kind !== "live" && window.RES){ const rl = window.RES.list(AH.kind).slice(0, 20).map(e => Object.assign({}, e, {_pct:Math.round(e.p / e.d * 100), _sub:(e.group ? e.group + " · " : "") + Math.max(1, Math.round((e.d - e.p) / 60)) + " min restantes"})); if(rl.length) rows += row("▶ Continuar a ver", rl); }
    const fl = favList(AH.kind); if(fl.length) rows += row("⭐ Favoritos", fl.slice(0, 40));
    const rv = (AH.recSnap || recents()).filter(x => x && x.url && (AH.kind === "live" ? !isPoster(x) && x.kind !== "episode" : x.kind === AH.kind) && !(!AH.recSnap && cur && cur.url === x.url)).slice(0, 20);
    if(rv.length) rows += row("🕘 Vistos recentemente", rv);
    if(AH.kind === "live" && window.__op){ try{ const ok = window.__op.opKey(); if(ok){ const ol = window.__op.opChannels(ok); if(ol.length){ const hq = window.__op.opQual() === "hd"; rows += row("📺 " + sx(window.__op.opTitle(ok)), ol.slice(0, 80), ol.length, null, "ahOp", '<button class="ahQ' + (hq ? "" : " on") + '" data-opq="1" title="Versão dos canais desta lista">' + (hq ? "HD" : "Ultra HD") + '</button>'); } } }catch(e){} }
    const gm = groupsOf(AH.kind);
    let names = []; try{ names = orgGroupList(AH.kind, [...gm.keys()], false); }catch(e){ names = [...gm.keys()]; }
    let sel = names.filter(n => isPtGroup(n));
    if(!sel.length && AH.kind !== "live"){ const re = /(^|[^A-Za-zÀ-ÿ])(PT|PT-PT|PORTUGAL|PORTUGU[EÊ]S|PORTUGUESA)([^A-Za-zÀ-ÿ]|$)|🇵🇹/i; sel = names.filter(n => re.test(n)); if(!sel.length) sel = names; }
    if(AH.kind !== "live"){ try{ const gi = genreIndex(AH.kind); for(const x of GENRES){ const l = gi.get(x[0]); if(!l || l.length < 6) continue; const lk = "gen|" + AH.kind + "|" + x[0]; rows += row(sx(x[1]), l.slice(0, AH.lim[lk] || 25), l.length, lk); } }catch(e){} }   /* v242: filas por género */
    for(const g of sel.slice(0, 14)){ const l = gm.get(g) || []; const lk = AH.kind + "|" + g; const n = AH.kind === "live" ? 40 : (AH.lim[lk] || 25); rows += row(sx(g), l.slice(0, n), l.length, AH.kind === "live" ? "" : lk); }
    if(AH.kind === "live" && !channels.some(c => c.kind === "live") && freeChans.length) rows += row("📡 Canais abertos PT", freeChans.slice(0, 40), freeChans.length);
    if(!rows.includes("ahRow")){
      const kl = AH.kind === "live" ? "canais" : AH.kind === "movie" ? "filmes" : "séries";
      const tot = channels.filter(c => c.kind === AH.kind).length;
      rows += '<p class="ahEmpty">' + (tot ? "Tens " + tot + " " + kl + ", mas nenhuma categoria visível. Abre a lista para os ver." : (typeof freeLoading !== "undefined" && freeLoading) ? "A carregar canais…" : "Sem " + kl + " carregados. Adiciona a tua lista IPTV nas Definições ou abre a lista.") + '</p>';
    }
    try{ AH.n = channels.length + freeChans.length; }catch(e){}
    if(force || AH.rr !== rows){
      const keep = {}; sec.querySelectorAll(".ahRow").forEach(r => { const h = r.querySelector("h3 span"), s = r.querySelector(".ahScroll"); if(h && s) keep[AH.kind + "|" + h.textContent] = s.scrollLeft; });
      $("ahRows").innerHTML = rows; AH.rr = rows;
      sec.querySelectorAll(".ahRow").forEach(r => { const h = r.querySelector("h3 span"), s = r.querySelector(".ahScroll"); const v = h && keep[AH.kind + "|" + h.textContent]; if(s && v) s.scrollLeft = v; });
      armAnim(); cvScan();
    }
  }
  AH.render = render;

  /* animações (repetem sempre que um cartão entra no ecrã) */
  let io = null, ioFired = false;
  function armAnim(){
    const an = cfg.tvHomeAnim || "suave";
    ANS.forEach(a => sec.classList.toggle("an-" + a[0], an === a[0]));
    try{ if(io) io.disconnect(); }catch(e){} io = null; sec.classList.remove("ahArm");
    const cards = [...sec.querySelectorAll("#ahRows .ahCard")];
    if(an === "nenhuma" || typeof IntersectionObserver !== "function"){ cards.forEach(c => c.classList.add("in")); return; }
    ioFired = false;
    io = new IntersectionObserver(es => {
      ioFired = true; let n = 0;
      es.filter(e => e.isIntersecting).sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left)).forEach(e => {
        const el = e.target; if(el.classList.contains("in")) return;
        el.style.setProperty("--d", Math.min(n++, 10) * 70 + "ms"); el.classList.add("in", "rev"); setTimeout(() => el.classList.remove("rev"), 1400);
      });
      es.filter(e => !e.isIntersecting).forEach(e => e.target.classList.remove("in", "rev"));
    }, {threshold:0.1});
    sec.classList.add("ahArm"); cards.forEach(c => io.observe(c));
    setTimeout(() => { if(!ioFired){ cards.forEach(c => c.classList.add("in")); sec.classList.remove("ahArm"); } }, 2500);   /* rede de segurança */
  }
  function replay(){ sec.querySelectorAll("#ahRows .ahCard").forEach(c => c.classList.remove("in", "rev")); armAnim(); }

  /* toques */
  sec.addEventListener("click", e => {
    const b = e.target.closest("[data-k],[data-go],[data-kind],[data-lm],[data-srch],[data-opq]"); if(!b) return;
    if(b.dataset.opq){ e.stopPropagation(); try{ window.__op.opToggle(); }catch(x){} render(true); return; }
    if(b.dataset.lm){ AH.lim[b.dataset.lm] = (AH.lim[b.dataset.lm] || 25) + 25; render(true); return; }
    if(b.dataset.kind){ AH.kind = b.dataset.kind; LS.set("ahKind", AH.kind); render(true); return; }
    if(b.dataset.srch){ openSearch(); return; }
    if(b.dataset.go === "explore"){ AH.pass = Date.now() + 1500; show("tv"); return; }
    if(b.dataset.go === "guide"){ try{ if(typeof openGuide === "function") openGuide(); else $("btnGuide").click(); }catch(x){} return; }
    if(b.dataset.go){ show(b.dataset.go); return; }
    if(b.dataset.k != null){ window.__srcFromRow(b, AH.flat); watch(AH.flat[+b.dataset.k]); }
  });
  function watch(c){
    if(!c) return;
    if(c.kind === "series" && c.sid){ window.openSeries(c); return; }
    window.playChannel(c);
  }

  /* pesquisa global */
  let found = [];
  const nz = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function openSearch(){ srch.hidden = false; $("ahSrIn").value = ""; runSearch(); setTimeout(() => { try{ $("ahSrIn").focus(); }catch(e){} }, 50); }
  function runSearch(){
    const q = nz($("ahSrIn").value).split(/\s+/).filter(Boolean), res = $("ahSrRes");
    if(!q.length){ res.innerHTML = '<p class="ahEmpty">Escreve para pesquisar.</p>'; found = []; return; }
    /* v447: base completa (inclui categorias ocultas), escolhida nos botões Tudo / Canais / Filmes / Séries; nomes já preparados (rápido em ~340 mil títulos) */
    const sk = LS.get("ahSrK", "all") || "all"; let all;
    try{ all = typeof tvScopeSearch === "function" ? tvScopeSearch(norm($("ahSrIn").value || ""), sk) : null; }catch(e){ all = null; }
    if(!all) all = [...channels, ...freeChans].filter(c => c && (sk === "all" || c.kind === sk) && q.every(w => nz(c.name).includes(w)) && !(window.__parHide && window.__parHide(c)));
    all = uniq(all); found = all.slice(0, 150);
    $("ahSrN").textContent = all.length ? all.length + (all.length > found.length ? " (mostra " + found.length + ")" : "") + " resultados na base completa, incluindo categorias ocultas" : "";
    const ic = c => c.kind === "movie" ? "🎬" : c.kind === "series" ? "🍿" : "📺";
    res.innerHTML = found.length ? found.map((c, i) => '<button class="ahBtn" data-i="' + i + '">' + ic(c) + ' <b>' + sx(c.name) + '</b><small> ' + sx(c.group || "") + '</small></button>').join("") : '<p class="ahEmpty">Sem resultados.</p>';
  }
  let st = 0; $("ahSrIn").addEventListener("input", () => { clearTimeout(st); st = setTimeout(runSearch, 180); });
  $("ahSrX").onclick = () => { srch.hidden = true; };
  const skSync = () => { const k = LS.get("ahSrK", "all") || "all"; srch.querySelectorAll("[data-sk]").forEach(b => { const on = b.dataset.sk === k; b.classList.toggle("pri", on); b.setAttribute("aria-pressed", String(on)); }); };
  skSync(); srch.querySelectorAll("[data-sk]").forEach(b => b.onclick = () => { LS.set("ahSrK", b.dataset.sk); skSync(); runSearch(); try{ $("ahSrIn").focus(); }catch(e){} });
  $("ahSrRes").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if(!b) return; const c = found[+b.dataset.i]; srch.hidden = true; watch(c); });

  /* Definições → TV e IPTV */
  /* v282: controlos do Início estão em Aspeto e layout (ids estáticos); mantém aliases ahSet* se existirem */
  const fillAh = () => {
    const vOn = on() ? "android" : "classic", vTpl = cfg.tvHomeTpl || "equilibrado", vAn = cfg.tvHomeAnim || "suave";
    [["ahSetOn","setTvHome"],["ahSetTpl","setTvHomeTpl"],["ahSetAn","setCardAnim"]].forEach(([a,b]) => {
      const el = $(a) || $(b); if(el) el.value = a.includes("On") || b.includes("Home") && !b.includes("Tpl") ? vOn : a.includes("Tpl") || b.includes("Tpl") ? vTpl : vAn;
    });
    try{ syncBack(); }catch(e){}
  };
  const bindAh = (id, key, after) => { const el = $(id); if(!el || el._ahBound) return; el._ahBound = 1; el.onchange = () => { cfg[key] = el.value; saveCfg(); try{ after && after(); }catch(e){} fillAh(); }; };
  bindAh("setTvHome", "tvHome", () => { try{ syncBack(); toast($("setTvHome").value === "classic" ? "A TV abre na lista clássica." : "A TV abre no Início estilo Android TV ✓"); }catch(e){} });
  bindAh("setTvHomeTpl", "tvHomeTpl");
  bindAh("setCardAnim", "tvHomeAnim");
  bindAh("ahSetOn", "tvHome", () => { try{ syncBack(); }catch(e){} });
  bindAh("ahSetTpl", "tvHomeTpl");
  bindAh("ahSetAn", "tvHomeAnim");
  fillAh();
  const _fsAh = window.fillSettings; if(typeof _fsAh === "function") window.fillSettings = function(){ const r = _fsAh.apply(this, arguments); try{ fillAh(); }catch(e){} return r; };
  syncBack();
  /* se a app abriu já na TV (última vista), passa para o Início */
  setTimeout(() => { try{
    if(currentView === "tvinicio") show(on() ? "tvinicio" : "tv");   /* a app abriu no Início antes de ele existir */
    else if(on() && currentView === "tv" && !(lastPlayed[0] || lastPlayed[1])) show("tvinicio");
  }catch(e){} }, 300);
  }catch(e){ console.log("Início TV", e); }
})();
