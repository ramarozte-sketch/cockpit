
/* ===== Tesla: canal que carrega mas fica parado (sem imagem nem som, ex.: Sport TV 1/2) =====
   Os pedaços chegam ao leitor mas nada é descodificado. 1) salta para o início do que está no buffer;
   2) se continuar parado, abre o mesmo canal em .ts com o outro leitor (mpegts.js), fechando antes a ligação;
   3) se também não der, usa as alternativas habituais (outra versão/lista do canal). Só atua quando não há imagem nenhuma. */
(function(){
  if(window.ANDROID || !window.__TESLA) return;
  try{
  const S = [{}, {}], tsFrom = new Map();
  /* abre a versão .ts do mesmo canal (uma vez por canal); devolve true se mudou */
  window.__tTryTs = (slot, c) => {
    try{
      if(!c || c.kind !== "live" || !/\/live\/.+\.m3u8(\?|$)/i.test(c.url) || Date.now() - (tsFrom.get(c.url) || 0) < 120000 || Date.now() - (maintAt.get(c.url) || 0) < 600000) return false;
      const c2 = Object.assign({}, c, {url:c.url.replace(/\.m3u8(\?|$)/i, ".ts$1")}); tsFrom.set(c.url, Date.now());
      log(slot, "sem imagem: muda para .ts (mpegts.js)", {});
      toast(c.name + ": sem imagem pelo leitor HLS. A tentar o outro leitor…");
      try{ stopSlot(slot); }catch(e){}
      const sq = playSeq[slot]; setTimeout(() => { if(sq === playSeq[slot]) playChannel(c2, slot, true); }, 1000);
      return true;
    }catch(e){ return false; }
  };
  const log = (slot, t, d) => { try{ window.__dbgEv && window.__dbgEv(slot, t, d); }catch(e){} };
  setInterval(() => { [0, 1].forEach(slot => {
    try{
      const v = $("vid" + slot), c = lastPlayed && lastPlayed[slot];
      let st = S[slot];
      if(window.__sv && window.__sv.on(slot)){ S[slot] = {}; return; }
      if(!v || !c || c.kind !== "live" || (typeof mirrorOn !== "undefined" && mirrorOn) || drivingEff() || v.paused && v.readyState >= 3){ S[slot] = {}; return; }
      if(st.url !== c.url || st.seq !== playSeq[slot]){ S[slot] = st = {url:c.url, seq:playSeq[slot], since:0, step:0}; }
      const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null, frames = q ? q.totalVideoFrames : 0;
      const dec = (v.webkitVideoDecodedByteCount || 0) + (v.webkitAudioDecodedByteCount || 0);
      if(frames > 0 || dec > 0){ st.step = 9; return; }       /* está a descodificar: não mexe */
      if(st.step === 9) return;
      const h = hlsInst[slot];
      /* pedaços já entraram no leitor, mas o vídeo e o som não se sobrepõem no tempo: buffer «vazio» e parado sem erro */
      if(!(v.buffered && v.buffered.length)){
        if(h && h.__fbAt && v.readyState < 2 && !st.noOverlap && Date.now() - h.__fbAt > 6000){
          st.noOverlap = true; st.step = 2;
          log(slot, "parado: som e vídeo não se sobrepõem", {faixas:window.__trackBuf ? window.__trackBuf(h) : null});
          if(window.__tDecodeFail) window.__tDecodeFail(slot, c, "sem imagem", () => true);
        }
        return;
      }
      if(!st.since){ st.since = Date.now(); return; }
      const el = Date.now() - st.since;
      if(st.step === 0 && el > 7000){
        st.step = 1; const b = v.buffered, i = b.length - 1, ct = v.currentTime; let inside = false;
        for(let k = 0; k < b.length; k++) if(ct >= b.start(k) && ct < b.end(k)) inside = true;
        const to = inside ? Math.min(b.end(i) - 0.5, ct + 0.3) : b.start(i) + 0.2;
        log(slot, "parado: salto no buffer", {de:+ct.toFixed(1), para:+to.toFixed(1), buffer:window.__bufStr ? window.__bufStr(v) : ""});
        try{ v.currentTime = to; v.play().catch(() => {}); }catch(e){}
        return;
      }
      if(st.step === 1 && el > 14000){
        st.step = 2; log(slot, "parado: sem imagem nem som", {});
        if(window.__tDecodeFail) window.__tDecodeFail(slot, c, "sem imagem", () => true);
      }
    }catch(e){}
  }); }, 1000);
  }catch(e){ console.log("tesla parado", e); }
})();
