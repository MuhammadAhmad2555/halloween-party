/* The Haunted Manor: Halloween invitation artwork.
   Shared by the renderer (card/render.html) and the website (site/index.html).
   Usage: const card = HauntCard.create(svgElement, { text, grain, party });
          await card.ready; card.setTime(seconds);
   Timeline: 0-3.4 s bat-swarm intro, then ambient animation forever. */
(function (global) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1080, H = 1920, CX = 540;
  const MOON = { x: 540, y: 700, r: 235 };
  const C = {
    cream: '#F1E6D0', ember: '#E8834A', flame: '#FFC35A',
    sil: '#0D0716', silMid: '#170E26', silBack: '#2A1842', silFar: '#3A2152', ground: '#0E0818',
  };
  const TAU = Math.PI * 2;
  const INTRO = 3.4;

  const DEFAULT_PARTY = {
    eyebrow: 'YOU ARE SUMMONED TO',
    title1: 'The Halloween', title2: 'Party',
    date: 'SATURDAY · 31 OCTOBER',
    time: 'from eight o’clock in the evening',
    venue: 'HOLLOW HOUSE',
    address: '13 Raven Lane',
    note: 'costumes required · fortunes told at midnight',
    rsvpLabel: 'RSVP ON WHATSAPP',
    rsvpNumber: '0301 476 1794',
  };

  function rng(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t, a, b) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const f2 = n => Math.round(n * 100) / 100;

  /* Bat silhouette, wingspan ~100 units, centred on its body. flap: 1 = wings up, -1 = down. */
  function batPath(flap) {
    const f = flap, ty = -18 - 26 * f, tx = 50 - 7 * Math.abs(f);
    const wing = s => {
      const X = x => f2(s * x);
      return `M${X(4)},-5 C${X(16)},${f2(-10 - 9 * f)} ${X(30)},${f2(-15 - 15 * f)} ${X(tx)},${f2(ty)} ` +
        `Q${X(tx - 7)},${f2(-6 - 14 * f)} ${X(tx - 10)},${f2(4 - 9 * f)} Q${X(33)},${f2(-3 - 7 * f)} ${X(27)},${f2(6 - 5 * f)} ` +
        `Q${X(20)},${f2(-1 - 2 * f)} ${X(13)},8 Q${X(8)},2 ${X(4)},6Z`;
    };
    const body = 'M0,-13 L-3.5,-17.5 L-4.5,-9.5 C-7,-6 -7,6 -3,12 L0,15 L3,12 C7,6 7,-6 4.5,-9.5 L3.5,-17.5Z';
    return wing(1) + wing(-1) + body;
  }

  function create(svg, opts = {}) {
    const OPT = { text: opts.text !== false, grain: !!opts.grain, lite: !!opts.lite };
    const P = Object.assign({}, DEFAULT_PARTY, opts.party || {});
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const uid = 'hc' + Math.floor(Math.random() * 1e6);
    const id = n => `${uid}-${n}`, url = n => `url(#${id(n)})`;

    function el(tag, attrs = {}, parent = svg) {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    }
    const anim = [];

    /* ---------- defs ---------- */
    const defs = el('defs');
    defs.innerHTML = `
      <linearGradient id="${id('sky')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0A0717"/><stop offset="0.3" stop-color="#1A1030"/>
        <stop offset="0.5" stop-color="#2E1846"/><stop offset="0.6" stop-color="#4A2350"/><stop offset="0.68" stop-color="#5E2C4C"/>
      </linearGradient>
      <radialGradient id="${id('moon')}" cx="0.4" cy="0.36" r="0.7">
        <stop offset="0" stop-color="#FFF4D6"/><stop offset="0.45" stop-color="#F8DC9C"/>
        <stop offset="0.8" stop-color="#EDB06A"/><stop offset="1" stop-color="#D98A4C"/>
      </radialGradient>
      <radialGradient id="${id('moonGlow')}">
        <stop offset="0.38" stop-color="#F6C47E" stop-opacity="0.55"/><stop offset="0.55" stop-color="#E8834A" stop-opacity="0.2"/>
        <stop offset="1" stop-color="#E8834A" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id('horizon')}" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#E8834A" stop-opacity="0.35"/><stop offset="1" stop-color="#E8834A" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id('win')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFD98A"/><stop offset="1" stop-color="#E8834A"/>
      </linearGradient>
      <radialGradient id="${id('glow')}">
        <stop offset="0" stop-color="#FFB25A" stop-opacity="0.6"/><stop offset="0.4" stop-color="#E8834A" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#E8834A" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id('fog')}">
        <stop offset="0" stop-color="#CBB5E8" stop-opacity="0.26"/><stop offset="0.6" stop-color="#B49AD6" stop-opacity="0.1"/>
        <stop offset="1" stop-color="#B49AD6" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id('pumpkin')}" cx="0.45" cy="0.4" r="0.65">
        <stop offset="0" stop-color="#E3803F"/><stop offset="0.7" stop-color="#B9562A"/><stop offset="1" stop-color="#7E3519"/>
      </radialGradient>
      <linearGradient id="${id('title')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFF4DE"/><stop offset="1" stop-color="#F3C98C"/>
      </linearGradient>
      <linearGradient id="${id('groundFade')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1A0F2B"/><stop offset="0.25" stop-color="${C.ground}"/><stop offset="1" stop-color="#08050F"/>
      </linearGradient>
      <radialGradient id="${id('vig')}" cx="0.5" cy="0.45" r="0.75">
        <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="0.85" stop-color="#000" stop-opacity="0.3"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.6"/>
      </radialGradient>
      <radialGradient id="${id('introDark')}" gradientUnits="userSpaceOnUse" cx="${MOON.x}" cy="${MOON.y}" r="1100">
        <stop offset="0" stop-color="#05030A" stop-opacity="0"/><stop offset="0.215" stop-color="#05030A" stop-opacity="0.05"/>
        <stop offset="0.34" stop-color="#05030A" stop-opacity="0.9"/><stop offset="1" stop-color="#05030A" stop-opacity="0.98"/>
      </radialGradient>
      <filter id="${id('titleGlow')}" x="-20%" y="-40%" width="140%" height="180%">
        <feGaussianBlur stdDeviation="14"/>
      </filter>
      <filter id="${id('grain')}" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="5" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>`;

    /* ---------- sky ---------- */
    el('rect', { width: W, height: H, fill: url('sky') });
    el('ellipse', { cx: CX, cy: 1000, rx: 760, ry: 260, fill: url('horizon') });

    (function stars() {
      const g = el('g');
      const R = rng(99), list = [];
      const n = OPT.lite ? 110 : 190;
      for (let i = 0; i < n; i++) {
        const x = R() * W, y = Math.pow(R(), 1.5) * 1000;
        const d = Math.hypot(x - MOON.x, y - MOON.y);
        if (d < MOON.r + 30) continue;
        const r = 0.8 + Math.pow(R(), 3) * 2.4, base = 0.25 + R() * 0.6;
        const c = el('circle', { cx: f2(x), cy: f2(y), r: f2(r), fill: C.cream, opacity: base }, g);
        list.push({ c, base, k: 0.3 + R() * 1.2, ph: R() * TAU });
      }
      anim.push(t => { for (const s of list) s.c.setAttribute('opacity', f2(s.base * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * s.k * t + s.ph))))); });
    })();

    /* ---------- moon ---------- */
    const moonGlow = el('circle', { cx: MOON.x, cy: MOON.y, r: 560, fill: url('moonGlow') });
    el('circle', { cx: MOON.x, cy: MOON.y, r: MOON.r, fill: url('moon') });
    for (const [dx, dy, r, o] of [[-80, -60, 46, 0.18], [60, 40, 62, 0.14], [-30, 110, 30, 0.16], [110, -90, 24, 0.16], [-130, 50, 20, 0.14], [20, -140, 16, 0.12], [150, 110, 18, 0.12]])
      el('circle', { cx: MOON.x + dx, cy: MOON.y + dy, r, fill: '#C9824A', opacity: o });
    anim.push(t => moonGlow.setAttribute('opacity', f2(0.85 + 0.15 * Math.sin(TAU * t / 4))));

    /* ---------- ambient bats circling the moon ---------- */
    const circling = [];
    (function ambientBats() {
      const g = el('g');
      const R = rng(4);
      for (let i = 0; i < 7; i++) {
        const b = {
          node: el('path', { fill: C.sil }, g), rx: 300 + R() * 160, ry: 90 + R() * 90, cy: MOON.y - 40 + R() * 80,
          period: 6 + R() * 5, ph: R(), dir: R() < 0.5 ? 1 : -1, s: 0.38 + R() * 0.42, flapHz: 2.6 + R() * 1.6, tilt: (R() - 0.5) * 0.5,
        };
        circling.push(b);
      }
      anim.push(t => {
        const show = smooth(t, 2.2, 3.4);
        for (const b of circling) {
          const a = TAU * (b.dir * t / b.period + b.ph);
          const x = CX + b.rx * Math.cos(a), y = b.cy + b.ry * Math.sin(a) + b.tilt * b.rx * Math.cos(a) * 0.3;
          const depth = 0.8 + 0.25 * Math.sin(a);
          b.node.setAttribute('d', batPath(Math.sin(TAU * b.flapHz * t + b.ph * 7)));
          b.node.setAttribute('transform', `translate(${f2(x)},${f2(y)}) scale(${f2(b.s * depth)})`);
          b.node.setAttribute('opacity', f2(show));
        }
      });
    })();

    /* ---------- far + back hills ---------- */
    el('path', { d: 'M0,955 C120,925 220,940 330,960 C430,975 520,930 640,925 C780,920 900,960 1080,935 L1080,1200 L0,1200Z', fill: C.silFar });
    (function farTrees() {
      const g = el('g', { fill: C.silFar });
      for (const [x, y, h] of [[90, 935, 46], [140, 940, 30], [880, 945, 40], [960, 940, 54], [1010, 938, 32]]) {
        el('path', { d: `M${x - 3},${y} L${x - 1.5},${y - h} L${x + 1.5},${y - h} L${x + 3},${y}Z M${x},${y - h * 0.6} L${x - h * 0.35},${y - h * 0.9} M${x},${y - h * 0.45} L${x + h * 0.3},${y - h * 0.8}`, stroke: C.silFar, 'stroke-width': 2.5 }, g);
      }
    })();
    el('path', { d: 'M0,1000 C150,965 260,990 380,1000 C480,1008 600,985 720,990 C860,995 960,1015 1080,990 L1080,1250 L0,1250Z', fill: C.silBack });

    /* ---------- manor ---------- */
    const windows = [];
    (function manor() {
      const g = el('g', { fill: C.sil });
      // crooked right tower
      const rt = el('g', { transform: 'rotate(2.5 725 1010)' }, g);
      el('rect', { x: 690, y: 700, width: 70, height: 320 }, rt);
      el('path', { d: 'M676,708 L725,535 L774,708Z' }, rt);
      el('path', { d: 'M725,540 L725,488', stroke: C.sil, 'stroke-width': 4 }, rt);
      el('path', { d: 'M725,500 L752,508 L725,516Z' }, rt);
      el('path', { d: 'M682,708 L768,708 L768,720 L682,720Z' }, rt);
      // left tower
      const lt = el('g', { transform: 'rotate(-2 330 1010)' }, g);
      el('rect', { x: 298, y: 765, width: 62, height: 255 }, lt);
      el('path', { d: 'M286,772 L329,632 L372,772Z' }, lt);
      el('path', { d: 'M329,636 L329,600', stroke: C.sil, 'stroke-width': 3.5 }, lt);
      el('circle', { cx: 329, cy: 598, r: 5 }, lt);
      // wings and main hall
      el('rect', { x: 340, y: 900, width: 80, height: 120 }, g);
      el('path', { d: 'M332,905 L380,850 L428,905Z' }, g);
      el('rect', { x: 662, y: 905, width: 140, height: 115 }, g);
      el('path', { d: 'M655,910 L735,852 L812,910Z' }, g);
      el('rect', { x: 600, y: 735, width: 26, height: 80 }, g);
      el('rect', { x: 596, y: 730, width: 34, height: 9 }, g);
      el('rect', { x: 410, y: 830, width: 262, height: 190 }, g);
      el('path', { d: 'M394,838 L541,698 L688,838Z' }, g);
      el('path', { d: 'M388,840 L694,840 L694,850 L388,850Z' }, g);
      // fence posts in front
      for (let x = 395; x <= 690; x += 22) el('path', { d: `M${x - 2},1022 L${x - 2},990 L${x},982 L${x + 2},990 L${x + 2},1022Z` }, g);
      el('rect', { x: 392, y: 998, width: 300, height: 3 }, g);

      const R = rng(21);
      const win = (x, y, w, h, base, parent = g) => {
        const glow = el('circle', { cx: x, cy: y + h / 2, r: w * 2.2, fill: url('glow'), opacity: 0.5 }, g);
        const d = `M${x - w / 2},${y + h} L${x - w / 2},${y + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${y + w / 2} L${x + w / 2},${y + h}Z`;
        const pane = el('path', { d, fill: url('win') }, parent);
        el('path', { d: `M${x},${y + 2} L${x},${y + h} M${x - w / 2},${y + h * 0.58} L${x + w / 2},${y + h * 0.58}`, stroke: C.sil, 'stroke-width': 2.4 }, parent);
        windows.push({ pane, glow, base, k1: 1 + R() * 3, k2: 4 + R() * 5, ph: R() * TAU, off: R() < 0.2 ? R() * 8 : -1 });
      };
      for (const x of [446, 498, 584, 636]) { win(x, 862, 26, 42, 0.95); win(x, 932, 26, 42, 0.8); }
      win(541, 772, 30, 34, 1);
      win(380, 932, 22, 36, 0.7);
      win(329, 805, 18, 34, 0.85, lt);
      win(725, 745, 20, 36, 1, rt);
      win(725, 830, 20, 36, 0.75, rt);
      win(760, 940, 22, 36, 0.9);
      // door
      const door = el('path', { d: 'M524,1020 L524,968 A17,17 0 0 1 558,968 L558,1020Z', fill: url('win'), opacity: 0.75 }, g);
      windows.push({ pane: door, glow: null, base: 0.7, k1: 2, k2: 7, ph: 1, off: -1 });
      anim.push(t => {
        for (const w of windows) {
          let v = w.base * (0.82 + 0.1 * Math.sin(TAU * w.k1 * t / 3 + w.ph) + 0.08 * Math.sin(TAU * w.k2 * t / 3 + w.ph * 2));
          if (w.off >= 0) { const c = (t + w.off) % 9; if (c > 6.2 && c < 7.4) v *= 0.15; }
          w.pane.setAttribute('opacity', f2(v));
          if (w.glow) w.glow.setAttribute('opacity', f2(0.55 * v));
        }
      });
    })();

    /* ---------- mid hill + graves ---------- */
    el('path', { d: 'M0,1062 C170,1030 330,1012 460,1018 C560,1022 620,1014 720,1020 C860,1030 960,1048 1080,1066 L1080,1300 L0,1300Z', fill: C.silMid });
    (function graves() {
      const g = el('g', { fill: C.sil });
      const stones = [[150, 1050, 26, 40, -6], [205, 1042, 22, 32, 4], [262, 1036, 30, 44, -3], [820, 1036, 28, 42, 5], [880, 1044, 22, 30, -4], [936, 1052, 26, 38, 3]];
      for (const [x, y, w, h, r] of stones)
        el('path', { d: `M${x - w / 2},${y} L${x - w / 2},${y - h + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${y - h + w / 2} L${x + w / 2},${y}Z`, transform: `rotate(${r} ${x} ${y})` }, g);
      for (const [x, y, s, r] of [[315, 1032, 1, 6], [765, 1030, 0.9, -5]])
        el('path', { d: `M${x - 4 * s},${y} L${x - 4 * s},${y - 30 * s} L${x - 14 * s},${y - 30 * s} L${x - 14 * s},${y - 38 * s} L${x - 4 * s},${y - 38 * s} L${x - 4 * s},${y - 50 * s} L${x + 4 * s},${y - 50 * s} L${x + 4 * s},${y - 38 * s} L${x + 14 * s},${y - 38 * s} L${x + 14 * s},${y - 30 * s} L${x + 4 * s},${y - 30 * s} L${x + 4 * s},${y}Z`, transform: `rotate(${r} ${x} ${y})` }, g);
    })();

    /* ---------- fog ---------- */
    function fogBand(y, n, seed, amp, speed, op) {
      const g = el('g', { opacity: op });
      const R = rng(seed), parts = [];
      for (let i = 0; i < n; i++) {
        const e = el('ellipse', { cx: f2(-100 + R() * (W + 200)), cy: f2(y + (R() - 0.5) * 40), rx: f2(260 + R() * 220), ry: f2(36 + R() * 30), fill: url('fog') }, g);
        parts.push({ e, ph: R() * TAU, a: amp * (0.6 + R() * 0.8) });
      }
      anim.push(t => { for (const p of parts) p.e.setAttribute('transform', `translate(${f2(p.a * Math.sin(TAU * t / speed + p.ph))},0)`); });
    }
    fogBand(1045, 7, 3, 70, 14, 1);

    /* ---------- framing trees ---------- */
    function tree(x0, y0, seed, lean) {
      const R = rng(seed);
      let d = '';
      function branch(x, y, ang, len, w, depth) {
        const bend = (R() - 0.5) * 0.35;
        const a2 = ang + bend;
        const x1 = x + Math.cos(a2) * len, y1 = y + Math.sin(a2) * len;
        const w1 = Math.max(w * 0.62, 1.2);
        const nx = -Math.sin(ang), ny = Math.cos(ang), nx1 = -Math.sin(a2), ny1 = Math.cos(a2);
        const mx = (x + x1) / 2 + nx * bend * len * 0.3, my = (y + y1) / 2 + ny * bend * len * 0.3;
        d += `M${f2(x + nx * w / 2)},${f2(y + ny * w / 2)} Q${f2(mx + nx * (w + w1) / 4)},${f2(my + ny * (w + w1) / 4)} ${f2(x1 + nx1 * w1 / 2)},${f2(y1 + ny1 * w1 / 2)} ` +
             `L${f2(x1 - nx1 * w1 / 2)},${f2(y1 - ny1 * w1 / 2)} Q${f2(mx - nx * (w + w1) / 4)},${f2(my - ny * (w + w1) / 4)} ${f2(x - nx * w / 2)},${f2(y - ny * w / 2)}Z `;
        if (depth === 0) return;
        const kids = depth > 4 ? 2 : (R() < 0.4 ? 3 : 2);
        for (let i = 0; i < kids; i++) {
          const spread = (i - (kids - 1) / 2) * (0.45 + R() * 0.3) + (R() - 0.5) * 0.2 + lean * 0.05;
          branch(x1, y1, a2 + spread, len * (0.66 + R() * 0.14), w1, depth - 1);
        }
      }
      branch(x0, y0, -Math.PI / 2 - lean * 0.07, 190, 42, 7);
      el('path', { d, fill: C.sil });
      // roots
      el('path', { d: `M${x0 - 60},${y0 + 30} Q${x0 - 20},${y0 - 5} ${x0 - 14},${y0 - 60} L${x0 + 14},${y0 - 60} Q${x0 + 20},${y0 - 5} ${x0 + 70},${y0 + 30}Z`, fill: C.sil });
    }
    tree(92, 1215, 8, 1);
    tree(988, 1210, 15, -1);

    /* ---------- foreground ---------- */
    el('path', { d: 'M0,1178 C110,1150 250,1188 380,1172 C520,1154 640,1192 780,1174 C900,1160 1000,1182 1080,1166 L1080,1920 L0,1920Z', fill: url('groundFade') });
    fogBand(1168, 6, 11, 90, 18, 0.45);

    const lanterns = [];
    function pumpkin(x, y, s, seed) {
      const g = el('g', { transform: `translate(${x},${y}) scale(${s})` });
      const glow = el('circle', { cx: 0, cy: -30, r: 150, fill: url('glow'), opacity: 0.8 }, g);
      el('path', { d: 'M-3,-62 C-4,-74 2,-84 12,-88 L15,-82 C8,-78 6,-72 6,-62Z', fill: '#3A2A18' }, g);
      for (const [cx, rx] of [[-26, 30], [26, 30], [-10, 28], [10, 28]])
        el('ellipse', { cx, cy: -30, rx, ry: 32, fill: url('pumpkin'), stroke: '#6E2E15', 'stroke-width': 1.6 }, g);
      el('ellipse', { cx: 0, cy: -30, rx: 22, ry: 33, fill: url('pumpkin'), stroke: '#6E2E15', 'stroke-width': 1.6 }, g);
      const face = el('g', { fill: C.flame }, g);
      el('path', { d: 'M-26,-42 L-12,-42 L-19,-56Z M12,-42 L26,-42 L19,-56Z M-4,-32 L4,-32 L0,-40Z', }, face);
      el('path', { d: 'M-32,-24 Q0,-6 32,-24 L28,-14 L20,-18 L14,-8 L6,-14 L0,-6 L-6,-14 L-14,-8 L-20,-18 L-28,-14Z' }, face);
      const R = rng(seed);
      lanterns.push({ face, glow, ph: R() * TAU, k: 1 + R() * 2 });
    }
    pumpkin(196, 1188, 1.15, 1);
    pumpkin(278, 1196, 0.62, 2);
    pumpkin(884, 1182, 0.95, 3);
    anim.push(t => {
      for (const l of lanterns) {
        const v = 0.78 + 0.12 * Math.sin(TAU * l.k * t + l.ph) + 0.1 * Math.sin(TAU * (l.k * 3.3) * t + l.ph * 2);
        l.face.setAttribute('opacity', f2(v));
        l.glow.setAttribute('opacity', f2(0.55 + 0.4 * (v - 0.6)));
      }
    });

    /* ---------- cobwebs + spider ---------- */
    function cobweb(sx) {
      const ox = sx > 0 ? 0 : W, g = el('g', { fill: 'none', stroke: C.cream, opacity: 0.34, 'stroke-width': 1.3 });
      const spokes = [], L = 270;
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI / 2;
        spokes.push([Math.cos(a), Math.sin(a)]);
        el('path', { d: `M${ox},0 L${f2(ox + sx * Math.cos(a) * L)},${f2(Math.sin(a) * L)}` }, g);
      }
      for (const r of [42, 84, 130, 180, 232]) {
        let d = '';
        for (let i = 0; i < spokes.length; i++) {
          const [cx, cy] = spokes[i];
          const px = ox + sx * cx * r, py = cy * r;
          if (i === 0) { d += `M${f2(px)},${f2(py)}`; continue; }
          const [pcx, pcy] = spokes[i - 1];
          const mx = ox + sx * (pcx + cx) / 2 * r * 0.84, my = (pcy + cy) / 2 * r * 0.84;
          d += ` Q${f2(mx)},${f2(my)} ${f2(px)},${f2(py)}`;
        }
        el('path', { d }, g);
      }
    }
    cobweb(1); cobweb(-1);
    (function spider() {
      const g = el('g');
      const thread = el('path', { stroke: C.cream, 'stroke-width': 1.2, opacity: 0.5 }, g);
      const body = el('g', {}, g);
      const legs = 'M-6,-2 Q-18,-14 -26,-6 M-6,2 Q-20,-2 -28,8 M-6,5 Q-18,10 -24,22 M-5,8 Q-12,18 -14,30 M6,-2 Q18,-14 26,-6 M6,2 Q20,-2 28,8 M6,5 Q18,10 24,22 M5,8 Q12,18 14,30';
      el('path', { d: legs, stroke: '#1E1430', 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round' }, body);
      el('ellipse', { cx: 0, cy: 6, rx: 11, ry: 14, fill: '#1E1430', stroke: '#6B4D86', 'stroke-width': 1 }, body);
      el('circle', { cx: 0, cy: -8, r: 7, fill: '#1E1430', stroke: '#6B4D86', 'stroke-width': 1 }, body);
      el('circle', { cx: -2.6, cy: -9, r: 1.6, fill: C.ember }, body);
      el('circle', { cx: 2.6, cy: -9, r: 1.6, fill: C.ember }, body);
      const ax = 1008, ay = 96;
      anim.push(t => {
        const y = 372 + 22 * Math.sin(TAU * t / 3.5) + 6 * Math.sin(TAU * t / 1.3);
        const sway = 5 * Math.sin(TAU * t / 5);
        thread.setAttribute('d', `M${ax},${ay} L${f2(ax + sway)},${f2(y - 14)}`);
        body.setAttribute('transform', `translate(${f2(ax + sway)},${f2(y)}) rotate(${f2(-sway * 0.8)})`);
      });
    })();

    /* inset border */
    el('rect', { x: 26, y: 26, width: W - 52, height: H - 52, rx: 26, fill: 'none', stroke: C.cream, 'stroke-width': 1.4, opacity: 0.22 });

    /* ---------- text ---------- */
    const entries = [];
    const fit = [];
    function line(txt, y, family, size, o = {}) {
      const t = el('text', {
        x: CX, y, 'font-family': family, 'font-size': size, 'text-anchor': 'middle', fill: o.fill || C.cream,
        'font-weight': o.weight || 400, 'letter-spacing': o.ls || 0, 'font-style': o.italic ? 'italic' : 'normal',
        style: 'font-variant-ligatures: none; font-feature-settings: "liga" 0, "dlig" 0',
      }, o.parent);
      t.textContent = txt;
      fit.push({ t, max: o.max || 900, ls: o.ls || 0 });
      return t;
    }
    function reveal(node, at, dur = 0.7, rise = 22) { entries.push({ node, at, dur, rise }); }
    const CINZEL = "'Cinzel', serif", CORM = "'Cormorant Garamond', serif", GOTH = "'Grenze Gotisch', serif";

    // RSVP pill frame + divider are artwork (kept in the text-free version)
    const pill = el('g');
    el('rect', { x: 230, y: 1676, width: 620, height: 124, rx: 62, fill: C.ember, 'fill-opacity': 0.08, stroke: C.ember, 'stroke-width': 2.4 }, pill);
    el('rect', { x: 242, y: 1688, width: 596, height: 100, rx: 50, fill: 'none', stroke: C.ember, 'stroke-width': 1, opacity: 0.5 }, pill);
    reveal(pill, 3.0);
    const divider = el('g', { stroke: C.cream, 'stroke-width': 1.4 });
    el('path', { d: 'M330,1408 L490,1408 M590,1408 L750,1408', opacity: 0.55 }, divider);
    el('path', { d: batPath(0.4), fill: C.cream, stroke: 'none', transform: 'translate(540,1408) scale(0.62)' }, divider);
    reveal(divider, 2.65);

    if (OPT.text) {
      const eg = el('g');
      line(P.eyebrow, 150, CINZEL, 30, { weight: 600, ls: 9, parent: eg, max: 640 });
      for (const sx of [-1, 1]) el('path', { d: batPath(0.6), fill: C.cream, transform: `translate(${CX + sx * 375},140) scale(0.36)` }, eg);
      reveal(eg, 1.9);

      const tg = el('g');
      const glow = el('g', { filter: url('titleGlow'), opacity: 0.75 }, tg);
      line(P.title1, 292, GOTH, 150, { fill: C.ember, weight: 700, parent: glow, max: 920 });
      line(P.title2, 442, GOTH, 176, { fill: C.ember, weight: 700, parent: glow, max: 920 });
      line(P.title1, 292, GOTH, 150, { fill: url('title'), weight: 700, parent: tg, max: 920 });
      line(P.title2, 442, GOTH, 176, { fill: url('title'), weight: 700, parent: tg, max: 920 });
      reveal(tg, 2.1, 0.9, 30);

      const dg = el('g');
      reveal(line(P.date, 1290, CINZEL, 56, { weight: 700, ls: 5, parent: dg, max: 860 }), 2.4);
      reveal(line(P.time, 1356, CORM, 46, { italic: true, weight: 500, fill: '#E9DBC4', parent: dg, max: 860 }), 2.5);
      reveal(line(P.venue, 1480, CINZEL, 50, { weight: 700, ls: 8, parent: dg, max: 860 }), 2.75);
      reveal(line(P.address, 1536, CORM, 44, { italic: true, weight: 500, fill: '#E9DBC4', parent: dg, max: 860 }), 2.85);
      reveal(line(P.note, 1616, CORM, 40, { italic: true, weight: 600, fill: C.ember, parent: dg, max: 880 }), 2.95);
      reveal(line(P.rsvpLabel, 1726, CINZEL, 25, { weight: 600, ls: 6, fill: C.ember, parent: dg, max: 540 }), 3.1);
      reveal(line(P.rsvpNumber, 1776, CINZEL, 44, { weight: 700, ls: 4, parent: dg, max: 560 }), 3.15);
    }

    /* ---------- finish ---------- */
    el('rect', { width: W, height: H, fill: url('vig'), 'pointer-events': 'none' });
    if (OPT.grain) el('rect', { width: W, height: H, filter: url('grain'), opacity: 0.1, style: 'mix-blend-mode: overlay', 'pointer-events': 'none' });

    /* ---------- intro: darkness + bat swarm bursting from the moon ---------- */
    const dark = el('rect', { width: W, height: H, fill: url('introDark'), 'pointer-events': 'none' });
    const black = el('rect', { width: W, height: H, fill: '#05030A', 'pointer-events': 'none' });
    const swarmG = el('g', { 'pointer-events': 'none' });
    const swarm = [];
    (function makeSwarm() {
      const R = rng(1031);
      const n = OPT.lite ? 70 : 110;
      for (let i = 0; i < n; i++) {
        const a = R() * TAU, r0 = Math.sqrt(R()) * 150;
        const near = R();
        swarm.push({
          node: el('path', { fill: '#06030B' }, swarmG),
          x0: MOON.x + Math.cos(a) * r0, y0: MOON.y + Math.sin(a) * r0 * 0.9,
          dir: a + (R() - 0.5) * 0.6, dist: 900 + R() * 700,
          t0: 0.3 + R() * 1.3, dur: 1.1 + R() * 0.8,
          s0: 0.14 + R() * 0.14, s1: 1.1 + near * near * 3.6,
          hz: 6 + R() * 4, ph: R(), wob: (R() - 0.5) * 120,
        });
      }
      // a few big bats sweeping across close to the "camera"
      for (const [y, dir, t0, s] of [[520, 1, 1.25, 3.4], [1380, -1, 1.55, 4.2], [980, 1, 1.9, 2.8]]) {
        swarm.push({ node: el('path', { fill: '#06030B' }, swarmG), sweep: true, y, dirx: dir, t0, dur: 1.1, s, hz: 4.5, ph: R() });
      }
    })();
    function intro(t) {
      black.setAttribute('opacity', f2(1 - smooth(t, 0.05, 0.6)));
      dark.setAttribute('opacity', f2(1 - smooth(t, 1.0, 2.6)));
      const on = t < INTRO + 0.2;
      swarmG.setAttribute('display', on ? 'inline' : 'none');
      if (!on) return;
      for (const b of swarm) {
        const u = (t - b.t0) / b.dur;
        if (u <= 0 || u >= 1) { b.node.setAttribute('display', 'none'); continue; }
        b.node.setAttribute('display', 'inline');
        let x, y, s, rot;
        if (b.sweep) {
          x = b.dirx > 0 ? -300 + u * (W + 600) : W + 300 - u * (W + 600);
          y = b.y - 120 * Math.sin(Math.PI * u);
          s = b.s; rot = -b.dirx * 8 * Math.cos(Math.PI * u);
        } else {
          const e = Math.pow(u, 1.7);
          const px = -Math.sin(b.dir), py = Math.cos(b.dir);
          const wob = b.wob * Math.sin(Math.PI * u);
          x = b.x0 + Math.cos(b.dir) * b.dist * e + px * wob;
          y = b.y0 + Math.sin(b.dir) * b.dist * e + py * wob - 60 * Math.sin(Math.PI * u);
          s = b.s0 + (b.s1 - b.s0) * Math.pow(u, 1.4);
          rot = Math.cos(b.dir) * 14;
        }
        b.node.setAttribute('d', batPath(Math.sin(TAU * (b.hz * t + b.ph))));
        b.node.setAttribute('transform', `translate(${f2(x)},${f2(y)}) rotate(${f2(rot)}) scale(${f2(s)})`);
      }
    }

    function setTime(t) {
      for (const f of anim) f(t);
      for (const e of entries) {
        const a = smooth(t, e.at, e.at + e.dur);
        e.node.setAttribute('opacity', f2(a));
        e.node.setAttribute('transform', a >= 1 ? '' : `translate(0,${f2((1 - a) * e.rise)})`);
      }
      intro(t);
    }

    const ready = (async () => {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load("700 50px 'Cinzel'"), document.fonts.load("600 50px 'Cinzel'"),
          document.fonts.load("italic 500 50px 'Cormorant Garamond'"), document.fonts.load("italic 600 50px 'Cormorant Garamond'"),
          document.fonts.load("700 50px 'Grenze Gotisch'"),
        ]).catch(() => {});
        await document.fonts.ready;
      }
      for (const { t, max, ls } of fit) {
        let size = +t.getAttribute('font-size');
        while (t.getComputedTextLength() > max && size > 10) { size -= 1; t.setAttribute('font-size', size); }
        t.setAttribute('x', CX + ls / 2); // letter-spacing leaves a trailing gap
      }
      return true;
    })();

    setTime(0);
    return { setTime, ready, INTRO, width: W, height: H };
  }

  global.HauntCard = { create, batPath, INTRO };
})(window);
