/* Halloween invitation artwork: three themed cards sharing one layout.
   Themes: 'manor' (The Haunted Manor), 'witch' (The Witching Hour), 'patch' (The Pumpkin Patch).
   Shared by the renderer (card/render.html) and the website (site/index.html).
   Usage: const card = HauntCard.create(svgElement, { theme, text, grain, lite, party });
          await card.ready; card.setTime(seconds);
   Timeline: 0-3.4 s bat-swarm intro, then ambient animation forever. */
(function (global) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1080, H = 1920, CX = 540;
  const TAU = Math.PI * 2;
  const INTRO = 3.4;
  const CREAM = '#F1E6D0';

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

  const THEMES = {
    manor: {
      name: 'The Haunted Manor',
      sky: ['#0A0717', '#1A1030', '#2E1846', '#4A2350', '#5E2C4C'],
      moon: { x: 540, y: 700, r: 235, c: ['#FFF4D6', '#F8DC9C', '#EDB06A', '#D98A4C'], crater: '#C9824A', glow: ['#F6C47E', '#E8834A'] },
      horizon: '#E8834A', far: '#3A2152', back: '#2A1842', mid: '#170E26', sil: '#0D0716',
      ground: ['#1A0F2B', '#0E0818', '#08050F'], fog: ['#CBB5E8', '#B49AD6'],
      accent: '#E8834A', soft: '#E9DBC4', title: ['#FFF4DE', '#F3C98C'], titleGlow: '#E8834A', bat: '#06030B',
      webs: true, spider: true, cloud: null,
    },
    witch: {
      name: 'The Witching Hour',
      sky: ['#030C0D', '#08201F', '#0F3432', '#1D4A43', '#2B5A49'],
      moon: { x: 540, y: 690, r: 250, c: ['#F6FFEA', '#DDF2C4', '#AEDB9C', '#7DB47E'], crater: '#86B88A', glow: ['#C8F0B0', '#5FBF6A'] },
      horizon: '#7ED07A', far: '#16403B', back: '#0F2E2B', mid: '#0A1F1E', sil: '#040B0A',
      ground: ['#0C2220', '#06110F', '#030807'], fog: ['#B8EBCB', '#8FD6A8'],
      accent: '#9BE07A', soft: '#DCEBD8', title: ['#F4FFE8', '#C6EBA6'], titleGlow: '#4FBF63', bat: '#020605',
      webs: true, spider: true, cloud: '#0A2422',
    },
    patch: {
      name: 'The Pumpkin Patch',
      sky: ['#100508', '#2A0B13', '#521519', '#8E2F1D', '#C45B26'],
      moon: { x: 540, y: 800, r: 300, c: ['#FFF0C8', '#FFCF7A', '#F59D42', '#DA6A2A'], crater: '#D07A36', glow: ['#FFC070', '#FF6A2A'] },
      horizon: '#FF7A30', far: '#5E1E1A', back: '#3E1013', mid: '#24080C', sil: '#0F0306',
      ground: ['#22080C', '#120407', '#090203'], fog: ['#F7C6A8', '#E89A78'],
      accent: '#FFB347', soft: '#F2DCC4', title: ['#FFF6E2', '#FFD08A'], titleGlow: '#FF5A1F', bat: '#080104',
      webs: false, spider: false, cloud: '#2B0A0E',
    },
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

  function flamePath(cx, base, h, w) {
    return `M${cx},${base - h} C${cx + w * 0.4},${base - h * 0.7} ${cx + w * 1.1},${base - h * 0.44} ${cx + w},${base - h * 0.23} ` +
      `C${cx + w * 0.9},${base - h * 0.05} ${cx + w * 0.4},${base} ${cx},${base} C${cx - w * 0.4},${base} ${cx - w * 0.9},${base - h * 0.05} ${cx - w},${base - h * 0.23} ` +
      `C${cx - w * 1.1},${base - h * 0.44} ${cx - w * 0.4},${base - h * 0.7} ${cx},${base - h}Z`;
  }

  function create(svg, opts = {}) {
    const T = THEMES[opts.theme] || THEMES.manor;
    const theme = THEMES[opts.theme] ? opts.theme : 'manor';
    const OPT = { text: opts.text !== false, grain: !!opts.grain, lite: !!opts.lite };
    const P = Object.assign({}, DEFAULT_PARTY, opts.party || {});
    const MOON = T.moon;
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
    const sk = T.sky;
    defs.innerHTML = `
      <linearGradient id="${id('sky')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${sk[0]}"/><stop offset="0.3" stop-color="${sk[1]}"/>
        <stop offset="0.5" stop-color="${sk[2]}"/><stop offset="0.6" stop-color="${sk[3]}"/><stop offset="0.68" stop-color="${sk[4]}"/>
      </linearGradient>
      <radialGradient id="${id('moon')}" cx="0.4" cy="0.36" r="0.7">
        <stop offset="0" stop-color="${MOON.c[0]}"/><stop offset="0.45" stop-color="${MOON.c[1]}"/>
        <stop offset="0.8" stop-color="${MOON.c[2]}"/><stop offset="1" stop-color="${MOON.c[3]}"/>
      </radialGradient>
      <radialGradient id="${id('moonGlow')}">
        <stop offset="0.38" stop-color="${MOON.glow[0]}" stop-opacity="0.55"/><stop offset="0.55" stop-color="${MOON.glow[1]}" stop-opacity="0.2"/>
        <stop offset="1" stop-color="${MOON.glow[1]}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id('horizon')}" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${T.horizon}" stop-opacity="0.35"/><stop offset="1" stop-color="${T.horizon}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id('win')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFD98A"/><stop offset="1" stop-color="#E8834A"/>
      </linearGradient>
      <radialGradient id="${id('glow')}">
        <stop offset="0" stop-color="#FFB25A" stop-opacity="0.6"/><stop offset="0.4" stop-color="#E8834A" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#E8834A" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id('greenGlow')}">
        <stop offset="0" stop-color="#C8FF8A" stop-opacity="0.65"/><stop offset="0.4" stop-color="#5FD86A" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#3FBF5A" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id('brew')}" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0" stop-color="#EFFFC2"/><stop offset="0.45" stop-color="#9BEA6E"/><stop offset="1" stop-color="#2E8A4A"/>
      </radialGradient>
      <radialGradient id="${id('fog')}">
        <stop offset="0" stop-color="${T.fog[0]}" stop-opacity="0.26"/><stop offset="0.6" stop-color="${T.fog[1]}" stop-opacity="0.1"/>
        <stop offset="1" stop-color="${T.fog[1]}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id('pumpkin')}" cx="0.45" cy="0.4" r="0.65">
        <stop offset="0" stop-color="#E3803F"/><stop offset="0.7" stop-color="#B9562A"/><stop offset="1" stop-color="#7E3519"/>
      </radialGradient>
      <radialGradient id="${id('pumpkinDim')}" cx="0.45" cy="0.4" r="0.65">
        <stop offset="0" stop-color="#9A4A24"/><stop offset="0.7" stop-color="#6E2E16"/><stop offset="1" stop-color="#3E170B"/>
      </radialGradient>
      <linearGradient id="${id('title')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${T.title[0]}"/><stop offset="1" stop-color="${T.title[1]}"/>
      </linearGradient>
      <linearGradient id="${id('groundFade')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${T.ground[0]}"/><stop offset="0.25" stop-color="${T.ground[1]}"/><stop offset="1" stop-color="${T.ground[2]}"/>
      </linearGradient>
      <radialGradient id="${id('vig')}" cx="0.5" cy="0.45" r="0.75">
        <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="0.85" stop-color="#000" stop-opacity="0.3"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.6"/>
      </radialGradient>
      <radialGradient id="${id('introDark')}" gradientUnits="userSpaceOnUse" cx="${MOON.x}" cy="${MOON.y}" r="1100">
        <stop offset="0" stop-color="#05030A" stop-opacity="0"/><stop offset="${f2(MOON.r / 1100 - 0.0)}" stop-color="#05030A" stop-opacity="0.05"/>
        <stop offset="${f2(MOON.r / 1100 + 0.12)}" stop-color="#05030A" stop-opacity="0.9"/><stop offset="1" stop-color="#05030A" stop-opacity="0.98"/>
      </radialGradient>
      <filter id="${id('titleGlow')}" x="-20%" y="-40%" width="140%" height="180%">
        <feGaussianBlur stdDeviation="14"/>
      </filter>
      <filter id="${id('grain')}" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="5" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>`;

    /* =============== shared building blocks =============== */
    function fogBand(y, n, seed, amp, speed, op, parent = svg) {
      const g = el('g', { opacity: op }, parent);
      const R = rng(seed), parts = [];
      for (let i = 0; i < n; i++) {
        const e = el('ellipse', { cx: f2(-100 + R() * (W + 200)), cy: f2(y + (R() - 0.5) * 40), rx: f2(260 + R() * 220), ry: f2(36 + R() * 30), fill: url('fog') }, g);
        parts.push({ e, ph: R() * TAU, a: amp * (0.6 + R() * 0.8) });
      }
      anim.push(t => { for (const p of parts) p.e.setAttribute('transform', `translate(${f2(p.a * Math.sin(TAU * t / speed + p.ph))},0)`); });
    }

    function tree(x0, y0, seed, lean, size = 1) {
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
      branch(x0, y0, -Math.PI / 2 - lean * 0.07, 190 * size, 42 * size, 7);
      el('path', { d, fill: T.sil });
      el('path', { d: `M${x0 - 60 * size},${y0 + 30} Q${x0 - 20 * size},${y0 - 5} ${x0 - 14 * size},${y0 - 60 * size} L${x0 + 14 * size},${y0 - 60 * size} Q${x0 + 20 * size},${y0 - 5} ${x0 + 70 * size},${y0 + 30}Z`, fill: T.sil });
    }

    const lanterns = [];
    function pumpkin(x, y, s, seed, carved = true, parent = svg) {
      const g = el('g', { transform: `translate(${x},${y}) scale(${s})` }, parent);
      const glow = carved ? el('circle', { cx: 0, cy: -30, r: 150, fill: url('glow'), opacity: 0.8 }, g) : null;
      el('path', { d: 'M-3,-62 C-4,-74 2,-84 12,-88 L15,-82 C8,-78 6,-72 6,-62Z', fill: '#3A2A18' }, g);
      const fill = carved ? url('pumpkin') : url('pumpkinDim');
      for (const [cx, rx] of [[-26, 30], [26, 30], [-10, 28], [10, 28]])
        el('ellipse', { cx, cy: -30, rx, ry: 32, fill, stroke: '#5A2410', 'stroke-width': 1.6 }, g);
      el('ellipse', { cx: 0, cy: -30, rx: 22, ry: 33, fill, stroke: '#5A2410', 'stroke-width': 1.6 }, g);
      if (carved) {
        const face = el('g', { fill: '#FFC35A' }, g);
        el('path', { d: 'M-26,-42 L-12,-42 L-19,-56Z M12,-42 L26,-42 L19,-56Z M-4,-32 L4,-32 L0,-40Z' }, face);
        el('path', { d: 'M-32,-24 Q0,-6 32,-24 L28,-14 L20,-18 L14,-8 L6,-14 L0,-6 L-6,-14 L-14,-8 L-20,-18 L-28,-14Z' }, face);
        const R = rng(seed);
        lanterns.push({ face, glow, ph: R() * TAU, k: 1 + R() * 2 });
      }
      return g;
    }
    anim.push(t => {
      for (const l of lanterns) {
        const v = 0.78 + 0.12 * Math.sin(TAU * l.k * t + l.ph) + 0.1 * Math.sin(TAU * (l.k * 3.3) * t + l.ph * 2);
        l.face.setAttribute('opacity', f2(v));
        l.glow.setAttribute('opacity', f2(0.55 + 0.4 * (v - 0.6)));
      }
    });

    function graves(stones, crosses) {
      const g = el('g', { fill: T.sil });
      for (const [x, y, w, h, r] of stones)
        el('path', { d: `M${x - w / 2},${y} L${x - w / 2},${y - h + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${y - h + w / 2} L${x + w / 2},${y}Z`, transform: `rotate(${r} ${x} ${y})` }, g);
      for (const [x, y, s, r] of crosses)
        el('path', { d: `M${x - 4 * s},${y} L${x - 4 * s},${y - 30 * s} L${x - 14 * s},${y - 30 * s} L${x - 14 * s},${y - 38 * s} L${x - 4 * s},${y - 38 * s} L${x - 4 * s},${y - 50 * s} L${x + 4 * s},${y - 50 * s} L${x + 4 * s},${y - 38 * s} L${x + 14 * s},${y - 38 * s} L${x + 14 * s},${y - 30 * s} L${x + 4 * s},${y - 30 * s} L${x + 4 * s},${y}Z`, transform: `rotate(${r} ${x} ${y})` }, g);
    }

    function hills() {
      el('path', { d: 'M0,955 C120,925 220,940 330,960 C430,975 520,930 640,925 C780,920 900,960 1080,935 L1080,1200 L0,1200Z', fill: T.far });
    }
    function backHill() {
      el('path', { d: 'M0,1000 C150,965 260,990 380,1000 C480,1008 600,985 720,990 C860,995 960,1015 1080,990 L1080,1250 L0,1250Z', fill: T.back });
    }
    function midHill() {
      el('path', { d: 'M0,1062 C170,1030 330,1012 460,1018 C560,1022 620,1014 720,1020 C860,1030 960,1048 1080,1066 L1080,1300 L0,1300Z', fill: T.mid });
    }
    function foreground() {
      el('path', { d: 'M0,1178 C110,1150 250,1188 380,1172 C520,1154 640,1192 780,1174 C900,1160 1000,1182 1080,1166 L1080,1920 L0,1920Z', fill: url('groundFade') });
    }
    function clouds(seed) {
      const g = el('g', { fill: T.cloud });
      const R = rng(seed), list = [];
      for (let i = 0; i < 3; i++) {
        const y = MOON.y - MOON.r * 0.55 + i * MOON.r * 0.38 + (R() - 0.5) * 40, len = 360 + R() * 260, th = 8 + R() * 9;
        const n = el('path', { d: `M0,0 C${len * 0.2},${-th} ${len * 0.6},${-th * 1.2} ${len},${-th * 0.2} C${len * 0.7},${th * 0.6} ${len * 0.3},${th * 0.8} 0,0Z`, opacity: 0.32 + R() * 0.22 }, g);
        list.push({ n, y, len, v: 14 + R() * 16, o: R() * (W + 900) });
      }
      anim.push(t => { for (const c of list) c.n.setAttribute('transform', `translate(${f2(((t * c.v + c.o) % (W + 900)) - c.len - 200)},${f2(c.y)})`); });
    }
    function lightWindow(x, y, w, h, parent, store, fill = url('win'), glowFill = url('glow')) {
      const glow = el('circle', { cx: x, cy: y + h / 2, r: w * 2.2, fill: glowFill, opacity: 0.5 }, parent);
      const d = `M${x - w / 2},${y + h} L${x - w / 2},${y + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${y + w / 2} L${x + w / 2},${y + h}Z`;
      const pane = el('path', { d, fill }, parent);
      el('path', { d: `M${x},${y + 2} L${x},${y + h} M${x - w / 2},${y + h * 0.58} L${x + w / 2},${y + h * 0.58}`, stroke: T.sil, 'stroke-width': 2.4 }, parent);
      store.push({ pane, glow, base: 0.9 });
    }

    /* ---------- sky ---------- */
    el('rect', { width: W, height: H, fill: url('sky') });
    el('ellipse', { cx: CX, cy: 1000, rx: 760, ry: 260, fill: url('horizon') });

    (function stars() {
      const g = el('g');
      const R = rng(99), list = [];
      const n = OPT.lite ? 110 : 190;
      for (let i = 0; i < n; i++) {
        const x = R() * W, y = Math.pow(R(), 1.5) * 1000;
        if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 30) continue;
        const r = 0.8 + Math.pow(R(), 3) * 2.4, base = 0.25 + R() * 0.6;
        const c = el('circle', { cx: f2(x), cy: f2(y), r: f2(r), fill: CREAM, opacity: base }, g);
        list.push({ c, base, k: 0.3 + R() * 1.2, ph: R() * TAU });
      }
      anim.push(t => { for (const s of list) s.c.setAttribute('opacity', f2(s.base * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * s.k * t + s.ph))))); });
    })();

    /* ---------- moon ---------- */
    const moonGlow = el('circle', { cx: MOON.x, cy: MOON.y, r: MOON.r * 2.4, fill: url('moonGlow') });
    el('circle', { cx: MOON.x, cy: MOON.y, r: MOON.r, fill: url('moon') });
    const k = MOON.r / 235;
    for (const [dx, dy, r, o] of [[-80, -60, 46, 0.18], [60, 40, 62, 0.14], [-30, 110, 30, 0.16], [110, -90, 24, 0.16], [-130, 50, 20, 0.14], [20, -140, 16, 0.12], [150, 110, 18, 0.12]])
      el('circle', { cx: f2(MOON.x + dx * k), cy: f2(MOON.y + dy * k), r: f2(r * k), fill: MOON.crater, opacity: o });
    anim.push(t => moonGlow.setAttribute('opacity', f2(0.85 + 0.15 * Math.sin(TAU * t / 4))));
    if (T.cloud) clouds(theme === 'witch' ? 12 : 5);

    /* ---------- ambient bats circling the moon ---------- */
    (function ambientBats() {
      const g = el('g');
      const R = rng(4), list = [];
      for (let i = 0; i < 7; i++) {
        list.push({
          node: el('path', { fill: T.bat }, g), rx: MOON.r * 1.3 + R() * 160, ry: 90 + R() * 90, cy: MOON.y - 40 + R() * 80,
          period: 6 + R() * 5, ph: R(), dir: R() < 0.5 ? 1 : -1, s: 0.38 + R() * 0.42, flapHz: 2.6 + R() * 1.6, tilt: (R() - 0.5) * 0.5,
        });
      }
      anim.push(t => {
        const show = smooth(t, 2.2, 3.4);
        for (const b of list) {
          const a = TAU * (b.dir * t / b.period + b.ph);
          const x = CX + b.rx * Math.cos(a), y = b.cy + b.ry * Math.sin(a) + b.tilt * b.rx * Math.cos(a) * 0.3;
          const depth = 0.8 + 0.25 * Math.sin(a);
          b.node.setAttribute('d', batPath(Math.sin(TAU * b.flapHz * t + b.ph * 7)));
          b.node.setAttribute('transform', `translate(${f2(x)},${f2(y)}) scale(${f2(b.s * depth)})`);
          b.node.setAttribute('opacity', f2(show));
        }
      });
    })();

    /* =============== scenes =============== */
    const windows = [];
    function flickerWindows() {
      const R = rng(21);
      for (const w of windows) Object.assign(w, { k1: 1 + R() * 3, k2: 4 + R() * 5, ph: R() * TAU, off: w.off !== undefined ? w.off : (R() < 0.2 ? R() * 8 : -1) });
      anim.push(t => {
        for (const w of windows) {
          let v = w.base * (0.82 + 0.1 * Math.sin(TAU * w.k1 * t / 3 + w.ph) + 0.08 * Math.sin(TAU * w.k2 * t / 3 + w.ph * 2));
          if (w.off >= 0) { const c = (t + w.off) % 9; if (c > 6.2 && c < 7.4) v *= 0.15; }
          w.pane.setAttribute('opacity', f2(v));
          if (w.glow) w.glow.setAttribute('opacity', f2(0.55 * v));
        }
      });
    }

    function sceneManor() {
      hills();
      (function farTrees() {
        const g = el('g', { fill: T.far });
        for (const [x, y, h] of [[90, 935, 46], [140, 940, 30], [880, 945, 40], [960, 940, 54], [1010, 938, 32]])
          el('path', { d: `M${x - 3},${y} L${x - 1.5},${y - h} L${x + 1.5},${y - h} L${x + 3},${y}Z M${x},${y - h * 0.6} L${x - h * 0.35},${y - h * 0.9} M${x},${y - h * 0.45} L${x + h * 0.3},${y - h * 0.8}`, stroke: T.far, 'stroke-width': 2.5 }, g);
      })();
      backHill();
      const g = el('g', { fill: T.sil });
      const rt = el('g', { transform: 'rotate(2.5 725 1010)' }, g);
      el('rect', { x: 690, y: 700, width: 70, height: 320 }, rt);
      el('path', { d: 'M676,708 L725,535 L774,708Z' }, rt);
      el('path', { d: 'M725,540 L725,488', stroke: T.sil, 'stroke-width': 4 }, rt);
      el('path', { d: 'M725,500 L752,508 L725,516Z' }, rt);
      el('path', { d: 'M682,708 L768,708 L768,720 L682,720Z' }, rt);
      const lt = el('g', { transform: 'rotate(-2 330 1010)' }, g);
      el('rect', { x: 298, y: 765, width: 62, height: 255 }, lt);
      el('path', { d: 'M286,772 L329,632 L372,772Z' }, lt);
      el('path', { d: 'M329,636 L329,600', stroke: T.sil, 'stroke-width': 3.5 }, lt);
      el('circle', { cx: 329, cy: 598, r: 5 }, lt);
      el('rect', { x: 340, y: 900, width: 80, height: 120 }, g);
      el('path', { d: 'M332,905 L380,850 L428,905Z' }, g);
      el('rect', { x: 662, y: 905, width: 140, height: 115 }, g);
      el('path', { d: 'M655,910 L735,852 L812,910Z' }, g);
      el('rect', { x: 600, y: 735, width: 26, height: 80 }, g);
      el('rect', { x: 596, y: 730, width: 34, height: 9 }, g);
      el('rect', { x: 410, y: 830, width: 262, height: 190 }, g);
      el('path', { d: 'M394,838 L541,698 L688,838Z' }, g);
      el('path', { d: 'M388,840 L694,840 L694,850 L388,850Z' }, g);
      for (let x = 395; x <= 690; x += 22) el('path', { d: `M${x - 2},1022 L${x - 2},990 L${x},982 L${x + 2},990 L${x + 2},1022Z` }, g);
      el('rect', { x: 392, y: 998, width: 300, height: 3 }, g);
      for (const x of [446, 498, 584, 636]) { lightWindow(x, 862, 26, 42, g, windows); lightWindow(x, 932, 26, 42, g, windows); windows[windows.length - 1].base = 0.8; }
      lightWindow(541, 772, 30, 34, g, windows);
      lightWindow(380, 932, 22, 36, g, windows); windows[windows.length - 1].base = 0.7;
      lightWindow(329, 805, 18, 34, lt, windows);
      lightWindow(725, 745, 20, 36, rt, windows);
      lightWindow(725, 830, 20, 36, rt, windows); windows[windows.length - 1].base = 0.75;
      lightWindow(760, 940, 22, 36, g, windows);
      const door = el('path', { d: 'M524,1020 L524,968 A17,17 0 0 1 558,968 L558,1020Z', fill: url('win'), opacity: 0.75 }, g);
      windows.push({ pane: door, glow: null, base: 0.7, off: -1 });
      flickerWindows();

      midHill();
      graves([[150, 1050, 26, 40, -6], [205, 1042, 22, 32, 4], [262, 1036, 30, 44, -3], [820, 1036, 28, 42, 5], [880, 1044, 22, 30, -4], [936, 1052, 26, 38, 3]],
             [[315, 1032, 1, 6], [765, 1030, 0.9, -5]]);
      fogBand(1045, 7, 3, 70, 14, 1);
      tree(92, 1215, 8, 1);
      tree(988, 1210, 15, -1);
      foreground();
      fogBand(1168, 6, 11, 90, 18, 0.45);
      pumpkin(196, 1188, 1.15, 1);
      pumpkin(278, 1196, 0.62, 2);
      pumpkin(884, 1182, 0.95, 3);
    }

    function sceneWitch() {
      // the witch, flying across the moon
      const wg = el('g');
      const witch = el('g', { fill: T.sil }, wg);
      el('path', { d: 'M-110,14 L105,-12', stroke: T.sil, 'stroke-width': 6, 'stroke-linecap': 'round' }, witch);
      el('path', { d: 'M-106,12 C-130,2 -160,-6 -174,-2 C-168,8 -170,20 -178,32 C-160,32 -132,26 -106,18Z' }, witch);
      el('path', { d: 'M-34,10 C-40,-20 -26,-48 -6,-62 L8,-60 C18,-50 26,-34 34,-14 L54,-7 L52,0 L30,-4 C24,12 10,30 -6,40 C-14,34 -28,24 -34,10Z' }, witch);
      el('path', { d: 'M-4,36 L4,52 L22,54 L24,48 L10,46 L6,32Z' }, witch);
      el('circle', { cx: 0, cy: -72, r: 11 }, witch);
      el('path', { d: 'M9,-76 L24,-70 L9,-67Z' }, witch);
      el('path', { d: 'M-32,-78 C-10,-86 14,-88 34,-84 L32,-80 C10,-82 -12,-78 -30,-72Z' }, witch);
      el('path', { d: 'M-14,-82 L14,-86 C6,-102 -6,-118 -28,-128 C-18,-116 -16,-100 -14,-82Z' }, witch);
      const hair = el('path', {}, witch);
      const cape = el('path', {}, witch);
      // her cat rides along on the broom
      el('path', { d: 'M62,-14 C60,-24 64,-32 70,-34 L68,-42 L74,-37 L79,-37 L84,-42 L83,-34 C88,-30 88,-22 84,-16Z' }, witch);
      el('path', { d: 'M62,-16 C52,-18 46,-28 50,-36', fill: 'none', stroke: T.sil, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, witch);
      anim.push(t => {
        const u = ((t + 5.84) % 9) / 9;
        const x = -170 + u * 1420, y = 610 + 40 * Math.sin(TAU * t / 4.5) - u * 60;
        const w = Math.sin(TAU * t * 1.4);
        witch.setAttribute('transform', `translate(${f2(x)},${f2(y)}) rotate(-7) scale(0.86)`);
        cape.setAttribute('d', `M-20,-52 C-48,-48 -76,-34 -98,${f2(-14 + 8 * w)} C-76,${f2(-20 + 4 * w)} -54,-12 -30,-4Z`);
        hair.setAttribute('d', `M-8,-66 C-28,-62 -44,-52 -58,${f2(-38 + 5 * w)} C-42,-44 -28,-48 -14,-54Z`);
      });

      hills();
      // ruined chapel on the far hill
      const ch = el('g', { fill: T.far });
      el('path', { d: 'M790,960 L790,900 L830,868 L870,900 L870,960Z M842,905 L842,850 L852,840 L862,850 L862,905Z M852,840 L852,812 M845,822 L859,822', stroke: T.far, 'stroke-width': 3 }, ch);
      el('path', { d: 'M870,960 L870,915 L884,925 L890,912 L898,960Z' }, ch);
      const chWin = el('path', { d: 'M823,930 L823,914 A7,7 0 0 1 837,914 L837,930Z', fill: '#A8F08A', opacity: 0.6 }, ch);
      anim.push(t => chWin.setAttribute('opacity', f2(0.45 + 0.2 * Math.sin(TAU * t / 2.3))));
      backHill();
      midHill();
      graves([[140, 1052, 26, 40, -6], [196, 1044, 22, 32, 4], [700, 1034, 26, 38, 6], [758, 1040, 22, 30, -4], [930, 1052, 30, 44, 3]],
             [[262, 1036, 1, 6], [992, 1060, 0.9, -8], [640, 1030, 0.75, 4]]);
      fogBand(1045, 7, 3, 70, 14, 1);

      // gnarled tree with a hanging lantern
      tree(92, 1215, 31, 1);
      el('path', { d: 'M96,792 C150,770 230,742 330,708 L332,714 C240,752 160,786 104,812Z', fill: T.sil });
      const lan = el('g');
      el('line', { x1: 0, y1: 0, x2: 0, y2: 52, stroke: T.sil, 'stroke-width': 2 }, lan);
      const lanGlow = el('circle', { cx: 0, cy: 72, r: 90, fill: url('greenGlow') }, lan);
      el('path', { d: 'M-14,56 L14,56 L18,64 L18,86 L14,92 L-14,92 L-18,86 L-18,64Z', fill: '#C8FF9A', opacity: 0.9 }, lan);
      el('path', { d: 'M-14,56 L14,56 L18,64 L18,86 L14,92 L-14,92 L-18,86 L-18,64Z M0,56 L0,92 M-18,74 L18,74 M-8,50 L8,50 L14,56 L-14,56Z', fill: 'none', stroke: T.sil, 'stroke-width': 3 }, lan);
      anim.push(t => {
        lan.setAttribute('transform', `translate(318,712) rotate(${f2(5 * Math.sin(TAU * t / 3.2))})`);
        lanGlow.setAttribute('opacity', f2(0.75 + 0.25 * Math.sin(TAU * t * 1.3)));
      });
      tree(1000, 1210, 44, -1, 0.85);

      // bubbling cauldron over a fire
      const cg = el('g');
      const cGlow = el('circle', { cx: 540, cy: 990, r: 280, fill: url('greenGlow') }, cg);
      for (const [dx, h, w, ph] of [[-34, 50, 16, 0], [0, 66, 20, 1.7], [34, 48, 15, 3.1]]) {
        const f = el('path', { d: flamePath(540 + dx, 1172, h, w), fill: '#F2994A' }, cg);
        const fi = el('path', { d: flamePath(540 + dx, 1170, h * 0.55, w * 0.5), fill: '#FFE08A' }, cg);
        anim.push(t => {
          const sy = 1 + 0.12 * Math.sin(TAU * 3 * t + ph) + 0.06 * Math.sin(TAU * 7 * t + ph * 2);
          const tr = `translate(${540 + dx},1172) scale(${f2(1 - 0.06 * Math.sin(TAU * 5 * t + ph))},${f2(sy)}) translate(${-540 - dx},-1172)`;
          f.setAttribute('transform', tr); fi.setAttribute('transform', tr);
        });
      }
      el('path', { d: 'M470,1178 L610,1160 L612,1170 L472,1188Z M470,1160 L610,1178 L608,1188 L468,1170Z', fill: '#2A1A10' }, cg);
      el('path', { d: 'M440,1012 C426,1080 452,1140 540,1146 C628,1140 654,1080 640,1012Z', fill: '#081210', stroke: '#2F5446', 'stroke-width': 2 }, cg);
      el('path', { d: 'M466,1140 L456,1160 L474,1160 L482,1142Z M614,1140 L624,1160 L606,1160 L598,1142Z', fill: '#081210' }, cg);
      el('path', { d: 'M432,1030 C412,1032 410,1060 430,1062 M648,1030 C668,1032 670,1060 650,1062', fill: 'none', stroke: '#2F5446', 'stroke-width': 5 }, cg);
      el('ellipse', { cx: 540, cy: 1012, rx: 122, ry: 20, fill: '#081210', stroke: '#4C7A60', 'stroke-width': 2.5 }, cg);
      el('ellipse', { cx: 540, cy: 1013, rx: 108, ry: 14, fill: url('brew') }, cg);
      const R = rng(77), bubbles = [];
      for (let i = 0; i < 10; i++) bubbles.push({ n: el('circle', { fill: '#D8FFAE', stroke: '#7FD86A', 'stroke-width': 1.2 }, cg), dx: (R() - 0.5) * 170, p: 1.3 + R() * 1.4, ph: R(), r: 3 + R() * 6 });
      const steam = [];
      for (let i = 0; i < 4; i++) steam.push({ n: el('ellipse', { fill: url('fog') }, cg), dx: (R() - 0.5) * 80, p: 3 + R() * 2, ph: i / 4 });
      anim.push(t => {
        cGlow.setAttribute('opacity', f2(0.7 + 0.3 * Math.sin(TAU * t / 1.7)));
        for (const b of bubbles) {
          const u = (t / b.p + b.ph) % 1;
          b.n.setAttribute('cx', f2(540 + b.dx * (1 - u * 0.3) + 6 * Math.sin(u * TAU * 2)));
          b.n.setAttribute('cy', f2(1010 - u * 150));
          b.n.setAttribute('r', f2(b.r * (0.5 + u)));
          b.n.setAttribute('opacity', f2(Math.min(1, u * 8) * (1 - u) * 0.9));
        }
        for (const s of steam) {
          const u = (t / s.p + s.ph) % 1;
          s.n.setAttribute('cx', f2(540 + s.dx + 30 * Math.sin(u * TAU)));
          s.n.setAttribute('cy', f2(1000 - u * 280));
          s.n.setAttribute('rx', f2(70 + u * 140)); s.n.setAttribute('ry', f2(26 + u * 40));
          s.n.setAttribute('opacity', f2(Math.min(1, u * 5) * (1 - u) * 1.6));
        }
      });

      foreground();
      fogBand(1168, 6, 11, 90, 18, 0.4);

      // black cat on a tombstone
      const cat = el('g', { fill: T.sil });
      el('path', { d: 'M820,1188 L820,1090 A46,46 0 0 1 912,1090 L912,1188Z' }, cat);
      el('path', { d: 'M846,1062 C840,1042 844,1024 854,1016 C852,1008 852,1002 856,996 L854,984 L862,992 C866,991 870,991 874,992 L880,984 L879,997 C883,1004 882,1012 876,1016 C886,1024 890,1044 884,1062Z' }, cat);
      const tail = el('path', { fill: 'none', stroke: T.sil, 'stroke-width': 6, 'stroke-linecap': 'round' }, cat);
      const eyes = el('g', { fill: '#B8FF7A' }, cat);
      el('ellipse', { cx: 860, cy: 1004, rx: 2.6, ry: 3 }, eyes);
      el('ellipse', { cx: 871, cy: 1004, rx: 2.6, ry: 3 }, eyes);
      anim.push(t => {
        const s = Math.sin(TAU * t / 2.6);
        tail.setAttribute('d', `M882,1058 C${f2(904 + 6 * s)},1060 ${f2(912 + 14 * s)},1080 ${f2(902 + 22 * s)},${f2(1100 + 4 * s)}`);
        const blink = (t % 4.2) > 4.0 ? 0.1 : 1;
        eyes.setAttribute('transform', `translate(0,1004) scale(1,${blink}) translate(0,-1004)`);
      });

      // fireflies
      const ff = el('g'), flies = [];
      const RF = rng(9);
      for (let i = 0; i < 14; i++) {
        flies.push({ g: el('circle', { r: 9, fill: url('greenGlow') }, ff), d: el('circle', { r: 2.2, fill: '#E4FFB8' }, ff),
          x: 120 + RF() * 840, y: 900 + RF() * 260, ax: 20 + RF() * 40, ay: 10 + RF() * 30, k: 0.1 + RF() * 0.2, ph: RF() * TAU });
      }
      anim.push(t => {
        for (const f of flies) {
          const x = f.x + f.ax * Math.sin(TAU * f.k * t + f.ph), y = f.y + f.ay * Math.sin(TAU * f.k * 1.7 * t + f.ph * 2);
          const o = f2(0.3 + 0.7 * Math.max(0, Math.sin(TAU * f.k * 3 * t + f.ph)));
          for (const n of [f.g, f.d]) { n.setAttribute('cx', f2(x)); n.setAttribute('cy', f2(y)); n.setAttribute('opacity', o); }
        }
      });
    }

    function scenePatch() {
      hills();
      // farm with a turning windmill on the far hill
      const fm = el('g', { fill: T.far, transform: 'translate(-150,0)' });
      el('path', { d: 'M772,968 L772,930 L782,908 L822,894 L862,908 L872,930 L872,968Z' }, fm);
      const barnWin = el('rect', { x: 814, y: 930, width: 16, height: 14, fill: '#FFC35A' }, fm);
      windows.push({ pane: barnWin, glow: null, base: 0.85, off: -1 });
      el('path', { d: 'M922,970 L928,900 L940,900 L946,970Z' }, fm);
      const blades = el('g', { stroke: T.far }, fm);
      for (let i = 0; i < 4; i++)
        el('path', { d: 'M0,0 L0,-58 M-7,-20 L7,-20 M-7,-34 L7,-34 M-7,-48 L7,-48 M-7,-20 L-7,-56 M7,-20 L7,-56', transform: `rotate(${i * 90})`, 'stroke-width': 3 }, blades);
      el('circle', { cx: 934, cy: 902, r: 6 }, fm);
      anim.push(t => blades.setAttribute('transform', `translate(934,902) rotate(${f2(t * 36)})`));
      flickerWindows();
      backHill();

      // pumpkin-headed scarecrow with a crow
      const sc = el('g', { fill: T.sil });
      el('rect', { x: 326, y: 800, width: 9, height: 300 }, sc);
      el('rect', { x: 230, y: 830, width: 200, height: 9 }, sc);
      el('path', { d: 'M292,836 L372,836 L384,960 L366,950 L356,974 L342,954 L328,978 L314,954 L298,972 L286,952 L272,962Z' }, sc);
      el('path', { d: 'M232,826 L300,828 L298,856 L234,852Z M430,826 L362,828 L364,856 L428,852Z' }, sc);
      const rags = [];
      for (const [x, s] of [[236, -1], [426, 1], [262, -1], [404, 1]]) {
        const r = el('path', { d: `M${x - 6},852 L${x + 6},852 L${x + 2},${880 + (x % 7) * 2} Z` }, sc);
        rags.push({ r, x, ph: x * 0.07 });
      }
      el('path', { d: 'M232,840 L214,826 M232,842 L212,844 M232,844 L216,860 M428,840 L446,826 M428,842 L448,844 M428,844 L444,860', stroke: T.sil, 'stroke-width': 3 }, sc);
      pumpkin(331, 806, 0.6, 21, true, sc);
      el('path', { d: 'M282,770 C310,762 352,760 382,764 L380,772 C350,770 314,772 284,778Z' }, sc);
      el('path', { d: 'M300,770 L362,766 C356,744 344,726 318,714 C328,734 306,750 300,770Z' }, sc);
      const crow = el('g', { transform: 'translate(414,826)' }, sc);
      const crowHead = el('g', {}, crow);
      el('path', { d: 'M-22,2 C-18,-8 -6,-14 4,-14 C10,-14 14,-10 14,-4 C14,2 8,6 0,6 L-10,6 L-26,12Z' }, crow);
      el('path', { d: 'M4,-12 C6,-24 18,-26 22,-18 L32,-16 L22,-12 C20,-8 12,-6 6,-8Z' }, crowHead);
      el('path', { d: 'M-2,6 L-4,14 M4,6 L4,14', stroke: T.sil, 'stroke-width': 2 }, crow);
      const crowEye = el('circle', { cx: 18, cy: -18, r: 1.6, fill: '#FFB347' }, crowHead);
      anim.push(t => {
        for (const g of rags) g.r.setAttribute('transform', `rotate(${f2(8 * Math.sin(TAU * t / 2.4 + g.ph))} ${g.x} 852)`);
        const peck = (t % 5) > 4.2 ? 18 * Math.sin(Math.PI * ((t % 5) - 4.2) / 0.8) : 0;
        crowHead.setAttribute('transform', `rotate(${f2(peck)} 6 -8)`);
        crowEye.setAttribute('opacity', (t % 3.1) > 3.0 ? 0 : 1);
      });

      midHill();
      // fences
      const fence = el('g', { fill: T.sil });
      for (const [x0, x1] of [[30, 230], [850, 1060]]) {
        for (let x = x0; x <= x1; x += 40) el('rect', { x: x - 4, y: 1030, width: 8, height: 62 }, fence);
        el('rect', { x: x0 - 6, y: 1044, width: x1 - x0 + 12, height: 6 }, fence);
        el('rect', { x: x0 - 6, y: 1066, width: x1 - x0 + 12, height: 6 }, fence);
      }
      // the pumpkin field
      const R = rng(303);
      const field = el('g');
      for (let i = 0; i < 10; i++) pumpkin(110 + i * 92 + (R() - 0.5) * 30, 1060 + R() * 12, 0.26 + R() * 0.1, 40 + i, R() < 0.6, field);
      fogBand(1050, 6, 7, 60, 16, 0.6);
      for (let i = 0; i < 7; i++) {
        const x = 140 + i * 133 + (R() - 0.5) * 40;
        if (Math.abs(x - 540) < 60) continue;
        pumpkin(x, 1118 + R() * 12, 0.46 + R() * 0.14, 60 + i, R() < 0.7, field);
      }
      tree(1000, 1210, 52, -1, 0.9);
      foreground();
      fogBand(1168, 6, 11, 90, 18, 0.35);
      pumpkin(180, 1192, 1.15, 1);
      pumpkin(278, 1198, 0.6, 2, false);
      pumpkin(540, 1182, 0.7, 5);
      pumpkin(806, 1196, 0.55, 4, false);
      pumpkin(894, 1186, 0.98, 3);
    }

    ({ manor: sceneManor, witch: sceneWitch, patch: scenePatch })[theme]();

    /* ---------- cobwebs + spider ---------- */
    function cobweb(sx) {
      const ox = sx > 0 ? 0 : W, g = el('g', { fill: 'none', stroke: CREAM, opacity: 0.34, 'stroke-width': 1.3 });
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
          d += ` Q${f2(ox + sx * (pcx + cx) / 2 * r * 0.84)},${f2((pcy + cy) / 2 * r * 0.84)} ${f2(px)},${f2(py)}`;
        }
        el('path', { d }, g);
      }
    }
    if (T.webs) { cobweb(1); cobweb(-1); }
    if (T.spider) (function spider() {
      const g = el('g');
      const thread = el('path', { stroke: CREAM, 'stroke-width': 1.2, opacity: 0.5 }, g);
      const body = el('g', {}, g);
      const legs = 'M-6,-2 Q-18,-14 -26,-6 M-6,2 Q-20,-2 -28,8 M-6,5 Q-18,10 -24,22 M-5,8 Q-12,18 -14,30 M6,-2 Q18,-14 26,-6 M6,2 Q20,-2 28,8 M6,5 Q18,10 24,22 M5,8 Q12,18 14,30';
      el('path', { d: legs, stroke: '#1E1430', 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round' }, body);
      el('ellipse', { cx: 0, cy: 6, rx: 11, ry: 14, fill: '#1E1430', stroke: '#6B4D86', 'stroke-width': 1 }, body);
      el('circle', { cx: 0, cy: -8, r: 7, fill: '#1E1430', stroke: '#6B4D86', 'stroke-width': 1 }, body);
      el('circle', { cx: -2.6, cy: -9, r: 1.6, fill: T.accent }, body);
      el('circle', { cx: 2.6, cy: -9, r: 1.6, fill: T.accent }, body);
      const ax = 1008, ay = 96;
      anim.push(t => {
        const y = 372 + 22 * Math.sin(TAU * t / 3.5) + 6 * Math.sin(TAU * t / 1.3);
        const sway = 5 * Math.sin(TAU * t / 5);
        thread.setAttribute('d', `M${ax},${ay} L${f2(ax + sway)},${f2(y - 14)}`);
        body.setAttribute('transform', `translate(${f2(ax + sway)},${f2(y)}) rotate(${f2(-sway * 0.8)})`);
      });
    })();

    el('rect', { x: 26, y: 26, width: W - 52, height: H - 52, rx: 26, fill: 'none', stroke: CREAM, 'stroke-width': 1.4, opacity: 0.22 });

    /* ---------- text ---------- */
    const entries = [], fit = [];
    function line(txt, y, family, size, o = {}) {
      const t = el('text', {
        x: CX, y, 'font-family': family, 'font-size': size, 'text-anchor': 'middle', fill: o.fill || CREAM,
        'font-weight': o.weight || 400, 'letter-spacing': o.ls || 0, 'font-style': o.italic ? 'italic' : 'normal',
        style: 'font-variant-ligatures: none; font-feature-settings: "liga" 0, "dlig" 0',
      }, o.parent);
      t.textContent = txt;
      fit.push({ t, max: o.max || 900, ls: o.ls || 0 });
      return t;
    }
    function reveal(node, at, dur = 0.7, rise = 22) { entries.push({ node, at, dur, rise }); }
    const CINZEL = "'Cinzel', serif", CORM = "'Cormorant Garamond', serif", GOTH = "'Grenze Gotisch', serif";

    const pill = el('g');
    el('rect', { x: 230, y: 1676, width: 620, height: 124, rx: 62, fill: T.accent, 'fill-opacity': 0.08, stroke: T.accent, 'stroke-width': 2.4 }, pill);
    el('rect', { x: 242, y: 1688, width: 596, height: 100, rx: 50, fill: 'none', stroke: T.accent, 'stroke-width': 1, opacity: 0.5 }, pill);
    reveal(pill, 3.0);
    const divider = el('g', { stroke: CREAM, 'stroke-width': 1.4 });
    el('path', { d: 'M330,1408 L490,1408 M590,1408 L750,1408', opacity: 0.55 }, divider);
    el('path', { d: batPath(0.4), fill: CREAM, stroke: 'none', transform: 'translate(540,1408) scale(0.62)' }, divider);
    reveal(divider, 2.65);

    if (OPT.text) {
      const eg = el('g');
      line(P.eyebrow, 150, CINZEL, 30, { weight: 600, ls: 9, parent: eg, max: 640 });
      for (const sx of [-1, 1]) el('path', { d: batPath(0.6), fill: CREAM, transform: `translate(${CX + sx * 375},140) scale(0.36)` }, eg);
      reveal(eg, 1.9);

      const tg = el('g');
      const glow = el('g', { filter: url('titleGlow'), opacity: 0.75 }, tg);
      line(P.title1, 292, GOTH, 150, { fill: T.titleGlow, weight: 700, parent: glow, max: 920 });
      line(P.title2, 442, GOTH, 176, { fill: T.titleGlow, weight: 700, parent: glow, max: 920 });
      line(P.title1, 292, GOTH, 150, { fill: url('title'), weight: 700, parent: tg, max: 920 });
      line(P.title2, 442, GOTH, 176, { fill: url('title'), weight: 700, parent: tg, max: 920 });
      reveal(tg, 2.1, 0.9, 30);

      const dg = el('g');
      reveal(line(P.date, 1290, CINZEL, 56, { weight: 700, ls: 5, parent: dg, max: 860 }), 2.4);
      reveal(line(P.time, 1356, CORM, 46, { italic: true, weight: 500, fill: T.soft, parent: dg, max: 860 }), 2.5);
      reveal(line(P.venue, 1480, CINZEL, 50, { weight: 700, ls: 8, parent: dg, max: 860 }), 2.75);
      reveal(line(P.address, 1536, CORM, 44, { italic: true, weight: 500, fill: T.soft, parent: dg, max: 860 }), 2.85);
      reveal(line(P.note, 1616, CORM, 40, { italic: true, weight: 600, fill: T.accent, parent: dg, max: 880 }), 2.95);
      reveal(line(P.rsvpLabel, 1726, CINZEL, 25, { weight: 600, ls: 6, fill: T.accent, parent: dg, max: 540 }), 3.1);
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
        const a = R() * TAU, r0 = Math.sqrt(R()) * MOON.r * 0.64;
        const near = R();
        swarm.push({
          node: el('path', { fill: T.bat }, swarmG),
          x0: MOON.x + Math.cos(a) * r0, y0: MOON.y + Math.sin(a) * r0 * 0.9,
          dir: a + (R() - 0.5) * 0.6, dist: 900 + R() * 700,
          t0: 0.3 + R() * 1.3, dur: 1.1 + R() * 0.8,
          s0: 0.14 + R() * 0.14, s1: 1.1 + near * near * 3.6,
          hz: 6 + R() * 4, ph: R(), wob: (R() - 0.5) * 120,
        });
      }
      for (const [y, dir, t0, s] of [[520, 1, 1.25, 3.4], [1380, -1, 1.55, 4.2], [980, 1, 1.9, 2.8]])
        swarm.push({ node: el('path', { fill: T.bat }, swarmG), sweep: true, y, dirx: dir, t0, dur: 1.1, s, hz: 4.5, ph: R() });
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
    return { setTime, ready, INTRO, width: W, height: H, theme, moon: { x: MOON.x / W, y: MOON.y / H, r: MOON.r / W } };
  }

  global.HauntCard = { create, batPath, INTRO, THEMES: Object.keys(THEMES), themeNames: Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.name])) };
})(window);
