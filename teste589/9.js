
(function(){
  try{
    const sel = document.getElementById("setFsl"); if(!sel) return;
    const get = () => { let m = LS.get("fsList", "all"); if(m === "group") m = "all"; return m; };
    sel.value = get();
    const push = () => { try{ if(window.ANDROID && Android.nfsl) Android.nfsl(get()); }catch(e){} };
    sel.onchange = () => { LS.set("fsList", sel.value); push(); try{ const b = document.getElementById("vFsl"); if(b) b.textContent = "☰ Lista: " + (sel.value === "off" ? "off" : "ligada"); }catch(e){} };
    push();
  }catch(e){}
})();
