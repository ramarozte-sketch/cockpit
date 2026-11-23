
(function(){
  if(window.ANDROID) return;
  /* ---------- 3. Modo ambiente: parado e sem mexer no ecrã há X minutos ---------- */
  try{
    const amb = document.createElement("div"); amb.id = "ambient";
    amb.innerHTML = '<div id="ambClock">--:--</div><div id="ambDate"></div><div id="ambRow"></div><div id="ambPlay"><button id="ambPP" aria-label="Pausa ou continuar">⏯</button><span id="ambNow"></span></div><div id="ambHint">Toca no ecrã para voltar</div>';
    document.body.appendChild(amb);
    const $m = id => document.getElementById(id);
    let lastAct = Date.now();
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(ev => document.addEventListener(ev, e => { lastAct = Date.now(); if(amb.classList.contains("on") && !(e.target && e.target.closest && e.target.closest("#ambPP"))){ e.preventDefault(); e.stopPropagation(); close(); } }, true));
    /* v578: qualquer interação conta (não só toques no Cockpit): toques e teclas dentro dos jogos (janelas internas),
       comandos do telemóvel, comandos físicos e o comando no ecrã. E nunca abre a meio de um jogo nem com a mesa de DJ a tocar */
    window.__ckActivity = () => { lastAct = Date.now(); };
    const hookFrame = f => { try{ const w = f.contentWindow; if(!w || w.__ckHooked) return; w.__ckHooked = true; ["pointerdown", "keydown", "touchstart", "wheel"].forEach(ev => w.addEventListener(ev, () => { lastAct = Date.now(); }, true)); }catch(e){} };
    document.addEventListener("load", e => { if(e.target && e.target.tagName === "IFRAME") hookFrame(e.target); }, true);
    setInterval(() => { try{ document.querySelectorAll("iframe").forEach(hookFrame); const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; for(const g of pads){ if(g.buttons.some(b => b.pressed) || g.axes.some(a => Math.abs(a) > .4)){ lastAct = Date.now(); break; } } }catch(e){} }, 1000);
    const busy = () => { try{
      const ew = document.getElementById("emuWin"); if(ew && ew.classList.contains("on")) return true;   /* emulador aberto */
      if(typeof currentView !== "undefined" && currentView === "games" && document.querySelector("#v-games canvas, #v-games iframe")) { const vis = [...document.querySelectorAll("#v-games canvas, #v-games iframe")].some(x => x.offsetParent !== null && x.offsetWidth > 120); if(vis) return true; }   /* jogo do Cockpit em curso */
      if(window.__dj && window.__dj.D && window.__dj.D.some(d => d.playing)) return true;   /* mesa de DJ a tocar */
    }catch(e){} return false; };
    const mins = () => { const v = (typeof cfg !== "undefined" && cfg.ambientMin != null) ? +cfg.ambientMin : 5; return v; };
    const playing = () => { try{ const W = window.__wamp; if(W && W.playing && W.playing() && W.cur) return {k:"amp", t:"🎵 " + W.cur.artist + " — " + W.cur.title};
      const ra = document.getElementById("radioAud"); if(typeof radioCur !== "undefined" && radioCur) return {k:"radio", t:"📻 " + radioCur.name, paused:ra && ra.paused};
      const c = lastPlayed && (lastPlayed[0] || lastPlayed[1]); if(c) return {k:"tv", t:"📺 " + c.name}; }catch(e){} return null; };
    const card = (v, l) => '<div class="c"><b>' + v + '</b><small>' + l + '</small></div>';
    const paint = () => {
      /* respeita as definições do protetor: itens ativos, fundo e escala */
      let c = {info:{}, bg:"noite", scale:1};
      try{ c = saverCfgGet(); }catch(e){}
      const info = c.info || {};
      amb.style.background = svBgCss(c); amb.style.color = svTextOn(c);
      const d = new Date(); $m("ambClock").textContent = d.toLocaleTimeString("pt-PT", {hour:"2-digit", minute:"2-digit"});
      $m("ambDate").textContent = d.toLocaleDateString("pt-PT", {weekday:"long", day:"numeric", month:"long"});
      $m("ambClock").style.display = info.hora ? "" : "none";
      $m("ambDate").style.display = info.data ? "" : "none";
      let h = "";
      try{ saverItems(c).forEach(it => { if(it.k !== "hora" && it.k !== "data") h += '<div class="c">' + it.html + '</div>'; }); }catch(e){}
      $m("ambRow").style.zoom = c.scale || 1;
      const p = playing(); $m("ambPlay").classList.toggle("on", !!p); if(p) $m("ambNow").textContent = p.t;
    };
    /* o modo ambiente abre o protetor definido na app Protetor (modelo, informação, fundo) */
    const svOn = () => { const s = document.getElementById("saver"); return !!s && !s.hidden; };
    const open = () => { if(svOn()) return; try{ saverOpen(false); }catch(e){ paint(); amb.classList.add("on"); } };
    const close = () => { amb.classList.remove("on"); try{ if(svOn()) saverClose(); }catch(e){} lastAct = Date.now(); };
    window.__ambient = {open, close};
    $m("ambPP").addEventListener("click", e => { e.stopPropagation(); try{ const p = playing(); if(!p) return;
      if(p.k === "amp"){ const W = window.__wamp; if(W.E){ W.E.paused() ? W.E.play() : W.E.pause(); } }
      else if(p.k === "radio"){ const a = document.getElementById("radioAud"); a.paused ? a.play().catch(() => {}) : a.pause(); }
      else { const v = document.getElementById("vid" + (lastPlayed[0] ? 0 : 1)); v.paused ? v.play().catch(() => {}) : v.pause(); } paint(); }catch(x){} });
    setInterval(() => { try{
      if(amb.classList.contains("on") || svOn()){ if(amb.classList.contains("on")) paint(); if(typeof drivingEff === "function" && drivingEff()) close(); return; }
      const m = mins(); if(!m) return;
      const moving = typeof drivingEff === "function" && drivingEff();
      if(busy()){ lastAct = Date.now(); return; }
      if(!moving && !document.body.classList.contains("pfull") && Date.now() - lastAct > m * 60000) open();
    }catch(e){} }, 5000);
    /* opção nas Definições (junto das opções da TV) */
    setTimeout(() => { try{ const w = document.getElementById("drvSet"); if(!w) return; const l = document.createElement("label"); l.className = "f";
      l.innerHTML = 'Modo ambiente (relógio, temperatura, bateria, carga e destino) com o carro parado e sem tocar no ecrã há<select id="ambOpt"><option value="0">Desligado</option><option value="2">2 min</option><option value="5">5 min</option><option value="10">10 min</option><option value="20">20 min</option></select>';
      w.appendChild(l); const sel = document.getElementById("ambOpt"); sel.value = String(mins()); sel.onchange = () => { cfg.ambientMin = +sel.value; saveCfg(); }; }catch(e){} }, 2000);
  }catch(e){ console.log("modo ambiente", e); }

  /* ---------- 10a. Rádios portuguesas principais (lista curada, procurada no radio-browser) ---------- */
  try{
    const PT = ["Rádio Comercial", "RFM", "Antena 1", "Antena 2", "Antena 3", "TSF", "M80", "Cidade FM", "Renascença", "Mega Hits", "Smooth FM", "Rádio Observador", "Kiss FM", "Vodafone FM", "Rádio Amália", "Rádio Nova Era", "Batida FM", "Rádio Clube Português"];
    const tabs = document.querySelector('#radioPanel [role="tablist"]');
    if(tabs && typeof rbGet === "function" && typeof rSlim === "function"){
      const b = document.createElement("button"); b.className = "tab"; b.dataset.rt = "ptc"; b.setAttribute("aria-selected", "false"); b.textContent = "⭐ Principais PT"; tabs.insertBefore(b, tabs.firstChild);
      let cache = LS.get("radioPtc", null);
      b.onclick = async () => {
        document.querySelectorAll("[data-rt]").forEach(x => x.setAttribute("aria-selected", String(x === b))); try{ radioTab = "ptc"; }catch(e){}
        if(cache && cache.list && Date.now() - cache.at < 7 * 864e5){ renderRadios(cache.list, ""); return; }
        document.getElementById("radioGrid").innerHTML = '<p class="muted small" style="margin:0">A procurar as rádios principais…</p>';
        const out = [];
        await Promise.all(PT.map(async (n, i) => { try{ const j = await rbGet("/json/stations/search?" + new URLSearchParams({name:n, countrycode:"PT", order:"votes", reverse:"true", hidebroken:"true", limit:"3"}));
          const st = (j || []).map(rSlim).find(x => x.url); if(st) out[i] = st; }catch(e){} }));
        const list = out.filter(Boolean); cache = {at:Date.now(), list}; if(list.length) LS.set("radioPtc", cache);
        renderRadios(list, "Não consegui obter a lista agora. Experimenta «Portuguesas».");
      };
    }
  }catch(e){ console.log("rádios PT", e); }

  /* ---------- 10b. Importar favoritos de outras apps IPTV (M3U, lista de nomes ou JSON) ---------- */
  try{
    setTimeout(() => { try{
      const w = document.getElementById("drvSet") || document.getElementById("ahSet"); if(!w) return;
      const d = document.createElement("div"); d.innerHTML = '<h3 style="margin:14px 0 6px">Importar favoritos de outra app</h3><p class="small muted" style="margin:0 0 8px">Ficheiro .m3u / .txt / .json exportado de outra app IPTV (Televizo, TiviMate, IPTV Smarters…), ou cola os nomes dos canais, um por linha.</p>' +
        '<div class="row" style="gap:10px;flex-wrap:wrap"><input type="file" id="favImpF" accept=".m3u,.m3u8,.txt,.json,text/plain,application/json"><button class="btn" id="favImpGo">Importar</button></div><textarea id="favImpT" rows="4" placeholder="RTP 1&#10;SIC&#10;Sport TV 1" style="width:100%;margin-top:8px"></textarea><p class="small" id="favImpR" style="margin:6px 0 0"></p>';
      w.appendChild(d);
      const key = n => String(n || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^[\s\W_]*(pt|portugal)\b[\s|:\-\/]*/i, "").replace(/\[[^\]]*\]|\([^)]*\)/g, " ").replace(/\b(fhd|uhd|hd|sd|4k|hevc|h265)\b/g, " ").replace(/[^a-z0-9]+/g, "");
      const names = txt => { txt = String(txt || ""); try{ const j = JSON.parse(txt); const arr = Array.isArray(j) ? j : (j.favorites || j.favourites || j.channels || j.items || []); return arr.map(x => typeof x === "string" ? x : (x.name || x.title || x.channel || "")).filter(Boolean); }catch(e){}
        if(/#EXTINF/i.test(txt)) return txt.split(/\r?\n/).filter(l => /^#EXTINF/i.test(l)).map(l => { const m = l.match(/tvg-name="([^"]+)"/i); const c = l.lastIndexOf(","); return (c > -1 ? l.slice(c + 1) : "").trim() || (m ? m[1] : ""); }).filter(Boolean);
        return txt.split(/\r?\n/).map(x => x.trim()).filter(x => x && !/^#/.test(x)); };
      document.getElementById("favImpGo").onclick = async () => {
        let txt = document.getElementById("favImpT").value; const f = document.getElementById("favImpF").files[0]; if(f) txt += "\n" + await f.text();
        const ns = names(txt); if(!ns.length){ document.getElementById("favImpR").textContent = "Não encontrei nomes de canais."; return; }
        const idx = new Map(); (channels || []).filter(c => c.kind === "live").forEach(c => { const k = key(c.name); if(k && !idx.has(k)) idx.set(k, c); });
        let ok = 0, miss = [];
        ns.forEach(n => { const c = idx.get(key(n)); if(c){ if(!favs.has(c.url)){ favs.add(c.url); ok++; } } else miss.push(n); });
        LS.set("tvfavs", [...favs]); try{ renderTV && renderTV(); }catch(e){}
        document.getElementById("favImpR").textContent = ok + " canais adicionados aos favoritos" + (miss.length ? " · não encontrei " + miss.length + " (ex.: " + miss.slice(0, 4).join(", ") + ")" : "") + ".";
      };
    }catch(e){} }, 2200);
  }catch(e){ console.log("importar favoritos", e); }

  /* ---------- 8. Botões do volante / teclas multimédia ---------- */
  try{
    const act = a => {
      try{ if(window.__ambient && document.getElementById("ambient").classList.contains("on")) window.__ambient.close(); }catch(e){}
      const W = window.__wamp, ampOn = W && W.cur && W.playing && (W.playing() || (W.E && !W.E.paused()));
      const ra = document.getElementById("radioAud"), radioOn = typeof radioCur !== "undefined" && radioCur;
      const tvOn = lastPlayed && (lastPlayed[0] || lastPlayed[1]);
      if(a === "next" || a === "prev"){ const d = a === "next" ? 1 : -1;
        if(ampOn){ const b = document.querySelector('#wampPanel [data-w="' + (d > 0 ? "next" : "prev") + '"]'); if(b) b.click(); }
        else if(tvOn){ try{ if(zap(d)){ const c = lastPlayed[tvTarget]; if(c) toast((d > 0 ? "▶ " : "◀ ") + c.name); } }catch(e){} }
        else if(radioOn){ try{ const L = (typeof radioTab !== "undefined" && radioTab === "fav") ? radioFavs : radioList; const i = L.findIndex(x => x.id === radioCur.id); const n = L[(i + d + L.length) % L.length]; if(n) playRadio(n); }catch(e){} }
      } else if(a === "play" || a === "pause" || a === "toggle"){
        if(ampOn || (W && W.cur)){ if(W.E){ W.E.paused() ? W.E.play() : W.E.pause(); } }
        else if(radioOn){ ra.paused ? ra.play().catch(() => {}) : ra.pause(); }
        else if(tvOn){ const v = document.getElementById("vid" + (typeof tvTarget === "number" ? tvTarget : 0)); if(v) v.paused ? v.play().catch(() => {}) : v.pause(); }
      }
      try{ window.__dbgEv && window.__dbgEv(0, "botão do volante/teclado", {acao:a}); }catch(e){}
    };
    if("mediaSession" in navigator){ const ms = navigator.mediaSession;
      [["nexttrack", "next"], ["previoustrack", "prev"], ["play", "toggle"], ["pause", "toggle"], ["seekforward", "next"], ["seekbackward", "prev"]].forEach(([k, a]) => { try{ ms.setActionHandler(k, () => act(a)); }catch(e){} });
      setInterval(() => { try{ if(!ms.metadata){ const c = lastPlayed && (lastPlayed[0] || lastPlayed[1]); const t = (typeof radioCur !== "undefined" && radioCur) ? radioCur.name : c ? c.name : ""; if(t) ms.metadata = new MediaMetadata({title:t, artist:"Cockpit"}); } }catch(e){} }, 5000); }
    document.addEventListener("keydown", e => {
      if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const k = e.key;
      if(k === "MediaTrackNext" || k === "AudioTrackNext"){ e.preventDefault(); act("next"); }
      else if(k === "MediaTrackPrevious" || k === "AudioTrackPrevious"){ e.preventDefault(); act("prev"); }
      else if(k === "MediaPlayPause" || k === "MediaPlay" || k === "MediaPause"){ e.preventDefault(); act("toggle"); }
    }, true);
    window.__wheelAct = act;
  }catch(e){ console.log("botões do volante", e); }
})();
