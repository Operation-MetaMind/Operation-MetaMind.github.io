/* Evidence-network ambience, two layers sharing one visual language:
   dots = individual studies, diamonds = pooled estimates (forest-plot
   summary symbol), faint teal links = evidence synthesis.

   Layer 1 — hero constellation: slowly rotating 3D cloud behind the
   headline (canvas #evidence-network, absolute inside the hero).
   Layer 2 — margin field: a fixed, full-height layer that draws only in
   the empty side gutters outside the content column, drifting gently
   with a slight scroll parallax. Hidden when the gutters are too narrow. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TEAL = '76, 184, 166';
  var SAGE = '196, 206, 199';
  var COPPER = '207, 148, 89';

  function rand(a, b) { return a + Math.random() * (b - a); }

  function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

  function fitCanvas(canvas, ctx, w, h) {
    var r = dpr();
    canvas.width = Math.round(w * r);
    canvas.height = Math.round(h * r);
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

  function heroBuild() {
    var n = Math.round(Math.min(110, Math.max(40, (hW * hH) / 16000)));
    hpts = [];
    for (var i = 0; i < n; i++) {
      hpts.push({
        x: rand(-1, 1), y: rand(-1, 1), z: rand(-1, 1),
        ph: rand(0, Math.PI * 2),
        sp: rand(0.5, 1.4),
        r: rand(1.3, 2.4),
        diamond: i % 9 === 0
      });
    }
  }

  function heroResize() {
    if (!hctx) return;
    var rect = heroCanvas.parentElement.getBoundingClientRect();
    hW = Math.max(1, rect.width);
    hH = Math.max(1, rect.height);
    fitCanvas(heroCanvas, hctx, hW, hH);
    hcx = hW / 2;
    hcy = hH / 2;
    heroBuild();
  }

  function heroDraw(t) {
    if (!hctx) return;
    var r = heroCanvas.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return; // hero off-screen

    hctx.clearRect(0, 0, hW, hH);

    var ry = t * 0.00006;            // one slow revolution ≈ 105 s
    var cosY = Math.cos(ry), sinY = Math.sin(ry);
    var cosX = Math.cos(TILT), sinX = Math.sin(TILT);
    var i, j, p, n = hpts.length;
    var wob = [], proj = [];

    for (i = 0; i < n; i++) {
      p = hpts[i];
      var wx = p.x + 0.07 * Math.sin(t * 0.00025 * p.sp + p.ph);
      var wy = p.y + 0.07 * Math.cos(t * 0.0002 * p.sp + p.ph * 1.7);
      var wz = p.z + 0.07 * Math.sin(t * 0.00022 * p.sp + p.ph * 2.3);
      wob.push(wx, wy, wz);

      var X = wx * cosY + wz * sinY;
      var Z = wz * cosY - wx * sinY;
      var Y = wy * cosX - Z * sinX;
      Z = wy * sinX + Z * cosX;

      var s = 2.3 / (2.3 + Z);
      var depth = Math.max(0, Math.min(1, (s - 0.68) / 0.62));
      proj.push({
        x: hcx + X * s * hW * 0.46,
        y: hcy + Y * s * hH * 0.52,
        s: s,
        a: 0.25 + 0.75 * depth
      });
    }

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

    for (i = 0; i < n; i++) {
      p = hpts[i];
      var q = proj[i];
      if (p.diamond) {
        var rr = 3.4 * q.s;
        hctx.fillStyle = 'rgba(' + COPPER + ',' + (0.12 * q.a).toFixed(3) + ')';
        diamond(hctx, q.x, q.y, rr * 2.1);
        hctx.fillStyle = 'rgba(' + COPPER + ',' + (0.85 * q.a).toFixed(3) + ')';
        diamond(hctx, q.x, q.y, rr);
      } else {
        hctx.fillStyle = 'rgba(' + SAGE + ',' + (0.8 * q.a).toFixed(3) + ')';
        hctx.beginPath();
        hctx.arc(q.x, q.y, p.r * q.s, 0, Math.PI * 2);
        hctx.fill();
      }
    }
  }

  /* ==================== layer 2: margin field ==================== */
  var marCanvas = document.getElementById('margin-network');
  var mctx = marCanvas && marCanvas.getContext ? marCanvas.getContext('2d') : null;
  var mW = 0, mH = 0, gutter = 0, active = false, mpts = [];
  var CONTENT_W = 1240;   // content column plus breathing room
  var MIN_GUTTER = 48;    // hide the field on narrower viewports
  var FEATHER = 28;       // fade at the content-side edge of each strip
  var MLINK = 110;        // px link distance within a strip

  function marBuild() {
    mpts = [];
    var perStrip = Math.max(10, Math.min(42, Math.round((gutter * mH) / 3800)));
    for (var s = 0; s < 2; s++) {
      var x0 = s === 0 ? 6 : mW - gutter + 6;
      var x1 = s === 0 ? gutter - 6 : mW - 6;
      for (var i = 0; i < perStrip; i++) {
        mpts.push({
          strip: s,
          x: rand(x0, x1),
          y: rand(0, mH),
          vy: rand(3, 9),           // px/s upward drift
          par: rand(0.05, 0.16),    // scroll parallax factor
          ph: rand(0, Math.PI * 2),
          r: rand(1.2, 2.2),
          diamond: i % 10 === 0
        });
      }
    }
  }

  function marResize() {
    if (!mctx) return;
    mW = window.innerWidth;
    mH = window.innerHeight;
    gutter = (mW - CONTENT_W) / 2;
    active = gutter >= MIN_GUTTER;
    fitCanvas(marCanvas, mctx, mW, mH);
    if (active) marBuild();
  }

  function marMask(p, sx, sy) {
    // vertical: ease in below the header, ease out at the bottom edge
    var va = Math.max(0, Math.min(1, (sy - 70) / 90)) *
             Math.max(0, Math.min(1, (mH - 30 - sy) / 90));
    // horizontal: feather toward the content column
    var ha = p.strip === 0
      ? Math.max(0, Math.min(1, (gutter - sx) / FEATHER))
      : Math.max(0, Math.min(1, (sx - (mW - gutter)) / FEATHER));
    return va * ha;
  }

  function marDraw(t) {
    if (!mctx) return;
    mctx.clearRect(0, 0, mW, mH);
    if (!active) return;

    var sc = window.scrollY || 0;
    var i, j, p, n = mpts.length;
    var proj = [];

    for (i = 0; i < n; i++) {
      p = mpts[i];
      var sy = (((p.y - sc * p.par - t * 0.001 * p.vy) % mH) + mH) % mH;
      var sx = p.x + 3 * Math.sin(t * 0.00035 + p.ph);
      proj.push({ x: sx, y: sy, m: marMask(p, sx, sy) });
    }

    mctx.lineWidth = 1;
    for (i = 0; i < n; i++) {
      if (proj[i].m <= 0.01) continue;
      for (j = i + 1; j < n; j++) {
        if (mpts[i].strip !== mpts[j].strip || proj[j].m <= 0.01) continue;
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
      p = mpts[i];
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

  /* ==================== shared loop ==================== */
  function frame(t) {
    requestAnimationFrame(frame);
    heroDraw(t);
    marDraw(t);
  }

  function resizeAll() {
    heroResize();
    marResize();
    if (reduceMotion) {
      heroDraw(0);
      marDraw(0);
    }
  }

  window.addEventListener('resize', resizeAll);
  resizeAll();
  if (!reduceMotion) requestAnimationFrame(frame);
})();
