/* depth.js — tilt sutil + parallax só no hero (#demo). Vanilla, sem deps. Só transform. */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
  if ("ontouchstart" in window && !window.matchMedia("(hover: hover)").matches) return;
  var term = document.querySelector(".term");
  var demo = document.getElementById("demo");
  if (!term || !demo) return;

  document.documentElement.classList.add("depth-on");

  var MAX_RX = 3.5, MAX_RY = 4.5;
  var tx = 0, ty = 0, sy = 0;
  var cx = 0, cy = 0, csy = 0;
  var raf = 0, visible = true, hovering = false;

  function loop() {
    raf = 0;
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    csy += (sy - csy) * 0.08;
    var settled = Math.abs(tx - cx) < 0.0005 && Math.abs(ty - cy) < 0.0005;
    term.style.setProperty("--rx", (-cy * MAX_RX).toFixed(3) + "deg");
    term.style.setProperty("--ry", (cx * MAX_RY).toFixed(3) + "deg");
    term.style.setProperty("--px", cx.toFixed(4));
    term.style.setProperty("--py", cy.toFixed(4));
    term.style.setProperty("--sy", csy.toFixed(4));
    if (!settled || hovering) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); }
  function updateScroll() {
    if (!visible) return;
    var r = term.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var d = (vh / 2 - (r.top + r.height / 2)) / vh;
    sy = Math.max(-0.5, Math.min(0.5, d));
  }
  demo.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var r = term.getBoundingClientRect();
    var nx = (e.clientX - (r.left + r.width / 2)) / r.width;
    var ny = (e.clientY - (r.top + r.height / 2)) / r.height;
    tx = Math.max(-0.5, Math.min(0.5, nx));
    ty = Math.max(-0.5, Math.min(0.5, ny));
    hovering = true; kick();
  }, { passive: true });
  demo.addEventListener("pointerleave", function () {
    tx = 0; ty = 0; hovering = false; kick();
  }, { passive: true });
  window.addEventListener("scroll", function () { updateScroll(); kick(); }, { passive: true });
  window.addEventListener("resize", function () { updateScroll(); }, { passive: true });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) { updateScroll(); kick(); }
    }, { threshold: 0 }).observe(term);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && visible) kick(); });
  updateScroll();
})();
