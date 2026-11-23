
/* ===== Tesla: pré-visualização do último canal no destaque do Início (sem som) ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const on = () => cfg.tvHomePrev !== false;
  const P = {c:null, h:null, v:null, cv:null, raf:0, t:0, mode:""};
  const isLive = c => c && !/^(movie|series|episode|vod)$/.test(c.kind || "") && !/\/(movie|series)\//.test(c.url || "");
  const curCh = () => { try{ const a = (lastPlayed && (lastPlayed[0] || lastPlayed[1])) || (LS.get("tvRecent", []) || [])[0]; return isLive(a) ? a : null; }catch(e){ return null; } };
  const art = () => document.querySelector("#ahHero .ahHeroArt");
  const stop = () => {
    cancelAnimationFrame(P.raf); P.raf = 0;
    try{ window.__sv && window.__sv.stop("prev"); }catch(e){}
    try{ if(P.h){ P.h.destroy(); } }catch(e){} P.h = null;
    try{ if(P.v){ P.v.removeAttribute("src"); P.v.load(); P.v.remove(); } }catch(e){} P.v = null;
    try{ if(P.cv) P.cv.remove(); }catch(e){} P.cv = null;
    const a = art(); if(a) a.classList.remove("prev");
    P.c = null; P.mode = "";
  };
  window.__ahPrevStop = stop;
  const srcOf = c => {
    let u = String(c.url || "");
    if(/\/live\//.test(u)) u = u.replace(/\.ts(\?|$)/i, ".m3u8$1");
    if(!/\.m3u8(\?|#|$)/i.test(u) && /\.(ts|mp4|mkv|flv)(\?|$)/i.test(u)) return "";
    const ref = typeof refFor === "function" ? refFor(c) : "";
    const viaProxy = !(DIRECT_VIDEO() || (c.free && /^https:/i.test(u) && HASPX()));
    return cfg.directMode ? directUrl(u) : cfg.proxy2 ? px2(u, ref, c.free) : viaProxy ? px(u, ref, c.free) : u;
  };
  /* o leitor principal ainda tem este canal carregado (a dar ou em pausa): usa a imagem dele, sem abrir outra ligação */
  const mainPlaying = c => { for(const s of [0, 1]){ const v = $("vid" + s); if(lastPlayed[s] && lastPlayed[s].url === c.url && v && (v.currentSrc || hlsInst[s] || tsInst[s]) && v.readyState >= 2) return v; } return null; };
  const start = () => {
    const a = art(), c = curCh(); if(!a || !c){ stop(); return; }
    if(P.c && P.c.url === c.url && a.contains(P.v || P.cv)) return;
    stop(); P.c = c;
    const mv = mainPlaying(c);
    if(mv){   /* o canal já está a dar: copia a imagem, sem abrir outra ligação */
      const cv = P.cv = document.createElement("canvas"); cv.className = "ahPrev"; a.appendChild(cv);
      const g = cv.getContext("2d"); P.mode = "copy";
      const draw = () => { if(!P.cv) return; try{ const sl = mv.id === "vid1" ? 1 : 0, sv = window.__sv && window.__sv.on(sl) ? window.__sv.last(sl) : null; if(sv){ if(cv.width !== 480){ cv.width = 480; cv.height = 270; } g.drawImage(sv, 0, 0, 480, 270); cv.classList.add("on"); a.classList.add("prev"); } else if(mv.videoWidth){ if(cv.width !== 480){ cv.width = 480; cv.height = 270; } g.drawImage(mv, 0, 0, 480, 270); cv.classList.add("on"); a.classList.add("prev"); } }catch(e){} P.raf = requestAnimationFrame(draw); };
      draw(); return;
    }
    const src = srcOf(c); if(!src || !window.Hls || !Hls.isSupported()) return;
    const v = P.v = document.createElement("video"); v.className = "ahPrev"; v.muted = true; v.playsInline = true; v.setAttribute("muted", ""); a.appendChild(v);
    P.seqN = (P.seqN || 0) + 1;
    const PL = (() => { try{ const B = Hls.DefaultConfig.loader; return class extends B { load(ctx, cf, cb){ const os = cb.onSuccess; cb = Object.assign({}, cb, {onSuccess:(r, s2, cx, n) => { try{ const d0 = r && r.data; if(d0 && d0.byteLength > 752 && ctx && /frag/i.test(ctx.type || "frag")){ const u = d0 instanceof ArrayBuffer ? new Uint8Array(d0) : new Uint8Array(d0.buffer, d0.byteOffset, d0.byteLength); if(u[0] === 0x47 && typeof __tsFixFn === "function"){ const rr = __tsFixFn(u); if(window.__sv && window.__sv.hookPrev) window.__sv.hookPrev(P, u, rr); } } }catch(e){} os(r, s2, cx, n); }}); return super.load(ctx, cf, cb); } }; }catch(e){ return undefined; } })();
    const h = P.h = new Hls({...(PL ? {fLoader:PL} : {}), startLevel:0, capLevelToPlayerSize:true, maxBufferLength:6, maxMaxBufferLength:10, backBufferLength:0, enableWorker:true, manifestLoadingMaxRetry:1, levelLoadingMaxRetry:1, fragLoadingMaxRetry:2});
    P.mode = "hls";
    h.on(Hls.Events.MANIFEST_PARSED, () => { v.play().catch(() => {}); });
    h.on(Hls.Events.ERROR, (e, d) => { if(d && d.fatal) stop(); });
    v.addEventListener("playing", () => { v.classList.add("on"); a.classList.add("prev"); });
    h.loadSource(src); h.attachMedia(v);
  };
  /* abrir qualquer canal: larga primeiro a ligação da pré-visualização (muitas contas só permitem uma) */
  const _pc = window.playChannel;
  window.playChannel = function(){ if(P.mode === "hls") stop(); return _pc.apply(this, arguments); };
  /* liga só com o Início à vista, parado e com a opção ativa */
  setInterval(() => {
    let want = false;
    try{ want = on() && currentView === "tvinicio" && !document.hidden && !tvBlocked() && !!art() && !window.__ahStageIn; }catch(e){}
    if(!want){ if(P.c) stop(); return; }
    if(Date.now() - P.t > 700){ P.t = Date.now(); start(); }
    const tag = art(); if(tag && !tag.querySelector(".ahLive")){ const s = document.createElement("span"); s.className = "ahLive"; s.textContent = "AO VIVO"; tag.appendChild(s); }
  }, 1000);
  document.addEventListener("visibilitychange", () => { if(document.hidden) stop(); });
  /* Definições */
  const w = $("ahSet");
  if(w){
    const l = document.createElement("label"); l.className = "row small"; l.style.marginTop = "6px";
    l.innerHTML = '<input type="checkbox" id="ahSetPrev"> Pré-visualização do último canal no Início, sem som (usa uma ligação ao servidor enquanto o Início está aberto)';
    w.appendChild(l); const cb = $("ahSetPrev"); cb.checked = on();
    cb.onchange = () => { cfg.tvHomePrev = cb.checked; saveCfg(); if(!cb.checked) stop(); };
  }
  }catch(e){ console.log("pré-visualização", e); }
})();
