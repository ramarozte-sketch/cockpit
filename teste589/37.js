
(function(){
  if(window.ANDROID) return;
  /* --- interface escura do pôr ao nascer do sol (casa do Rui nas Definições; sem casa: Portugal continental) --- */
  try{
    const dim = document.createElement("div"); dim.id = "nightDim"; document.body.appendChild(dim);
    const sun = (lat, lon, d) => {   /* nascer e pôr do sol (algoritmo NOAA simplificado), em horas UTC */
      const rad = Math.PI / 180, N = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
      const g = 2 * Math.PI / 365 * (N - 1);
      const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
      const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
      const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(dec)) - Math.tan(lat * rad) * Math.tan(dec)) / rad;
      return {rise:(720 - 4 * (lon + ha) - eq) / 60, set:(720 - 4 * (lon - ha) - eq) / 60};
    };
    const night = () => {
      try{
        const m = cfg.nightUi || "auto"; let on = false;
        if(m === "on") on = true;
        else if(m === "auto"){ const lat = +cfg.homeLat || 38.7, lon = +cfg.homeLon || -9.1, d = new Date(), s = sun(lat, lon, d), h = d.getUTCHours() + d.getUTCMinutes() / 60; on = !(h > s.rise && h < s.set); }
        document.documentElement.classList.toggle("nightUi", on);
      }catch(e){}
    };
    window.__night = night; night(); setInterval(night, 60000);
  }catch(e){ console.log("noite", e); }

  /* --- ao abrir o Cockpit, continuar o último canal ou filme --- */
  try{
    if(cfg.resumeOpen){
      const L = LS.get("last0", null);
      if(L && L.url){
        let n = 0;
        const t = setInterval(() => {
          try{
            if(++n > 90){ clearInterval(t); return; }
            if(n < 4 || (lastPlayed[0] || lastPlayed[1])){ if(lastPlayed[0] || lastPlayed[1]) clearInterval(t); return; }
            const all = [...(channels || []), ...(typeof freeChans !== "undefined" ? freeChans : [])];
            const c = all.find(x => x && x.url === L.url); if(!c) return;
            clearInterval(t);
            if(typeof tvBlocked === "function" && tvBlocked(c)) return;
            show(c.kind === "live" && typeof cfg.tvHome !== "undefined" && cfg.tvHome === "classic" ? "tv" : (c.kind === "live" ? "tvinicio" : "tv"));
            toast("A continuar " + c.name + "…");
            (window.__oneConn || window.playChannel)(c, 0);
          }catch(e){ clearInterval(t); }
        }, 1000);
      }
    }
  }catch(e){ console.log("retomar ao abrir", e); }
})();
