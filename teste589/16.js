
/* ===== Tesla: compatibilidade de vídeo e som ===== */
(function(){
  if(window.ANDROID) return;
  try{
  if(window.__TESLA){
  /* 1) O browser recusou começar com som (sem toque do utilizador): começa sem som e mostra um botão para ativar */
  const st = $("stage"), ub = document.createElement("button"); ub.id = "vUnmute"; ub.type = "button"; ub.hidden = true; ub.textContent = "🔇 Toca para ativar o som"; st.appendChild(ub);
  ub.onclick = e => { e.stopPropagation(); const v = $("vid" + audioSlot); try{ v.muted = false; v.volume = (window.__vg && window.__vg.v) || 1; v.play().catch(() => {}); }catch(x){} ub.hidden = true; };
  const kick = slot => {
    const v = $("vid" + slot); if(!v || !lastPlayed[slot] || !v.paused || v.ended || v.readyState < 2) return;
    v.play().catch(err => {
      if(!err || err.name !== "NotAllowedError") return;
      v.muted = true; v.play().then(() => { if(slot === audioSlot) ub.hidden = false; }).catch(() => {});
    });
  };
  const _pc = window.playChannel;
  window.playChannel = function(c, slot){ const sl = slot == null ? tvTarget : slot; ub.hidden = true; const r = _pc.apply(this, arguments); [1500, 4000, 8000].forEach(t => setTimeout(() => kick(sl), t)); return r; };
  ["vid0", "vid1"].forEach((id, sl) => { const v = $(id); if(v) v.addEventListener("volumechange", () => { if(sl === audioSlot && !v.muted) ub.hidden = true; }); });

  /* 2) Voltar à página (ou ao separador): retoma o direto, perto do momento atual */
  document.addEventListener("visibilitychange", () => {
    if(document.hidden) return;
    [0, 1].forEach(sl => { try{
      const c = lastPlayed[sl], v = $("vid" + sl); if(!c || !v || c.kind !== "live") return;
      const h = hlsInst[sl];
      if(h && h.liveSyncPosition && v.currentTime < h.liveSyncPosition - 20) v.currentTime = h.liveSyncPosition;
      else if(!h && v.buffered && v.buffered.length){ const end = v.buffered.end(v.buffered.length - 1); if(end - v.currentTime > 12) v.currentTime = end - 2; }
      if(v.paused) v.play().catch(() => {});
    }catch(e){} });
  });

  /* 3) Leitor dos canais .ts carregado em segundo plano, para esses canais abrirem mais depressa */
  setTimeout(() => { try{ if(typeof loadMpegts === "function") loadMpegts(); }catch(e){} }, 9000);
  }

  /* 4) O que este browser consegue descodificar (aparece no Diagnóstico) */
  const sup = t => { try{ return !!(window.MediaSource && MediaSource.isTypeSupported(t)); }catch(e){ return false; } };
  window.__codecs = () => {
    const ok = (n, t) => n + " " + (sup(t) ? "✓" : "✗");
    return [ok("H.264", 'video/mp4; codecs="avc1.640028"'), ok("HEVC", 'video/mp4; codecs="hvc1.1.6.L120.90"'), ok("VP9", 'video/webm; codecs="vp9"'), ok("AV1", 'video/mp4; codecs="av01.0.05M.08"'),
      ok("AAC", 'audio/mp4; codecs="mp4a.40.2"'), ok("MP3", 'audio/mpeg'), ok("Opus", 'audio/webm; codecs="opus"'), ok("AC-3", 'audio/mp4; codecs="ac-3"'), ok("E-AC-3", 'audio/mp4; codecs="ec-3"')].join(" · ")
      + " · MSE " + (window.MediaSource ? "✓" : "✗") + " · leitor .ts " + (window.mpegts ? "✓" : "a carregar");
  };
  }catch(e){ console.log("compatibilidade", e); }
})();
