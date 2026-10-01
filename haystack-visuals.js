/*!
 * Haystack visuals — animated abstract backgrounds for the Haystack Talent site.
 * Palette from the Haystack design system: tan #d4a574, brown #8b4513, white page.
 *
 * Usage: include this file once, then add a sized <canvas> anywhere:
 *   <canvas data-haystack="hero"></canvas>   hero | why | what | how | who
 * The canvas fills whatever size you give it with CSS. Optional on "who":
 *   data-core-x="0.72" data-core-y="0.5"  (where the bright core sits, 0–1), or
 *   data-core-target="#join"  (centre the core on an element; on phones it sits at that element's top edge)
 * On phones it draws fewer particles, caps resolution and runs at ~30fps to stay smooth and save battery.
 * Animations pause off-screen and stay still for reduced-motion visitors.
 */
(() => {

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const Q = mobile ? .55 : 1;           // particle density
const DPR_CAP = mobile ? 1.5 : 2;     // drawing resolution
const MIN_FRAME = mobile ? 31 : 0;    // ms between frames (~30fps on phones)
const TAU = Math.PI * 2;
const R = (a, b) => a + Math.random() * (b - a);
const G = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const BG = '#ffffff';
const STRAW = [212,165,116], HAZE = [222,196,166], ROSE = [176,112,62], EMBER = [139,69,19], CORE = [110,52,14], DUST = [150,120,95];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const SCENES = {};
function scene(name, init, draw) { SCENES[name] = { init, draw }; }

function mount(el) {
  if (el.__haystack) return; const def = SCENES[el.dataset.haystack]; if (!def) return;
  el.__haystack = true;
  const ctx = el.getContext('2d');
  let w = 0, h = 0, s = null, visible = false, running = false;
  const t0 = performance.now();
  let last = 0;
  const frame = (now, k = 1) => { s.k = k; def.draw(ctx, w, h, (now - t0) / 1000, s); };
  function resize() {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
    w = r.width; h = r.height; el.width = Math.round(w * dpr); el.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    s = def.init(w, h, el);
    if (reduce) { for (let i = 0; i < 40; i++) frame(t0 + 8000 + i * 16); } else { last = performance.now(); frame(last); }
  }
  function loop(now) {
    if (!visible) { running = false; return; }
    const dt = now - last;
    if (dt >= MIN_FRAME) { frame(now, Math.min(dt / 16.67, 3)); last = now; }
    requestAnimationFrame(loop);
  }
  new ResizeObserver(resize).observe(el);
  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (visible && !running && !reduce && s) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }, { rootMargin: '80px' }).observe(el);
}

function haze(ctx, x, y, r, c, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/* HERO: dense straw fibers with one buried ember */
scene('hero', (w, h) => {
  const wide = w > 860, cx = w * .5, cy = h * .6;
  const n = Math.round(Math.min(420, w * h / 1800) * (mobile ? .8 : 1));
  const ex = wide ? cx + w * .22 : w * .7, ey = wide ? cy + h * .12 : h * .88;
  return { cx, cy, ex, ey, fibers: Array.from({ length: n }, () => ({
    x: cx + G() * w * (wide ? .42 : .5), y: cy + G() * h * .34,
    len: R(40, 210), ang: R(-.6, .6) + (Math.random() < .35 ? R(-1.6, 1.6) : 0),
    bend: R(-.45, .45), ph: R(0, TAU), a: R(.12, .42), lw: R(.5, 1.3)
  })) };
}, (ctx, w, h, t, s) => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  haze(ctx, s.cx - w * .1 + Math.sin(t * .1) * 40, s.cy - h * .1, Math.max(w, h) * .45, HAZE, .10);
  const p = .75 + .25 * Math.sin(t * 1.2);
  haze(ctx, s.ex, s.ey, 90 * p, STRAW, .45);
  haze(ctx, s.ex, s.ey, 10, EMBER, .8 * p);
  ctx.globalCompositeOperation = 'source-over';
  for (const f of s.fibers) {
    const a = f.ang + Math.sin(t * .35 + f.ph) * .05;
    const dx = Math.cos(a) * f.len / 2, dy = Math.sin(a) * f.len / 2;
    ctx.beginPath();
    ctx.moveTo(f.x - dx, f.y - dy);
    ctx.quadraticCurveTo(f.x - dy * f.bend * 2, f.y + dx * f.bend * 2, f.x + dx, f.y + dy);
    ctx.strokeStyle = rgba(STRAW, f.a); ctx.lineWidth = f.lw; ctx.stroke();
  }
});

/* WHY: murmuration in fog, a few warm embers inside the noise */
scene('why', (w, h) => ({
  pts: Array.from({ length: Math.round(w * h / 260 * Q) }, () => ({ x: R(0, w), y: R(0, h), s: R(.6, 1.8), warm: Math.random() < .3, a: R(.15, .5) })),
  embers: Array.from({ length: 7 }, () => ({ x: R(w * .2, w * .8), y: R(h * .2, h * .8), ph: R(0, TAU) })),
  fog: Array.from({ length: 5 }, (_, i) => ({ x: R(.2, .8), y: R(.2, .8), r: R(.3, .55), ph: R(0, TAU), c: i % 2 ? STRAW : HAZE }))
}), (ctx, w, h, t, s) => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  for (const f of s.fog) haze(ctx, (f.x + Math.sin(t * .08 + f.ph) * .08) * w, (f.y + Math.cos(t * .06 + f.ph) * .08) * h, f.r * Math.max(w, h), f.c, f.c === HAZE ? .14 : .06);
  const field = (x, y) => (Math.sin(x * .006 + t * .25) + Math.sin(y * .007 - t * .18) + Math.sin((x + y) * .003 + t * .12)) * 1.1;
  for (const p of s.pts) {
    const a = field(p.x, p.y); p.x += Math.cos(a) * .7 * s.k; p.y += Math.sin(a) * .7 * s.k;
    if (p.x < -5) p.x = w + 5; if (p.x > w + 5) p.x = -5; if (p.y < -5) p.y = h + 5; if (p.y > h + 5) p.y = -5;
    ctx.fillStyle = rgba(p.warm ? EMBER : STRAW, p.a); ctx.fillRect(p.x, p.y, p.s, p.s);
  }
  for (const e of s.embers) {
    const a = field(e.x, e.y); e.x += Math.cos(a) * .4 * s.k; e.y += Math.sin(a) * .4 * s.k;
    if (e.x < w * .1 || e.x > w * .9 || e.y < h * .1 || e.y > h * .9) { e.x = R(w * .3, w * .7); e.y = R(h * .3, h * .7); }
    const p = .5 + .5 * Math.sin(t * 1.4 + e.ph);
    haze(ctx, e.x, e.y, 26, STRAW, .45 * p); haze(ctx, e.x, e.y, 4, CORE, .9 * p);
  }
});

/* WHAT: distinct clusters that stay separate but get threaded together */
scene('what', (w, h) => {
  const m = Math.min(w, h), cr = m * .17;
  const centers = [[.3,.3],[.72,.27],[.27,.72],[.73,.7]];
  const cols = [STRAW, EMBER, ROSE, DUST];
  return { cr, clusters: centers.map((c, i) => ({ x: c[0] * w, y: c[1] * h, col: cols[i], ph: R(0, TAU),
    nodes: Array.from({ length: 40 }, (_, k) => ({ r: k === 0 ? 3 : Math.sqrt(Math.random()) * cr, th: R(0, TAU), sp: R(.04, .22) * (Math.random() < .5 ? -1 : 1), s: R(.8, 2) })) })),
    links: [[0,1],[0,2],[1,3],[2,3],[0,3]] };
}, (ctx, w, h, t, s) => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  const pos = s.clusters.map(c => {
    const ox = c.x + Math.sin(t * .2 + c.ph) * 10, oy = c.y + Math.cos(t * .17 + c.ph) * 10;
    haze(ctx, ox, oy, s.cr * 1.6, HAZE, .22);
    return c.nodes.map(n => [ox + Math.cos(n.th + n.sp * t) * n.r, oy + Math.sin(n.th + n.sp * t) * n.r * .85]);
  });
  const max = s.cr * .45;
  s.clusters.forEach((c, i) => {
    const P = pos[i];
    ctx.lineWidth = .6;
    for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
      const d = Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]);
      if (d < max) { ctx.strokeStyle = rgba(c.col, (1 - d / max) * .32); ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke(); }
    }
    c.nodes.forEach((n, k) => { ctx.fillStyle = rgba(c.col, .75); ctx.beginPath(); ctx.arc(P[k][0], P[k][1], n.s, 0, TAU); ctx.fill(); });
  });
  s.links.forEach(([a, b], k) => {
    const A = pos[a][0], B = pos[b][0];
    const mx = (A[0] + B[0]) / 2 + (B[1] - A[1]) * .18, my = (A[1] + B[1]) / 2 - (B[0] - A[0]) * .18;
    ctx.strokeStyle = 'rgba(139,69,19,.18)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(mx, my, B[0], B[1]); ctx.stroke();
    const u = (t * .16 + k * .21) % 1, v = 1 - u;
    const x = v * v * A[0] + 2 * v * u * mx + u * u * B[0], y = v * v * A[1] + 2 * v * u * my + u * u * B[1];
    haze(ctx, x, y, 14, STRAW, .55); haze(ctx, x, y, 3, CORE, .9);
  });
});

/* HOW: an iris of fibers; the field is soft bokeh outside, sharp inside the aperture */
scene('how', (w, h) => ({
  bokeh: Array.from({ length: Math.round(70 * Q) }, () => ({ x: R(0, w), y: R(0, h), r: R(10, 34), vx: R(-.15, .15), vy: R(-.12, .12), c: Math.random() < .6 ? HAZE : STRAW })),
  sharp: Array.from({ length: 90 }, () => ({ x: R(-1, 1), y: R(-1, 1), s: R(.8, 1.8), ph: R(0, TAU) })),
  fibers: Array.from({ length: Math.round(460 * (mobile ? .65 : 1)) }, () => ({ a: R(0, TAU), j: R(.85, 1.12), tw: R(-.25, .25), g: Math.floor(R(0, 3)) }))
}), (ctx, w, h, t, s) => {
  const cx = w / 2, cy = h / 2, Ro = Math.min(w, h) * .36, ri = Ro * (.34 + .1 * Math.sin(t * .45));
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  for (const b of s.bokeh) {
    b.x += b.vx * s.k; b.y += b.vy * s.k;
    if (b.x < -40) b.x = w + 40; if (b.x > w + 40) b.x = -40; if (b.y < -40) b.y = h + 40; if (b.y > h + 40) b.y = -40;
    haze(ctx, b.x, b.y, b.r, b.c, .22);
  }
  const grad = ctx.createRadialGradient(cx, cy, ri * .9, cx, cy, Ro * 1.15);
  grad.addColorStop(0, rgba(EMBER, .9)); grad.addColorStop(.35, rgba(STRAW, .55)); grad.addColorStop(1, rgba(HAZE, 0));
  ctx.strokeStyle = grad;
  [.18, .3, .45].forEach((alpha, g) => {
    ctx.globalAlpha = alpha; ctx.lineWidth = g === 2 ? .5 : .8; ctx.beginPath();
    for (const f of s.fibers) if (f.g === g) {
      const a0 = f.a + Math.sin(t * .2) * .04, a1 = a0 + f.tw;
      ctx.moveTo(cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri);
      ctx.lineTo(cx + Math.cos(a1) * Ro * f.j, cy + Math.sin(a1) * Ro * f.j);
    }
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ri, 0, TAU); ctx.fillStyle = BG; ctx.fill(); ctx.clip();
  ctx.globalCompositeOperation = 'multiply';
  for (const p of s.sharp) {
    const x = cx + (p.x + Math.sin(t * .15 + p.ph) * .05) * Ro * .6, y = cy + (p.y + Math.cos(t * .12 + p.ph) * .05) * Ro * .6;
    ctx.fillStyle = rgba(STRAW, .55 + .35 * Math.sin(t + p.ph)); ctx.fillRect(x, y, p.s, p.s);
  }
  const fx = cx + Math.cos(t * .3) * ri * .35, fy = cy + Math.sin(t * .23) * ri * .3;
  haze(ctx, fx, fy, 22, STRAW, .6); haze(ctx, fx, fy, 3.5, CORE, 1);
  ctx.restore();
  ctx.globalCompositeOperation = 'multiply';
  const rim = ctx.createRadialGradient(cx, cy, ri - 1, cx, cy, ri + 16);
  rim.addColorStop(0, rgba(EMBER, .6)); rim.addColorStop(1, rgba(EMBER, 0));
  ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, ri + 16, 0, TAU); ctx.arc(cx, cy, ri - 1, 0, TAU, true); ctx.fill();
});

/* WHO: three streams spiral into one bright core behind the form */
scene('who', (w, h, el) => {
  const wide = w > 860;
  let cx = w * parseFloat(el.dataset.coreX || (wide ? .72 : .5)), cy = h * parseFloat(el.dataset.coreY || (wide ? .5 : .8));
  const target = el.dataset.coreTarget && document.querySelector(el.dataset.coreTarget);
  const tr = target && target.getBoundingClientRect();
  // only follow the target if it is visible and sits in the same section as this canvas
  if (target && tr.width && tr.height && el.parentElement && el.parentElement.contains(target)) {
    const cr = el.getBoundingClientRect();
    cx = tr.left - cr.left + tr.width / 2;
    cy = wide ? tr.top - cr.top + tr.height / 2 : tr.top - cr.top;
  }
  const rmax = Math.max(w, h) * .6;
  const streams = [[STRAW, -2.5], [DUST, -.6], [ROSE, 1.4]];
  return { cx, cy, rmax, streams, pts: Array.from({ length: Math.round(Math.min(1100, w * h / 700) * Q) }, () => {
    const k = Math.floor(R(0, 3)); return { k, th: streams[k][1] + G() * .8 + R(0, TAU) * .15, r: R(10, rmax), v: R(.25, .7), s: R(1, 2.4) };
  }) };
}, (ctx, w, h, t, s) => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  haze(ctx, s.cx, s.cy, s.rmax * .8, HAZE, .25);
  for (const p of s.pts) {
    p.r -= p.v * (1 + 50 / (p.r + 20)) * s.k; p.th += .0025 * (1 + 90 / (p.r + 15)) * s.k;
    if (p.r < 6) { p.r = s.rmax * R(.85, 1.05); p.th = s.streams[p.k][1] + G() * .8; }
    const x = s.cx + Math.cos(p.th) * p.r, y = s.cy + Math.sin(p.th) * p.r * .72;
    const a = Math.min(.9, .32 + 60 / (p.r + 40));
    ctx.fillStyle = rgba(s.streams[p.k][0], a); ctx.fillRect(x, y, p.s, p.s);
  }
  const pulse = .85 + .15 * Math.sin(t * .9);
  haze(ctx, s.cx, s.cy, Math.min(w, h) * .62 * pulse, STRAW, .5);
  haze(ctx, s.cx, s.cy, Math.min(w, h) * .09 * pulse, EMBER, .55);
});

function mountAll() { document.querySelectorAll('canvas[data-haystack]').forEach(mount); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
new MutationObserver(mountAll).observe(document.documentElement, { childList: true, subtree: true });
window.HaystackVisuals = { mount, mountAll };
})();
