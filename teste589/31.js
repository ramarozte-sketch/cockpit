
/* ===== Silenciar/repor o som (canais, filmes, rádio…) e som sempre ativo no Tesla ===== */
(() => { try{
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "muted");
  window.__muteAll = false;
  const media = () => [...document.querySelectorAll("video,audio")].filter(e => !e._noAmp);
  /* qualquer parte da app que mande calar/falar continua a funcionar; com «sem som» ativo fica sempre calado */
  if(d && d.set) Object.defineProperty(HTMLMediaElement.prototype, "muted", {configurable:true, enumerable:d.enumerable, get:d.get, set(v){ if(!this._noAmp) this._want = !!v; d.set.call(this, (window.__muteAll || this._nat) && !this._noAmp ? true : !!v); }});
  /* v213: o que o utilizador quer (calado ou não), mesmo quando o som do leitor do carro está desligado para dar lugar ao som por software */
  window.__wantMuted = el => !!(window.__muteAll || (el && el._want !== undefined ? el._want : (el && el.muted)));
  const labels = () => { const m = window.__muteAll; ["btnMute", "chMute"].forEach(id => { const b = document.getElementById(id); if(b){ b.textContent = m ? "🔇 Sem som" : "🔊 Som"; b.setAttribute("aria-pressed", m ? "true" : "false"); } }); };
  window.__setMute = on => {
    on = !!on; if(on === window.__muteAll) return;
    if(on) media().forEach(e => { if(e._want === undefined) e._want = e.muted; });
    window.__muteAll = on;
    media().forEach(e => { try{ d.set.call(e, on ? true : (e._want !== undefined ? e._want : e.defaultMuted)); }catch(x){} });
    labels(); try{ toast(on ? "Som desligado" : "Som ligado"); }catch(x){}
  };
  ["btnMute", "chMute"].forEach(id => { const b = document.getElementById(id); if(b) b.addEventListener("click", e => { e.stopPropagation(); window.__setMute(!window.__muteAll); }); });
  document.addEventListener("keydown", e => { if((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "") && !(e.target && e.target.isContentEditable)) window.__setMute(!window.__muteAll); });
  /* um canal novo recomeça a tocar: mantém o silêncio escolhido */
  document.addEventListener("loadstart", e => { if(window.__muteAll && e.target instanceof HTMLMediaElement && !e.target._noAmp) try{ d.set.call(e.target, true); }catch(x){} }, true);
  labels();

  /* --- Tesla: entre canais o <video> pára um instante e o carro volta ao rádio. Um som inaudível em ciclo mantém o Cockpit como fonte ativa --- */
  if(window.__TESLA){
    const KA = {el:null, last:0};
    const mk = () => {
      const sr = 8000, n = sr, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, t) => { for(let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
      w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
      for(let i = 0; i < n; i++) v.setInt16(44 + i * 2, (Math.random() * 3 | 0) - 1, true);   /* ruído de ±1 em 32768 (-90 dB): inaudível, mas não é silêncio digital */
      const a = new Audio(URL.createObjectURL(new Blob([b], {type:"audio/wav"}))); a.loop = true; a._noAmp = true; a.preload = "auto"; a.setAttribute("data-keepalive", "1"); return a; };
    const on = () => (typeof cfg === "undefined" || cfg.keepAudio !== false);
    const others = () => media().some(e => !e.paused && !e.ended && e.readyState >= 2);
    const vis = () => document.visibilityState !== "hidden";
    const start = () => { if(!on()) return; if(!KA.el){ KA.el = mk();
        /* v287: se o carro/sistema pausar o som de manutenção com o Cockpit à vista, volta a ligá-lo logo (senão o carro volta ao rádio) */
        KA.el.addEventListener("pause", () => { setTimeout(() => { try{ if(on() && vis() && KA.el.paused && !KA.off) start(); }catch(x){} }, 250); }); }
      KA.last = Date.now(); KA.off = false;
      if(KA.el.paused) KA.el.play().then(() => { try{ if(navigator.mediaSession){ navigator.mediaSession.playbackState = "playing"; if(!navigator.mediaSession.metadata && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({title:"Cockpit", artist:"Cockpit"}); } }catch(x){} }).catch(() => {}); };
    document.addEventListener("playing", e => { if(e.target instanceof HTMLMediaElement && !e.target._noAmp) start(); }, true);
    /* v287: o Cockpit passa a ser a fonte de som logo ao primeiro toque, sem esperar por um vídeo (antes o rádio podia ligar enquanto se navegava nos menus) */
    ["pointerdown", "touchstart", "keydown", "click"].forEach(t => document.addEventListener(t, () => { if(!KA.el || KA.el.paused) start(); }, {capture:true, passive:true}));
    document.addEventListener("visibilitychange", () => { if(vis()) start(); });
    setInterval(() => {
      if(!on()){ if(KA.el && !KA.el.paused){ KA.off = true; KA.el.pause(); } return; }
      if(!KA.el) return;
      if(KA.el.paused){ if(vis() && !KA.off && KA.el.readyState >= 0) start(); return; }
      if(others()) KA.last = Date.now();
      else if(!vis() && Date.now() - KA.last > 30000){ KA.off = true; KA.el.pause(); }   /* só larga o som se o Cockpit estiver escondido há mais de 30 s; com o Cockpit à vista mantém-no sempre */
    }, 2000);
    window.__keepAlive = KA;
  }
  setTimeout(() => { try{
    const card = [...document.querySelectorAll("#v-settings .setcard")].find(e => ((t => t === "Reprodução" || t === "TV e IPTV")(((e.querySelector("h2") || {}).textContent || "").trim()))); if(!card) return;
    const l = document.createElement("label"); l.className = "row small"; l.innerHTML = '<input type="checkbox" id="setKeepAudio"> Tesla: manter o som ativo entre canais (evita que o rádio do carro ligue)';
    card.appendChild(l); const c = document.getElementById("setKeepAudio"); c.checked = cfg.keepAudio !== false; c.onchange = () => { cfg.keepAudio = c.checked; saveCfg(); toast(c.checked ? "Som sempre ativo ligado" : "Som sempre ativo desligado"); };
  }catch(e){} }, 0);
}catch(e){ console.log("silenciar", e); } })();
