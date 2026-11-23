
/* modo Andamento: distingue a pausa feita por ti (toque) da pausa imposta pelo carro */
(function(){
  ["vid0", "vid1"].forEach((id, slot) => { const v = $(id); if(!v) return;
    v.addEventListener("pause", () => { const st = MIR[slot]; if(st) st.userPaused = !!(navigator.userActivation && navigator.userActivation.isActive); });
    v.addEventListener("play", () => { const st = MIR[slot]; if(st) st.userPaused = false; });
  });
})();
