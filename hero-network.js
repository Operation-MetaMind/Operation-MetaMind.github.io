/* Evidence-network constellation for the hero background.
   Dots = individual studies, diamonds = pooled estimates (forest-plot
   summary symbol), faint links = evidence synthesis. Slow 3D drift. */
(function () {
  var canvas = document.getElementById('evidence-network');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TEAL = '76, 184, 166';
  var SAGE = '196, 206, 199';
  var COPPER = '207, 148, 89';
  var LINK_DIST = 0.55;
  var TILT = 0.35;

  var dpr = 1, W = 0, H = 0, cx = 0, cy = 0;
  var pts = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function build() {
    var n = Math.round(Math.min(110, Math.max(40, (W * H) / 16000)));
    pts = [];
    for (var i = 0; i < n; i++) {
      pts.push({
        x: rand(-1, 1), y: rand(-1, 1), z: rand(-1, 1),
        ph: rand(0, Math.PI * 2),
        sp: rand(0.5, 1.4),
        r: rand(1.3, 2.4),
        diamond: i % 9 === 0
      });
    }
  }

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    cy = H / 2;
    build();
    if (reduceMotion) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    var ry = t * 0.00006;            // one slow revolution ≈ 105 s
    var cosY = Math.cos(ry), sinY = Math.sin(ry);
    var cosX = Math.cos(TILT), sinX = Math.sin(TILT);
    var i, j, p, n = pts.length;
    var wob = [], proj = [];

    for (i = 0; i < n; i++) {
      p = pts[i];
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
      var depth = Math.max(0, Math.min(1, (s - 0.68) / 0.62));
      proj.push({
        x: cx + X * s * W * 0.46,
        y: cy + Y * s * H * 0.52,
        s: s,
        a: 0.25 + 0.75 * depth
      });
    }

    // links between nearby studies
    ctx.lineWidth = 1;
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        var dx = wob[i * 3] - wob[j * 3];
        var dy = wob[i * 3 + 1] - wob[j * 3 + 1];
        var dz = wob[i * 3 + 2] - wob[j * 3 + 2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < LINK_DIST) {
          var a = (1 - d / LINK_DIST) * 0.38 * Math.min(proj[i].a, proj[j].a);
          ctx.strokeStyle = 'rgba(' + TEAL + ',' + a.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(proj[i].x, proj[i].y);
          ctx.lineTo(proj[j].x, proj[j].y);
          ctx.stroke();
        }
      }
    }

    // nodes
    for (i = 0; i < n; i++) {
      p = pts[i];
      var q = proj[i];
      if (p.diamond) {
        var r = 3.4 * q.s;
        // soft halo behind the pooled-estimate diamond
        ctx.fillStyle = 'rgba(' + COPPER + ',' + (0.12 * q.a).toFixed(3) + ')';
        diamond(q.x, q.y, r * 2.1);
        ctx.fillStyle = 'rgba(' + COPPER + ',' + (0.85 * q.a).toFixed(3) + ')';
        diamond(q.x, q.y, r);
      } else {
        ctx.fillStyle = 'rgba(' + SAGE + ',' + (0.8 * q.a).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(q.x, q.y, p.r * q.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function diamond(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
  }

  function loop(t) {
    requestAnimationFrame(loop);
    // hero scrolled out of view: skip the work, keep the loop cheap.
    // Hidden tabs are handled natively — rAF stops firing there.
    var r = canvas.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    draw(t);
  }

  window.addEventListener('resize', resize);

  resize();
  if (!reduceMotion) requestAnimationFrame(loop);
})();
