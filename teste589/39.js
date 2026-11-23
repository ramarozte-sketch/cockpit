
(function(){
  if(window.ANDROID) return;
  try{
    const rp = document.getElementById("radioPanel"); if(!rp) return;
    const P = document.createElement("div"); P.className = "panel"; P.id = "wampPanel";
    P.innerHTML = '<div class="wTitle"><b>COCKPIT AMP</b><span style="flex:1;height:8px"></span><span id="wampSrcTag" class="small">Audius · iTunes · YouTube Music</span></div>' +
      '<div class="wMain"><div id="wampLcd"><div id="wampTime">00:00</div><div id="wampKbps">— parado —</div><canvas id="wampSpec" width="150" height="38"></canvas><div id="wampYtBox" hidden><div id="wampYt"></div><canvas id="wampYtCv" hidden></canvas></div></div>' +
      '<div id="wampInfo"><div id="wampMarq"><span>*** Procura um artista ou uma música em baixo ***</span></div><input type="range" id="wampSeek" min="0" max="1000" value="0" aria-label="Posição"></div></div>' +
      '<div class="wCtl"><button data-w="prev" aria-label="Anterior">⏮</button><button data-w="play" aria-label="Tocar ou pausa">⏯</button><button data-w="stop" aria-label="Parar">⏹</button><button data-w="next" aria-label="Seguinte">⏭</button>' +
      '<button data-w="shuf" aria-pressed="false" aria-label="Aleatório">🔀</button><button data-w="rep" aria-pressed="false" aria-label="Repetir">🔁</button>' +
      '<span class="wVolBox"><span>🔈</span><input type="range" id="wampVol" min="0" max="100" value="80" aria-label="Volume"><span>🔊</span></span></div>' +
      '<form id="wampForm"><input type="search" id="wampQ" placeholder="Artista ou música…" autocomplete="off"><select id="wampSrc" aria-label="Fonte"><option value="audius">Audius (completas)</option><option value="itunes">iTunes (30 s)</option><option value="youtube">YouTube Music</option></select><button>Procurar</button></form>' +
      '<div id="wampPl"><div class="e">A playlist aparece aqui. Audius tem músicas completas de artistas independentes; o iTunes tem amostras de 30 s de quase tudo.</div></div>';
    rp.before(P);
    const $w = id => document.getElementById(id), a = $w("wampAud");
    const W = window.__wamp = {list:[], i:-1, shuf:false, rep:false, an:null, ctx:null, lyr:null, cur:null};
    const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
    const esc2 = t => String(t || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    try{ a.volume = (+LS.get("wampVol", 80)) / 100; $w("wampVol").value = LS.get("wampVol", 80); }catch(e){}

    /* --- pesquisa --- */
    const getJ = async u => { try{ const r = await fetch(u); if(r.ok) return await r.json(); throw new Error(r.status); }catch(e){ if(typeof px === "function"){ const r2 = await fetch(px(u)); if(r2.ok) return await r2.json(); } throw e; } };
    let audHost = "";
    const audius = async q => {
      if(!audHost){ try{ const j = await getJ("https://api.audius.co"); audHost = (j.data || [])[0] || "https://discoveryprovider.audius.co"; }catch(e){ audHost = "https://discoveryprovider.audius.co"; } }
      const j = await getJ(audHost + "/v1/tracks/search?app_name=CockpitTesla&query=" + encodeURIComponent(q));
      return (j.data || []).filter(t => t && t.id && t.is_streamable !== false).slice(0, 60).map(t => ({src:"audius", title:t.title, artist:(t.user && t.user.name) || "", art:(t.artwork && (t.artwork["150x150"] || t.artwork["480x480"])) || "", dur:t.duration || 0, url:audHost + "/v1/tracks/" + t.id + "/stream?app_name=CockpitTesla", full:true}));
    };
    const itunes = async q => {
      const j = await getJ("https://itunes.apple.com/search?media=music&entity=song&limit=60&country=PT&term=" + encodeURIComponent(q));
      return (j.results || []).filter(t => t.previewUrl).map(t => ({src:"itunes", title:t.trackName, artist:t.artistName, art:t.artworkUrl100 || "", dur:(t.trackTimeMillis || 0) / 1000, url:t.previewUrl, full:false}));
    };
    /* YouTube Music: pesquisa com a chave da API do YouTube (Definições › YouTube); categoria Música */
    const isoDur = d => { const m = String(d || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
    const ytClean = t => String(t || "").replace(/\s*[\(\[](official|oficial|lyric|lyrics|audio|video|vídeo|videoclip|hd|4k|visualizer|letra)[^\)\]]*[\)\]]/gi, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
    const youtube = async q => {
      if(!cfg.ytKey) throw new Error("nokey");
      const u = "https://www.googleapis.com/youtube/v3/search?" + new URLSearchParams({part:"snippet", type:"video", videoCategoryId:"10", videoEmbeddable:"true", maxResults:"40", regionCode:"PT", q, key:cfg.ytKey});
      const j = await (await fetch(u)).json(); if(j.error) throw new Error(j.error.message || "yt");
      const items = (j.items || []).filter(x => x.id && x.id.videoId), ids = items.map(x => x.id.videoId);
      let durs = {}; try{ const d = await (await fetch("https://www.googleapis.com/youtube/v3/videos?" + new URLSearchParams({part:"contentDetails", id:ids.join(","), key:cfg.ytKey}))).json(); (d.items || []).forEach(v => durs[v.id] = isoDur(v.contentDetails && v.contentDetails.duration)); }catch(e){}
      return items.map(x => { const sn = x.snippet || {}, raw = ytClean(sn.title), ch = String(sn.channelTitle || "").replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "");
        const k = raw.indexOf(" - "); const artist = k > 0 ? raw.slice(0, k).trim() : ch, title = k > 0 ? raw.slice(k + 3).trim() : raw;
        return {src:"youtube", title, artist, art:(sn.thumbnails && (sn.thumbnails.default || sn.thumbnails.medium) || {}).url || "", dur:durs[x.id.videoId] || 0, yt:x.id.videoId, full:true}; });
    };
    const renderPl = () => {
      const pl = $w("wampPl");
      if(!W.list.length){ pl.innerHTML = '<div class="e">Nada encontrado. Experimenta outro nome ou a outra fonte.</div>'; return; }
      pl.innerHTML = W.list.map((t, i) => '<button data-i="' + i + '" class="' + (i === W.i ? "on" : "") + '">' + (t.art ? '<img src="' + esc2(t.art) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<img alt="">') +
        '<span class="n">' + (i + 1) + '. ' + esc2(t.artist) + ' — ' + esc2(t.title) + '</span>' + (t.yt ? '<span class="q yt">YT</span>' : t.full ? "" : '<span class="q">30 s</span>') + '<span class="d">' + fmt(t.dur) + '</span></button>').join("");
    };
    $w("wampForm").addEventListener("submit", async e => {
      e.preventDefault(); const q = $w("wampQ").value.trim(); if(!q) return;
      const src = $w("wampSrc").value; LS.set("wampSrc", src); $w("wampPl").innerHTML = '<div class="e">A procurar «' + esc2(q) + '»…</div>';
      try{ W.list = src === "itunes" ? await itunes(q) : src === "youtube" ? await youtube(q) : await audius(q); W.i = -1; renderPl(); }
      catch(err){ $w("wampPl").innerHTML = '<div class="e">' + (String(err && err.message) === "nokey" ? "Para o YouTube Music falta a chave da API do YouTube (Definições › YouTube)." : 'Não consegui ligar a ' + (src === "itunes" ? "iTunes" : src === "youtube" ? "YouTube" : "Audius") + (src === "youtube" && err && err.message ? " (" + esc2(err.message) + ")" : "") + '. Experimenta outra fonte.') + '</div>'; }
    });
    try{ $w("wampSrc").value = LS.get("wampSrc", "audius"); }catch(e){}
    $w("wampPl").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if(b) play(+b.dataset.i); });

    /* --- leitor do YouTube (vídeo pequeno no visor; o som sai pelo YouTube, por isso o espectro e as animações usam ritmo simulado) --- */
    let ytP = null, ytReady = null, ytState = -1;
    const ytLoad = () => ytReady || (ytReady = new Promise(res => {
      const mk = () => { ytP = new YT.Player("wampYt", {width:150, height:84, playerVars:{playsinline:1, controls:0, rel:0, modestbranding:1, autoplay:1}, events:{onReady:() => res(true), onStateChange:e => { ytState = e.data; if(e.data === 0) next(1); if(e.data === 1) tick(); }, onError:() => { toast("Este vídeo não pode tocar fora do YouTube. A passar ao seguinte."); next(1); }}}); };
      if(window.YT && YT.Player) return mk();
      const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { try{ prev && prev(); }catch(e){} mk(); };
      const sc = document.createElement("script"); sc.src = "https://www.youtube.com/iframe_api"; sc.onerror = () => res(false); document.head.appendChild(sc);
    }));
    const isYt = () => !!(W.cur && W.cur.yt);
    const E = {   /* motor atual: <audio> ou YouTube */
      t:() => isYt() ? (ytP && ytP.getCurrentTime ? ytP.getCurrentTime() : 0) : a.currentTime,
      d:() => isYt() ? (ytP && ytP.getDuration ? ytP.getDuration() : 0) : a.duration,
      paused:() => isYt() ? ytState !== 1 : a.paused,
      play:() => { if(isYt()){ ytP && ytP.playVideo(); } else a.play().catch(() => {}); },
      pause:() => { if(isYt()){ ytP && ytP.pauseVideo(); } else a.pause(); },
      seek:x => { if(isYt()){ ytP && ytP.seekTo(x, true); } else a.currentTime = x; },
      vol:v => { a.volume = v; try{ ytP && ytP.setVolume(Math.round(v * 100)); }catch(e){} }
    };
    W.E = E;
    let tickT = 0; const tick = () => { clearInterval(tickT); tickT = setInterval(() => { if(!isYt()){ clearInterval(tickT); return; } $w("wampTime").textContent = fmt(E.t()); const d = E.d(); if(d && !W.drag) $w("wampSeek").value = Math.round(E.t() / d * 1000); }, 500); };

    /* --- tocar --- */
    const tapAn = () => {   /* espectro: só se o servidor deixar ler o som (CORS); senão toca na mesma, sem espectro */
      if(W.an || !a.crossOrigin) return;
      try{ const AC = window.AudioContext || window.webkitAudioContext; W.ctx = W.ctx || new AC(); const s = W.ctx.createMediaElementSource(a); W.an = W.ctx.createAnalyser(); W.an.fftSize = 1024; W.an.smoothingTimeConstant = 0.78; s.connect(W.an); W.an.connect(W.ctx.destination); a._noAmp = true; }catch(e){}
    };
    const play = i => {
      const t = W.list[i]; if(!t) return; W.i = i; W.cur = t; renderPl();
      try{ if(typeof radioStop === "function" && typeof radioCur !== "undefined" && radioCur) radioStop(); }catch(e){}
      $w("wampYtBox").hidden = !t.yt; $w("wampSpec").hidden = !!t.yt;
      if(t.yt){
        try{ a.pause(); }catch(e){}
        $w("wampMarq").innerHTML = "<span>*** " + esc2(t.artist) + " — " + esc2(t.title) + " ***</span>"; $w("wampKbps").textContent = "YOUTUBE · " + fmt(t.dur);
        ytLoad().then(ok => { if(!ok || W.cur !== t){ if(!ok) toast("Não consegui carregar o leitor do YouTube.", true); return; } try{ ytP.setVolume(Math.round(a.volume * 100)); ytP.loadVideoById(t.yt); }catch(e){} });
        W.lyr = null; loadLyrics(t); keepAwake && keepAwake(true); return;
      }
      try{ ytP && ytP.stopVideo && ytP.stopVideo(); }catch(e){}
      const go = cors => { if(cors) a.crossOrigin = "anonymous"; else a.removeAttribute("crossorigin"); a.src = t.url; a.play().catch(() => {}); };
      a.onerror = () => { if(a.crossOrigin && !W.an){ a.onerror = () => { toast("Não consegui tocar esta música. A passar à seguinte."); next(1); }; go(false); } else { toast("Não consegui tocar esta música. A passar à seguinte."); next(1); } };
      go(!W.an || !!a.crossOrigin);
      if(W.ctx) W.ctx.resume().catch(() => {});
      $w("wampMarq").innerHTML = "<span>*** " + esc2(t.artist) + " — " + esc2(t.title) + (t.full ? "" : " (amostra de 30 s)") + " ***</span>";
      $w("wampKbps").textContent = (t.src === "audius" ? "AUDIUS" : "iTUNES") + " · " + fmt(t.dur);
      W.lyr = null; loadLyrics(t);
      try{ if(navigator.mediaSession){ navigator.mediaSession.metadata = new MediaMetadata({title:t.title, artist:t.artist, artwork:t.art ? [{src:t.art, sizes:"150x150"}] : []}); } }catch(e){}
      keepAwake && keepAwake(true);
    };
    const next = d => { if(!W.list.length) return; let i = W.shuf ? Math.floor(Math.random() * W.list.length) : W.i + d; if(i >= W.list.length){ if(!W.rep) return; i = 0; } if(i < 0) i = W.list.length - 1; play(i); };
    a.addEventListener("playing", () => { tapAn(); if(W.ctx) W.ctx.resume().catch(() => {}); });
    a.addEventListener("ended", () => next(1));
    a.addEventListener("timeupdate", () => { $w("wampTime").textContent = fmt(a.currentTime); if(a.duration && !W.drag) $w("wampSeek").value = Math.round(a.currentTime / a.duration * 1000); });
    $w("wampSeek").addEventListener("input", () => { W.drag = true; }); $w("wampSeek").addEventListener("change", () => { W.drag = false; const d = E.d(); if(d) E.seek($w("wampSeek").value / 1000 * d); });
    $w("wampVol").addEventListener("input", e => { E.vol(e.target.value / 100); LS.set("wampVol", +e.target.value); });
    P.querySelector(".wCtl").addEventListener("click", e => { const b = e.target.closest("[data-w]"); if(!b) return; const k = b.dataset.w;
      if(k === "play"){ if(W.i < 0 && W.list.length) play(0); else if(E.paused()) E.play(); else E.pause(); }
      else if(k === "stop"){ E.pause(); try{ E.seek(0); }catch(x){} }
      else if(k === "next") next(1); else if(k === "prev") next(-1);
      else if(k === "shuf"){ W.shuf = !W.shuf; b.setAttribute("aria-pressed", String(W.shuf)); }
      else if(k === "rep"){ W.rep = !W.rep; b.setAttribute("aria-pressed", String(W.rep)); } });
    /* a rádio e o Winamp não tocam ao mesmo tempo */
    try{ const _pr = window.playRadio; if(typeof _pr === "function") window.playRadio = function(){ try{ a.pause(); ytP && ytP.pauseVideo && ytP.pauseVideo(); }catch(e){} return _pr.apply(this, arguments); }; }catch(e){}
    W.playing = () => isYt() ? ytState === 1 : (!a.paused && !a.ended && a.currentTime > 0);
    W.audio = a;

    /* --- mini espectro no visor --- */
    const sc = $w("wampSpec"), sg = sc.getContext("2d"); let fd = null;
    const spec = () => { requestAnimationFrame(spec); if(currentView !== "media" || document.hidden) return; sg.clearRect(0, 0, 150, 38);
      if(W.an && W.playing()){ fd = fd || new Uint8Array(W.an.frequencyBinCount); W.an.getByteFrequencyData(fd); for(let i = 0; i < 19; i++){ const v = fd[Math.floor(Math.pow(i / 19, 1.5) * 300) + 1] / 255, h = Math.max(1, v * 36); for(let y = 0; y < h; y += 3){ sg.fillStyle = y > 26 ? "#ff3c3c" : y > 18 ? "#f0c35a" : "#3cff5a"; sg.fillRect(i * 8, 37 - y, 6, 2); } } }
      else if(W.playing()){ const t = performance.now() / 160; for(let i = 0; i < 19; i++){ const h = 6 + 12 * Math.abs(Math.sin(t + i * 0.7)); for(let y = 0; y < h; y += 3){ sg.fillStyle = "#3cff5a"; sg.fillRect(i * 8, 37 - y, 6, 2); } } } };
    requestAnimationFrame(spec);

    /* --- letras (karaoke): lrclib.net, sincronizadas quando existem --- */
    async function loadLyrics(t){
      const id = t;
      try{
        let j = null;
        try{ j = await getJ("https://lrclib.net/api/get?artist_name=" + encodeURIComponent(t.artist) + "&track_name=" + encodeURIComponent(t.title) + (t.dur ? "&duration=" + Math.round(t.dur) : "")); }catch(e){}
        if(!j || !(j.syncedLyrics || j.plainLyrics)){ const r = await getJ("https://lrclib.net/api/search?q=" + encodeURIComponent(t.artist + " " + t.title)); j = (r || []).find(x => x.syncedLyrics) || (r || [])[0]; }
        if(W.cur !== id || !j) return;
        if(j.syncedLyrics){ const L = []; String(j.syncedLyrics).split(/\r?\n/).forEach(l => { const m = l.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/); if(m) L.push({t:+m[1] * 60 + +m[2], x:m[3]}); }); W.lyr = {sync:true, lines:L}; }
        else if(j.plainLyrics) W.lyr = {sync:false, lines:String(j.plainLyrics).split(/\r?\n/).filter(Boolean).map(x => ({t:0, x}))};
      }catch(e){}
    }
    /* linha atual e seguinte, para o robô cantar */
    W.lyricNow = () => { const L = W.lyr; if(!L || !L.lines.length || !W.playing()) return null; if(!L.sync) return null;
      const t = E.t() + 0.25; let k = -1; for(let i = 0; i < L.lines.length; i++){ if(L.lines[i].t <= t) k = i; else break; } return {cur:k >= 0 ? L.lines[k].x : "", next:L.lines[k + 1] ? L.lines[k + 1].x : ""}; };
  }catch(e){ console.log("winamp", e); }
})();
