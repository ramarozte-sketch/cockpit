
(function(){
  if(window.ANDROID) return;
  try{
    const V = document.getElementById("v-games"), hub = document.getElementById("gmHub"); if(!V) return;
    const L = [
      {i:"🕹️", n:"EmulatorJS", d:"NES, SNES, GB/GBA, Mega Drive, Neo Geo, PlayStation, N64, DS, MS-DOS… Carregas os teus jogos.", u:"https://demo.emulatorjs.org/"},
      {i:"👾", n:"Emulador Joe Heyming", d:"Vários sistemas clássicos no browser. Carregas as tuas ROMs.", u:"https://joeheyming.github.io/emulator/"},
      {i:"⬡", n:"Hextris", d:"Jogo de puzzle hexagonal, código aberto.", u:"https://hextris.github.io/hextris/"},
      {i:"🧱", n:"Tetris (React)", d:"Tetris clássico de código aberto, com teclado ou toque.", u:"https://chvin.github.io/react-tetris/"},
      {i:"🔢", n:"2048", d:"O puzzle dos números.", u:"https://play2048.co/"},
      {i:"🐍", n:"Snake", d:"A cobra clássica, código aberto.", u:"https://patorjk.com/games/snake/"},
      {i:"🎯", n:"Os meus emuladores", d:"Acrescenta um link teu (ex.: outro emulador ou jogo homebrew).", add:true}
    ];
    const extra = () => LS.get("emuExtra", []) || [];
    const box = document.createElement("div"); box.className = "panel"; box.id = "emuPanel";
    /* v268: jogos (ROMs tuas) abertos a partir de um endereço, no EmulatorJS dentro do Cockpit */
    const games = () => LS.get("emuGames", []) || [];
    const SYS = {nes:"NES", snes:"Super Nintendo", gb:"Game Boy", gba:"Game Boy Advance", segaMD:"Mega Drive", sms:"Master System", gg:"Game Gear", n64:"Nintendo 64", psx:"PlayStation", nds:"Nintendo DS", atari2600:"Atari 2600", pce:"PC Engine", neogeo:"Neo Geo", sega32x:"Sega 32X", segaCD:"Mega CD", lynx:"Atari Lynx", ngp:"Neo Geo Pocket", ws:"WonderSwan", atari7800:"Atari 7800", mame:"Arcade (MAME)", dos:"MS-DOS"};
    const EXT = {nes:"nes", sfc:"snes", smc:"snes", gb:"gb", gbc:"gb", gba:"gba", md:"segaMD", gen:"segaMD", smd:"segaMD", bin:"segaMD", sms:"sms", gg:"gg", n64:"n64", z64:"n64", v64:"n64", cue:"psx", pbp:"psx", chd:"psx", nds:"nds", a26:"atari2600", pce:"pce", "32x":"sega32x", lnx:"lynx", ngp:"ngp", ngc:"ngp", ws:"ws", wsc:"ws", a78:"atari7800", jsdos:"dos"};
    const fixUrl = u => { u = String(u || "").trim();
      let m = u.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/); if(m) return "https://raw.githubusercontent.com/" + m[1] + "/" + m[2] + "/" + m[3];
      m = u.match(/drive\.google\.com\/file\/d\/([^\/?]+)/); if(m) return "https://drive.google.com/uc?export=download&id=" + m[1];
      if(/dropbox\.com/.test(u)) return u.replace(/[?&]dl=0/, "").replace(/\?.*$/, m2 => m2) + (/[?&]dl=1/.test(u) ? "" : (u.includes("?") ? "&dl=1" : "?dl=1"));
      return u; };
    const sysOf = u => { const e = (String(u).split("?")[0].match(/\.([a-z0-9]+)$/i) || [])[1]; if(e && /^(zip|7z)$/i.test(e)) return "zip"; return e && EXT[e.toLowerCase()] || ""; };
    /* v568: jogos em .zip/.7z: o EmulatorJS descomprime-os sozinho; o sistema vem do nome do ficheiro lá dentro (zip),
       ou do nome do jogo/pasta (ex.: «Mega Drive»), ou pergunta-se uma vez */
    const zipSys = buf => { let dosHit = false; try{ const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
        for(let i = Math.max(0, b.length - 66000); i < b.length - 46; i++){ if(dv.getUint32(i, true) !== 0x02014b50) continue; const nl = dv.getUint16(i + 28, true), nm = new TextDecoder().decode(b.subarray(i + 46, i + 46 + nl)); if(/(^|[-_.])(p1|p2|s1|m1|v1|v2|c1|c2)$|-[pscmv]\d\.[a-z0-9]+$/i.test(nm)) return "neogeo"; if(/\.(exe|com|bat)$/i.test(nm)) dosHit = true; const s = sysOf(nm); if(s && s !== "zip") return s; i += 45 + nl; }
        if(dosHit) return "dos";
        for(let i = 0; i + 30 < Math.min(b.length, 4096); i++){ if(dv.getUint32(i, true) !== 0x04034b50) continue; const nl = dv.getUint16(i + 26, true), s = sysOf(new TextDecoder().decode(b.subarray(i + 30, i + 30 + nl))); if(s && s !== "zip") return s; break; }
      }catch(e){} return ""; };
    const guessSys = txt => { const n = String(txt || "").toLowerCase(); return /\bms-?dos\b|\bdos\b/.test(n) ? "dos" : /neo ?geo pocket|\bngp\b/.test(n) ? "ngp" : /neo ?-?geo|\bmvs\b/.test(n) ? "neogeo" : /\bnds\b|nintendo ds/.test(n) ? "nds" : /playstation|\bpsx\b|\bps1\b/.test(n) ? "psx" : /\b32x\b/.test(n) ? "sega32x" : /mega ?cd|sega ?cd/.test(n) ? "segaCD" : /\bmame\b|arcade/.test(n) ? "mame" : /wonderswan/.test(n) ? "ws" : /\blynx\b/.test(n) ? "lynx" : /mega ?drive|genesis|\bmd\b|sega 16/.test(n) ? "segaMD" : /super ?nintendo|snes|super famicom/.test(n) ? "snes" : /\bgba\b|game ?boy advance/.test(n) ? "gba" : /game ?boy|\bgbc?\b/.test(n) ? "gb" : /master ?system|\bsms\b/.test(n) ? "sms" : /game ?gear/.test(n) ? "gg" : /pc ?engine|turbografx/.test(n) ? "pce" : /atari/.test(n) ? "atari2600" : /\bnes\b|famicom|nintendo 8/.test(n) ? "nes" : /\bn64\b|nintendo 64/.test(n) ? "n64" : ""; };
    const askSys = name => { const k = Object.keys(SYS).filter(x => CORE[x]); const r = prompt("De que consola é «" + name + "»? Escreve o número:\n" + k.map((x, i) => (i + 1) + " " + SYS[x]).join("\n"), "1"); const ix = (+r || 0) - 1; return k[ix] || ""; };
    const realSys = (s, name, buf, dir) => s !== "zip" ? s : (buf && zipSys(buf)) || guessSys(name + " " + (dir || "")) || askSys(name);
    /* v269: o emulador e os núcleos ficam no próprio site do Cockpit (pasta emu/); se faltar algum, usa o CDN do EmulatorJS */
    let emuData = "https://cdn.emulatorjs.org/stable/data/";
    const CORE = {nes:"fceumm", snes:"snes9x", gb:"gambatte", gba:"mgba", segaMD:"genesis_plus_gx", sms:"genesis_plus_gx", gg:"genesis_plus_gx", pce:"mednafen_pce", atari2600:"stella2014", neogeo:"fbneo",
      nds:"melonds", psx:"pcsx_rearmed", n64:"mupen64plus_next", sega32x:"picodrive", segaCD:"genesis_plus_gx", lynx:"handy", ngp:"mednafen_ngp", ws:"mednafen_wswan", atari7800:"prosystem", mame:"mame2003_plus"};
    /* v572: nomes de sistema do EmulatorJS (o Cockpit usa nomes curtos) */
    const EJS_SYS = {sms:"segaMS", gg:"segaGG", neogeo:"fbneo"};
    const localOk = async s => { try{ const base = new URL("emu/data/", location.href).href; const r1 = await fetch(base + "loader.js", {method:"HEAD", cache:"no-store"}); if(!r1.ok) return false; const c = CORE[s]; if(!c) return false; const r2 = await fetch(base + "cores/" + c + "-wasm.data", {method:"HEAD", cache:"no-store"}); return r2.ok ? base : false; }catch(e){ return false; } };
    /* v569: Neo Geo (núcleo FBNeo): precisa da BIOS «neogeo.zip» do utilizador (guardada no aparelho: pasta MEGA, telemóvel ou ficheiro) */
    const neoBios = async () => { let b = await romGet("bios:neogeo"); if(b) return b;
      if(!megaBios && LS.get("emuMega", "")){ try{ megaFiles = await megaList(LS.get("emuMega", "")); }catch(e){} }   /* relê a pasta: a BIOS pode ter sido posta depois */
      if(megaBios){ try{ toast("A trazer a BIOS do Neo Geo da pasta MEGA…"); let x = await megaBios.downloadBuffer(); x = x.buffer ? x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength) : x; await romPut("bios:neogeo", x); return x; }catch(e){ toast("Não consegui trazer a BIOS do MEGA: " + (e && e.message || e), true); } }
      return null; };
    /* v577: MS-DOS com js-dos 6.22 (alojado em emu/dos, sem precisar de threads). O jogo é um .zip da pasta do jogo (teu);
       o programa a arrancar escolhe-se uma vez e fica guardado. O comando simula o teclado (setas, espaço, Ctrl, Alt, Enter, Esc). */
    const zipNames = buf => { const out = []; try{ const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength); for(let i = Math.max(0, b.length - 1048576); i < b.length - 46; i++){ if(dv.getUint32(i, true) !== 0x02014b50) continue; const nl = dv.getUint16(i + 28, true); out.push(new TextDecoder().decode(b.subarray(i + 46, i + 46 + nl))); i += 45 + nl; } }catch(e){} return out; };
    const playDos = async gm => {
      if(!gm.buf){ try{ const r = await fetch(gm.px && typeof px === "function" && cfg.proxy ? px(gm.u) : gm.u); if(!r.ok) throw 0; gm = {...gm, buf:await r.arrayBuffer()}; }catch(e){ toast("Não consegui descarregar o jogo de MS-DOS.", true); return; } }
      const k = "dosExe:" + (gm.key || gm.u || gm.n); let exe = LS.get(k, "");
      const progs = zipNames(gm.buf).filter(n => /\.(exe|com|bat)$/i.test(n) && !/(^|\/)(setup|install|instal|dos4gw|uninst|config|setsound|sound)\.(exe|com|bat)$/i.test(n));
      if(!exe || !progs.includes(exe)){
        if(!progs.length){ toast("Não encontrei nenhum programa (.exe, .com ou .bat) dentro do .zip.", true); return; }
        if(progs.length === 1) exe = progs[0];
        else { const r = prompt("Que programa arranca o jogo? Escreve o número:\n" + progs.map((x, i) => (i + 1) + " " + x).join("\n"), "1"); const ix = (+r || 0) - 1; if(!progs[ix]) return; exe = progs[ix]; }
        LS.set(k, exe);
      }
      const dir = exe.includes("/") ? exe.slice(0, exe.lastIndexOf("/")) : "", file = exe.split("/").pop();
      window.__emuG = {buf:gm.buf, name:gm.fname || "jogo.zip"}; window.__emuDos = true;
      const base = new URL("emu/dos/", location.href).href;
      const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#c{width:100%;height:100%;display:block;object-fit:contain;image-rendering:pixelated}</style></head><body><canvas id="c"></canvas><script src="' + base + 'js-dos.js"><\/script><script>' +
        'Dos(document.getElementById("c"),{wdosboxUrl:' + JSON.stringify(base + "wdosbox.js") + ',cycles:"auto",autolock:false}).ready(function(fs,main){var u=URL.createObjectURL(new Blob([parent.__emuG.buf]));fs.extract(u).then(function(){' +
        'main(["-c",' + JSON.stringify(dir ? "cd " + dir.replace(/\//g, "\\") : "cd \\") + ',"-c",' + JSON.stringify(file) + ']);});});<\/script></body></html>';
      cur = {n:gm.n, u:gm.key || gm.u, rom:gm}; const f = document.getElementById("emuF"); f.removeAttribute("src"); f.srcdoc = html; zApply();
      document.getElementById("emuT").textContent = gm.n + " · MS-DOS · " + file; win.classList.add("on");
      setTimeout(() => { try{ f.focus(); }catch(e){} }, 800);
    };
    const playRom = async gm => { if(gm.s === "dos") return playDos(gm); window.__emuDos = false; const lb = await localOk(gm.s); emuData = lb || "https://cdn.emulatorjs.org/stable/data/";
      /* v575: o FBNeo/MAME do browser não lê .7z (só .zip) */
      if((gm.s === "neogeo" || gm.s === "mame") && /\.7z$/i.test(gm.fname || gm.u || "")){ toast("Os jogos Neo Geo/arcada têm de estar em .zip (este browser não lê .7z). Converte-o para .zip com o mesmo nome.", true); return; }
      let biosUrl = "", biosBuf = null; if(gm.s === "neogeo"){ const bb = await neoBios(); biosBuf = bb; if(!bb){ toast("Para o Neo Geo falta a BIOS «neogeo.zip». Põe-na na tua pasta MEGA ou envia-a do telemóvel (como uma ROM).", true); return; } biosUrl = URL.createObjectURL(new Blob([bb])); }
      const viaPx = gm.px && typeof px === "function" && cfg.proxy, url = viaPx ? px(gm.u) : gm.u;
      /* v572: o FBNeo (Neo Geo) e o MAME reconhecem o jogo pelo NOME do ficheiro (ex.: kof2002.zip); com um endereço blob: o nome perdia-se
         («Romset is unknown»). O jogo e a BIOS passam como ficheiros com o nome verdadeiro, criados dentro da janela do emulador */
      window.__emuG = gm.buf ? {buf:gm.buf, name:gm.fname || (gm.n + ".zip")} : null; window.__emuB = biosBuf || null;
      const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}#game{width:100%;height:100%}</style></head><body><div id="game"></div><script>' +
        'window.EJS_player="#game";window.EJS_core=' + JSON.stringify(EJS_SYS[gm.s] || gm.s) + ';window.EJS_gameUrl=' + JSON.stringify(url) + (biosUrl ? ';window.EJS_biosUrl=' + JSON.stringify(biosUrl) : "") +
        ';try{if(parent.__emuG){window.EJS_gameUrl=new File([parent.__emuG.buf],parent.__emuG.name);}if(parent.__emuB){window.EJS_biosUrl=new File([parent.__emuB],"neogeo.zip");}}catch(e){}' + ';window.EJS_gameName=' + JSON.stringify(gm.n) + ';window.EJS_pathtodata=' + JSON.stringify(emuData) + ';window.EJS_startOnLoaded=true;window.EJS_language="pt-PT";' + (lb ? 'window.EJS_DEBUG_XX=true;' : '') +
        'window.EJS_onLoadError=function(){parent.postMessage({emuErr:1},"*")};<\/script><script src="' + emuData + 'loader.js"><\/script></body></html>';
      cur = {n:gm.n, u:gm.key || gm.u, rom:gm}; const f = document.getElementById("emuF"); f.removeAttribute("src"); f.srcdoc = html; zApply(); document.getElementById("emuT").textContent = gm.n + " · " + (SYS[gm.s] || gm.s) + (lb ? " · local" : " · internet"); win.classList.add("on");
    };
    window.addEventListener("message", e => { if(e.data && e.data.emuErr) toast("O emulador não conseguiu carregar a ROM. Confirma o endereço (tem de ser um link direto para o ficheiro) ou liga «pelo proxy».", true); });
    const addGame = () => {
      const u0 = prompt("Endereço direto da ROM (GitHub, Dropbox, Google Drive ou outro site)"); if(!u0 || !/^https?:\/\//i.test(u0.trim())) return;
      const u = fixUrl(u0); let sy = sysOf(u); if(sy === "zip") sy = guessSys(decodeURIComponent(u)) || "";
      if(!sy){ const k = Object.keys(SYS); const r = prompt("Sistema do jogo? Escreve o número:\n" + k.map((x, i) => (i + 1) + " " + SYS[x]).join("\n"), "1"); const ix = (+r || 0) - 1; if(!k[ix]) return; sy = k[ix]; }
      const n = prompt("Nome do jogo", (String(u).split("?")[0].split("/").pop() || "Jogo").replace(/\.[a-z0-9]+$/i, "").replace(/[_%20]+/g, " ")) || "Jogo";
      const viaPx = /drive\.google\.com/.test(u) ? true : confirm("Abrir pelo proxy do Cockpit? (escolhe OK se o link direto não funcionar, por exemplo Google Drive)");
      const g = games(); g.push({n, u, s:sy, px:viaPx}); LS.set("emuGames", g); paint(); toast("«" + n + "» guardado. Toca para jogar.");
    };
    /* v562: ROMs da pasta MEGA do utilizador. O link fica só neste aparelho (nunca no código do site);
       os ficheiros são descarregados e desencriptados no browser (megajs) e guardados no IndexedDB para não voltar a descarregar. */
    const romDb = () => new Promise((res, rej) => { const r = indexedDB.open("ckroms", 1); r.onupgradeneeded = () => r.result.createObjectStore("r"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const romGet = async k => { try{ const d = await romDb(); return await new Promise(res => { const q = d.transaction("r").objectStore("r").get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }catch(e){ return null; } };
    const romPut = async (k, v) => { try{ const d = await romDb(); await new Promise(res => { const tx = d.transaction("r", "readwrite"); tx.objectStore("r").put(v, k); tx.oncomplete = tx.onerror = tx.onabort = () => res(); }); }catch(e){} };
    const megaLib = () => window.mega ? Promise.resolve(window.mega) : new Promise((res, rej) => { const s = document.createElement("script"); s.src = "emu/megajs.min.js"; s.onload = () => res(window.mega); s.onerror = () => rej(new Error("não carreguei o leitor do MEGA")); document.head.appendChild(s); });
    let megaFiles = null, megaBios = null;   /* v571: a BIOS do Neo Geo da pasta MEGA fica à parte (antes era tirada da lista e depois não era encontrada) */
    const megaList = async url => {
      const M = await megaLib(), root = M.File.fromURL(url); await root.loadAttributes();
      const out = [], walk = (n, path) => { if(n.directory || n.children){ (n.children || []).forEach(c => walk(c, path ? path + " / " + n.name : (n === root ? "" : n.name))); return; } const s0 = sysOf(n.name), s = s0 === "zip" ? (guessSys(n.name + " " + path) || "zip") : s0; if(/^neogeo\.zip$/i.test(n.name)){ megaBios = n; return; } if(s) out.push({n:n.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " "), f:n, s, size:n.size, dir:path, k:"mega:" + (n.nodeId || n.downloadId || n.name) + ":" + n.size}); };
      walk(root, ""); return out.sort((a, b) => (a.dir || "").localeCompare(b.dir || "") || a.n.localeCompare(b.n));
    };
    const megaPaint = (msg) => {
      const mb = box.querySelector("#megaBox"); if(!mb) return; mb.hidden = false;
      const head = '<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap"><h3 style="margin:0">📂 A minha pasta MEGA</h3><span class="spacer" style="flex:1"></span><button class="btn" data-mg="ref">↻ Atualizar</button><button class="btn" data-mg="link">🔗 Mudar link</button><button class="btn" data-mg="close"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="vertical-align:-2px"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg></button></div>';
      if(msg){ mb.innerHTML = head + '<p class="small muted">' + esc(msg) + '</p>'; }
      else if(!megaFiles || !megaFiles.length){ mb.innerHTML = head + '<p class="small muted">Não encontrei ROMs nesta pasta (.md, .gen, .bin, .nes, .sfc, .smc, .gb, .gbc, .gba, .sms, .gg, .pce, .a26, .zip, .7z…).</p>'; }
      else mb.innerHTML = head + '<p class="small muted" style="margin:6px 0">' + megaFiles.length + ' jogos · na 1.ª vez cada jogo é descarregado; depois abre logo.</p><div class="eg">' +
        megaFiles.map((g, i) => '<button class="et" data-mi="' + i + '"><i>' + (g.s === "neogeo" ? "🟡" : g.s === "segaMD" ? "🔵" : g.s === "snes" || g.s === "nes" ? "🔴" : g.s.startsWith("gb") ? "🟢" : g.s === "zip" ? "🗜️" : "🎮") + '</i><b>' + esc(g.n) + '</b><small>' + esc((SYS[g.s] || (g.s === "zip" ? "ZIP" : g.s)) + (g.dir ? " · " + g.dir : "") + " · " + Math.round(g.size / 1024) + " KB") + '</small></button>').join("") + '</div>';
      mb.querySelectorAll("[data-mi]").forEach(b => b.onclick = () => megaPlay(megaFiles[+b.dataset.mi], b));
      mb.querySelectorAll("[data-mg]").forEach(b => b.onclick = () => { const a = b.dataset.mg; if(a === "close"){ mb.hidden = true; } else if(a === "ref"){ megaFiles = null; megaOpen(false); } else megaOpen(true); });
    };
    const megaOpen = async (ask) => {
      let url = LS.get("emuMega", "");
      if(ask || !url){ const u = prompt("Link da tua pasta MEGA com ROMs (https://mega.nz/folder/…#chave). Fica guardado só neste aparelho.", url || ""); if(u == null) return; if(!/^https:\/\/mega\.(nz|co\.nz)\/(folder|file)\//i.test(u.trim()) || !u.includes("#")){ toast("Esse link não parece uma pasta MEGA (tem de ter #chave no fim).", true); return; } url = u.trim(); LS.set("emuMega", url); megaFiles = null; paint(); }
      if(megaFiles){ megaPaint(); return; }
      megaPaint("A ler a pasta MEGA…");
      try{ megaFiles = await megaList(url); megaPaint(); }catch(e){ megaPaint("Não consegui ler a pasta: " + (e && e.message || e) + ". Confirma que o link tem a chave (#…)."); }
    };
    /* v565: ROMs enviadas do telemóvel (link ou ficheiro) */
    const addLink = u => {
      if(/^https:\/\/mega\.(nz|co\.nz)\/(folder|file)\//i.test(u) && u.includes("#")){ LS.set("emuMega", u); megaFiles = null; try{ show("games"); }catch(e){} setTimeout(() => { paint(); megaOpen(false); }, 300); return "Pasta MEGA guardada no carro ✓ — a abrir em Jogos."; }
      if(/mega\.nz/i.test(u)) return "Esse link MEGA não tem a chave (#…) no fim.";
      const v = fixUrl(u); let sy = sysOf(v); if(sy === "zip") sy = guessSys(decodeURIComponent(v)) || askSys(decodeURIComponent(v.split("?")[0].split("/").pop())); if(!sy) return "Não reconheço o tipo de ROM pelo nome do ficheiro (.md, .nes, .sfc, .gba…). Adiciona-o no carro em «Jogo por endereço».";
      const n = decodeURIComponent((v.split("?")[0].split("/").pop() || "Jogo")).replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ");
      const g = games(); if(!g.some(x => x.u === v)){ g.push({n, u:v, s:sy, px:/drive\.google\.com/.test(v)}); LS.set("emuGames", g); }
      try{ show("games"); }catch(e){} paint(); toast("🎮 «" + n + "» chegou do telemóvel."); return "«" + n + "» adicionado aos Jogos do carro ✓";
    };
    let phoneCat = null, phoneReq = null;
    const phonePaint = () => {
      const mb = box.querySelector("#phoneBox"); if(!mb) return; if(!phoneCat){ mb.hidden = true; return; } mb.hidden = false;
      mb.innerHTML = '<div class="row" style="margin-top:12px;gap:8px"><h3 style="margin:0">📱 Pasta do telemóvel</h3><span class="spacer" style="flex:1"></span><span class="small muted">' + phoneCat.length + ' jogos · o telemóvel tem de estar ligado</span></div>' +
        '<div class="eg">' + phoneCat.map((g, i) => '<button class="et" data-pi="' + i + '"><i>📱</i><b>' + esc(g.n.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ")) + '</b><small>' + esc((SYS[sysOf(g.n)] || (sysOf(g.n) === "zip" ? "ZIP" : "?")) + " · " + Math.round(g.size / 1024) + " KB") + '</small></button>').join("") + '</div>';
      mb.querySelectorAll("[data-pi]").forEach(b => b.onclick = async () => { const g = phoneCat[+b.dataset.pi], k = "file:" + g.n + ":" + g.size, buf = await romGet(k);
        if(buf){ const s = realSys(sysOf(g.n), g.n, buf); if(!s) return; playRom({n:g.n.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " "), u:URL.createObjectURL(new Blob([buf])), s, px:false, key:k, buf, fname:g.n}); return; }
        if(!phoneReq){ toast("Liga o telemóvel ao carro (📱) para trazer este jogo.", true); return; }
        b.querySelector("small").textContent = "A pedir ao telemóvel…"; phoneReq(g.id); });
    };
    const setPhoneCat = (list, req) => { phoneCat = list.filter(g => sysOf(g.n)); phoneReq = req; phonePaint(); };
    const addFile = async (name, buf, play) => {
      if(/^neogeo\.zip$/i.test(name)){ await romPut("bios:neogeo", buf); toast("🎮 BIOS do Neo Geo guardada no carro."); return "BIOS do Neo Geo guardada no carro ✓"; }
      let sy = sysOf(name); if(sy === "zip") sy = zipSys(buf) || guessSys(name) || askSys(name); if(!sy) return "Não reconheço o tipo de ROM de «" + name + "» (.md, .nes, .sfc, .gba…).";
      const k = "file:" + name + ":" + buf.byteLength; await romPut(k, buf);
      const n = name.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " "), g = games(); if(!g.some(x => x.key === k)){ g.push({n, u:"", s:sy, px:false, key:k}); LS.set("emuGames", g); }
      try{ show("games"); }catch(e){} paint(); toast("🎮 «" + n + "» guardado no carro.");
      if(play) playRom({n, u:URL.createObjectURL(new Blob([buf])), s:sy, px:false, key:k, buf, fname:name});
      return "«" + n + "» guardado no carro ✓ (Jogos)";
    };
    window.__emu = {addLink, addFile, setPhoneCat};
    const megaPlay = async (g, btn) => {
      try{
        let buf = await romGet(g.k);
        if(!buf){ const sm = btn && btn.querySelector("small"), old = sm ? sm.textContent : ""; if(sm) sm.textContent = "A descarregar…"; buf = await g.f.downloadBuffer(); if(sm) sm.textContent = old; buf = buf.buffer ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf; await romPut(g.k, buf); }
        const s = realSys(g.s, g.n, buf, g.dir); if(!s){ toast("Não consegui saber de que consola é «" + g.n + "».", true); return; } if(g.s === "zip"){ g.s = s; }
        const u = URL.createObjectURL(new Blob([buf]));
        playRom({n:g.n, u, s, px:false, key:g.k, buf, fname:g.f && g.f.name});
      }catch(e){ toast("Não consegui abrir «" + g.n + "»: " + (e && e.message || e), true); }
    };
    const paint = () => { const all = [...L.filter(x => !x.add), ...extra(), ...games().map((g, gi) => ({i:"🎮", n:g.n, d:(SYS[g.s] || g.s) + (g.key ? " · no carro" : g.px ? " · pelo proxy" : ""), rom:g, gi})), {i:"📂", n:"A minha pasta MEGA", d:LS.get("emuMega", "") ? "As tuas ROMs da pasta MEGA" : "Liga a tua pasta MEGA com ROMs", mega:true}, {i:"➕", n:"Jogo por endereço", d:"Junta uma ROM tua a partir de um link (GitHub, Dropbox, Drive…)", addRom:true}, L.find(x => x.add)];
      box.innerHTML = '<div class="row"><h2 style="margin:0">🕹️ Emuladores e jogos web</h2><span class="spacer" style="flex:1"></span><label class="row small" style="gap:8px"><input type="checkbox" id="emuIn"> Abrir dentro do Cockpit</label></div>' +
        '<p class="small muted" style="margin:6px 0 0">Os emuladores não trazem jogos: usa só ROMs tuas, de jogos que tenhas, ou jogos homebrew livres.</p><div class="eg">' +
        all.map((x, k) => '<button class="et" data-k="' + k + '"><i>' + x.i + '</i><b>' + x.n + '</b><small>' + x.d + '</small></button>').join("") + '</div><div id="phoneBox" hidden></div><div id="megaBox" hidden></div>';
      box.querySelector("#emuIn").checked = LS.get("emuIn", true) !== false; setTimeout(() => { try{ phonePaint(); }catch(e){} }, 0);
      box.querySelectorAll(".et").forEach(b => b.onclick = () => { const x = all[+b.dataset.k];
        if(x.addRom){ addGame(); return; }
        if(x.mega){ megaOpen(false); return; }
        if(x.rom){ if(x.rom.key && !x.rom.u){ romGet(x.rom.key).then(buf => { if(!buf){ toast("Este jogo já não está guardado no carro. Envia-o de novo do telemóvel.", true); return; } const fn = (x.rom.key.match(/^file:(.+):\d+$/) || [])[1]; playRom({...x.rom, u:URL.createObjectURL(new Blob([buf])), buf, fname:fn}); }); return; } playRom(x.rom); return; }
        if(x.add){ const u = prompt("Endereço do emulador ou jogo (https://…)"); if(!u || !/^https?:\/\//i.test(u)) return; const n = prompt("Nome", "Jogo") || "Jogo"; const e = extra(); e.push({i:"⭐", n, d:u.replace(/^https?:\/\//, "").slice(0, 40), u}); LS.set("emuExtra", e); paint(); return; }
        open(x); }); };
    const win = document.createElement("div"); win.id = "emuWin"; win.innerHTML = '<div class="bar"><button id="emuBack">◀ Voltar</button><b id="emuT"></b><button id="emuZo" aria-label="Diminuir">−</button><button id="emuZv" aria-label="Repor o tamanho" style="min-width:64px">100%</button><button id="emuZi" aria-label="Aumentar">+</button><button id="emuRe" aria-label="Recarregar">⟳</button><button id="emuPad" aria-label="Comando no ecrã">🎮</button><button id="emuOut">Abrir fora</button></div><div class="zw" id="emuZw"><iframe id="emuF" allow="autoplay; fullscreen; gamepad; clipboard-write" allowfullscreen referrerpolicy="no-referrer"></iframe></div>';
    document.body.appendChild(win);
    /* v566: comando virtual: cruzeta, A/B/X/Y, L/R, Select e Start (mesmas teclas do comando no telemóvel) */
    { const vp = document.createElement("div"); vp.id = "emuVp"; const zw = win.querySelector("#emuZw") || win; zw.style.position = "relative"; zw.appendChild(vp);
      const B = (b, cls, txt, css) => '<button class="' + cls + '" data-b="' + b + '" style="' + css + '">' + txt + '</button>';
      const D = "clamp(56px,8vw,78px)";
      vp.innerHTML = B(12, "dp", "▲", "left:calc(24px + " + D + ");bottom:calc(30px + 2*" + D + ")") + B(14, "dp", "◀", "left:16px;bottom:calc(26px + " + D + ")") + B(15, "dp", "▶", "left:calc(32px + 2*" + D + ");bottom:calc(26px + " + D + ")") + B(13, "dp", "▼", "left:calc(24px + " + D + ");bottom:22px") +
        B(3, "fb", "Y", "right:calc(26px + clamp(62px,9vw,86px));bottom:calc(34px + 2*clamp(62px,9vw,86px))") + B(2, "fb", "X", "right:calc(40px + 2*clamp(62px,9vw,86px));bottom:calc(28px + clamp(62px,9vw,86px))") + B(1, "fb", "B", "right:14px;bottom:calc(28px + clamp(62px,9vw,86px))") + B(0, "fb", "A", "right:calc(26px + clamp(62px,9vw,86px));bottom:20px") +
        B(4, "sh", "L", "left:16px;top:8px") + B(5, "sh", "R", "right:16px;top:8px") + B(8, "sm", "Select", "left:50%;transform:translateX(-110%);bottom:16px") + B(9, "sm", "Start", "left:50%;transform:translateX(10%);bottom:16px");
      const held = {};
      const press = (btn, on) => { const b = +btn.dataset.b; btn.classList.toggle("on", on); try{ window.__padPress && window.__padPress(0, b, on); }catch(e){} if(on && navigator.vibrate) try{ navigator.vibrate(12); }catch(e){} };
      vp.addEventListener("pointerdown", e => { const btn = e.target.closest("button"); if(!btn) return; e.preventDefault(); try{ btn.setPointerCapture(e.pointerId); }catch(x){} held[e.pointerId] = btn; press(btn, true); });
      const up = e => { const btn = held[e.pointerId]; if(!btn) return; delete held[e.pointerId]; if(!Object.values(held).includes(btn)) press(btn, false); };
      vp.addEventListener("pointerup", up); vp.addEventListener("pointercancel", up); vp.addEventListener("lostpointercapture", up);
      vp.addEventListener("contextmenu", e => e.preventDefault());
      win.classList.toggle("vp", LS.get("emuVp", true) !== false);
      /* v574: esconder/mostrar (ecrã e telemóvel) e esconder sozinho quando se joga pelo telemóvel */
      const vpSet = on => { win.classList.toggle("vp", on); LS.set("emuVp", on); const pb = win.querySelector("#emuPad"); if(pb){ pb.style.background = on ? "#2b6cb0" : ""; pb.textContent = on ? "🎮" : "🎮̸"; } return on; };
      window.__emuVp = on => { if(!win.classList.contains("on")) return null; return vpSet(on == null ? !win.classList.contains("vp") : !!on); };
      let autoDone = "";
      window.__emuVpAuto = () => { if(!win.classList.contains("on") || LS.get("emuVpAuto", true) === false) return false; const k = document.getElementById("emuT").textContent; if(autoDone === k || !win.classList.contains("vp")) { autoDone = k; return false; } autoDone = k; win.classList.remove("vp"); const pb = win.querySelector("#emuPad"); if(pb){ pb.style.background = ""; pb.textContent = "🎮̸"; } toast("Comando no ecrã escondido: estás a jogar pelo telemóvel. Toca em 🎮 para o mostrar."); return true; };
      win.querySelector("#emuPad").classList.toggle("on", win.classList.contains("vp"));
    }
    let cur = null;
    /* v273: zoom da página do jogo (50 % a 200 %), guardado por jogo */
    const zKey = () => "emuZ:" + ((cur && (cur.u || cur.n)) || "");
    const zApply = () => { const z = Math.max(0.5, Math.min(2, +LS.get(zKey(), 1) || 1)), f = document.getElementById("emuF");
      f.style.width = (100 / z) + "%"; f.style.height = (100 / z) + "%"; f.style.transform = z === 1 ? "" : "scale(" + z + ")"; document.getElementById("emuZv").textContent = Math.round(z * 100) + "%"; };
    const zSet = d => { let z = +LS.get(zKey(), 1) || 1; z = d === 0 ? 1 : Math.max(0.5, Math.min(2, Math.round((z + d) * 10) / 10)); LS.set(zKey(), z); zApply(); };
    const out = u => { try{ const fs = typeof fsWrap === "function" ? fsWrap(u) : u; window.open(fs, "_blank"); }catch(e){ window.open(u, "_blank"); } };
    const open = x => { cur = x; if(LS.get("emuIn", true) === false){ out(x.u); return; }
      document.getElementById("emuT").textContent = x.n; const f0 = document.getElementById("emuF"); f0.removeAttribute("srcdoc"); f0.src = x.u; zApply(); win.classList.add("on");
      setTimeout(() => { if(cur === x && win.classList.contains("on")) toast("Se ficar em branco, o site não deixa abrir dentro: toca em «Abrir fora»."); }, 5000); };
    win.addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return;
      if(b.id === "emuBack"){ win.classList.remove("on"); const f = document.getElementById("emuF"); f.removeAttribute("srcdoc"); f.src = "about:blank"; }
      else if(b.id === "emuPad"){ window.__emuVp(); }
      else if(b.id === "emuZi") zSet(0.1); else if(b.id === "emuZo") zSet(-0.1); else if(b.id === "emuZv") zSet(0);
      else if(b.id === "emuRe" && cur){ const f = document.getElementById("emuF"); if(f.srcdoc){ const sd = f.srcdoc; f.srcdoc = ""; setTimeout(() => f.srcdoc = sd, 50); } else f.src = cur.u; }
      else if(b.id === "emuOut" && cur){ win.classList.remove("on"); const f = document.getElementById("emuF"); f.removeAttribute("srcdoc"); f.src = "about:blank";
        /* v564: jogos (ROMs) abrem fora numa página própria do Cockpit (emu/play.html), que lê a ROM guardada no aparelho ou o link */
        if(cur.rom){ const g = cur.rom, q = new URLSearchParams({s:g.s, n:g.n}); if(g.key) q.set("k", g.key); else q.set("u", g.px && typeof px === "function" && cfg.proxy ? px(g.u) : g.u); out(new URL("emu/play.html?" + q.toString(), location.href).href); }
        else out(cur.u); } });
    box.addEventListener("change", e => { if(e.target.id === "emuIn") LS.set("emuIn", e.target.checked); });
    box.addEventListener("contextmenu", e => { const b = e.target.closest(".et"); if(!b) return; e.preventDefault(); const t = b.querySelector("b").textContent; const g = games(); const i = g.findIndex(x => x.n === t); if(i >= 0 && confirm("Apagar «" + t + "» da lista?")){ g.splice(i, 1); LS.set("emuGames", g); paint(); } });
    paint();
    if(hub) hub.before(box); else V.appendChild(box);
    try{ const _sh = window.show; window.show = function(v){ if(v !== "games" && win.classList.contains("on")){ win.classList.remove("on"); document.getElementById("emuF").src = "about:blank"; } return _sh.apply(this, arguments); }; }catch(e){}
  }catch(e){ console.log("emuladores", e); }
})();
