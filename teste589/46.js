
(function(){
  if(window.ANDROID) return;
  if(!navigator.getGamepads) return;
  try{
    const tag = document.createElement("div"); tag.id = "gpTag"; document.body.appendChild(tag);
    /* botões do comando normal (Xbox / PlayStation / 8BitDo) → teclas que os jogos do Cockpit já usam */
    const P1 = {12:["ArrowUp","ArrowUp"], 13:["ArrowDown","ArrowDown"], 14:["ArrowLeft","ArrowLeft"], 15:["ArrowRight","ArrowRight"], 0:[" ","Space"], 1:["Enter","Enter"], 2:["x","KeyX"], 3:["z","KeyZ"], 4:["q","KeyQ"], 5:["e","KeyE"], 8:["r","KeyR"], 9:["Enter","Enter"], 16:["Escape","Escape"]};
    const P2 = {12:["w","KeyW"], 13:["s","KeyS"], 14:["a","KeyA"], 15:["d","KeyD"], 0:["f","KeyF"], 1:["g","KeyG"], 2:["c","KeyC"], 3:["v","KeyV"], 9:["Enter","Enter"]};
    const NAMES = ["A","B","X","Y","LB","RB","LT","RT","Select","Start","L3","R3","↑","↓","←","→","Home"];
    const prev = {};
    const key = (type, k, code) => { try{ const ev = new KeyboardEvent(type, {key:k, code, bubbles:true, cancelable:true}); (document.activeElement && document.activeElement !== document.body ? document.activeElement : document).dispatchEvent(ev); }catch(e){} };
    const inGame = () => { try{ return currentView === "games" && (typeof gmCurId !== "undefined" ? !!gmCurId : false); }catch(e){ return false; } };
    const inEmu = () => { const w = document.getElementById("emuWin"); return !!(w && w.classList.contains("on")); };

    /* navegação pela app com o comando: direções movem o foco, A carrega, B volta */
    const focusables = () => [...document.querySelectorAll("button, a[href], input, select, [tabindex]:not([tabindex='-1']), .ahCard, .rcard, .et")].filter(el => { const r = el.getBoundingClientRect(); if(!r.width || !r.height) return false; if(r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && !el.disabled; });
    let cur = null;
    const setFocus = el => { if(cur) cur.classList.remove("gpFocus"); cur = el; if(!el) return; el.classList.add("gpFocus"); try{ el.focus({preventScroll:true}); }catch(e){} try{ el.scrollIntoView({block:"nearest", inline:"nearest", behavior:"smooth"}); }catch(e){} };
    const nav = dir => {
      const all = focusables(); if(!all.length) return;
      if(!cur || !document.contains(cur) || !all.includes(cur)){ setFocus(all[0]); return; }
      const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2; let best = null, bd = 1e9;
      for(const el of all){ if(el === cur) continue; const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - ax, dy = y - ay;
        const ok = dir === "r" ? dx > 8 : dir === "l" ? dx < -8 : dir === "d" ? dy > 8 : dy < -8; if(!ok) continue;
        const main = dir === "r" || dir === "l" ? Math.abs(dx) : Math.abs(dy), side = dir === "r" || dir === "l" ? Math.abs(dy) : Math.abs(dx), d = main + side * 2.2; if(d < bd){ bd = d; best = el; } }
      if(best) setFocus(best); else { const m = document.querySelector("main"); if(m && (dir === "d" || dir === "u")) m.scrollBy({top:dir === "d" ? 260 : -260, behavior:"smooth"}); }
    };
    const back = () => { const closeBtn = document.querySelector("#avDlg:not([hidden]) [data-x], #emuWin.on #emuBack, #rmModal.on #rmClose, .modal:not([hidden]) [id$=Close]"); if(closeBtn){ closeBtn.click(); return; }
      if(document.body.classList.contains("pfull") && window.__fsLeave){ window.__fsLeave(); return; } key("keydown", "Escape", "Escape"); };

    const rep = {};   /* repetição das direções na navegação */
    const loop = () => {
      requestAnimationFrame(loop);
      const pads = [...(navigator.getGamepads() || [])].filter(Boolean);
      let any = false;
      pads.forEach((gp, pi) => {
        const map = pi === 0 ? P1 : P2, st = prev[gp.index] = prev[gp.index] || {};
        const btn = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
        const ax = gp.axes || [], dirs = {12:btn(12) || ax[1] < -0.55, 13:btn(13) || ax[1] > 0.55, 14:btn(14) || ax[0] < -0.55, 15:btn(15) || ax[0] > 0.55};
        const state = i => i in dirs ? dirs[i] : btn(i);
        for(const i of Object.keys(map).map(Number).concat([12, 13, 14, 15].filter(x => !(x in map)))){
          const on = state(i), was = !!st[i]; if(on) any = true; if(on === was) { if(on && !inGame() && !inEmu() && pi === 0 && i >= 12 && i <= 15 && performance.now() > (rep[i] || 0)){ rep[i] = performance.now() + 140; nav({12:"u", 13:"d", 14:"l", 15:"r"}[i]); } continue; }
          st[i] = on;
          if(inEmu()) continue;   /* o EmulatorJS lê o comando diretamente */
          if(inGame()){ const m = map[i]; if(m) key(on ? "keydown" : "keyup", m[0], m[1]); continue; }
          if(!on || pi !== 0) continue;
          if(i >= 12 && i <= 15){ rep[i] = performance.now() + 380; nav({12:"u", 13:"d", 14:"l", 15:"r"}[i]); }
          else if(i === 0){ if(cur && document.contains(cur)) cur.click(); else nav("d"); }
          else if(i === 1 || i === 16) back();
          else if(i === 9){ if(window.__wheelAct) window.__wheelAct("toggle"); }
          else if(i === 4 || i === 5){ if(window.__wheelAct) window.__wheelAct(i === 5 ? "next" : "prev"); }
        }
        const T = document.getElementById("gpTest"); if(T && pi === 0) T.querySelectorAll("span").forEach((sp, k) => sp.classList.toggle("on", k <= 11 ? btn(k) : !!dirs[k] || btn(k)));
      });
      if(any && cur && (inGame() || inEmu())){ cur.classList.remove("gpFocus"); cur = null; }
    };
    requestAnimationFrame(loop);
    /* v291: botões vindos do comando no telemóvel (joystick). Jogo do Cockpit → teclas dos jogos; emulador → teclas do EmulatorJS (dentro da janela); fora disso → navegação */
    /* v573: teclas por omissão do EmulatorJS 4.x: Select é «v» (antes «Shift», que não faz nada: nos jogos de arcada/Neo Geo o Select mete a moeda, por isso não se conseguia começar) */
    /* índice do botão no comando → entrada RetroArch do EmulatorJS (B, Y, Select, Start, ↑, ↓, ←, →, A, X, L, R) */
    /* v577: MS-DOS: cruzeta = setas; A = espaço; B = Ctrl; X = Alt; Y = Shift; Start = Enter; Select = Esc; L = Y; R = N */
    const DOSK = {0:[" ","Space",32], 1:["Control","ControlLeft",17], 2:["Alt","AltLeft",18], 3:["Shift","ShiftLeft",16], 9:["Enter","Enter",13], 8:["Escape","Escape",27], 4:["y","KeyY",89], 5:["n","KeyN",78], 12:["ArrowUp","ArrowUp",38], 13:["ArrowDown","ArrowDown",40], 14:["ArrowLeft","ArrowLeft",37], 15:["ArrowRight","ArrowRight",39]};
    const EMU_RI = {1:0, 3:1, 8:2, 9:3, 12:4, 13:5, 14:6, 15:7, 0:8, 2:9, 4:10, 5:11};
    const EMUK = {0:["z","KeyZ",90], 1:["x","KeyX",88], 2:["a","KeyA",65], 3:["s","KeyS",83], 4:["q","KeyQ",81], 5:["e","KeyE",69], 8:["v","KeyV",86], 9:["Enter","Enter",13], 12:["ArrowUp","ArrowUp",38], 13:["ArrowDown","ArrowDown",40], 14:["ArrowLeft","ArrowLeft",37], 15:["ArrowRight","ArrowRight",39]};
    const emuKey = (type, m) => { try{ const f = document.querySelector("#emuWin iframe"), d = f && f.contentDocument; if(!d) return; const ev = new f.contentWindow.KeyboardEvent(type, {key:m[0], code:m[1], keyCode:m[2], which:m[2], bubbles:true, cancelable:true}); (d.activeElement && d.activeElement !== d.body ? d.activeElement : d).dispatchEvent(ev); if(type === "keydown" && m[0].length === 1) (d.activeElement && d.activeElement !== d.body ? d.activeElement : d).dispatchEvent(new f.contentWindow.KeyboardEvent("keypress", {key:m[0], code:m[1], keyCode:m[2], which:m[2], charCode:m[0].charCodeAt(0), bubbles:true, cancelable:true})); }catch(e){} };
    /* v299: jogos só com rato/toque: o joystick move um cursor no ecrã e o botão A carrega no sítio do cursor */
    const VC = {x:innerWidth/2, y:innerHeight/2, dx:0, dy:0, t:null, el:null, down:false};
    const vcShow = () => { if(!VC.el){ VC.el = document.createElement("div"); VC.el.style.cssText = "position:fixed;z-index:99998;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:3px solid #7cc4ff;background:#7cc4ff55;box-shadow:0 0 0 2px #0008;pointer-events:none;display:none"; document.body.appendChild(VC.el); } VC.el.style.display = inGame() ? "block" : "none"; VC.el.style.left = VC.x + "px"; VC.el.style.top = VC.y + "px"; return VC.el; };
    const vcPtr = type => { const t = document.elementFromPoint(VC.x, VC.y) || document.body; const o = {clientX:VC.x, clientY:VC.y, bubbles:true, cancelable:true, button:0, buttons:type === "pointerdown" ? 1 : 0};
      try{ t.dispatchEvent(new PointerEvent(type, Object.assign({pointerId:7, pointerType:"touch", isPrimary:true}, o))); }catch(e){}
      const mt = type === "pointerdown" ? "mousedown" : type === "pointerup" ? "mouseup" : "";
      if(mt){ t.dispatchEvent(new MouseEvent(mt, o)); if(mt === "mouseup") t.dispatchEvent(new MouseEvent("click", o)); } };
    const vcTick = () => { if(!inGame()){ VC.dx = VC.dy = 0; clearInterval(VC.t); VC.t = null; vcShow(); return; }
      VC.x = Math.max(0, Math.min(innerWidth, VC.x + VC.dx * 9)); VC.y = Math.max(0, Math.min(innerHeight, VC.y + VC.dy * 9)); vcShow(); };
    const vcPad = (i, on) => {
      if(i >= 12 && i <= 15){ const dx = i === 14 ? -1 : i === 15 ? 1 : 0, dy = i === 12 ? -1 : i === 13 ? 1 : 0;
        if(on){ VC.dx += dx; VC.dy += dy; } else { VC.dx -= dx; VC.dy -= dy; }
        if((VC.dx || VC.dy) && !VC.t) VC.t = setInterval(vcTick, 16); if(!VC.dx && !VC.dy){ clearInterval(VC.t); VC.t = null; } vcShow(); }
      else if(i === 0 && on !== VC.down){ VC.down = on; vcShow(); vcPtr(on ? "pointerdown" : "pointerup"); } };
    window.__padPress = (pi, i, on) => {
      try{ window.__ckActivity && window.__ckActivity(); }catch(e){}
      try{
        /* v576: no emulador, cada telemóvel/comando é o seu jogador: o botão vai direto à entrada do jogador certo (antes eram teclas do teclado, que só servem o jogador 1) */
        if(inEmu() && window.__emuDos){ const m = DOSK[i]; if(m) emuKey(on ? "keydown" : "keyup", m); return; }
        if(inEmu()){ const ri = EMU_RI[i]; let done = false;
          try{ const f = document.querySelector("#emuWin iframe"), E = f && f.contentWindow && f.contentWindow.EJS_emulator, gm = E && E.gameManager; if(ri != null && gm && gm.simulateInput){ gm.simulateInput(pi === 1 ? 1 : 0, ri, on ? 1 : 0); done = true; } }catch(e){}
          if(!done){ const m = EMUK[i]; if(m) emuKey(on ? "keydown" : "keyup", m); } return; }
        if(pi === 0 && inGame()) vcPad(i, on);
        const map = pi === 1 ? P2 : P1;
        if(inGame()){ const m = map[i]; if(m) key(on ? "keydown" : "keyup", m[0], m[1]); return; }
        if(!on || pi !== 0) return;
        if(i >= 12 && i <= 15) nav({12:"u", 13:"d", 14:"l", 15:"r"}[i]);
        else if(i === 0){ if(cur && document.contains(cur)) cur.click(); else nav("d"); }
        else if(i === 1 || i === 8) back();
        else if(i === 9){ if(window.__wheelAct) window.__wheelAct("toggle"); }
        else if(i === 4 || i === 5){ if(window.__wheelAct) window.__wheelAct(i === 5 ? "next" : "prev"); }
      }catch(e){}
    };
    const showTag = () => { const pads = [...(navigator.getGamepads() || [])].filter(Boolean); tag.style.display = pads.length ? "block" : "none"; tag.textContent = "🎮 " + pads.length + (pads.length > 1 ? " comandos" : " comando"); };
    addEventListener("gamepadconnected", e => { showTag(); toast("🎮 Comando ligado: " + String(e.gamepad.id).replace(/\(.*?\)/g, "").trim().slice(0, 40)); setTimeout(() => tag.style.display = "none", 6000); try{ window.__dbgEv && window.__dbgEv(0, "comando de jogos ligado", {id:e.gamepad.id, mapa:e.gamepad.mapping}); }catch(x){} });
    addEventListener("gamepaddisconnected", () => { showTag(); toast("🎮 Comando desligado."); });
  }catch(e){ console.log("comando de jogos", e); }
})();
