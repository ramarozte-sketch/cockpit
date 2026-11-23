
/* ===== Uma ligação de cada vez: fecha o vídeo anterior e a pré-visualização, espera um instante, e só depois abre o canal novo ===== */
(function(){
  if(window.ANDROID) return;
  let tk = 0;
  window.__oneConn = function(c, slot){
    slot = slot == null ? tvTarget : slot;
    const my = ++tk;
    /* v398: a conta tem uma só ligação: fecha as duas saídas de vídeo (não só a escolhida) antes de abrir a nova */
    let busy = false;
    try{ for(const s of [0, 1]){ const v = $("vid" + s); if(hlsInst[s] || tsInst[s] || dashInst[s] || (v && (v.currentSrc || v.getAttribute("src")))){ busy = true; stopSlot(s); } } }catch(e){}
    try{ if(window.__ahPrevStop){ const pv = document.querySelector(".ahPrev"); if(pv){ busy = true; } window.__ahPrevStop(); } }catch(e){}
    /* espera o que falta desde o último fecho (900 ms no mínimo; 3 s entre ligações de ficheiro) */
    const since = Date.now() - (window.__connCloseAt || 0);
    const wait = (busy || since < 3000) && !c.free ? Math.max(busy ? 900 : 0, 3000 - since) : 0;
    const go = () => { if(my === tk) window.playChannel(c, slot); };
    wait ? setTimeout(go, wait) : go();
  };
})();
