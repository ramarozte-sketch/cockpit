
setTimeout(() => { try{
  const card = [...document.querySelectorAll("#v-settings .setcard")].find(e => ((t => t === "Reprodução" || t === "TV e IPTV")(((e.querySelector("h2")||{}).textContent||"").trim())));
  if(!card) return;
  const l = document.createElement("label"); l.className = "f";
  l.innerHTML = 'Som Dolby (AC-3 / E-AC-3)<select id="setEac3"><option value="auto">Automático (hardware quando existir, senão software)</option><option value="sw">Sempre por software (libav — compatível com tudo)</option></select>';
  card.appendChild(l);
  const sel = document.getElementById("setEac3"), info = document.createElement("p");
  info.className = "small muted"; info.style.margin = "4px 0 0"; card.appendChild(info);
  const paint = async () => { await probeHardwareEac3();
    info.textContent = HW.eac3
      ? "Este dispositivo tem descodificador E-AC3 (" + HW.why + "). Modo atual: " + (cfg.eac3Mode || "auto") + "."
      : "Este dispositivo não tem descodificador E-AC3 — o Cockpit usa o libav (software)."; };
  sel.value = cfg.eac3Mode === "sw" ? "sw" : "auto";
  sel.onchange = () => { cfg.eac3Mode = sel.value; saveCfg(); paint();
    try{ const c = lastPlayed[tvTarget]; if(c && c.kind === "live") window.__oneConn(c, tvTarget); }catch(e){} };
  paint();
  const _fs = window.fillSettings; if(typeof _fs === "function") window.fillSettings = function(){ const r = _fs.apply(this, arguments); try{ sel.value = cfg.eac3Mode === "sw" ? "sw" : "auto"; paint(); }catch(e){} return r; };
}catch(e){} }, 0);
