/* hls.js carrega em segundo plano: primeiro a cópia do próprio site (hls.min.js ao lado do index.html), depois as CDN.
   window.__hlsP resolve quando há leitor (ou quando todas as fontes falharam); os canais esperam por ele em vez de falhar. */
(function(){
  var src = ["hls.min.js", "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js", "https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js", "https://unpkg.com/hls.js@1.5.13/dist/hls.min.js"];
  if(typeof Android !== "undefined") src.shift();   /* app Android: não há cópia local */
  window.__hlsSrc = "";
  window.__hlsP = new Promise(function(done){
    var i = 0;
    var next = function(){
      if(window.Hls){ window.__hlsDone = true; return done(true); }
      if(i >= src.length){ window.__hlsDone = true; return done(false); }
      var u = src[i++], s = document.createElement("script"), t = setTimeout(function(){ s.onload = s.onerror = null; next(); }, 12000);
      s.src = u; s.async = true;
      s.onload = function(){ clearTimeout(t); if(window.Hls) window.__hlsSrc = u; next(); };
      s.onerror = function(){ clearTimeout(t); next(); };
      document.head.appendChild(s);
    };
    next();
  });
})();