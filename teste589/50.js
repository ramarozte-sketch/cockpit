
/* v583: medidor de desempenho do jogo. Mostra o ritmo do ecrã e as pausas longas da página, que o emulador partilha com o Cockpit. Só aparece com o emulador aberto. */
(function(){
  if (window.__perfOn) return; window.__perfOn = true;
  const box = document.createElement("div");
  box.id = "emuPerf";
  box.style.cssText = "position:fixed;right:10px;top:10px;z-index:9500;padding:4px 8px;border-radius:8px;background:#000b;color:#9ef;font:600 13px/1.3 monospace;pointer-events:none;display:none";
  document.body.appendChild(box);
  let frames = 0, last = performance.now(), stalls = 0, worst = 0;
  try{ new PerformanceObserver(list => { for (const e of list.getEntries()){ stalls++; if (e.duration > worst) worst = e.duration; } }).observe({entryTypes:["longtask"]}); }catch(e){}
  function tick(now){
    frames++;
    const dt = now - last;
    if (dt >= 1000){
      const w = document.getElementById("emuWin");
      const on = !!w && getComputedStyle(w).display !== "none";
      box.style.display = on ? "block" : "none";
      if (on) box.textContent = "FPS " + Math.round(frames * 1000 / dt) + " · pausas " + stalls + " · máx " + Math.round(worst) + " ms";
      frames = 0; last = now; stalls = 0; worst = 0;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
