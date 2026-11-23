
(function(){
  if(window.ANDROID) return;
  const qs = new URLSearchParams(location.search);
  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const waitIce = pc => new Promise(res => { if(pc.iceGatheringState === "complete") return res(); const t = setTimeout(res, 4500); pc.addEventListener("icegatheringstatechange", () => { if(pc.iceGatheringState === "complete"){ clearTimeout(t); res(); } }); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ====================== TELEMÓVEL: ?remote=CODIGO&b=…&k=… ====================== */
  if(qs.get("remote")){
    try{
      const code = qs.get("remote"), base = qs.get("b") || (typeof cfg !== "undefined" ? cfg.proxy : ""), key = qs.get("k") || (typeof cfg !== "undefined" ? cfg.pkey : "");
      const ui = document.createElement("div"); ui.id = "rmUI";
      ui.innerHTML = '<h1>📱 Comando do Cockpit</h1><div class="st" id="rmSt">A ligar ao carro…</div>' +
        '<div class="now"><div class="slot" id="rmS0" data-slot="0"><b>Ecrã 1</b><small>—</small></div><div class="slot" id="rmS1" data-slot="1"><b>Ecrã 2</b><small>—</small></div></div>' +
        '<div class="pad"><button data-c="prev">◀ Canal</button><button data-c="play" class="pri">⏯</button><button data-c="next">Canal ▶</button><button data-c="vd">🔉 −</button><button data-c="mute">🔇</button><button data-c="vu">🔊 +</button><button data-c="mirror">🖼 Andamento</button><button data-c="full">⛶ Ecrã total</button><button data-c="home">🏠 Início TV</button><button data-c="stop" style="grid-column:span 3">⏹ Parar o canal</button></div>' +
        '<div class="row"><button data-v="tv">📺 TV</button><button data-v="media">📻 Media</button><button data-v="car">🚗 Carro</button><button id="rmPadBtn" class="pri">🎮 Joystick</button></div>' +
        '<div class="row" style="margin-top:14px"><select id="rmKind"><option value="live">Canais</option><option value="movie">Filmes</option><option value="series">Séries</option><option value="radio">Rádio</option><option value="amp">Música (Amp)</option></select></div>' +
        '<div class="row"><input id="rmQ" type="search" placeholder="Pesquisar…" autocomplete="off"><button id="rmGo" class="pri" style="flex:0 0 110px">Procurar</button></div><div id="rmRes"></div>' +
        '<h1 style="margin-top:18px;font-size:20px">🎮 Jogos (ROMs)</h1><div class="st">Envia para o carro o link da pasta MEGA, o link direto de uma ROM, ou o próprio ficheiro.</div>' +
        '<div class="row"><input id="rmRom" type="url" placeholder="https://mega.nz/folder/…#chave ou link da ROM" autocomplete="off"><button id="rmRomGo" class="pri" style="flex:0 0 110px">Enviar</button></div>' +
        '<div class="row"><label class="pri" style="display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:14px;background:#1f3b63;flex:1;cursor:pointer">📁 Enviar ficheiro da ROM<input id="rmRomF" type="file" hidden></label></div>' +
        '<div class="row"><label class="pri" style="display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:14px;background:#2b4a7a;flex:1;cursor:pointer">📂 Pasta de ROMs no telemóvel<input id="rmRomD" type="file" webkitdirectory directory multiple hidden></label><label style="display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:14px;background:#24324d;flex:0 0 120px;cursor:pointer">ou ficheiros<input id="rmRomM" type="file" multiple hidden></label></div><div class="st" id="rmRomSt"></div><div class="st" id="rmLib"></div>';
      document.body.appendChild(ui); document.title = "Comando Cockpit";
      const $r = id => document.getElementById(id); let dc = null;
      const send = o => { try{ if(dc && dc.readyState === "open") dc.send(JSON.stringify(o)); else $r("rmSt").textContent = "Ainda não estou ligado ao carro…"; }catch(e){} };
      /* v291: ecrã de comando de jogos (cruzeta ou joystick, A/B/X/Y, LB/RB, Select/Start, jogador 1 ou 2) */
      let myPlayer = 0;
      const openPad = () => {
        let P = document.getElementById("rmPad");
        try{ document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => {}); }catch(e){}
        if(P){ P.style.display = "flex"; setTimeout(() => P.__drawBody && P.__drawBody(), 60); return; }
        const css = document.createElement("style");
        /* v577: visual moderno: vidro escuro, néon na cor do jogador (J1 ciano, J2 rosa), cruzeta em cruz, A/B/X/Y coloridos em losango, botões que afundam ao toque */
        css.textContent = "#rmPad{--acc:#5cf2ff;position:fixed;inset:0;z-index:100000;color:#eaf6ff;display:flex;flex-direction:column;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none;-webkit-touch-callout:none;" +
            "background:radial-gradient(ellipse at 15% 60%,color-mix(in srgb,var(--acc) 18%,transparent),transparent 45%),radial-gradient(ellipse at 85% 60%,#8a7dff22,transparent 45%),linear-gradient(#ffffff08 1px,transparent 1px) 0 0/100% 26px,linear-gradient(90deg,#ffffff08 1px,transparent 1px) 0 0/26px 100%,#05080f}" +
          "#rmPad.p2{--acc:#ff5ca8}" +
          "#rmPad .top{display:flex;gap:8px;align-items:center;padding:8px 12px;background:#ffffff08;border-bottom:1px solid #ffffff12}" +
          "#rmPad .top button{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid #ffffff1f;background:#ffffff0d;color:#eaf6ff;font:700 14px system-ui;box-shadow:none}" +
          "#rmPad .top #rpPl{background:var(--acc);color:#03121a;border-color:transparent;font-weight:900;min-width:52px;box-shadow:0 0 16px var(--acc)}" +
          "#rmPad .top span{flex:1;text-align:right;color:#9fb3cc;font:600 12px system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
          "#rmPad .ctl{flex:1;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 4vw 4vh;gap:3vw}" +
          "#rmPad .l,#rmPad .r{display:flex;flex-direction:column;align-items:center;gap:3vh}#rmPad .sh{display:flex;gap:3vw}" +
          "#rmPad button{border:0;color:#fff;font:800 20px system-ui;touch-action:none;transition:transform .06s,box-shadow .12s,background .12s}" +
          "#rmPad .sh button{width:26vmin;height:10vmin;border-radius:12px 12px 22px 22px;background:linear-gradient(180deg,#2a3550,#161e30);border:1px solid #ffffff1a;box-shadow:0 6px 0 #0b0f19,0 10px 18px #0008;font-size:16px;letter-spacing:1px}" +
          "#rmPad button.on{transform:translateY(4px) scale(.96)!important;box-shadow:0 0 0 2px var(--acc),0 0 22px var(--acc)!important;filter:brightness(1.25)}" +
          "#rpDpad{display:grid;grid-template:repeat(3,21vmin)/repeat(3,21vmin);gap:0;filter:drop-shadow(0 10px 16px #000a)}" +
          "#rpDpad button{background:linear-gradient(180deg,#2c3854,#171f33);font-size:24px;color:#cfe;border:1px solid #ffffff14}" +
          "#rpDpad button[data-b='12']{border-radius:16px 16px 4px 4px}#rpDpad button[data-b='13']{border-radius:4px 4px 16px 16px}#rpDpad button[data-b='14']{border-radius:16px 4px 4px 16px}#rpDpad button[data-b='15']{border-radius:4px 16px 16px 4px}" +
          "#rpDpad .c{background:#1c2540;border-radius:0}#rpDpad .c:not([style]){background:radial-gradient(circle,#26324f 30%,#1a2238 32%);border:1px solid #ffffff10}" +
          "#rpStick{width:54vmin;height:54vmin;border-radius:50%;background:radial-gradient(circle,#ffffff10 0 30%,transparent 31%),radial-gradient(circle,#1b2540,#0d1322);border:2px solid color-mix(in srgb,var(--acc) 45%,transparent);box-shadow:0 0 30px color-mix(in srgb,var(--acc) 25%,transparent),inset 0 0 30px #000a;position:relative;touch-action:none;display:none}" +
          "#rpStick i{position:absolute;left:50%;top:50%;width:24vmin;height:24vmin;margin:-12vmin 0 0 -12vmin;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--acc) 45%,color-mix(in srgb,var(--acc) 60%,#000));box-shadow:0 8px 20px #000a,0 0 24px var(--acc);opacity:.95}" +
          "#rmPad .mid{display:flex;flex-direction:column;gap:2.6vh;align-items:center}" +
          "#rmPad .mid button{width:22vmin;height:9vmin;border-radius:999px;font-size:14px;letter-spacing:1px;background:#ffffff10;border:1px solid #ffffff22;box-shadow:0 4px 0 #0b0f19}" +
          "#rpAbxy{display:grid;grid-template:repeat(3,18vmin)/repeat(3,18vmin);gap:2px;filter:drop-shadow(0 10px 16px #000a)}" +
          "#rpAbxy button{border-radius:50%;font-size:24px;box-shadow:0 6px 0 #0b0f19,inset 0 2px 0 #ffffff33;border:1px solid #ffffff22}" +
          "#rpAbxy button[data-b='0']{background:radial-gradient(circle at 35% 30%,#5be39a,#169c57)}#rpAbxy button[data-b='1']{background:radial-gradient(circle at 35% 30%,#ff7a8a,#c22a42)}" +
          "#rpAbxy button[data-b='2']{background:radial-gradient(circle at 35% 30%,#6db8ff,#1f5fc4)}#rpAbxy button[data-b='3']{background:radial-gradient(circle at 35% 30%,#ffe066,#c99a0a);color:#3a2a00}" +
          /* v579: três estilos de comando (só o aspeto e os nomes; a função de cada posição não muda) */
          "#rmPad.st-ps #rpAbxy button{background:radial-gradient(circle at 35% 30%,#2b3247,#141927)!important;font-size:30px;font-weight:400}" +
          "#rmPad.st-ps #rpAbxy button[data-b='3']{color:#4fe3c1}#rmPad.st-ps #rpAbxy button[data-b='1']{color:#ff6b7d}#rmPad.st-ps #rpAbxy button[data-b='0']{color:#7aa8ff}#rmPad.st-ps #rpAbxy button[data-b='2']{color:#f59ad6}" +
          "#rmPad.st-ps #rpDpad{gap:6px}#rmPad.st-ps #rpDpad button{border-radius:10px!important;clip-path:none}#rmPad.st-ps #rpDpad .c{background:transparent!important;border:0!important}" +
          "#rmPad.st-ps .sh button{border-radius:22px 22px 10px 10px}#rmPad.st-ps .mid button{width:16vmin;border-radius:10px}" +
          "#rmPad.st-nt #rpAbxy button{background:radial-gradient(circle at 35% 30%,#4a4f63,#262a38)!important;color:#fff!important}" +
          "#rmPad.st-nt .sh button{border-radius:10px 10px 18px 18px;background:linear-gradient(180deg,#3b4050,#22262f)}" +
          "#rmPad.st-nt .mid{flex-direction:row}#rmPad.st-nt .mid button{width:11vmin;height:11vmin;border-radius:50%;font-size:22px;font-weight:900}" +
          "#rmPad.st-nt #rpDpad button{background:linear-gradient(180deg,#3a3f50,#20242f)}" +
          /* v580: corpo de comando original (desenho próprio) por trás dos botões; a cor muda com o estilo */
          "#rmPad .ctl{position:relative;isolation:isolate}#rpBody{position:absolute;inset:0;z-index:-1;pointer-events:none}" +
          "#rpBody svg{width:100%;height:100%;display:block;filter:drop-shadow(0 18px 30px #000c)}" +
          "#rmPad.st-xb #rpBody .sh *{fill:url(#rpGx)}#rmPad.st-ps #rpBody .sh *{fill:url(#rpGp)}#rmPad.st-nt #rpBody .sh *{fill:url(#rpGn)}" +
          "#rpBody .rim *{fill:var(--acc);fill-opacity:.4;stroke:var(--acc);stroke-opacity:.4;stroke-width:6}#rpBody .gl{fill:#ffffff0d}#rpBody .sh *{stroke:none}" +
          "@media (orientation:portrait){#rpBody{display:none}}" +
          "@media (orientation:portrait){#rmPad .ctl{grid-template-columns:1fr;grid-template-rows:auto auto auto;justify-items:center;gap:3vh}#rmPad .mid{flex-direction:row}}";
        document.head.appendChild(css);
        P = document.createElement("div"); P.id = "rmPad";
        P.innerHTML = '<div class="top"><button id="rpClose"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="vertical-align:-2px"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg> Sair</button><button id="rpPl">J' + (myPlayer + 1) + '</button><button id="rpMode">Cruzeta</button><button id="rpStyle" title="Estilo do comando">🎨 Estilo</button><button id="rpFull">⛶ Ecrã</button><button id="rpVp" title="Esconder ou mostrar o comando no ecrã do carro">🎮 Carro</button><span id="rpSt">Jogos e emuladores do Cockpit</span></div>' +
          '<div class="ctl"><div id="rpBody"><svg aria-hidden="true"></svg></div><div class="l"><div class="sh"><button data-b="4">LB</button></div><div id="rpDpad"><i class="c" style="visibility:hidden"></i><button data-b="12">▲</button><i class="c" style="visibility:hidden"></i><button data-b="14">◀</button><i class="c"></i><button data-b="15">▶</button><i class="c" style="visibility:hidden"></i><button data-b="13">▼</button><i class="c" style="visibility:hidden"></i></div><div id="rpStick"><i></i></div></div>' +
          '<div class="mid"><button data-b="8">Select</button><button data-b="9">Start</button></div>' +
          '<div class="r"><div class="sh"><button data-b="5">RB</button></div><div id="rpAbxy"><i style="visibility:hidden"></i><button data-b="3">Y</button><i style="visibility:hidden"></i><button data-b="2">X</button><i style="visibility:hidden"></i><button data-b="1">B</button><i style="visibility:hidden"></i><button data-b="0">A</button><i style="visibility:hidden"></i></div></div></div>';
        document.body.appendChild(P); P.classList.toggle("p2", myPlayer === 1);
        /* v579: estilos parecidos com os comandos mais conhecidos (posições iguais; só mudam os nomes, cores e formas) */
        const STY = {xb:{n:"Letras coloridas", lab:{0:"A", 1:"B", 2:"X", 3:"Y", 4:"LB", 5:"RB", 8:"View", 9:"Menu"}},
          ps:{n:"Formas", lab:{0:"✕", 1:"○", 2:"□", 3:"△", 4:"L1", 5:"R1", 8:"Select", 9:"Start"}},
          nt:{n:"Letras trocadas", lab:{0:"B", 1:"A", 2:"Y", 3:"X", 4:"L", 5:"R", 8:"−", 9:"+"}}};
        const ORD = ["xb", "ps", "nt"];
        /* v581: o corpo do comando é desenhado à volta dos botões reais (pegas centradas na cruzeta/joystick e nos A/B/X/Y,
           ombros por baixo de LB/RB e ponte a cobrir Select/Start); redesenha ao rodar o ecrã, mudar de modo ou de estilo */
        const drawBody = () => { try{
          const C = P.querySelector(".ctl"), svg = P.querySelector("#rpBody svg"); if(!C || !svg) return; const cr = C.getBoundingClientRect(); if(cr.width < 50) return;
          const box = el => { const r = el.getBoundingClientRect(); return {x:r.left - cr.left, y:r.top - cr.top, w:r.width, h:r.height, cx:r.left - cr.left + r.width / 2, cy:r.top - cr.top + r.height / 2}; };
          const st = P.querySelector("#rpStick"), dp = P.querySelector("#rpDpad"), L = box(st && st.offsetParent ? st : dp), R = box(P.querySelector("#rpAbxy")), M = box(P.querySelector(".mid")), sh = [...P.querySelectorAll(".sh button")].map(box);
          const rl = Math.max(L.w, L.h) / 2 * 0.95 + 22, rr = Math.max(R.w, R.h) / 2 * 0.95 + 22;
          const by0 = Math.min(L.cy - rl * .78, R.cy - rr * .78, M.y - 26), by1 = Math.max(M.y + M.h + 26, Math.min(L.cy, R.cy) + Math.min(rl, rr) * .35);
          let shapes = '<circle cx="' + L.cx + '" cy="' + L.cy + '" r="' + rl + '"/><circle cx="' + R.cx + '" cy="' + R.cy + '" r="' + rr + '"/>' +
            '<rect x="' + L.cx + '" y="' + by0 + '" width="' + (R.cx - L.cx) + '" height="' + (by1 - by0) + '" rx="' + Math.min(60, (by1 - by0) / 2) + '"/>';
          sh.forEach(b => { shapes += '<rect x="' + (b.x - 10) + '" y="' + (b.y + b.h * .35) + '" width="' + (b.w + 20) + '" height="' + Math.max(40, (b.cx < cr.width / 2 ? L.cy : R.cy) - b.y) + '" rx="22"/>'; });
          svg.setAttribute("viewBox", "0 0 " + cr.width + " " + cr.height); svg.setAttribute("width", cr.width); svg.setAttribute("height", cr.height);
          svg.innerHTML = '<defs><linearGradient id="rpGx" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3443"/><stop offset="1" stop-color="#11141c"/></linearGradient>' +
            '<linearGradient id="rpGp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#26385c"/><stop offset=".6" stop-color="#16213a"/><stop offset="1" stop-color="#0c1324"/></linearGradient>' +
            '<linearGradient id="rpGn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a4256"/><stop offset=".35" stop-color="#2a2f3d"/><stop offset=".65" stop-color="#2a2f3d"/><stop offset="1" stop-color="#3d3550"/></linearGradient></defs>' +
            '<g class="rim">' + shapes + '</g><g class="sh">' + shapes + '</g>' +
            '<ellipse class="gl" cx="' + (L.cx + R.cx) / 2 + '" cy="' + (by0 + 24) + '" rx="' + (R.cx - L.cx) * .42 + '" ry="16"/>' +
            '<rect x="' + ((L.cx + R.cx) / 2 - 50) + '" y="' + (by1 - 18) + '" width="100" height="7" rx="3.5" fill="var(--acc)" fill-opacity=".65"/>';
        }catch(e){} };
        P.__drawBody = drawBody; addEventListener("resize", () => setTimeout(drawBody, 120)); try{ screen.orientation && screen.orientation.addEventListener("change", () => setTimeout(drawBody, 300)); }catch(e){}
        setTimeout(drawBody, 60); setTimeout(drawBody, 600);
        const applySty = k => { if(!STY[k]) k = "xb"; ORD.forEach(x => P.classList.toggle("st-" + x, x === k)); Object.entries(STY[k].lab).forEach(([b, l]) => { const el = P.querySelector('button[data-b="' + b + '"]'); if(el) el.textContent = l; }); const sb = document.getElementById("rpStyle"); if(sb) sb.textContent = "🎨 " + STY[k].n; try{ localStorage.setItem("ck_padStyle", k); }catch(e){} setTimeout(() => P.__drawBody && P.__drawBody(), 30); };
        let curSty = "xb"; try{ curSty = localStorage.getItem("ck_padStyle") || "xb"; }catch(e){}
        applySty(curSty);
        document.getElementById("rpStyle").onclick = () => { curSty = ORD[(ORD.indexOf(curSty) + 1) % ORD.length]; applySty(curSty); };
        const held = new Set();
        const press = (b, on) => { b = +b; if(on === held.has(b)) return; on ? held.add(b) : held.delete(b); send({t:"pad", p:myPlayer, b, on}); const el = P.querySelector('[data-b="' + b + '"]'); if(el) el.classList.toggle("on", on); if(on){ try{ navigator.vibrate && navigator.vibrate(12); }catch(e){} } };
        const releaseAll = () => { [...held].forEach(b => press(b, false)); };
        P.querySelectorAll("button[data-b]").forEach(el => {
          el.addEventListener("pointerdown", e => { e.preventDefault(); try{ el.setPointerCapture(e.pointerId); }catch(x){} press(el.dataset.b, true); });
          ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => el.addEventListener(t, () => press(el.dataset.b, false)));
          el.addEventListener("contextmenu", e => e.preventDefault());
        });
        /* joystick analógico → 4 direções digitais (zona morta de 35 %) */
        const S = document.getElementById("rpStick"), K = S.querySelector("i"); let sid = null;
        const stick = e => { const r = S.getBoundingClientRect(), R = r.width / 2, dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R), d = Math.hypot(dx, dy) || 1, m = Math.min(d, R * 0.6), kx = dx / d * m, ky = dy / d * m;
          K.style.transform = "translate(" + kx + "px," + ky + "px)"; const t = R * 0.35;
          press(14, dx < -t); press(15, dx > t); press(12, dy < -t); press(13, dy > t); };
        S.addEventListener("pointerdown", e => { e.preventDefault(); sid = e.pointerId; try{ S.setPointerCapture(sid); }catch(x){} stick(e); });
        S.addEventListener("pointermove", e => { if(e.pointerId === sid) stick(e); });
        ["pointerup", "pointercancel"].forEach(t => S.addEventListener(t, e => { if(e.pointerId !== sid) return; sid = null; K.style.transform = ""; [12, 13, 14, 15].forEach(b => press(b, false)); }));
        let mode = 0; document.getElementById("rpMode").onclick = () => { releaseAll(); mode = 1 - mode; document.getElementById("rpMode").textContent = mode ? "Joystick" : "Cruzeta"; document.getElementById("rpDpad").style.display = mode ? "none" : "grid"; S.style.display = mode ? "block" : "none"; setTimeout(() => P.__drawBody && P.__drawBody(), 30); };
        document.getElementById("rpFull").onclick = () => send({t:"cmd", c:"gfull"});
        /* v574: esconde/mostra o comando virtual no ecrã do carro */
        document.getElementById("rpVp").onclick = () => send({t:"cmd", c:"vpad"});
        document.getElementById("rpPl").onclick = () => { releaseAll(); myPlayer = 1 - myPlayer; document.getElementById("rpPl").textContent = "J" + (myPlayer + 1); P.classList.toggle("p2", myPlayer === 1); };
        document.getElementById("rpClose").onclick = () => { releaseAll(); P.style.display = "none"; try{ document.exitFullscreen && document.fullscreenElement && document.exitFullscreen(); screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); }catch(e){} };
        document.addEventListener("visibilitychange", () => { if(document.hidden) releaseAll(); });
      };
      const esc3 = t => String(t || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
      ui.addEventListener("click", e => { const b = e.target.closest("button,[data-slot]"); if(!b) return;
        if(b.dataset.c) send({t:"cmd", c:b.dataset.c}); else if(b.dataset.v) send({t:"view", v:b.dataset.v}); else if(b.dataset.slot) send({t:"slot", s:+b.dataset.slot});
        else if(b.id === "rmPadBtn") openPad(); else if(b.dataset.u) send({t:"open", u:b.dataset.u, k:b.dataset.k}); else if(b.id === "rmGo"){ const q = $r("rmQ").value.trim(); if(q){ $r("rmRes").innerHTML = '<div class="st">A procurar…</div>'; send({t:"search", q, kind:$r("rmKind").value}); } } });
      $r("rmQ").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); $r("rmGo").click(); } });
      /* v565: ROMs a partir do telemóvel: link (pasta MEGA ou ROM) ou o ficheiro, enviado aos bocados pela ligação direta ao carro */
      $r("rmRomGo").onclick = () => { const u = $r("rmRom").value.trim(); if(!/^https?:\/\//i.test(u)){ $r("rmRomSt").textContent = "Cola um link que comece por https://"; return; } send({t:"romlink", u}); $r("rmRomSt").textContent = "Link enviado ✓"; $r("rmRom").value = ""; };
      /* v567: pasta de ROMs no telemóvel: os jogos ficam guardados no browser do telemóvel e o carro vê a lista; ao escolher um jogo no carro, o telemóvel envia-o */
      const RX = /\.(nes|sfc|smc|gb|gbc|gba|md|gen|smd|bin|sms|gg|n64|z64|v64|nds|a26|pce|zip|7z)$/i;
      const libDb = () => new Promise((res, rej) => { const q = indexedDB.open("ckphoneroms", 1); q.onupgradeneeded = () => q.result.createObjectStore("f"); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
      const libAll = async () => { try{ const d = await libDb(); return await new Promise(res => { const out = [], c = d.transaction("f").objectStore("f").openCursor(); c.onsuccess = () => { const k = c.result; if(k){ out.push({id:k.key, n:k.value.n, size:k.value.size}); k.continue(); } else res(out); }; c.onerror = () => res(out); }); }catch(e){ return []; } };
      const libGet = async id => { const d = await libDb(); return await new Promise(res => { const q = d.transaction("f").objectStore("f").get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); };
      const libPut = async files => { const d = await libDb(); let n = 0; for(const f of files){ if(!RX.test(f.name) || f.size > 64 * 1048576) continue; const buf = await f.arrayBuffer(); await new Promise(res => { const tx = d.transaction("f", "readwrite"); tx.objectStore("f").put({n:f.name, size:f.size, buf}, f.name + ":" + f.size); tx.oncomplete = tx.onerror = () => res(); }); n++; } return n; };
      const libShow = async () => { const L = await libAll(); $r("rmLib").textContent = L.length ? "📂 No telemóvel: " + L.length + " jogos (o carro mostra-os em Jogos › Pasta do telemóvel)." : ""; return L; };
      const libSend = async () => { const L = await libShow(); if(L.length) send({t:"romcat", list:L}); };
      const libPick = async e => { const fs = [...(e.target.files || [])]; e.target.value = ""; if(!fs.length) return; $r("rmRomSt").textContent = "A guardar no telemóvel…"; const n = await libPut(fs); $r("rmRomSt").textContent = n ? n + " jogos guardados no telemóvel ✓" : "Não encontrei ROMs (.md, .nes, .sfc, .gba, .zip…) na escolha."; libSend(); };
      $r("rmRomD").onchange = libPick; $r("rmRomM").onchange = libPick; libShow();
      const sendFile = async (name, b, extra) => { const CH = 12000, n = Math.ceil(b.length / CH), id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        send(Object.assign({t:"romfile0", id, name, size:b.length, n}, extra || {}));
        for(let i = 0; i < n; i++){ while(dc.bufferedAmount > 1 << 20) await new Promise(r => setTimeout(r, 30)); let s = ""; const part = b.subarray(i * CH, (i + 1) * CH); for(let k = 0; k < part.length; k++) s += String.fromCharCode(part[k]); send({t:"romfile", id, i, d:btoa(s)}); if(i % 20 === 0) $r("rmRomSt").textContent = "A enviar " + name + "… " + Math.round(i / n * 100) + " %"; }
        $r("rmRomSt").textContent = "Enviado ✓ " + name; };
      window.__rmLibReq = async id => { const v = await libGet(id); if(!v){ send({t:"toast2", m:"O telemóvel já não tem esse jogo."}); return; } sendFile(v.n, new Uint8Array(v.buf), {play:true}); };
      window.__rmLibSend = libSend;
      $r("rmRomF").onchange = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if(!f) return;
        if(f.size > 64 * 1048576){ $r("rmRomSt").textContent = "Ficheiro grande demais (máx. 64 MB)."; return; }
        if(!dc || dc.readyState !== "open"){ $r("rmRomSt").textContent = "Ainda não estou ligado ao carro…"; return; }
        const b = new Uint8Array(await f.arrayBuffer()), CH = 12000, n = Math.ceil(b.length / CH), id = Date.now().toString(36);
        send({t:"romfile0", id, name:f.name, size:b.length, n});
        for(let i = 0; i < n; i++){
          while(dc.bufferedAmount > 1 << 20) await new Promise(r => setTimeout(r, 30));
          let s = ""; const part = b.subarray(i * CH, (i + 1) * CH); for(let k = 0; k < part.length; k++) s += String.fromCharCode(part[k]);
          send({t:"romfile", id, i, d:btoa(s)});
          if(i % 20 === 0) $r("rmRomSt").textContent = "A enviar " + f.name + "… " + Math.round(i / n * 100) + " %";
        }
        $r("rmRomSt").textContent = "Enviado ✓ " + f.name + " (o carro guarda-o nos Jogos)."; };
      const onMsg = m => { let o; try{ o = JSON.parse(m.data); }catch(e){ return; }
        if(o.t === "state"){ [0, 1].forEach(i => { const S = o.slots[i] || {}, el = $r("rmS" + i); el.classList.toggle("on", o.target === i); el.innerHTML = (S.logo ? '<img src="' + esc3(S.logo) + '" alt="" onerror="this.remove()">' : "") + "<b>" + (i ? "Ecrã 2" : "Ecrã 1") + (o.audio === i ? " 🔊" : "") + "</b><small>" + esc3(S.name || "—") + (S.now ? " · " + esc3(S.now) : "") + "</small>"; });
          $r("rmSt").textContent = "✅ Ligado ao carro" + (o.other ? " · " + o.other : "") + (o.mirror ? " · imagem em andamento ligada" : ""); }
        else if(o.t === "results"){ $r("rmRes").innerHTML = o.list.length ? o.list.map(x => '<button data-u="' + esc3(x.u) + '" data-k="' + esc3(x.k) + '">' + (x.logo ? '<img src="' + esc3(x.logo) + '" alt="" onerror="this.remove()">' : "") + '<span>' + esc3(x.n) + '</span></button>').join("") : '<div class="st">Nada encontrado.</div>'; }
        else if(o.t === "player"){ myPlayer = o.n === 1 ? 1 : 0; const pb = document.getElementById("rpPl"); if(pb) pb.textContent = "J" + (myPlayer + 1); const pp = document.getElementById("rmPad"); if(pp) pp.classList.toggle("p2", myPlayer === 1); }
        else if(o.t === "toast"){ $r("rmSt").textContent = o.m; }
        else if(o.t === "vpad"){ const vb = document.getElementById("rpVp"); if(vb) vb.textContent = o.on ? "🎮 Carro: visível" : "🎮 Carro: escondido"; }
        else if(o.t === "romget"){ if(window.__rmLibReq) window.__rmLibReq(o.id); } };
      (async () => {
        if(!base){ $r("rmSt").textContent = "Falta o endereço do proxy no link. Lê de novo o código no ecrã do carro."; return; }
        let offer = null, lastE = ""; for(let i = 0; i < 40 && !offer; i++){ try{ const r = await fetch(syncUrl(base, key, __rmId(code, 0)), {cache:"no-store"}); if(r.ok) offer = await r.json(); else lastE = "HTTP " + r.status + " " + (await r.text()).slice(0, 60); }catch(e){ lastE = String(e.message || e); } if(!offer){ $r("rmSt").textContent = "À procura do carro… (" + (i + 1) + "/40" + (lastE && !/404/.test(lastE) ? " · " + lastE : "") + ")"; await sleep(1500); } }
        if(!offer){ $r("rmSt").textContent = "Não encontrei o carro (" + (lastE || "sem resposta") + "). Gera um código novo no carro e lê-o logo."; return; }
        const pc = new RTCPeerConnection(await rtcConfig(base, key));
        pc.ondatachannel = ev => { dc = ev.channel; dc.onmessage = onMsg; dc.onopen = () => { $r("rmSt").textContent = "✅ Ligado ao carro"; send({t:"hello"}); setTimeout(() => window.__rmLibSend && window.__rmLibSend(), 600); }; dc.onclose = () => { $r("rmSt").textContent = "Ligação ao carro terminada. Lê de novo o código no carro."; }; };
        await pc.setRemoteDescription(offer); await pc.setLocalDescription(await pc.createAnswer()); await waitIce(pc);
        const pr = await fetch(syncUrl(base, key, __rmId(code, 1)), {method:"POST", body:JSON.stringify({type:pc.localDescription.type, sdp:pc.localDescription.sdp, n:offer.n})});
        if(!pr.ok){ $r("rmSt").textContent = "O Worker recusou a resposta (HTTP " + pr.status + "). Gera um código novo no carro."; return; }
        $r("rmSt").textContent = "A estabelecer a ligação…";
        setTimeout(() => { if(!(dc && dc.readyState === "open")) $r("rmSt").textContent = "A ligação direta não abriu (estado: " + pc.iceConnectionState + "). Tenta com o telemóvel no mesmo Wi-Fi/hotspot do carro, ou ativa o TURN da Cloudflare no Worker."; }, 25000);
      })().catch(e => { $r("rmSt").textContent = "Erro: " + (e.message || e); });
    }catch(e){ console.log("comando telemóvel", e); }
    return;
  }

  /* ====================== CARRO: mostra o código e recebe os comandos ====================== */
  try{
    const M = document.createElement("div"); M.id = "rmModal";
    M.innerHTML = '<div class="b"><h2 style="margin:0">📱 Comando no telemóvel</h2><p style="margin:8px 0 0">No telemóvel do passageiro, aponta a câmara para o código.</p><div id="rmQr"></div><div class="code" id="rmCode">······</div><div class="st" id="rmSt2">A preparar…</div><div id="rmPeers" style="margin-top:8px"></div><div style="margin-top:10px"><button id="rmCopy">Copiar link</button><button id="rmClose" style="background:#555">Fechar</button></div></div>';
    document.body.appendChild(M);
    const $c = id => document.getElementById(id);
    let pc = null, dc = null, link = "", stT = 0; const conns = [];   /* v291: vários telemóveis ligados (1.º = jogador 1, 2.º = jogador 2) */
    const st2 = t => { const e = $c("rmSt2"); if(e) e.textContent = t; };
    /* v305: lista dos telemóveis ligados, com botão para desligar cada um */
    const peers = () => { const el = $c("rmPeers"); if(!el) return;
      el.innerHTML = conns.length ? conns.map((d, i) => '<div style="margin:6px 0"><b>' + (i ? "2.º" : "1.º") + ' telemóvel</b> <button data-k="' + i + '" style="min-height:44px">Desligar</button></div>').join("") : '<p class="small muted" style="margin:0">Nenhum telemóvel ligado.</p>';
      el.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const d = conns[+b.dataset.k]; try{ d && d.close(); }catch(e){} setTimeout(peers, 300); }); };
    const vidT = () => document.getElementById("vid" + (typeof tvTarget === "number" ? tvTarget : 0));
    const state = () => { const slots = [0, 1].map(i => { const c = lastPlayed[i]; if(!c) return {}; let now = ""; try{ const nn = nowNext(c); if(nn && nn.now) now = nn.now.title; }catch(e){} return {name:c.name, logo:c.logo || "", now}; });
      let other = ""; try{ const W = window.__wamp; if(W && W.playing && W.playing() && W.cur) other = "🎵 " + W.cur.artist + " — " + W.cur.title; else if(typeof radioCur !== "undefined" && radioCur) other = "📻 " + radioCur.name; }catch(e){}
      return {t:"state", slots, target:tvTarget, audio:audioSlot, mirror:typeof mirrorOn !== "undefined" && mirrorOn, view:currentView, other}; };
    const tx = o => { try{ const t = JSON.stringify(o); conns.forEach(d => { try{ if(d.readyState === "open") d.send(t); }catch(e){} }); }catch(e){} };
    const txTo = (d, o) => { try{ if(d && d.readyState === "open") d.send(JSON.stringify(o)); }catch(e){} };
    const vol = d => { try{ const G = window.__vg, v = document.getElementById("vid" + audioSlot); let x = (G && G.v != null ? G.v : v.volume) + d; x = Math.max(0, Math.min(1, Math.round(x * 10) / 10)); if(G) G.v = x; v.muted = false; v.volume = x; LS.set("tvVol", x); tx({t:"toast", m:"Som " + Math.round(x * 100) + "%"}); }catch(e){} };
    const onCmd = async (m, from) => { let o; try{ o = JSON.parse(m.data); }catch(e){ return; }
      try{ window.__ckActivity && window.__ckActivity(); }catch(e){}
      try{
        if(o.t === "pad"){ if(window.__padPress) window.__padPress(o.p === 1 ? 1 : 0, o.b | 0, !!o.on);
          /* v574: a jogar pelo telemóvel, o comando no ecrã esconde-se sozinho (uma vez por jogo; dá para voltar a mostrar) */
          if(o.on && window.__emuVpAuto){ const r = window.__emuVpAuto(); if(r) txTo(from, {t:"vpad", on:false}); } return; }
        if(o.t === "hello"){ const n = Math.max(0, conns.indexOf(from)); txTo(from, {t:"player", n:n > 0 ? 1 : 0}); tx(state()); toast("📱 Telemóvel ligado (jogador " + (n > 0 ? 2 : 1) + ")."); }
        else if(o.t === "cmd"){ const c = o.c;
          if(c === "next" || c === "prev"){ if(window.__wheelAct) window.__wheelAct(c); else zap(c === "next" ? 1 : -1); }
          else if(c === "play"){ if(window.__wheelAct) window.__wheelAct("toggle"); else { const v = vidT(); v.paused ? v.play().catch(() => {}) : v.pause(); } }
          else if(c === "vu") vol(0.1); else if(c === "vd") vol(-0.1);
          else if(c === "mute"){ const v = document.getElementById("vid" + audioSlot); v.muted = !v.muted; tx({t:"toast", m:v.muted ? "Sem som" : "Com som"}); }
          else if(c === "mirror"){ if(typeof toggleMirror === "function") toggleMirror("telemóvel ligado"); }
          else if(c === "full"){ if(window.__ah) window.__ah.pass = Date.now() + 3000; show("tv"); setCinema(true); window.__goFull && window.__goFull(); }
          else if(c === "vpad"){ const on = window.__emuVp ? window.__emuVp() : null; if(on == null) tx({t:"toast", m:"Abre um jogo do emulador primeiro."}); else { tx({t:"vpad", on}); tx({t:"toast", m:on ? "Comando no ecrã do carro: visível" : "Comando no ecrã do carro: escondido"}); } }
          else if(c === "gfull"){ if(currentView === "games" && typeof gmFullSet === "function") gmFullSet(!gmIsFull()); else tx({t:"toast", m:"Abre um jogo primeiro."}); }
          else if(c === "home"){ setCinema(false); show("tvinicio"); }
          else if(c === "stop"){ window.__tvStop && window.__tvStop(); } }
        else if(o.t === "view"){ setCinema(false); show(o.v === "tv" ? "tvinicio" : o.v); }
        else if(o.t === "romcat"){ const go = () => window.__emu.setPhoneCat(Array.isArray(o.list) ? o.list : [], id => txTo(from, {t:"romget", id})); if(window.__emu) go(); else setTimeout(() => window.__emu && go(), 1500); toast("📱 Pasta do telemóvel: " + (o.list || []).length + " jogos."); }
        else if(o.t === "toast2"){ toast(String(o.m || "")); }
        else if(o.t === "romlink"){ const go = () => { const r = window.__emu.addLink(String(o.u || "")); txTo(from, {t:"toast", m:r}); }; if(window.__emu) go(); else { show("games"); setTimeout(() => window.__emu ? go() : txTo(from, {t:"toast", m:"Os jogos ainda não estão prontos no carro. Abre Jogos e envia de novo."}), 1500); } }
        else if(o.t === "romfile0"){ (window.__romRx = window.__romRx || {})[o.id] = {name:String(o.name || "jogo"), size:+o.size || 0, n:+o.n || 0, parts:new Array(+o.n || 0), got:0, play:!!o.play}; toast("📱 A receber " + o.name + "…"); }
        else if(o.t === "romfile"){ const R = window.__romRx && window.__romRx[o.id]; if(!R || R.parts[o.i]) return; const s = atob(o.d), u = new Uint8Array(s.length); for(let k = 0; k < s.length; k++) u[k] = s.charCodeAt(k); R.parts[o.i] = u; R.got++;
          if(R.got === R.n){ delete window.__romRx[o.id]; const all = new Uint8Array(R.size); let off = 0; for(const p of R.parts){ all.set(p, off); off += p.length; }
            if(!window.__emu){ show("games"); await new Promise(r => setTimeout(r, 1500)); } const r = window.__emu ? await window.__emu.addFile(R.name, all.buffer, R.play) : "Os jogos ainda não estão prontos no carro."; txTo(from, {t:"toast", m:r}); } }
        else if(o.t === "slot"){ if(typeof setTarget === "function") setTarget(o.s); }
        else if(o.t === "search"){ const q = (typeof norm === "function" ? norm(o.q) : o.q.toLowerCase()); let list = [];
          if(o.kind === "radio"){ playRadioByName(o.q).then(ok => tx({t:"toast", m:ok ? "📻 A tocar" : "Rádio não encontrada"})); list = []; }
          else if(o.kind === "amp"){ const f = document.getElementById("wampForm"); if(f){ document.getElementById("wampQ").value = o.q; f.requestSubmit(); let k = 0; const t = setInterval(() => { const W = window.__wamp; if(++k > 30 || (W && W.list && W.list.length)){ clearInterval(t); tx({t:"results", list:((W && W.list) || []).slice(0, 30).map((x, i) => ({n:x.artist + " — " + x.title, u:"amp:" + i, k:"amp", logo:x.art}))}); } }, 400); } return; }
          else { const pool = [...(channels || []), ...(typeof freeChans !== "undefined" ? freeChans : [])].filter(c => c.kind === o.kind || (o.kind === "series" && c.kind === "series"));
            list = pool.filter(c => (typeof norm === "function" ? norm(c.name) : c.name.toLowerCase()).includes(q)).slice(0, 40).map(c => ({n:c.name, u:c.url, k:c.kind, logo:c.logo || ""})); }
          tx({t:"results", list}); }
        else if(o.t === "open"){
          if(String(o.u).startsWith("amp:")){ const b = document.querySelector('#wampPl [data-i="' + o.u.slice(4) + '"]'); if(b) b.click(); show("media"); return; }
          const c = [...(channels || []), ...(typeof freeChans !== "undefined" ? freeChans : [])].find(x => x.url === o.u); if(!c) return;
          if(c.kind === "series" && window.openSeries){ show("tv"); window.openSeries(c); return; }
          if(typeof tvBlocked === "function" && tvBlocked(c)){ tx({t:"toast", m:"Bloqueado em andamento"}); return; }
          if(c.kind === "live") show("tvinicio"); else show("tv"); (window.__oneConn || window.playChannel)(c, typeof tvTarget === "number" ? tvTarget : 0); }
        setTimeout(() => tx(state()), 700);
      }catch(e){ tx({t:"toast", m:"Erro: " + (e.message || e)}); }
    };
    /* v299: cada telemóvel ganha o seu offer (com um n.º único). O mesmo código serve para o 2.º telemóvel: o carro publica um novo offer logo após cada ligação */
    let gen = 0;
    const newOffer = async (code) => {
      const pc = new RTCPeerConnection(await rtcConfig(cfg.proxy, cfg.pkey));
      const dc = pc.createDataChannel("ctl", {ordered:true});
      (window.__rmKeep = window.__rmKeep || []).push(pc);
      const nonce = Math.random().toString(36).slice(2, 10);
      dc.onopen = () => { if(!conns.includes(dc)) conns.push(dc); peers(); st2("✅ Telemóvel ligado. Podes fechar esta janela. Para o 2.º jogador, abre este código outra vez noutro telemóvel."); clearInterval(stT); stT = setInterval(() => tx(state()), 3000); setTimeout(() => { M.classList.remove("on"); }, 2500); };
      dc.onmessage = m => onCmd(m, dc);
      dc.onclose = () => { const i = conns.indexOf(dc); if(i >= 0) conns.splice(i, 1); peers(); if(!conns.length) clearInterval(stT); toast("📱 Um telemóvel desligou-se."); };
      await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
      const ld = pc.localDescription;
      const r = await fetch(syncUrl(cfg.proxy, cfg.pkey, __rmId(code, 0)), {method:"POST", body:JSON.stringify({type:ld.type, sdp:ld.sdp, n:nonce})});
      if(!r.ok){ try{ pc.close(); }catch(e){} throw new Error(r.status === 501 ? "Falta o KV SYNC no teu Worker." : "o Worker recusou o código (HTTP " + r.status + ")"); }
      return {pc, dc, nonce};
    };
    const start = async () => {
      if(!cfg.proxy){ st2("Configura primeiro o proxy do Cockpit (Definições)."); return; }
      const my = ++gen;
      /* v300: o /sync do Worker recusa reutilizar um código (409) e apaga a resposta ao ser lida. Por isso cada telemóvel recebe um código novo (novo QR) */
      const showCode = async () => {
        const code = String(Math.floor(100000 + Math.random() * 900000)); $c("rmCode").textContent = code;
        link = location.origin + location.pathname + "?remote=" + code + "&b=" + encodeURIComponent(cfg.proxy) + (cfg.pkey ? "&k=" + encodeURIComponent(cfg.pkey) : "");
        $c("rmQr").innerHTML = ""; if(await loadQr()){ try{ new QRCode($c("rmQr"), {text:link, width:260, height:260, correctLevel:QRCode.CorrectLevel.M}); }catch(e){} }
        return code; };
      let code = await showCode();
      st2("A preparar a ligação…");
      const t0 = Date.now();
      while(my === gen && conns.length < 2 && Date.now() - t0 < 600000){
        /* v327: não volta a abrir o modal sozinho (antes reabria a cada ciclo de 90 s enquanto houvesse um telemóvel ligado) */
        if(conns.length){ code = await showCode(); }
        let o;
        try{ o = await newOffer(code); }catch(e){ st2("Erro: " + (e.message || e) + ". Toca para gerar outro."); return; }
        st2(conns.length ? "À espera do 2.º telemóvel (usa o mesmo código)…" : "À espera do telemóvel…");
        let got = false; const until = Date.now() + 90000;
        while(my === gen && !got && Date.now() < until && conns.length < 2){
          await sleep(1500);
          try{ const a = await fetch(syncUrl(cfg.proxy, cfg.pkey, __rmId(code, 1)), {cache:"no-store"});
            if(a.ok){ const ans = await a.json(); if(ans && ans.sdp && ans.n === o.nonce && o.pc.signalingState === "have-local-offer"){ await o.pc.setRemoteDescription({type:"answer", sdp:ans.sdp}); got = true; st2("A estabelecer a ligação…"); } } }catch(e){}
        }
        if(got){ const t1 = Date.now(); while(o.dc.readyState !== "open" && Date.now() - t1 < 25000 && my === gen) await sleep(300);
          if(o.dc.readyState !== "open"){ st2("O telemóvel respondeu mas a ligação direta não abriu (" + o.pc.iceConnectionState + "). Põe o telemóvel no mesmo Wi-Fi/hotspot do carro ou ativa o TURN da Cloudflare."); try{ o.pc.close(); }catch(e){} } }
        else { try{ o.pc.close(); }catch(e){} }
      }
    };
    window.__remoteStart = () => { M.classList.add("on"); peers(); start().catch(e => st2("Erro: " + (e.message || e))); };
    $c("rmClose").onclick = () => M.classList.remove("on");
    $c("rmCopy").onclick = () => { try{ navigator.clipboard.writeText(link).then(() => toast("Link copiado"), () => toast("Não consegui copiar.", true)); }catch(e){} };
    /* botões: Definições (cartão do passageiro) e cabeçalho */
    const qrBtn = document.getElementById("btnShowQr");
    if(qrBtn){ const b = document.createElement("button"); b.className = "btn primary"; b.id = "btnRemote"; b.textContent = "📱 Comando no telemóvel"; qrBtn.parentNode.insertBefore(b, qrBtn); b.onclick = () => window.__remoteStart(); }
    const top = document.querySelector("header.top"), mic = document.getElementById("micBtn");
    if(top && mic){ const b = document.createElement("button"); b.id = "hRemote"; b.className = "chip"; b.style.cssText = "cursor:pointer;min-height:40px;border:0"; b.textContent = "📱"; b.title = "Comando no telemóvel do passageiro"; b.setAttribute("aria-label", "Comando no telemóvel do passageiro"); top.insertBefore(b, mic); b.onclick = () => window.__remoteStart(); }
  }catch(e){ console.log("comando carro", e); }
})();
