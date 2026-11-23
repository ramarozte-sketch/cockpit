
(function(){
  if(window.ANDROID) return;
  try{
  const sec = $("v-tvinicio"), hero = $("ahHero"); if(!sec || !hero) return;
  const setH = () => { try{ sec.style.setProperty("--ahHH", Math.round(hero.getBoundingClientRect().height) + "px"); }catch(e){} };
  const kbar = $("ahKindsBar"), setK = () => { try{ sec.style.setProperty("--ahKH", Math.round(kbar.getBoundingClientRect().height) + "px"); }catch(e){} };
  if(typeof ResizeObserver === "function"){ new ResizeObserver(setH).observe(hero); if(kbar) new ResizeObserver(setK).observe(kbar); } setH(); setK();
  hero.addEventListener("transitionend", setH);
  const scrolled = () => { const m = $("main"); return Math.max(m ? m.scrollTop : 0, window.scrollY || 0, (document.scrollingElement || {}).scrollTop || 0); };
  let raf = 0;
  const upd = () => { raf = 0;
    if(currentView !== "tvinicio"){ document.body.classList.remove("ahStuck"); return; }
    const y = scrolled(), on = document.body.classList.contains("ahStuck");
    if(!on && y > 140) document.body.classList.add("ahStuck");
    else if(on && y < 40) document.body.classList.remove("ahStuck");
  };
  document.addEventListener("scroll", () => { if(!raf) raf = requestAnimationFrame(upd); }, true);
  const _sh = window.show; window.show = function(){ const r = _sh.apply(this, arguments); try{ upd(); setH(); }catch(e){} return r; };
  }catch(e){ console.log("início fixo", e); }
})();
