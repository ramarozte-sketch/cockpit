/* v312: descodificador H.264 com WebCodecs (VideoDecoder), com o mesmo protocolo do h264soft.js.
   Só é usado quando Definições → Motor de descodificação = WebCodecs (por defeito o h264soft.js continua a ser usado). */
let dec = null, cfgOk = false, eps = new Map(), curEp = 0, pending = 0, lastErr = null;
const ver = 2;
function fail(msg){ lastErr = msg; postMessage({type:"error", msg}); }
function ensure(extra){
  if(dec && cfgOk) return;
  if(!self.VideoDecoder){ fail("open: sem WebCodecs neste browser"); return; }
  dec = new VideoDecoder({
    output: frame => {
      const ts = frame.timestamp, ep = eps.get(ts); eps.delete(ts);
      createImageBitmap(frame).then(bmp => {
        postMessage({type:"frame", ts, w: frame.displayWidth, h: frame.displayHeight, bmp, ep}, [bmp]);
      }).catch(e => fail("bitmap: " + (e && e.message)))
        .finally(() => { try{ frame.close(); }catch(e){} });
    },
    error: e => fail("descodificar: " + (e && e.message))
  });
  const c = {codec: "avc1.640028", hardwareAcceleration: "prefer-hardware", optimizeForLatency: true};
  if(extra) c.description = extra;
  VideoDecoder.isConfigSupported(c).then(r => {
    if(!r.supported){ fail("open: H.264 não suportado por WebCodecs"); return; }
    dec.configure(c); cfgOk = true; postMessage({type:"ready", ver});
  }).catch(e => fail("open: " + (e && e.message)));
}
onmessage = e => {
  const d = e.data;
  if(d.cmd === "warm"){ postMessage({type:"ready", ver}); return; }
  if(d.cmd === "open"){ curEp = d.ep || 0; ensure(d.extra ? new Uint8Array(d.extra) : null); return; }
  if(d.cmd === "fast" || d.cmd === "shift" || d.cmd === "bob" || d.cmd === "gpu") return;  /* sem efeito neste descodificador */
  if(d.cmd === "decode"){
    if(!dec || !cfgOk){ ensure(null); }
    if(!dec || !cfgOk) return;
    try{
      eps.set(d.ts, d.ep);
      pending++;
      dec.decode(new EncodedVideoChunk({type: d.key ? "key" : "delta", timestamp: d.ts, data: d.data}));
      postMessage({type:"done", n:1, ms:0, ep:d.ep});
    }catch(err){ fail("decode: " + (err && err.message)); }
    return;
  }
  if(d.cmd === "drain"){
    const ep = d.ep;
    if(!dec || !cfgOk){ postMessage({type:"drained", n:0, ep}); return; }
    dec.flush().then(() => postMessage({type:"drained", n:0, ep})).catch(err => { fail("drain: " + (err && err.message)); postMessage({type:"drained", n:0, ep}); });
    return;
  }
  if(d.cmd === "flush"){
    eps.clear(); pending = 0; curEp = d.ep || curEp;
    try{ if(dec && cfgOk && dec.state !== "closed") dec.reset(); }catch(err){ fail("flush: " + (err && err.message)); }
    return;
  }
};
