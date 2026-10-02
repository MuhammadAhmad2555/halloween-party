/* Animated Halloween page background: stars, moon, fog, bats, leaves, embers, a ghost.
   Needs art.js loaded first (uses HauntCard.batPath). Draws into <canvas id="bg">. */
(function () {
  const cv = document.getElementById('bg');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  let w = 0, h = 0, dpr = 1;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
  }

  /* ---------- stars ---------- */
  let stars = [];
  function seedStars() {
    const n = Math.round(Math.min(160, (w * h) / 5200));
    stars = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.pow(Math.random(), 1.4) * h * 0.85,
      r: 0.5 + Math.pow(Math.random(), 3) * 1.6, a: rnd(0.25, 0.85), k: rnd(0.3, 1.4), p: Math.random() * TAU }));
  }

  /* ---------- fog ---------- */
  const fog = Array.from({ length: 5 }, (_, i) => ({ y: 0.72 + i * 0.06, r: rnd(0.45, 0.7), sp: rnd(0.008, 0.02) * (i % 2 ? 1 : -1), p: Math.random() }));

  /* ---------- bats ---------- */
  const batPaths = Array.from({ length: 16 }, (_, i) => new Path2D(HauntCard.batPath(Math.sin(i / 16 * TAU))));
  const bats = [];
  let nextBat = 0.6;
  function spawnBat(t) {
    const dir = Math.random() < 0.5 ? 1 : -1, s = rnd(0.28, 0.75);
    bats.push({ dir, s, x: dir > 0 ? -60 : w + 60, y: rnd(0.08, 0.6) * h, vy: rnd(-12, 12), sp: rnd(90, 170) * (0.6 + s),
      amp: rnd(10, 40), wav: rnd(0.6, 1.4), hz: rnd(5, 8), born: t, ph: Math.random() * TAU });
    // sometimes a small flock
    if (Math.random() < 0.35) for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const b = bats[bats.length - 1];
      bats.push(Object.assign({}, b, { x: b.x - dir * rnd(40, 140), y: b.y + rnd(-50, 50), s: b.s * rnd(0.6, 0.95), ph: Math.random() * TAU, hz: rnd(5, 8) }));
    }
  }

  /* ---------- leaves ---------- */
  const LEAF_COLORS = ['#C2562A', '#E8834A', '#8E3B1E', '#B5702E', '#6E2A18'];
  const leafPath = new Path2D('M0,-14 C6,-10 10,-4 9,3 C8,9 3,13 0,15 C-3,13 -8,9 -9,3 C-10,-4 -6,-10 0,-14Z M0,-14 L0,18');
  const leaves = Array.from({ length: 12 }, () => newLeaf(true));
  function newLeaf(anywhere) {
    return { x: Math.random() * w, y: anywhere ? Math.random() * h : -30, s: rnd(0.6, 1.3), vy: rnd(18, 40), sway: rnd(20, 60),
      sw: rnd(0.3, 0.8), rot: Math.random() * TAU, vr: rnd(-1.5, 1.5), c: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)], p: Math.random() * TAU };
  }

  /* ---------- embers ---------- */
  const embers = Array.from({ length: 26 }, () => newEmber(true));
  function newEmber(anywhere) {
    return { x: Math.random() * w, y: anywhere ? rnd(0.3, 1) * h : h + 10, vy: rnd(10, 26), r: rnd(1, 2.4), p: Math.random() * TAU, k: rnd(1, 3), dx: rnd(8, 24) };
  }

  /* ---------- ghost ---------- */
  const ghost = { active: false, next: 4 };
  function drawGhost(t) {
    if (!ghost.active) {
      if (t > ghost.next) Object.assign(ghost, { active: true, t0: t, dir: Math.random() < 0.5 ? 1 : -1, y: rnd(0.2, 0.55) * h, s: rnd(0.8, 1.2) });
      return;
    }
    const u = (t - ghost.t0) / 16;
    if (u > 1) { ghost.active = false; ghost.next = t + rnd(10, 18); return; }
    const x = ghost.dir > 0 ? -80 + u * (w + 160) : w + 80 - u * (w + 160);
    const y = ghost.y + Math.sin(t * 1.6) * 18;
    const fade = Math.min(1, u * 6, (1 - u) * 6);
    ctx.save();
    ctx.translate(x, y); ctx.scale(ghost.s * -ghost.dir, ghost.s); ctx.rotate(Math.sin(t * 1.2) * 0.08);
    ctx.globalAlpha = 0.14 * fade;
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
    g.addColorStop(0, 'rgba(241,230,208,0.9)'); g.addColorStop(1, 'rgba(241,230,208,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.3 * fade;
    ctx.fillStyle = '#F1E6D0';
    ctx.beginPath();
    ctx.moveTo(-22, 10); ctx.bezierCurveTo(-24, -34, 24, -34, 22, 10);
    const wv = Math.sin(t * 4) * 3;
    ctx.quadraticCurveTo(22, 30 + wv, 15, 32); ctx.quadraticCurveTo(11, 24, 7, 32 - wv); ctx.quadraticCurveTo(2, 24, -3, 32 + wv);
    ctx.quadraticCurveTo(-8, 24, -12, 32 - wv); ctx.quadraticCurveTo(-20, 30, -22, 10);
    ctx.fill();
    ctx.fillStyle = '#1A1030';
    ctx.beginPath(); ctx.ellipse(-8, -8, 3.4, 5, 0, 0, TAU); ctx.ellipse(8, -8, 3.4, 5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 4, 4, 5.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, w, h);

    // moon (the splash screen draws its own big one)
    if (!document.body.classList.contains('splash')) {
    const mr = Math.max(60, Math.min(w, h) * 0.11), mx = w * 0.84, my = h * 0.13;
    const glow = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2);
    glow.addColorStop(0, `rgba(246,196,126,${0.22 + 0.04 * Math.sin(t / 2)})`); glow.addColorStop(1, 'rgba(232,131,74,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    const mg = ctx.createRadialGradient(mx - mr * 0.25, my - mr * 0.25, mr * 0.1, mx, my, mr);
    mg.addColorStop(0, 'rgba(255,244,214,0.5)'); mg.addColorStop(0.6, 'rgba(248,220,156,0.38)'); mg.addColorStop(1, 'rgba(237,176,106,0.28)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(201,130,74,0.16)';
    for (const [dx, dy, cr] of [[-0.35, -0.25, 0.2], [0.25, 0.18, 0.26], [-0.1, 0.45, 0.12], [0.45, -0.38, 0.1]]) { ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, cr * mr, 0, TAU); ctx.fill(); }
    }

    // stars
    ctx.fillStyle = '#F1E6D0';
    for (const s of stars) {
      ctx.globalAlpha = s.a * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.k * TAU / 3 + s.p)));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawGhost(t);

    // bats
    if (t > nextBat) { spawnBat(t); nextBat = t + rnd(2.5, 6); }
    ctx.fillStyle = '#05030A';
    for (let i = bats.length - 1; i >= 0; i--) {
      const b = bats[i];
      b.x += b.dir * b.sp * dt; b.y += b.vy * dt;
      if (b.x < -200 || b.x > w + 200) { bats.splice(i, 1); continue; }
      const y = b.y + Math.sin(t * b.wav * TAU / 2 + b.ph) * b.amp;
      const fi = Math.floor(((t * b.hz + b.ph) % 1) * 16) & 15;
      ctx.save(); ctx.translate(b.x, y); ctx.rotate(b.dir * 0.08 * Math.cos(t * 2 + b.ph)); ctx.scale(b.s, b.s);
      ctx.globalAlpha = 0.92; ctx.fill(batPaths[fi]); ctx.restore();
    }
    ctx.globalAlpha = 1;

    // leaves
    for (const l of leaves) {
      l.y += l.vy * dt; l.rot += l.vr * dt;
      if (l.y > h + 30) Object.assign(l, newLeaf(false));
      const x = l.x + Math.sin(t * l.sw + l.p) * l.sway;
      ctx.save(); ctx.translate(x, l.y); ctx.rotate(l.rot); ctx.scale(l.s, l.s * (0.6 + 0.4 * Math.abs(Math.sin(t * 1.5 + l.p))));
      ctx.globalAlpha = 0.75; ctx.fillStyle = l.c; ctx.fill(leafPath);
      ctx.strokeStyle = 'rgba(40,14,6,0.6)'; ctx.lineWidth = 1; ctx.stroke(leafPath);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // embers
    for (const e of embers) {
      e.y -= e.vy * dt;
      if (e.y < h * 0.25) Object.assign(e, newEmber(false));
      const x = e.x + Math.sin(t * 0.8 + e.p) * e.dx;
      const a = (0.45 + 0.45 * Math.sin(t * e.k + e.p)) * Math.min(1, (e.y - h * 0.25) / (h * 0.2));
      const g = ctx.createRadialGradient(x, e.y, 0, x, e.y, e.r * 5);
      g.addColorStop(0, `rgba(255,195,90,${a})`); g.addColorStop(1, 'rgba(232,131,74,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, e.y, e.r * 5, 0, TAU); ctx.fill();
    }

    // fog along the bottom
    for (const f of fog) {
      const cx = ((f.p + t * f.sp) % 1.6 - 0.3) * w, cy = f.y * h, r = f.r * Math.max(w, h * 0.7);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(180,154,214,0.12)'); g.addColorStop(0.6, 'rgba(180,154,214,0.05)'); g.addColorStop(1, 'rgba(180,154,214,0)');
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.28);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
    }
  }

  resize();
  window.addEventListener('resize', resize);
  if (reduce) { draw(3, 0); return; }
  let last = performance.now(), start = last;
  (function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    draw((now - start) / 1000, dt);
    requestAnimationFrame(loop);
  })(last);
})();
