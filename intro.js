/* Full-screen intro: the page starts in dim, flickering light while a swarm of bats
   flies out of the card's moon straight toward the viewer, then the light comes up.
   Needs art.js (HauntCard.batPath). Usage: PageIntro.play(originX, originY) in CSS pixels. */
(function (global) {
  const TAU = Math.PI * 2;
  const DURATION = 4.4;
  let cv, ctx, w, h, dpr, raf = 0, bats = [], t0 = 0, origin = [0, 0];
  const frames = Array.from({ length: 20 }, (_, i) => new Path2D(HauntCard.batPath(Math.sin(i / 20 * TAU))));

  function setup() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.id = 'intro';
    cv.setAttribute('aria-hidden', 'true');
    Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '30', pointerEvents: 'none', display: 'none' });
    document.body.appendChild(cv);
    ctx = cv.getContext('2d');
    window.addEventListener('resize', size);
  }
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

  function makeSwarm() {
    const n = Math.round(Math.min(70, Math.max(36, (w * h) / 11000)));
    bats = Array.from({ length: n }, (_, i) => {
      const a = Math.random() * TAU, spread = Math.pow(Math.random(), 0.7);
      return {
        ts: 0.15 + Math.pow(i / n, 0.9) * 2.3 + rnd(-0.1, 0.1),
        X: Math.cos(a) * spread * w * 0.42, Y: Math.sin(a) * spread * h * 0.32 - h * 0.04,
        z: 6, v: rnd(3.2, 5.2), hz: rnd(7, 11), ph: Math.random(), wob: rnd(-1, 1), alive: true,
      };
    });
    // a few that come right at your face
    for (let i = 0; i < 4; i++) bats.push({ ts: 0.9 + i * 0.45, X: rnd(-0.08, 0.08) * w, Y: rnd(-0.06, 0.06) * h, z: 6, v: rnd(3.6, 4.4), hz: rnd(6, 8), ph: Math.random(), wob: rnd(-1, 1), alive: true, big: true });
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    if (t > DURATION) { cv.style.display = 'none'; raf = 0; return; }
    ctx.clearRect(0, 0, w, h);

    // dim light: darkness with a flickering glow that widens as the night "lights up"
    const flick = 1 + 0.05 * Math.sin(t * 23) + 0.035 * Math.sin(t * 37 + 1) + 0.02 * Math.sin(t * 61);
    const darkA = 0.93 * (1 - ease((t - 1.3) / 2.8));
    const r = (Math.min(w, h) * 0.32 + ease((t - 0.9) / 3.2) * Math.max(w, h) * 1.6) * flick;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(4,2,7,${darkA})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    const hole = ctx.createRadialGradient(origin[0], origin[1], 0, origin[0], origin[1], r);
    hole.addColorStop(0, 'rgba(0,0,0,0.85)'); hole.addColorStop(0.45, 'rgba(0,0,0,0.5)'); hole.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hole; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    const warm = ctx.createRadialGradient(origin[0], origin[1], 0, origin[0], origin[1], r * 0.9);
    warm.addColorStop(0, `rgba(255,170,90,${0.1 * darkA * flick})`); warm.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = warm; ctx.fillRect(0, 0, w, h);

    // bats flying toward the viewer (perspective: screen offset and size grow as 1/z)
    const unit = Math.min(w, h) / 390;
    ctx.fillStyle = '#030104';
    for (const b of bats) {
      if (!b.alive || t < b.ts) continue;
      const age = t - b.ts;
      b.z = 6 - b.v * age * (1 + age * 0.35);
      if (b.z < 0.13) { b.alive = false; continue; }
      const k = 0.6 / b.z;
      const wob = Math.sin(age * 5 + b.ph * TAU) * 14 * b.wob;
      const x = origin[0] + b.X * k + wob, y = origin[1] + b.Y * k + Math.sin(age * 3 + b.ph) * 10;
      const s = unit * (b.big ? 0.62 : 0.5) / b.z;
      if (x < -s * 60 || x > w + s * 60 || y < -s * 40 || y > h + s * 40) { if (b.z < 1) b.alive = false; continue; }
      const fi = Math.floor(((t * b.hz + b.ph) % 1) * 20) % 20;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(b.Y, b.X || 1) * 0.12 + wob * 0.004);
      ctx.scale(s, s);
      ctx.globalAlpha = Math.min(1, (6 - b.z) * 0.8);
      ctx.fill(frames[fi]);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function play(ox, oy) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setup(); size();
    origin = [ox ?? w / 2, oy ?? h * 0.3];
    makeSwarm();
    cv.style.display = 'block';
    cancelAnimationFrame(raf);
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }
  global.PageIntro = { play, DURATION };
})(window);
