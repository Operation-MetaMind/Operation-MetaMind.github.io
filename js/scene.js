// Operation MetaMind hero: kinetic typography.
// The headline is not text on a page, it is several thousand particles that
// assemble into the words on load and scatter away from the cursor. Rendered in
// screen space with an orthographic camera so the type stays crisp. Falls back
// to the real headline when WebGL is unavailable or motion is reduced.
// No em dashes anywhere.

import * as THREE from 'three';

const LINES = [
  ['Questions medicine', false],
  ["hasn't answered.", false],
  ["We're closing them.", true],
];
const INK = [0.086, 0.090, 0.107];   // #16171c
const ACC = [0.294, 0.275, 0.898];   // #4b46e5

const canvas = document.getElementById('scene');
const heading = document.querySelector('.hero h1');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let gl = null;
try { gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch (e) { gl = null; }

if (!canvas || !gl || reduceMotion) {
  document.body.classList.add('no-webgl');
  if (heading) { heading.classList.remove('sr-only'); heading.classList.add('hero-visible'); }
} else {
  try { init(); } catch (e) { console.error('[MetaMind] hero init failed', e); }
}

function init() {
  const mq = window.matchMedia('(max-width: 760px)');
  let isMobile = mq.matches;
  const N = isMobile ? 4800 : 9000;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  let vw = window.innerWidth, vh = window.innerHeight;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-vw / 2, vw / 2, vh / 2, -vh / 2, -1000, 1000);
  camera.position.z = 10;

  const cur = new Float32Array(N * 3);
  const tgt = new Float32Array(N * 3);
  const from = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    seed[i] = Math.random() * Math.PI * 2;
    from[i * 3] = (Math.random() - 0.5) * vw * 0.8;
    from[i * 3 + 1] = (Math.random() - 0.5) * vh * 0.8;
    cur[i * 3] = from[i * 3];
    cur[i * 3 + 1] = from[i * 3 + 1];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(cur, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: isMobile ? 2.0 : 2.1,
    sizeAttenuation: false,
    map: makeDot(),
    transparent: true,
    depthTest: false,
    vertexColors: true,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  let morph = 0;          // 0 scattered, 1 assembled
  let lastSampleW = 0;

  function setTargets() {
    const pts = sampleText(vw, vh, isMobile);
    if (!pts.length) return;
    // shuffle for even coverage when resampling to a fixed particle count
    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = pts[i]; pts[i] = pts[j]; pts[j] = t;
    }
    for (let i = 0; i < N; i++) {
      const p = pts[i % pts.length];
      tgt[i * 3] = p[0]; tgt[i * 3 + 1] = p[1]; tgt[i * 3 + 2] = 0;
      const c = p[2] ? ACC : INK;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    geo.attributes.color.needsUpdate = true;
    lastSampleW = vw;
  }

  // Sample immediately (Georgia fallback in the stack), refine once Fraunces loads.
  setTargets();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setTargets);

  const pointer = { x: 1e6, y: 1e6, on: false };
  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX - vw / 2; pointer.y = vh / 2 - e.clientY; pointer.on = true; }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.on = false; });

  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    isMobile = mq.matches;
    renderer.setSize(vw, vh, false);
    camera.left = -vw / 2; camera.right = vw / 2; camera.top = vh / 2; camera.bottom = -vh / 2;
    camera.updateProjectionMatrix();
    if (Math.abs(vw - lastSampleW) > 30) setTargets();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  renderer.setSize(vw, vh, false);

  // Render while the tab is visible. Pausing on scroll proved fragile when the
  // page loads at an anchor (#work), so keep it simple: one draw call is cheap.
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running) requestAnimationFrame(tick);
  });

  const R = 115, EASE = 0.14;
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    const t = performance.now() * 0.001;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      let dx = tgt[i3], dy = tgt[i3 + 1];
      if (morph < 1) {
        const e = 1 - Math.pow(1 - morph, 3);
        dx = from[i3] + (tgt[i3] - from[i3]) * e;
        dy = from[i3 + 1] + (tgt[i3 + 1] - from[i3 + 1]) * e;
      }
      // gentle idle sway so the type breathes
      dx += Math.sin(t * 0.8 + seed[i]) * 1.1;
      dy += Math.cos(t * 0.7 + seed[i] * 1.3) * 1.1;
      // cursor repel
      if (pointer.on) {
        const rx = cur[i3] - pointer.x, ry = cur[i3 + 1] - pointer.y;
        const d2 = rx * rx + ry * ry;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 1; const f = (1 - d / R) * 42; dx += rx / d * f; dy += ry / d * f; }
      }
      cur[i3] += (dx - cur[i3]) * EASE;
      cur[i3 + 1] += (dy - cur[i3 + 1]) * EASE;
    }
    if (morph < 1) morph = Math.min(1, morph + 0.012);
    geo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
}

function sampleText(vw, vh, isMobile) {
  const cnv = document.createElement('canvas');
  cnv.width = vw; cnv.height = vh;
  const ctx = cnv.getContext('2d');
  const fontPx = isMobile ? Math.min(vw * 0.10, 52) : Math.min(vw * 0.068, 100);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${fontPx}px Fraunces, Georgia, serif`;
  ctx.fillStyle = '#000';
  const lineH = fontPx * 1.08;
  const blockH = lineH * LINES.length;
  const cx = vw / 2;
  const startY = vh * 0.46 - blockH / 2 + lineH / 2;
  LINES.forEach((ln, i) => ctx.fillText(ln[0], cx, startY + i * lineH));

  const data = ctx.getImageData(0, 0, vw, vh).data;
  const gap = isMobile ? 2 : 3;
  const pts = [];
  for (let y = 0; y < vh; y += gap) {
    const li = Math.floor((y - (startY - lineH / 2)) / lineH);
    const accent = li >= 0 && li < LINES.length ? LINES[li][1] : false;
    const row = y * vw;
    for (let x = 0; x < vw; x += gap) {
      if (data[(row + x) * 4 + 3] > 128) pts.push([x - vw / 2, vh / 2 - y, accent]);
    }
  }
  return pts;
}

function makeDot() {
  const s = 64, c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
}
