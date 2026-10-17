/* my-dev-clock — site demonstrativo. Interpretação web das animações do
   src/animation.rs: mesmos nomes, mesma ordem de ciclo, mesma correção de
   proporção da célula (0.5). O relógio do app é nativo em Rust; aqui o
   canvas apenas demonstra o comportamento. */
"use strict";

const SPARKS = ["ﾊ","ﾐ","ﾋ","ｰ","ｳ","ｼ","ﾅ","ﾓ","ﾆ","ｻ","ﾜ","ﾂ","ｵ","ﾘ","ｱ","ﾎ","ﾃ","ﾏ","ﾹ","ﾒ","ｴ","ｶ","ｷ","ﾑ"];
const RAMP = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];
const RAIN_TAIL = 9;
const CELL_ASPECT = 0.5;

function mix(v) {
  v = (v + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
  v = ((v ^ (v >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
  v = ((v ^ (v >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
  return v ^ (v >> 31n);
}
function noise(a, b, c) {
  return mix(BigInt(a) ^ mix(BigInt(b) ^ mix(BigInt(c))));
}
const num = (n) => Number(n & 0xffffffffn);

const THEMES = {
  default: { clock: "#00e65c", header: "#00e65c", widget: "#00e65c", title: "#9a9a9a", marker: "#00e5ff", accent: "#7dff8a", anim: "#0a7a33" },
  matrix:  { clock: "#00ff46", header: "#00aa3c", widget: "#00c850", title: "#96ffaa", marker: "#00ff00", accent: "#b4ff78", anim: "#008c2d" },
  neon:    { clock: "#ff00be", header: "#00ebeb", widget: "#be96ff", title: "#00ffff", marker: "#ff00be", accent: "#78ffc8", anim: "#783caa" },
  system:  { clock: "#e8ece8", header: "#c9cfc9", widget: "#c9cfc9", title: "#ffffff", marker: "#e8ece8", accent: "#ffffff", anim: "#5a615a" },
  fire:    { clock: "#ff7800", header: "#ffbe50", widget: "#ff5f28", title: "#ffe182", marker: "#ff3c00", accent: "#ffaa28", anim: "#963c14" },
  ice:     { clock: "#78dcff", header: "#beebff", widget: "#8cc3ff", title: "#dcf5ff", marker: "#50b4ff", accent: "#a0e6ff", anim: "#4682b4" }
};

const state = { theme: "matrix", font: "bricks", animation: "matrix", size: 0, seed: 7, fps: 12, t0: performance.now() };

const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");
const screen = document.getElementById("termscreen");
const CELL = 9; // resolução grosseira: fiel ao picotado do terminal e barata
let cols = 0, rows = 0;

function fit() {
  const r = screen.getBoundingClientRect();
  cols = Math.max(8, Math.floor(r.width / CELL));
  rows = Math.max(8, Math.floor(r.height / CELL));
  canvas.width = cols; canvas.height = rows;
}
new ResizeObserver(fit).observe(screen);
fit();

function themeColors() { return THEMES[state.theme]; }

function rampChar(v) {
  const i = Math.max(0, Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1))));
  return RAMP[i];
}

function drawFrame() {
  const th = themeColors();
  const now = (performance.now() - state.t0) / 1000;
  const tick = Math.floor(now * state.fps);
  const time = tick / state.fps;
  const dim = hex(th.anim), acc = hex(th.clock);
  const grid = [];

  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) grid[y][x] = null;
  }

  if (state.animation === "matrix") {
    const span = rows + RAIN_TAIL;
    for (let x = 0; x < cols; x++) {
      const cs = num(noise(state.seed, x, 0x5eed));
      const speed = 1 + (cs % 3);
      const start = (cs >>> 8) % span;
      const head = (((tick * speed + start) % span) + span) % span;
      for (let d = 0; d < RAIN_TAIL; d++) {
        const row = head - d;
        if (row < 0 || row >= rows) continue;
        if (d > 2 && num(noise(x, row, Math.floor(tick / 4))) % 4 === 0) continue;
        const ch = SPARKS[num(noise(x, row, Math.floor(tick / 3))) % SPARKS.length];
        grid[row][x] = { ch, c: d === 0 ? acc : dim };
      }
    }
  } else if (state.animation === "plasma") {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const xx = x * CELL_ASPECT;
      const v = Math.sin(xx * 0.32 + time * 0.9) + Math.sin(y * 0.32 + time * 0.7) + Math.sin((xx + y) * 0.2 + time * 0.5);
      grid[y][x] = { ch: rampChar((v + 3) / 6), c: dim };
    }
  } else if (state.animation === "waves") {
    const cx = cols * 0.5, cy = rows * 0.5;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const dx = x - cx, dy = (y - cy) / CELL_ASPECT;
      const v = Math.sin(Math.sqrt(dx * dx + dy * dy) * 0.55 - time * 3.0);
      grid[y][x] = { ch: rampChar((v + 1) * 0.5), c: v > 0.85 ? acc : dim };
    }
  } else if (state.animation === "stars") {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const cell = num(noise(state.seed, x, y));
      if (cell % 100 >= 3) continue;
      const tw = (Math.sin(time * 2.0 + (cell % 100) * 0.31) + 1) * 0.5;
      grid[y][x] = tw > 0.9
        ? { ch: SPARKS[cell % SPARKS.length], c: acc }
        : { ch: RAMP[2 + Math.floor(tw * 3)], c: dim };
    }
  }

  // pinta num canvas de baixa resolução; o CSS amplia (pixelado = estética terminal)
  ctx.fillStyle = "#050605";
  ctx.fillRect(0, 0, cols, rows);
  ctx.font = "1px monospace";
  ctx.textBaseline = "bottom";
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const g = grid[y][x];
    if (!g || g.ch === " ") continue;
    ctx.fillStyle = `rgb(${g.c[0]},${g.c[1]},${g.c[2]})`;
    ctx.fillText(g.ch, x, y + 1);
  }
  requestAnimationFrame(drawFrame);
}

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
canvas.style.imageRendering = "pixelated";
ctx.textBaseline = "bottom";

/* ---------- relógio ---------- */
const big = document.getElementById("bigclock");
const dateLine = document.getElementById("dateline");
const worldLine = document.getElementById("worldline");
const cpurate = document.getElementById("cpurate");
const cpubar = document.getElementById("cpubar");

function tickClock() {
  const now = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const t = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  if (state.font === "flip") {
    big.innerHTML = [...t].map((c) =>
      c === ":" ? '<span class="sep">:</span>' : `<span class="d">${c}</span>`).join("");
  } else {
    big.innerHTML = t.replaceAll(":", '<span class="sep">:</span>');
  }
  try {
    dateLine.textContent = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long", day: "numeric", month: "long", hour12: false
    }).format(now);
    const fmt = (tz) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(now);
    worldLine.textContent = `New York ${fmt("America/New_York")} · Lisboa ${fmt("Europe/Lisbon")} · Tóquio ${fmt("Asia/Tokyo")}`;
  } catch { dateLine.textContent = now.toLocaleDateString("pt-BR"); }
  // widget CPU fictício: apenas demonstra o painel, como no README
  const load = 18 + Math.round(14 * Math.abs(Math.sin(Date.now() / 4000)));
  cpurate.textContent = load + "%";
  cpubar.textContent = "█".repeat(Math.round(load / 10)) + "░".repeat(10 - Math.round(load / 10));
}
setInterval(tickClock, 250);
tickClock();

/* ---------- controles ---------- */
function bindChips(id, key, apply) {
  const box = document.getElementById(id);
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    state[key] = b.dataset.v;
    box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    apply();
    announce(`${box.previousElementSibling.textContent.trim()}: ${b.dataset.v}`);
  });
}
function applyTheme() {
  const th = themeColors();
  const root = document.documentElement.style;
  root.setProperty("--clock", th.clock);
  root.setProperty("--header", th.header);
  root.setProperty("--widget", th.widget);
  root.setProperty("--title", th.title);
  root.setProperty("--marker", th.marker);
  root.setProperty("--accent", th.accent);
  root.setProperty("--anim", th.anim);
}
function applyFont() {
  big.classList.remove("slant", "slim", "flip");
  if (state.font !== "bricks") big.classList.add(state.font);
  tickClock();
}
bindChips("themes", "theme", applyTheme);
bindChips("fonts", "font", applyFont);
bindChips("anims", "animation", () => {});

const size = document.getElementById("size");
const sizeVal = document.getElementById("sizeval");
size.addEventListener("input", () => {
  const v = Number(size.value);
  sizeVal.textContent = v === 0 ? "auto" : String(v);
  big.style.fontSize = v === 0 ? "" : `clamp(28px, ${2 + v * 0.7}vw, ${24 + v * 9}px)`;
  announce(`tamanho dos dígitos: ${v === 0 ? "automático" : v}`);
});

const note = document.getElementById("note");
let noteT;
function announce(msg) {
  note.textContent = msg;
  clearTimeout(noteT);
  noteT = setTimeout(() => { note.textContent = "Shift+T tema · Shift+F fonte · Shift+A animação (botões aqui; teclas no app)"; }, 2600);
}

/* atalhos de teclado espelham o app: t/f/a como Shift+T/F/A */
document.addEventListener("keydown", (e) => {
  if (!e.shiftKey || e.key.length !== 1) return;
  const k = e.key.toLowerCase();
  const cycle = (id, key, order, apply) => {
    const next = order[(order.indexOf(state[key]) + 1) % order.length];
    state[key] = next; apply();
    document.querySelectorAll(`#${id} button`).forEach((x) =>
      x.setAttribute("aria-pressed", x.dataset.v === next ? "true" : "false"));
    announce(`${key}: ${next}`);
  };
  if (k === "t") cycle("themes", "theme", Object.keys(THEMES), applyTheme);
  if (k === "f") cycle("fonts", "font", ["bricks", "slim", "slant", "flip"], applyFont);
  if (k === "a") cycle("anims", "animation", ["none", "matrix", "plasma", "waves", "stars"], () => {});
});

/* ---------- tabs ---------- */
document.querySelectorAll("[data-tabs]").forEach((wrap) => {
  const tabs = [...wrap.querySelectorAll('[role="tab"]')];
  const panels = [...wrap.querySelectorAll('[role="tabpanel"]')];
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", x === t ? "true" : "false"));
    panels.forEach((p) => p.classList.toggle("active", p.id === t.getAttribute("aria-controls")));
  }));
});

/* ---------- mini demo do timer ---------- */
let demo = { left: 25 * 60, run: false, id: null, label: "Foco" };
const dT = document.getElementById("demo-t"), dL = document.getElementById("demo-lbl");
function renderDemo() {
  const m = String(Math.floor(demo.left / 60)).padStart(2, "0");
  const s = String(demo.left % 60).padStart(2, "0");
  dT.textContent = `${m}:${s}`;
  dL.textContent = demo.label;
}
document.getElementById("demo-start").addEventListener("click", () => {
  if (demo.run) return;
  demo.run = true;
  demo.id = setInterval(() => {
    if (demo.left > 0) demo.left--;
    else { demo.label = demo.label === "Foco" ? "Pausa" : "Foco"; demo.left = demo.label === "Foco" ? 25 * 60 : 5 * 60; }
    renderDemo();
  }, 1000);
});
document.getElementById("demo-pause").addEventListener("click", () => { demo.run = false; clearInterval(demo.id); });
document.getElementById("demo-reset").addEventListener("click", () => {
  demo.run = false; clearInterval(demo.id); demo.left = 25 * 60; demo.label = "Foco"; renderDemo();
});
renderDemo();

/* respeita quem prefere menos movimento */
if (matchMedia("(prefers-reduced-motion: reduce)").matches) state.fps = 1;
requestAnimationFrame(drawFrame);
