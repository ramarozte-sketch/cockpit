
/* ===== Tesla: lista oficial dos operadores (MEO / NOS / Vodafone / personalizada) no Início ===== */
(function(){
  if(window.ANDROID) return;
  try{
  const OPS = {
    meo:{label:"MEO", src:"MEO: lista oficial de canais (set/26); MTV, MTV 00s, Trace Toca e E! saíram a 31/12/2025", list:["RTP 1", "RTP 2", "SIC", "TVI", "SIC Notícias", "RTP Notícias|RTP 3", "CNN Portugal|CNN PT", "CMTV", "News Now", "Globo", "11|Canal 11", "V+ TVI|TVI Ficção", "SIC Mulher", "SIC Novelas", "Veja", "Sport TV+", "Sport TV 1", "Sport TV 2", "Sport TV 3", "Sport TV 4", "Sport TV 5", "Sport TV 6", "Benfica TV|BTV", "NBA TV", "Eleven Sports 1|ELEVEN 1", "Eleven Sports 2|ELEVEN 2", "Eleven Sports 3|ELEVEN 3", "A Bola TV", "Porto Canal", "Sporting TV", "W-Sport", "Eurosport 1", "Eurosport 2", "Kombat Sport", "Disney Channel", "Cartoon Network", "Panda Kids", "SIC K", "Nickelodeon", "Disney Junior", "Panda", "Cartoonito", "Nick Jr.", "Baby TV", "Biggs", "Lolly Kids", "TVCine Top", "TVCine Edition", "TVCine Emotion", "TVCine Action", "Cinemundo", "Hollywood", "STAR Movies|FOX Movies", "AMC", "AXN Movies", "STAR Channel|FOX", "STAR Life|FOX Life", "STAR Crime|FOX Crime", "FOX Comedy|STAR Comedy", "AXN", "AXN White", "Syfy", "Dizi Channel|Dizi", "VinTV", "Discovery Channel", "História", "Odisseia", "National Geographic", "National Geographic Wild", "TVI Reality", "RTP Memória", "Canal Q|Q", "SIC Radical", "AMC Break", "Gametoon", "AMC Crime", "TLC", "SIC Caras", "Casa e Cozinha", "24 Kitchen", "Travelxp|Travel Channel", "Fashion TV", "Trace Urban", "MCM Pop", "MCM Top", "Afro Music", "Alma Lusa", "Mezzo", "RTP Açores", "RTP Madeira", "ARTV", "Localvisão TV", "Canção Nova", "UM Europa", "Record Europa|Record TV", "Record News", "Euronews", "RTP África", "TPA Notícias|TPA Internacional", "CNN", "Bloomberg", "Sky News", "BBC World News|BBC World", "France 24", "i24News", "NHK World", "CGTN", "Al Jazeera|AlJazeera", "TRT World", "TVE Internacional|TVEi", "TVE 24h", "TV Galicia", "TV5 Monde", "BFM TV", "BVN", "CCTV 4"]},
    nos:{label:"NOS", src:"NOS: plano de canais digitais (sem caixa)", list:["RTP 1", "RTP 2", "SIC", "TVI", "SIC Notícias", "RTP 3", "CNN Portugal|CNN PT", "CMTV", "Sport TV+", "Globo", "Canal 11|11", "TVI Reality", "SIC Mulher", "SIC Caras", "SIC Radical", "RTP Memória", "Porto Canal", "Sporting TV", "Disney Channel", "Nickelodeon", "Canal Panda|Panda", "Disney Junior", "Cartoon Network", "Nick Jr.", "Biggs", "Hollywood", "AXN Movies", "AXN", "AMC", "FOX", "FOX Life", "AXN White", "Canal Q|Q", "TLC", "MTV Portugal|MTV", "Record TV", "Discovery Channel", "National Geographic", "Odisseia", "Canal História|História", "AMC Break", "24 Kitchen", "Eurosport 1", "Eurosport 2", "Fuel TV", "MTV 00s", "MCM Top", "Mezzo", "MCM Pop", "Record News", "Canal 180", "Kuriakos TV", "Canção Nova", "RTP Madeira", "RTP Açores", "RTP África", "TPA Notícias", "STV Notícias", "Localvisão TV", "Rai Italia", "Euronews", "CNN", "Sky News", "Al Jazeera", "France 24", "CNBC", "Bloomberg", "TVE 24h", "Phoenix InfoNews", "NHK World", "CGTN", "ARTV", "TV Galicia", "TVE Internacional|TVEi", "TV5 Monde", "ARTE", "BVN", "RTL", "DW|Deutsche Welle", "KBS World", "CCTV 4"]},
    vodafone:{label:"Vodafone", src:"Vodafone: grelha sem caixa (ago/2023)", list:["RTP 1", "RTP 2", "SIC", "TVI", "SIC Notícias|SIC N", "RTP 3", "CNN Portugal|CNN", "CMTV", "Sport TV+|SPORTV+", "Globo", "Canal 11|11", "TVI Ficção", "Porto Canal", "SIC Caras", "SIC Radical|SIC R", "SIC Mulher|SIC M", "RTP Memória", "24 Kitchen", "Canal Q", "Eurosport 1|Eurosport", "Eurosport 2", "A Bola TV", "SCP|Sporting TV", "Fuel TV", "Disney Channel", "Disney Junior", "Cartoon Network", "Panda", "Biggs|Panda Biggs", "SIC K", "Cartoonito", "Nickelodeon", "Dizi", "Hollywood", "Cinemundo", "FOX Movies", "FOX", "AXN", "FOX Life", "FOX Crime", "FOX Comedy", "AXN White", "AXN Movies", "Syfy", "AMC", "MTV Portugal|MTV", "MTV 00s|MTV00s", "MCM Top", "C Music", "Trace Urban|Trace", "Trace Toca", "Discovery Channel|Discovery", "National Geographic|Nat Geo", "National Geographic Wild|Nat Geo Wild", "História|Historia", "Odisseia", "AMC Crime", "S+", "Casa e Cozinha", "TVI Reality", "Record TV", "AMC Break", "TLC", "E!", "Fashion TV", "Travel Channel|Travel", "BBC Entertainment", "Food Network", "Ginx", "Insight TV", "Gametoon", "ARTV", "Record News", "Euronews", "Bloomberg", "Sky News", "BBC World News|BBC World", "CNBC", "Al Jazeera|Aljazeera English", "TVE 24h", "DW", "France 24", "RTP Madeira", "RTP Açores", "Localvisão TV", "RTP África", "TPA", "Canal 180|180", "TV Galicia", "TVEi", "TV5 Monde", "RAI Uno|RAI 1", "RT DOC", "Russia Today", "PRO TV International", "NHK World", "Cubavision", "Freedom", "Canção Nova", "Kuriakos TV"]}
  };
  const opKey = () => { try{ return LS.get("tvOp", ""); }catch(e){ return ""; } };
  const opCustom = () => { try{ return String(LS.get("tvOpCustom", "") || ""); }catch(e){ return ""; } };
  const nrm = n => String(n || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^[\s\W_]*(pt|portugal)\b[\s|:\-\/]*/i, "").replace(/\[[^\]]*\]|\([^)]*\)/g, " ").replace(/\b(fhd|uhd|hd|sd|4k|8k|hevc|h265|raw|plus)\b/g, " ").replace(/[^a-z0-9]+/g, "");
  const opOrder = key => key === "custom" ? opCustom().split(/\r?\n/).map(x => x.trim()).filter(Boolean) : ((OPS[key] || {}).list || []);
  const opQual = () => { try{ return LS.get("tvOpQ", "uhd") === "hd" ? "hd" : "uhd"; }catch(e){ return "uhd"; } };
  /* troca a versão e, se estiver a dar um canal desta lista, passa logo para a outra versão dele (o ecrã total continua na lista) */
  function opToggle(){
    const k = opKey(); if(!k) return;
    LS.set("tvOpQ", opQual() === "hd" ? "uhd" : "hd");
    const ol = opChannels(k), hd = opQual() === "hd";
    toast("Lista " + ((OPS[k] || {}).label || "do operador") + ": canais em " + (hd ? "HD" : "Ultra HD"));
    try{
      const slot = tvTarget, c = lastPlayed[slot]; if(!c || c.kind !== "live") return;
      const b = nrm(c.name), nc = ol.find(x => nrm(x.name) === b); if(!nc) return;
      window.__src[slot] = ol.slice();
      if(nc.url !== c.url) playChannel(nc, slot, true);
    }catch(e){}
  }
  const opTitle = key => key === "custom" ? "Ordem personalizada" : "Canais " + ((OPS[key] || {}).label || "");
  function opChannels(key){
    const live = channels.filter(c => c.kind === "live"); if(!live.length) return [];
    const idx = new Map();
    for(const c of live){ const k = nrm(c.name); if(!k) continue; const a = idx.get(k) || []; a.push(c); idx.set(k, a); }
    /* áudio em português: só variantes de categorias PT (ou BR, AO, MZ, CV); categorias sem país vêm depois; ES, FR, GB… ficam de fora */
    const lang = c => { let k = ""; try{ k = window.__cty && window.__cty.ctyOfItem ? window.__cty.ctyOfItem(c) : (isPtGroup(c.group) ? "PT" : "??"); }catch(e){} return /^(PT|BR|AO|MZ|CV)$/.test(k) ? 0 : (k === "??" || k === "" || k.slice(0, 2) === "G:") ? 1 : 2; };
    /* v246: botão Ultra HD / HD no Início: escolhe a versão de cada canal (os nomes trazem «ᵁᴴᴰ», por isso NFKD) */
    const hdMode = opQual() === "hd";
    const tier = c => { const n = String(c.name || "").normalize("NFKD"); const u = /\b(uhd|4k|8k)\b/i.test(n), f = /\bfhd\b/i.test(n), h = /\bhd\b/i.test(n);
      return hdMode ? (u ? 3 : (f || h) ? 0 : 1) : (u ? 0 : f ? 1 : h ? 2 : 3); };
    const q = c => tier(c) + lang(c) * 10 + (isPtGroup(c.group) ? 0 : 5);
    const out = [], seen = new Set();
    for(const ent of opOrder(key)){
      let best = null;
      for(const alias of String(ent).split("|")){ const a = idx.get(nrm(alias)); if(a){ for(const c of a) if(!seen.has(c.url) && lang(c) < 2 && (!best || q(c) < q(best))) best = c; } }
      if(best){ seen.add(best.url); out.push(best); }
    }
    return out;
  }
  window.__op = {OPS, opKey, opCustom, opChannels, opTitle, opQual, opToggle};
  const w = $("ahSet");
  if(w){
    const d = document.createElement("div");
    d.innerHTML = '<label class="f" style="margin-top:8px">Lista do operador no Início (canais pela ordem da grelha)<select id="ahSetOp"><option value="">Desligada</option><option value="meo">MEO</option><option value="nos">NOS</option><option value="vodafone">Vodafone</option><option value="custom">Personalizada</option></select></label>' +
      '<label class="f" id="ahSetOpCw" hidden>Ordem personalizada (um canal por linha; «a|b» para nomes alternativos)<textarea id="ahSetOpC" rows="6" placeholder="RTP 1&#10;RTP 2&#10;SIC&#10;TVI"></textarea></label><p class="small muted" id="ahSetOpN" style="margin:4px 0 0"></p>';
    w.appendChild(d);
    const sel = $("ahSetOp"), ta = $("ahSetOpC"), note = $("ahSetOpN");
    const paint = () => {
      const k = opKey(); sel.value = k; $("ahSetOpCw").hidden = k !== "custom";
      const n = k ? opChannels(k).length : 0;
      note.textContent = !k ? "" : (n ? n + " canais da tua lista encontrados." : "Ainda não encontrei canais da tua lista com estes nomes.") + (k !== "custom" ? " Fonte: " + OPS[k].src + ". Canais premium só entram onde a grelha os indica; completa em «Personalizada»." : "");
    };
    ta.value = opCustom();
    sel.onchange = () => { LS.set("tvOp", sel.value); paint(); try{ window.__ah && window.__ah.render && (window.__ah.rr = null); }catch(e){} };
    ta.oninput = () => { LS.set("tvOpCustom", ta.value); paint(); };
    paint();
    const _fs = window.fillSettings; if(typeof _fs === "function") window.fillSettings = function(){ const r = _fs.apply(this, arguments); try{ paint(); }catch(e){} return r; };
  }
  }catch(e){ console.log("operadores", e); }
})();
