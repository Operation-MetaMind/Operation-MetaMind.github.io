// Operation MetaMind interactions: header state, reveal on scroll, project
// filtering, count-up stats, mobile menu. No em dashes anywhere.

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Header background on scroll ----
  var header = document.getElementById('header');
  function onScroll() {
    if (window.scrollY > 20) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Mobile menu: close after choosing a link ----
  var navToggle = document.getElementById('navToggle');
  document.querySelectorAll('.nav a').forEach(function (a) {
    a.addEventListener('click', function () { if (navToggle) navToggle.checked = false; });
  });

  // ---- Reveal on scroll ----
  var reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { revealObs.observe(el); });
  }

  // ---- Project filter ----
  var filters = document.querySelectorAll('.filter');
  var projects = document.querySelectorAll('#workGrid .proj');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lane = btn.getAttribute('data-filter');
      filters.forEach(function (f) {
        var active = f === btn;
        f.classList.toggle('is-active', active);
        f.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      projects.forEach(function (card) {
        var lanes = (card.getAttribute('data-lane') || '').split(' ');
        var show = lane === 'all' || lanes.indexOf(lane) !== -1;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });

  // ---- Count-up stats ----
  var stats = document.querySelectorAll('.num[data-count]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    stats.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  } else {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var startT = performance.now();
        var dur = 1000;
        function step(now) {
          var p = Math.min((now - startT) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased).toString();
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        statObs.unobserve(el);
      });
    }, { threshold: 0.6 });
    stats.forEach(function (el) { statObs.observe(el); });
  }
})();
