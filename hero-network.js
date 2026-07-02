/* Evidence-network ambience, two layers sharing one visual language:
   dots = individual studies, diamonds = pooled estimates (forest-plot
   summary symbol), faint teal links = evidence synthesis.

   Layer 1 — hero constellation: slowly rotating 3D cloud behind the
   headline. Interactive: the cloud tilts toward the pointer, and nearby
   studies are drawn toward it and linked to it, like evidence gathering
   around a research question.
   Layer 2 — margin field: a fixed layer that draws only in the empty
   side gutters outside the content column, drifting with a gentle
   scroll parallax. Hidden when the gutters are too narrow.

   Resize never regenerates the fields: positions are stored normalized
   and mapped to the current geometry each frame, so resizing the window
   glides instead of scrambling. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TEAL = '76, 184, 166';
  var SAGE = '196, 206, 199';
  var COPPER = '207, 148, 89';

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function fitCanvas(canvas, ctx, w, h) {
    var r = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.max(1, Math.round(w * r));
    var ph = Math.max(1, Math.round(h * r));
    // Only reassign width/height when the pixel size actually changes —
    // touching either property clears the canvas, so doing it on every
    // resize tick is what made the fields flash and scramble.
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  function diamond(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
  }

  /* ==================== layer 1: hero constellation ==================== */
  var heroCanvas = document.getElementById('evidence-network');
  var hctx = heroCanvas && heroCanvas.getContext ? heroCanvas.getContext('2d') : null;
  var hW = 0, hH = 0, hcx = 0, hcy = 0, hpts = [];
  var LINK_DIST = 0.55;
  var TILT = 0.35;

  // pointer state (eased every frame so the response feels fluid)
  var ptr = { x: 0, y: 0, active: false };
  var pull = 0, yaw = 0, pitch = 0;
  var LENS_R = 160;

  function heroPoint() {
    return {
      x: rand(-1, 1), y: rand(-1, 1), z: rand(-1, 1),
      ph: rand(0, Math.PI * 2),
      sp: rand(0.5, 1.4),
      r: rand(1.3, 2.4),
      diamond: Math.random() < 0.11
    };
  }

  // geometry runs every frame of a resize (cheap, smooth remap)
  function heroGeometry() {
    if (!hctx) return;
    var rect = heroCanvas.parentElement.getBoundingClientRect();
    hW = Math.max(1, rect.width);
    hH = Math.max(1, rect.height);
    fitCanvas(heroCanvas, hctx, hW, hH);
    hcx = hW / 2;
    hcy = hH / 2;
  }
  // density runs only once the size settles, so studies never pop in and
  // out on every frame of a drag; existing studies keep their positions
  function heroDensity() {
    if (!hctx) return;
    var n = Math.round(Math.min(110, Math.max(40, (hW * hH) / 16000)));
    while (hpts.length < n) hpts.push(heroPoint());
    if (hpts.length > n) hpts.length = n;
  }

  function heroDraw(t) {
    if (!hctx) return;
    var vis = heroCanvas.getBoundingClientRect();
    if (vis.bottom < 0 || vis.top > window.innerHeight) return; // off-screen

    hctx.clearRect(0, 0, hW, hH);

    // ease pointer influence: strength, and tilt toward the cursor
    pull += ((ptr.active ? 1 : 0) - pull) * 0.06;
    var yawT = ptr.active ? (ptr.x / hW - 0.5) * 0.5 : 0;
    var pitchT = ptr.active ? (ptr.y / hH - 0.5) * 0.35 : 0;
    yaw += (yawT - yaw) * 0.04;
    pitch += (pitchT - pitch) * 0.04;

    var ry = t * 0.00006 + yaw;      // one slow revolution ≈ 105 s
    var rx = TILT + pitch;
    var cosY = Math.cos(ry), sinY = Math.sin(ry);
    var cosX = Math.cos(rx), sinX = Math.sin(rx);
    var i, j, p, n = hpts.length;
    var wob = [], proj = [];

    for (i = 0; i < n; i++) {
      p = hpts[i];
      // gentle individual breathing on top of the global rotation
      var wx = p.x + 0.07 * Math.sin(t * 0.00025 * p.sp + p.ph);
      var wy = p.y + 0.07 * Math.cos(t * 0.0002 * p.sp + p.ph * 1.7);
      var wz = p.z + 0.07 * Math.sin(t * 0.00022 * p.sp + p.ph * 2.3);
      wob.push(wx, wy, wz);

      var X = wx * cosY + wz * sinY;
      var Z = wz * cosY - wx * sinY;
      var Y = wy * cosX - Z * sinX;
      Z = wy * sinX + Z * cosX;

      var s = 2.3 / (2.3 + Z);                       // perspective
      var depth = clamp01((s - 0.68) / 0.62);
      var q = {
        x: hcx + X * s * hW * 0.46,
        y: hcy + Y * s * hH * 0.52,
        s: s,
        a: 0.25 + 0.75 * depth,
        f: 0
      };

      // magnetic lens: studies near the cursor gather toward it
      if (pull > 0.01) {
        var pdx = ptr.x - q.x;
        var pdy = ptr.y - q.y;
        var pd = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pd < LENS_R) {
          q.f = (1 - pd / LENS_R) * pull;
          q.x += pdx * q.f * 0.12;
          q.y += pdy * q.f * 0.12;
        }
      }
      proj.push(q);
    }

    // links between nearby studies
    hctx.lineWidth = 1;
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        var dx = wob[i * 3] - wob[j * 3];
        var dy = wob[i * 3 + 1] - wob[j * 3 + 1];
        var dz = wob[i * 3 + 2] - wob[j * 3 + 2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < LINK_DIST) {
          var a = (1 - d / LINK_DIST) * 0.38 * Math.min(proj[i].a, proj[j].a);
          hctx.strokeStyle = 'rgba(' + TEAL + ',' + a.toFixed(3) + ')';
          hctx.beginPath();
          hctx.moveTo(proj[i].x, proj[i].y);
          hctx.lineTo(proj[j].x, proj[j].y);
          hctx.stroke();
        }
      }
    }

    // links from the cursor to the studies it has gathered
    for (i = 0; i < n; i++) {
      if (proj[i].f > 0.02) {
        hctx.strokeStyle = 'rgba(' + TEAL + ',' + (0.35 * proj[i].f * proj[i].a).toFixed(3) + ')';
        hctx.beginPath();
        hctx.moveTo(ptr.x, ptr.y);
        hctx.lineTo(proj[i].x, proj[i].y);
        hctx.stroke();
      }
    }

    // nodes (brightened and slightly enlarged inside the lens)
    for (i = 0; i < n; i++) {
      p = hpts[i];
      var q2 = proj[i];
      var glow = 1 + 0.5 * q2.f;
      var alpha = Math.min(1, q2.a * (1 + 0.6 * q2.f));
      if (p.diamond) {
        var r = 3.4 * q2.s * glow;
        // soft halo behind the pooled-estimate diamond
        hctx.fillStyle = 'rgba(' + COPPER + ',' + (0.12 * alpha).toFixed(3) + ')';
        diamond(hctx, q2.x, q2.y, r * 2.1);
        hctx.fillStyle = 'rgba(' + COPPER + ',' + (0.85 * alpha).toFixed(3) + ')';
        diamond(hctx, q2.x, q2.y, r);
      } else {
        hctx.fillStyle = 'rgba(' + SAGE + ',' + (0.8 * alpha).toFixed(3) + ')';
        hctx.beginPath();
        hctx.arc(q2.x, q2.y, p.r * q2.s * glow, 0, Math.PI * 2);
        hctx.fill();
      }
    }
  }

  function heroPointerInit() {
    if (!hctx || reduceMotion) return;
    var hero = heroCanvas.parentElement;
    hero.addEventListener('pointermove', function (e) {
      var r = heroCanvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left;
      ptr.y = e.clientY - r.top;
      ptr.active = true;
    });
    hero.addEventListener('pointerleave', function () { ptr.active = false; });
    hero.addEventListener('pointercancel', function () { ptr.active = false; });
  }

  /* ==================== layer 2: margin field ==================== */
  var marCanvas = document.getElementById('margin-network');
  var mctx = marCanvas && marCanvas.getContext ? marCanvas.getContext('2d') : null;
  var mW = 0, mH = 0, gutter = 0, active = false;
  var strips = [[], []];  // per-strip point lists
  var CONTENT_W = 1240;   // content column plus breathing room
  var MIN_GUTTER = 48;    // hide the field on narrower viewports
  var FEATHER = 28;       // fade at the content-side edge of each strip
  var MLINK = 110;        // px link distance within a strip

  function marPoint() {
    return {
      u: Math.random(),          // 0..1 across the strip width
      yf: Math.random(),         // 0..1 of the viewport height
      vy: rand(3, 9),            // px/s upward drift
      par: rand(0.05, 0.16),     // scroll parallax factor
      ph: rand(0, Math.PI * 2),
      r: rand(1.2, 2.2),
      diamond: Math.random() < 0.1
    };
  }

  function marGeometry() {
    if (!mctx) return;
    mW = window.innerWidth;
    mH = window.innerHeight;
    gutter = (mW - CONTENT_W) / 2;
    active = gutter >= MIN_GUTTER;
    fitCanvas(marCanvas, mctx, mW, mH);
  }
  function marDensity() {
    if (!mctx || !active) return;
    // adjust density only; existing points keep their normalized homes
    var n = Math.max(10, Math.min(42, Math.round((gutter * mH) / 3800)));
    for (var s = 0; s < 2; s++) {
      while (strips[s].length < n) strips[s].push(marPoint());
      if (strips[s].length > n) strips[s].length = n;
    }
  }

  function marDraw(t) {
    if (!mctx) return;
    mctx.clearRect(0, 0, mW, mH);
    if (!active) return;

    var sc = window.scrollY || 0;
    var innerW = gutter - 12;
    var s, i, j, p;

    for (s = 0; s < 2; s++) {
      var pts = strips[s];
      var x0 = (s === 0 ? 0 : mW - gutter) + 6;
      var n = pts.length;
      var proj = [];

      for (i = 0; i < n; i++) {
        p = pts[i];
        var sx = x0 + p.u * innerW + 3 * Math.sin(t * 0.00035 + p.ph);
        var sy = (((p.yf * mH - sc * p.par - t * 0.001 * p.vy) % mH) + mH) % mH;
        // vertical fade below the header and at the bottom edge,
        // horizontal feather toward the content column
        var va = clamp01((sy - 70) / 90) * clamp01((mH - 30 - sy) / 90);
        var ha = s === 0
          ? clamp01((gutter - sx) / FEATHER)
          : clamp01((sx - (mW - gutter)) / FEATHER);
        proj.push({ x: sx, y: sy, m: va * ha });
      }

      mctx.lineWidth = 1;
      for (i = 0; i < n; i++) {
        if (proj[i].m <= 0.01) continue;
        for (j = i + 1; j < n; j++) {
          if (proj[j].m <= 0.01) continue;
          var dx = proj[i].x - proj[j].x;
          var dy = proj[i].y - proj[j].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < MLINK) {
            var a = (1 - d / MLINK) * 0.28 * Math.min(proj[i].m, proj[j].m);
            mctx.strokeStyle = 'rgba(' + TEAL + ',' + a.toFixed(3) + ')';
            mctx.beginPath();
            mctx.moveTo(proj[i].x, proj[i].y);
            mctx.lineTo(proj[j].x, proj[j].y);
            mctx.stroke();
          }
        }
      }

      for (i = 0; i < n; i++) {
        p = pts[i];
        var q = proj[i];
        if (q.m <= 0.01) continue;
        if (p.diamond) {
          mctx.fillStyle = 'rgba(' + COPPER + ',' + (0.1 * q.m).toFixed(3) + ')';
          diamond(mctx, q.x, q.y, 6.5);
          mctx.fillStyle = 'rgba(' + COPPER + ',' + (0.75 * q.m).toFixed(3) + ')';
          diamond(mctx, q.x, q.y, 3.1);
        } else {
          mctx.fillStyle = 'rgba(' + SAGE + ',' + (0.65 * q.m).toFixed(3) + ')';
          mctx.beginPath();
          mctx.arc(q.x, q.y, p.r, 0, Math.PI * 2);
          mctx.fill();
        }
      }
    }
  }

  /* ==================== shared loop ==================== */
  var lastT = 0;

  function frame(t) {
    requestAnimationFrame(frame);
    lastT = t;
    heroDraw(t);
    marDraw(t);
  }

  // Coalesce resize events into one geometry update per frame. The rAF loop
  // keeps painting, so we never redraw synchronously mid-resize — that
  // double-draw at half-applied sizes was what made the fields go haywire.
  var resizeQueued = false, densityTimer = 0;
  function onResize() {
    if (!resizeQueued) {
      resizeQueued = true;
      requestAnimationFrame(function () {
        resizeQueued = false;
        heroGeometry();
        marGeometry();
        if (reduceMotion) { heroDraw(lastT); marDraw(lastT); }
      });
    }
    // recompute point counts only after the size stops changing
    clearTimeout(densityTimer);
    densityTimer = setTimeout(function () {
      heroDensity();
      marDensity();
      if (reduceMotion) { heroDraw(lastT); marDraw(lastT); }
    }, 180);
  }

  window.addEventListener('resize', onResize);
  heroPointerInit();
  heroGeometry(); heroDensity();
  marGeometry(); marDensity();
  if (reduceMotion) { heroDraw(0); marDraw(0); }
  else requestAnimationFrame(frame);
})();
