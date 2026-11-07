'use strict';
/* ============================================================
   Entrada: detecta celular (joystick virtual) ou computador (WASD).
   O modo troca automaticamente se o jogador usar o outro tipo de entrada.
   ============================================================ */
const Input = (() => {
  const keys = new Set();
  const body = document.body;
  const zone = document.getElementById('joy-zone');
  const base = document.getElementById('joy-base');
  const knob = document.getElementById('joy-knob');
  const runBtn = document.getElementById('btn-run');
  const MAX = 46;                       // raio do joystick (px)
  const joy = { id: null, x: 0, y: 0, cx: 0, cy: 0 };
  let run = false;
  let mode = 'keyboard';
  const listeners = [];

  const coarse = matchMedia('(pointer: coarse)').matches || (matchMedia('(hover: none)').matches && navigator.maxTouchPoints > 0);

  function setMode(m) {
    if (m === mode) return;
    mode = m; body.dataset.input = m;
    resetJoy();
    listeners.forEach(fn => fn(m));
  }
  setMode(coarse ? 'touch' : 'keyboard');
  body.dataset.input = mode;

  /* ---------- teclado ---------- */
  const MAP = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
  };
  addEventListener('keydown', e => {
    const k = MAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (mode !== 'keyboard') setMode('keyboard');
    keys.add(k);
  });
  addEventListener('keyup', e => { const k = MAP[e.code]; if (k) keys.delete(k); });
  addEventListener('blur', () => { keys.clear(); resetJoy(); run = false; });

  /* ---------- joystick virtual ---------- */
  function idlePos() {
    const x = Math.max(80, innerWidth * 0.14), y = innerHeight - Math.max(100, innerHeight * 0.2);
    return { x: Math.min(x, 120), y };
  }
  function placeBase(x, y) { base.style.left = x + 'px'; base.style.top = y + 'px'; joy.cx = x; joy.cy = y; }
  function resetJoy() {
    joy.id = null; joy.x = joy.y = 0;
    knob.style.transform = 'translate(-50%,-50%)';
    base.classList.remove('active');
    const p = idlePos(); placeBase(p.x, p.y);
  }
  resetJoy();
  addEventListener('resize', () => { if (joy.id === null) resetJoy(); });

  function moveJoy(e) {
    let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy;
    const d = Math.hypot(dx, dy);
    if (d > MAX) { dx = dx / d * MAX; dy = dy / d * MAX; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / MAX, ny = dy / MAX, mag = Math.hypot(nx, ny);
    if (mag < 0.18) { joy.x = joy.y = 0; return; }
    const s = (mag - 0.18) / 0.82 / mag;       // zona morta + saída analógica
    joy.x = nx * s; joy.y = ny * s;
  }
  zone.addEventListener('pointerdown', e => {
    if (joy.id !== null) return;
    if (e.pointerType === 'touch' || e.pointerType === 'pen') setMode('touch');
    if (mode !== 'touch') return;
    joy.id = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    const x = Math.min(Math.max(e.clientX, MAX + 24), innerWidth - MAX - 24);
    const y = Math.min(Math.max(e.clientY, MAX + 24), innerHeight - MAX - 24);
    placeBase(x, y); base.classList.add('active'); moveJoy(e);
    e.preventDefault();
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === joy.id) { moveJoy(e); e.preventDefault(); } });
  const end = e => { if (e.pointerId === joy.id) resetJoy(); };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('lostpointercapture', end);

  // botão de correr
  runBtn.addEventListener('pointerdown', e => { setMode('touch'); run = true; runBtn.classList.add('active'); runBtn.setPointerCapture(e.pointerId); e.preventDefault(); });
  const runEnd = () => { run = false; runBtn.classList.remove('active'); };
  runBtn.addEventListener('pointerup', runEnd);
  runBtn.addEventListener('pointercancel', runEnd);
  runBtn.addEventListener('lostpointercapture', runEnd);

  // primeiro toque em qualquer lugar ativa o modo touch (ex.: notebook com tela de toque)
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') setMode('touch'); }, { passive: true });

  // evita menu de contexto / zoom / scroll no celular
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

  return {
    get mode() { return mode; },
    onModeChange(fn) { listeners.push(fn); },
    vector() {
      let x = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      let y = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
      if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
      return { x: joy.x, y: joy.y };
    },
    get run() { return keys.has('run') || run; },
  };
})();
