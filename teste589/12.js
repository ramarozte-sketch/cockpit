/* ===== Tesla: países das categorias e controlo parental (mesmo código da app Android) ===== */
(function(){
  if(window.ANDROID) return;
  const MAP = {PORTUGAL:"PT",PORTUGUES:"PT",PORTUGUESA:"PT",SPAIN:"ES",ESPANA:"ES",ESPANHA:"ES",BRASIL:"BR",BRAZIL:"BR",FRANCE:"FR",FRANCA:"FR",ITALY:"IT",ITALIA:"IT",GERMANY:"DE",DEUTSCHLAND:"DE",ALEMANHA:"DE",ENGLAND:"GB",ANGOLA:"AO",MOCAMBIQUE:"MZ",CANADA:"CA",NETHERLANDS:"NL",HOLLAND:"NL",TURKEY:"TR",TURKIYE:"TR",ARABIC:"AR",ARAB:"AR"};
  const FIX = {UK:"GB", EL:"GR"};
  const KNOWN = {PT:1,ES:1,BR:1,FR:1,GB:1,UK:1,US:1,NL:1,AO:1,MZ:1,TR:1,MX:1,CV:1};   /* só códigos que não se confundem com palavras («DE», «IN», «IT», «NO»…) */
  let st = null;
  const load = () => { try{ st = JSON.parse(localStorage.getItem("ck_tvCty") || "{}") || {}; }catch(e){ st = {}; } st.order = st.order || []; st.hide = st.hide || []; return st; };
  const state = () => st || load();
  const ctyOf = g => {
    g = String(g || "");
    let m = /^[^A-Za-zÀ-ÿ]*([A-Za-z]{2,3})\s*(?:\||:|-|–|—|\]|\))/.exec(g);
    if(m){ const c = m[1].toUpperCase(); return FIX[c] || c; }
    m = /^[^A-Za-zÀ-ÿ]*([A-Za-zÀ-ÿ]{4,})/.exec(g);
    if(m){ const w = m[1].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); if(MAP[w]) return MAP[w]; }
    /* filmes e séries: o país nem sempre vem no início («FILMES | PT», «Séries - Portugal», «Netflix PT») */
    const toks = g.split(/[^A-Za-zÀ-ÿ]+/).filter(Boolean);
    for(const t of toks){ if(KNOWN[t]) return FIX[t] || t; }
    for(const t of toks){ const w = t.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); if(w.length > 3 && MAP[w]) return MAP[w]; }
    /* sem país (Ação, Comédia, Terror…): cada categoria fica individual, para a poderes ordenar ou esconder */
    return g.trim() ? "G:" + g.trim() : "??";
  };
  /* país de um item: a categoria; se não disser, o prefixo do nome («|PT| Título») */
  const ctyOfItem = c => { if(c && c.ctry) return c.ctry; let k = ctyOf(c && c.group); if((k === "??" || k.slice(0, 2) === "G:") && c && c.name){ const n = ctyOf(c.name); if(n !== "??" && n.slice(0, 2) !== "G:") k = n; } return k; };
  window.__par = {unlocked:false, re:/(^|[^a-z0-9])(xxx|adult[oa]?s?|adulto|porn\w*|er[oó]tic\w*|sexy|18\+|\+18|hentai|playboy|hustler|brazzers|for adults|xxxx)([^a-z0-9]|$)/i,
    on(){ try{ return !!localStorage.getItem("ck_parPin"); }catch(e){ return false; } },
    blocksText(t){ return this.on() && !this.unlocked && this.re.test(String(t || "")); },
    blocks(c){ return !!c && this.blocksText((c.group || "") + " " + (c.name || "")); }};
  window.__cty = {
    ctyOf, ctyOfItem, state, reload: load,
    hiddenItem: c => state().hide.indexOf(ctyOfItem(c)) >= 0 || window.__par.blocks(c),
    rankItem: c => { const k = ctyOfItem(c), i = state().order.indexOf(k); return i >= 0 ? i : (k === "PT" ? -1 : 1000); },
    save: () => { try{ localStorage.setItem("ck_tvCty", JSON.stringify(state())); }catch(e){} },
    rank: g => { const c = ctyOf(g), i = state().order.indexOf(c); return i >= 0 ? i : (c === "PT" ? -1 : 1000); },
    hidden: g => state().hide.indexOf(ctyOf(g)) >= 0 || window.__par.blocksText(g),
    active: () => { const x = state(); return x.order.length > 0 || x.hide.length > 0; },
    name: c => { if(c === "??") return "Outros"; if(c.slice(0, 2) === "G:") return c.slice(2); try{ const n = new Intl.DisplayNames(["pt"], {type:"region"}).of(c); return n && n !== c ? n : c; }catch(e){ return c; } },
    flag: c => c.slice(0, 2) === "G:" ? "\u{1F3F7}" : /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map(ch => 127397 + ch.charCodeAt(0))) : "\u{1F310}"
  };
})();