/* Renders a card with the host's own text to a PNG or an MP4, right in the browser.
   Used once the card text has been edited, so downloads match what the host sees;
   unedited cards keep using the ready-made files in cards/. */
(function (global) {
  const NS = 'http://www.w3.org/2000/svg';
  const MUXER_URL = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.min.js';
  const FPS = 30, SECONDS = 10, STILL_AT = 9.5;
  const fontCache = new Map();

  function base64(buf) {
    const u = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }

  // An SVG drawn as an image cannot load web fonts, so the font files go inline as @font-face rules.
  function fontFaces(families) {
    const key = families.join('|');
    if (!fontCache.has(key)) {
      fontCache.set(key, (async () => {
        const link = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
        const css = await (await fetch(link.href)).text();
        const blocks = css.split(/(?=\/\* [\w-]+ \*\/)/)
          .filter(b => b.startsWith('/* latin */') && families.some(f => b.includes(`font-family: '${f}'`)));
        const faces = await Promise.all(blocks.map(async b => {
          const m = b.match(/url\((https:[^)]+)\)/);
          if (!m) return '';
          const buf = await (await fetch(m[1])).arrayBuffer();
          return b.replace(m[1], `data:font/woff2;base64,${base64(buf)}`);
        }));
        return faces.join('\n');
      })().catch(e => { fontCache.delete(key); throw e; }));
    }
    return fontCache.get(key);
  }

  // an off-screen copy of the card at full quality, drawn frame by frame onto a canvas
  async function rig(theme, party, w, h) {
    const box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;height:${h}px;overflow:hidden;pointer-events:none;`;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    box.appendChild(svg); document.body.appendChild(box);
    try {
      const card = HauntCard.create(svg, { theme, party });
      const font = HauntCard.themeStyle[card.theme].font[0];
      const [faces] = await Promise.all([fontFaces(['Cinzel', 'Cormorant Garamond', font]), card.ready]);
      if (w / h > 0.5) card.setAspect(9 / 16); else card.setFit(w, h); // 9:16 card with its frame, or the tall phone version
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      const xs = new XMLSerializer(), style = `<style>${faces}</style>`;
      async function draw(t) {
        card.setTime(t);
        const xml = xs.serializeToString(svg).replace(/<svg\b[^>]*>/, m => m + style);
        const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
        try {
          const img = new Image();
          img.src = url;
          await img.decode();
          ctx.drawImage(img, 0, 0, w, h);
        } finally { URL.revokeObjectURL(url); }
      }
      await draw(STILL_AT); // first draw lets the inlined fonts settle before anything is kept
      return { canvas, draw, done: () => box.remove() };
    } catch (e) { box.remove(); throw e; }
  }

  async function png(theme, party, tall) {
    const r = await rig(theme, party, tall ? 1290 : 1080, tall ? 2796 : 1920);
    try {
      await r.draw(STILL_AT);
      return await new Promise((res, rej) => r.canvas.toBlob(b => (b ? res(b) : rej(new Error('PNG failed'))), 'image/png'));
    } finally { r.done(); }
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = Object.assign(document.createElement('script'), { src, onload: res, onerror: () => rej(new Error('Could not load ' + src)) });
      document.head.appendChild(s);
    });
  }

  const canMakeVideo = () => typeof VideoEncoder === 'function' && typeof VideoFrame === 'function';

  async function pickCodec(w, h) {
    for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.420028']) {
      const cfg = { codec, width: w, height: h, bitrate: 5e6, framerate: FPS, avc: { format: 'avc' } };
      try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch (e) {}
    }
    throw new Error('This browser cannot encode H.264 video.');
  }

  // the same 10-second, 1080x1920, 30 fps H.264 MP4 as the ready-made files
  async function video(theme, party, onProgress) {
    if (!canMakeVideo()) throw new Error('This browser cannot make videos.');
    if (!global.Mp4Muxer) await loadScript(MUXER_URL);
    const W = 1080, H = 1920, N = FPS * SECONDS;
    const cfg = await pickCodec(W, H);
    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width: W, height: H, frameRate: FPS },
      fastStart: 'in-memory',
    });
    let failure = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { failure = e; } });
    enc.configure(cfg);
    const r = await rig(theme, party, W, H);
    try {
      for (let i = 0; i < N; i++) {
        await r.draw(i / FPS);
        const frame = new VideoFrame(r.canvas, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        enc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
        frame.close();
        if (failure) throw failure;
        while (enc.encodeQueueSize > 4) await new Promise(res => setTimeout(res, 5));
        if (onProgress) onProgress((i + 1) / N);
      }
      await enc.flush();
      if (failure) throw failure;
      muxer.finalize();
      return new Blob([muxer.target.buffer], { type: 'video/mp4' });
    } finally {
      r.done();
      if (enc.state !== 'closed') enc.close();
    }
  }

  global.CardExport = { png, video, canMakeVideo };
})(window);
