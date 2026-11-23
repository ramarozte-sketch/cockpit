
/* ===== Direto parado: se o canal em direto não avança durante 15 s (o fornecedor falhou a lista e os tempos saltaram), volta a abri-lo sozinho ===== */
(function(){
  if(window.ANDROID) return;
  const W = [null, null], dbg = (slot, t, d) => { try{ window.__dbgEv && window.__dbgEv(slot, t, d); }catch(e){} };
  setInterval(() => { try{
    [0, 1].forEach(slot => {
      const v = document.getElementById("vid" + slot), c = lastPlayed[slot], h = hlsInst[slot];
      if(!v || !c || !c.url || /^(movie|series|episode|vod)$/.test(c.kind || "") || document.hidden || v.paused || v.seeking || (!h && !tsInst[slot])){ W[slot] = null; return; }
      const now = Date.now(); let w = W[slot];
      if(!w || w.url !== c.url){ w = W[slot] = {url:c.url, t:v.currentTime, at:now, n:0, since:now}; return; }
      /* v241: canal UHD/4K que em 8 s não tem nada no buffer: o fornecedor não o emite; passa logo para a versão H.264 (sem esperar 15 s) */
      if(!w.alt && now - w.since > 8000 && !v.buffered.length && /UHD|4K/i.test(String(c.name).normalize("NFKD"))){
        const sib = window.__h264Sib(c);
        if(sib){ w.alt = 1; dbg(slot, "sem dados em 8 s: para a versão H.264", {de:c.name, para:sib.name}); try{ toast("Sem sinal em " + c.name + ": a abrir " + sib.name); }catch(e){} window.playChannel(sib, slot); return; }
      }
      if(Math.abs(v.currentTime - w.t) > 0.05){ if(w.n && now - w.rs > 20000) w.n = 0; w.t = v.currentTime; w.at = now; return; }
      if(now - w.at < 15000 || v.readyState >= 4) return;
      if(w.n >= 2) return;                                     /* no máximo 2 reinícios seguidos por canal */
      /* v235: canal (ex. RTP 1 UHD, Eleven Sports 3 UHD) que não entrega NENHUM dado em 15 s: o fornecedor não está a emitir esta versão. Passa para a versão H.264 do mesmo canal, se existir. */
      try{
        if(!w.alt && !v.buffered.length){
          const sib = window.__h264Sib(c);
          if(sib){ w.alt = 1; dbg(slot, "sem dados: para a versão H.264", {de:c.name, para:sib.name}); try{ toast("Sem sinal em " + c.name + ": a abrir " + sib.name); }catch(e){} window.playChannel(sib, slot); return; }
        }
      }catch(e){}
      w.n++; w.rs = now; w.at = now;
      dbg(slot, "reinício automático: direto parado", {parado_s:15, buf:(function(){ let o = []; for(let i = 0; i < v.buffered.length; i++) o.push(v.buffered.start(i).toFixed(0) + "-" + v.buffered.end(i).toFixed(0)); return o.join(" "); })(), vez:w.n});
      try{ window.playChannel(c, slot, true); }catch(e){}
    });
  }catch(e){} }, 3000);
})();
