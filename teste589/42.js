
(function(){
  if(window.ANDROID) return;
  try{
    const st = [{}, {}], drv = () => { try{ return typeof drivingEff === "function" && drivingEff(); }catch(e){ return false; } };
    const box = s => { try{ return slotBox(s); }catch(e){ return null; } };
    const ov = (s, on, html) => { const b = box(s); if(!b) return; let o = b.querySelector(".mirOv"); if(!on){ if(o) o.remove(); return; } if(!o){ o = document.createElement("div"); o.className = "mirOv"; b.appendChild(o); } if(o.dataset.h !== html){ o.dataset.h = html; o.innerHTML = html; } };
    const logo = s => { try{ const c = lastPlayed[s]; return c && c.logo ? '<img src="' + String(c.logo).replace(/"/g, "") + '" alt="" onerror="this.remove()">' : ""; }catch(e){ return ""; } };
    const name = s => { try{ return (lastPlayed[s] || {}).name || ""; }catch(e){ return ""; } };
    const stat = document.createElement("div"); stat.id = "mirStat"; stat.innerHTML = '<i></i><span></span>'; document.body.appendChild(stat);

    /* ouve as métricas que o leitor já regista */
    const _ev = window.__dbgEv;
    window.__dbgEv = function(slot, type, data){
      try{ if(typeof slot === "number" && st[slot]){ const S = st[slot];
        if(type === "imagem pela placa gráfica (bitmaprenderer)" && data) S.w = data.w;
        if(type === "andamento: imagem" && data){
          S.fps = data.fps; S.dec = data.descodificadas; S.at = Date.now();
          S.low = data.fps < 18 ? (S.low || 0) + 1 : 0;
          S.stuck = (data.fps < 1 && data.descodificadas >= 10) ? (S.stuck || 0) + 1 : 0;
          /* 1. imagem bloqueada: o descodificador produz imagens mas nenhuma chega ao ecrã → só som, com o logótipo */
          if(S.stuck >= 2){ if(!S.stuckOn){ S.stuckOn = true; toast("Em andamento o carro não está a mostrar a imagem de " + name(slot) + ". Fica só o som."); try{ _ev && _ev.call(this, slot, "andamento: imagem bloqueada, só som", {}); }catch(x){} } ov(slot, true, logo(slot) + '<div>🔊 Só som</div><small>O carro não está a mostrar a imagem em andamento. Volta quando parares ou quando a imagem recuperar.</small>'); }
          else if(S.stuckOn && data.fps > 5){ S.stuckOn = false; ov(slot, false); }
          /* 2. resolução adaptativa: abaixo de 18 imagens/s duas vezes, descodifica a metade da resolução */
          if(S.low >= 2 && !window.__mirShift1 && (S.w || 0) >= 1000 && drv()){ window.__mirShift1 = true; S.low = 0; try{ _ev && _ev.call(this, slot, "andamento: resolução reduzida para fluidez", {fps:data.fps, largura:S.w}); }catch(x){} toast("Imagem em andamento lenta: a reduzir a resolução para ficar mais fluida."); try{ stopMirror(slot); setTimeout(() => { try{ if(mirrorOn) startMirror(slot); }catch(x){} }, 300); }catch(x){} }
        } } }catch(e){}
      return _ev ? _ev.apply(this, arguments) : undefined;
    };

    /* 3. estado do andamento no ecrã + 5. segundo ecrã só som */
    let paused2 = -1;
    setInterval(() => { try{
      const on = drv() && typeof mirrorOn !== "undefined" && mirrorOn && (lastPlayed[0] || lastPlayed[1]);
      if(!drv() && window.__mirShift1) window.__mirShift1 = false;
      /* 5. com dois canais, só o do som descodifica a imagem */
      const both = on && lastPlayed[0] && lastPlayed[1], other = typeof audioSlot === "number" ? (audioSlot ? 0 : 1) : 1;
      if(both && paused2 !== other){ if(paused2 >= 0){ ov(paused2, false); try{ startMirror(paused2); }catch(e){} } paused2 = other; try{ stopMirror(other); }catch(e){} ov(other, true, logo(other) + '<div>Imagem em pausa</div><small>Em andamento só o ecrã com som mostra imagem, para poupar o processador.</small>'); }
      else if(!both && paused2 >= 0){ const p = paused2; paused2 = -1; ov(p, false); try{ if(mirrorOn && lastPlayed[p]) startMirror(p); }catch(e){} }
      if(!on){ stat.style.display = "none"; return; }
      /* v282: indicador de fps só no ecrã se a definição estiver ligada (o log continua a registar) */
      if(!(typeof cfg === "object" && cfg.showFps)){ stat.style.display = "none"; return; }
      const s = typeof audioSlot === "number" && lastPlayed[audioSlot] ? audioSlot : (lastPlayed[0] ? 0 : 1), S = st[s], c = lastPlayed[s] || {};
      let cls = "", txt = "Andamento: a preparar…";
      if(S.at && Date.now() - S.at < 25000){
        const uhd = /UHD|4K/i.test(String(c.name || "").normalize("NFKD")), why = uhd ? "H.265" : window.__mirShift1 ? "resolução reduzida" : (S.w || 0) >= 1000 ? "processador" : "rede ou processador";
        if(S.stuckOn){ cls = "blk"; txt = "Andamento bloqueado · só som"; }
        else if(S.fps >= 20){ txt = "Andamento disponível · " + Math.round(S.fps) + " img/s"; }
        else if(S.fps >= 8){ cls = "lim"; txt = "Andamento limitado · " + Math.round(S.fps) + " img/s · " + why; }
        else { cls = "blk"; txt = "Andamento quase parado · " + Math.round(S.fps) + " img/s · " + why; }
      }
      stat.className = cls; stat.querySelector("span").textContent = txt; stat.style.display = "flex";
    }catch(e){} }, 2000);

  }catch(e){ console.log("andamento v264", e); }
})();
