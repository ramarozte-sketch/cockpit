
(function(){
  if(window.ANDROID) return;
  try{
  const o = $("tsDgOut"); if(!o) return;
  const l = document.createElement("label"); l.className = "f"; l.style.marginTop = "6px";
  l.innerHTML = 'Otimizações de vídeo e som do Tesla<select id="teslaOpt"><option value="auto">Automático (só no browser do Tesla)</option><option value="on">Sempre ligadas (também neste browser)</option><option value="off">Desligadas</option></select>';
  o.parentNode.insertBefore(l, o);
  const sel = $("teslaOpt"); sel.value = LS.get("teslaOpt", "auto");
  sel.onchange = () => { LS.set("teslaOpt", sel.value); toast("Guardado. Recarrega a página para aplicar."); };
  }catch(e){}
})();
