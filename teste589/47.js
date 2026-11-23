
(function(){
  if(window.ANDROID) return;
  /* ---------- servidor IPTV: verifica a conta quando um canal falha (e de 5 em 5 min enquanto estiver em baixo) ---------- */
  try{
    const bar = document.createElement("div"); bar.id = "srvDown"; bar.innerHTML = '<span id="srvTxt"></span><button id="srvRe">Testar de novo</button><button id="srvX" aria-label="Fechar">×</button>'; document.body.appendChild(bar);
    const host = () => { try{ return new URL(xBase()).host; }catch(e){ return "servidor IPTV"; } };
    let down = false, checking = false, lastCheck = 0, hidden = 0;
    const probe = async (why) => {
      if(checking || !(cfg.xs && cfg.xu && cfg.xp)) return null; checking = true; lastCheck = Date.now();
      let ok = false, reason = "";
      try{ const ac = new AbortController(), to = setTimeout(() => ac.abort(), 12000);
        const r = await fetchPx(xBase() + "/player_api.php?" + xQ(), {signal:ac.signal}); clearTimeout(to);
        if(r.ok){ const j = await r.json().catch(() => null); const ui = j && j.user_info; if(ui && (ui.auth === 1 || ui.auth === "1") && !/expired|disabled|banned/i.test(ui.status || "")) ok = true; else reason = ui ? "a conta responde «" + (ui.status || "sem acesso") + "»" : "o servidor respondeu sem dados da conta"; }
        else reason = "o servidor respondeu com erro " + r.status;
      }catch(e){ reason = e.name === "AbortError" ? "o servidor não respondeu em 12 s" : "não foi possível ligar ao servidor"; }
      checking = false;
      try{ window.__dbgEv && window.__dbgEv(0, "verificação do servidor IPTV", {ok, servidor:host(), motivo:reason || "", porque:why || ""}); }catch(e){}
      set(!ok, reason); return ok;
    };
    const set = (isDown, reason) => {
      const was = down; down = isDown;
      if(isDown){ document.getElementById("srvTxt").textContent = "⚠️ O servidor IPTV (" + host() + ") não está a funcionar: " + reason + ". Não é um problema do Cockpit nem do carro."; if(Date.now() > hidden) bar.classList.add("on"); if(!was){ toast("O servidor IPTV não está a funcionar.", true); try{ window.__avatarSay && window.__avatarSay("Rui, o servidor da televisão não está a responder. Não é do carro."); }catch(e){} } }
      else { bar.classList.remove("on"); if(was) toast("✅ O servidor IPTV voltou a funcionar."); }
    };
    window.__srvProbe = probe;
    document.getElementById("srvRe").onclick = () => { document.getElementById("srvTxt").textContent = "A testar o servidor…"; probe("manual"); };
    document.getElementById("srvX").onclick = () => { bar.classList.remove("on"); hidden = Date.now() + 10 * 60000; };
    /* quando uma tentativa falha (registo do leitor), testa a conta — no máximo de 1 em 1 min */
    const _ev = window.__dbgEv;
    window.__dbgEv = function(slot, type, data){
      try{ if(/^(erro HLS|erro \.ts|sem dados|filme sem dados|reinício automático)/.test(type) && Date.now() - lastCheck > 60000){ const c = lastPlayed && lastPlayed[slot]; if(c && !c.free && /\/(live|movie|series)\//.test(c.url || "")) setTimeout(() => probe(type), 1500); } }catch(e){}
      return _ev ? _ev.apply(this, arguments) : undefined;
    };
    setInterval(() => { if(down && Date.now() - lastCheck > 5 * 60000) probe("repetição"); }, 30000);
    setTimeout(() => probe("arranque"), 9000);
  }catch(e){ console.log("servidor em baixo", e); }

  /* ---------- botão Parar nos canais ---------- */
  try{
    /* v361: Parar pára tudo (os dois ecrãs, rádio, motor) e cancela o regresso automático ao Início/Explorar */
    const stopTv = () => { try{ window.__fsFromHome = false; window.__fsLeave_skip = true; stopAllPlayback(); LS.set("last0", null); LS.set("last1", null); updateCinemaBar(); if(document.body.classList.contains("pfull") && window.__fsLeave) window.__fsLeave(); window.__fsLeave_skip = false; try{ window.__ahPrevStop && window.__ahPrevStop(); }catch(e){} toast("⏹ Parado."); }catch(e){} };
    window.__tvStop = stopTv;
    const prevB = document.getElementById("chPrev");
    if(prevB){ const b = document.createElement("button"); b.className = "btn"; b.id = "chStop"; b.setAttribute("aria-label", "Parar o canal"); b.textContent = "⏹ Parar"; prevB.parentNode.insertBefore(b, prevB); b.onclick = e => { e.stopPropagation(); stopTv(); }; }
    const hb = document.getElementById("halfBar");
    if(hb){ const b = document.createElement("button"); b.dataset.a = "stop"; b.setAttribute("aria-label", "Parar"); b.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>'; hb.insertBefore(b, hb.children[1]); b.addEventListener("click", e => { e.stopPropagation(); stopTv(); }, true); }
    /* Início: botão Parar no destaque quando há um canal a dar */
    setInterval(() => { try{ const h = document.querySelector("#ahHero .ahHeroBt"); if(!h) return; let b = h.querySelector(".ahStop"); const on = !!(lastPlayed[0] || lastPlayed[1]);
      if(on && !b){ b = document.createElement("button"); b.className = "ahBtn ahStop"; b.textContent = "⏹ Parar"; b.onclick = e => { e.stopPropagation(); e.preventDefault(); stopTv(); try{ window.__ah && window.__ah.render && window.__ah.render(true); }catch(x){} }; h.appendChild(b); }
      else if(!on && b) b.remove(); }catch(e){} }, 1000);
  }catch(e){ console.log("parar canal", e); }
})();
