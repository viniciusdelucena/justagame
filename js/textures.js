'use strict';
/* ============================================================
   Texturas procedurais em pixel art.
   Nenhuma imagem externa: tudo é desenhado em canvas ao iniciar.
   ============================================================ */
const TILE = 16;
const GROUND = { GRASS: 0, DIRT: 1, COBBLE: 2, WATER: 3, SAND: 4, SOIL: 5 };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}
const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

function ell(g, cx, cy, rx, ry, col) {
  g.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
    }
  }
}

// "Mancha" arredondada com luz vinda de cima/esquerda e contorno escuro
function blob(g, cx, cy, rx, ry, pal, rng) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const l = -(dx * 0.55 + dy * 0.95) + (rng() - 0.5) * 0.55;
      let col;
      if (d > 0.88) col = pal.dark;
      else if (l > 0.38) col = pal.light;
      else if (l < -0.28) col = pal.shadow;
      else col = pal.mid;
      px(g, col, x, y);
    }
  }
}

// Contorno de 1px ao redor de um sprite
function outline(src, col) {
  const w = src.width, h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const o = makeCanvas(w, h), og = o.getContext('2d');
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[(y * w + x) * 4 + 3];
  og.fillStyle = col;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a(x, y) === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) og.fillRect(x, y, 1, 1);
  }
  og.drawImage(src, 0, 0);
  return o;
}

const Tex = {};

/* ---------------- Chão ---------------- */
function genGrass(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  px(g, '#6cae48', 0, 0, 16, 16);
  for (let i = 0; i < 14; i++) px(g, '#62a141', (r() * 16) | 0, (r() * 16) | 0);
  for (let i = 0; i < 8; i++) px(g, '#7fc055', (r() * 16) | 0, (r() * 16) | 0);
  for (let i = 0; i < 3; i++) {
    const x = (r() * 15) | 0, y = (r() * 14) | 0;
    px(g, '#589a3a', x, y, 1, 2); px(g, '#86c85c', x + 1, y + 1);
  }
  return c;
}
function genDirt(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  px(g, '#b98a55', 0, 0, 16, 16);
  for (let i = 0; i < 16; i++) px(g, '#a47843', (r() * 16) | 0, (r() * 16) | 0);
  for (let i = 0; i < 9; i++) px(g, '#cfa26b', (r() * 16) | 0, (r() * 16) | 0);
  for (let i = 0; i < 2; i++) { const x = (r() * 14) | 0, y = (r() * 15) | 0; px(g, '#8e6a42', x, y, 2, 1); px(g, '#d6ae78', x, y - 1, 1, 1); }
  return c;
}
function genCobble(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  px(g, '#6f6f7a', 0, 0, 16, 16);
  const shades = ['#b9b9c2', '#adadb6', '#c3c3cb', '#b2b4be'];
  for (let row = 0; row < 2; row++) {
    const off = row ? -4 : 0;
    for (let i = 0; i < 3; i++) {
      const x = off + i * 8, y = row * 8, s = shades[(r() * shades.length) | 0];
      px(g, s, x + 1, y + 1, 7, 7);
      px(g, '#d6d6de', x + 1, y + 1, 7, 1);
      px(g, '#d6d6de', x + 1, y + 1, 1, 6);
      px(g, '#9a9aa6', x + 1, y + 7, 7, 1);
      if (r() < 0.5) px(g, '#a2a2ad', x + 3 + ((r() * 3) | 0), y + 3 + ((r() * 3) | 0), 1, 1);
    }
  }
  return c;
}
function genSand(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  px(g, '#ead59b', 0, 0, 16, 16);
  for (let i = 0; i < 14; i++) px(g, '#d8bf80', (r() * 16) | 0, (r() * 16) | 0);
  for (let i = 0; i < 8; i++) px(g, '#f5e6b5', (r() * 16) | 0, (r() * 16) | 0);
  return c;
}
function genSoil(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  px(g, '#7a5232', 0, 0, 16, 16);
  for (let y = 3; y < 16; y += 4) {
    px(g, '#9a6a41', 0, y - 1, 16, 1);
    px(g, '#5a3a22', 0, y, 16, 1);
  }
  for (let i = 0; i < 10; i++) px(g, '#6a4528', (r() * 16) | 0, (r() * 16) | 0);
  return c;
}
function genWater(frame) {
  const c = makeCanvas(16, 16), g = c.getContext('2d');
  px(g, '#3b86d1', 0, 0, 16, 16);
  const marks = [[2, 3], [10, 7], [5, 12], [13, 1]];
  const sh = frame * 5;
  for (const [mx, my] of marks) {
    const x = (mx + sh) % 16, y = my;
    for (const xx of [x, x - 16]) { px(g, '#7cc0f2', xx, y, 4, 1); px(g, '#2f72bb', xx + 2, y + 1, 4, 1); }
  }
  return c;
}

Tex.ground = [
  [0, 1, 2, 3].map(i => genGrass(11 + i * 7)),
  [0, 1, 2].map(i => genDirt(31 + i * 5)),
  [0, 1, 2].map(i => genCobble(51 + i * 9)),
  [genWater(0), genWater(1)],
  [0, 1, 2].map(i => genSand(71 + i * 3)),
  [0, 1].map(i => genSoil(91 + i * 3)),
];

// Bordas: franja de grama sobre caminhos / espuma na beira da água
const edgeCache = {};
Tex.edge = function (kind, mask) {
  const key = kind + mask;
  if (edgeCache[key]) return edgeCache[key];
  const c = makeCanvas(16, 16), g = c.getContext('2d');
  for (let s = 0; s < 4; s++) {
    if (!(mask & (1 << s))) continue;
    for (let i = 0; i < 16; i++) {
      const depth = kind === 'grass'
        ? 1 + (((i * 7 + s * 3) % 5) === 0 ? 1 : 0) + (((i * 3 + s) % 4) === 0 ? 1 : 0)
        : 2;
      for (let d = 0; d < depth; d++) {
        let col;
        if (kind === 'grass') col = d === depth - 1 ? '#52893a' : '#6cae48';
        else { if (d === 0 && (i + s) % 3 === 0) continue; col = d === 0 ? '#d9f3ff' : '#8ccaf3'; }
        const x = s === 1 ? 15 - d : s === 3 ? d : i;
        const y = s === 0 ? d : s === 2 ? 15 - d : i;
        px(g, col, x, y);
      }
    }
  }
  return (edgeCache[key] = c);
};

/* ---------------- Decorações (sem colisão) ---------------- */
function genFlowers(seed, petal) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  const n = 2 + ((r() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const x = 2 + ((r() * 11) | 0), y = 4 + ((r() * 9) | 0);
    px(g, '#3e7a2c', x, y + 1, 1, 2);
    px(g, '#4f9a3a', x + 1, y + 2, 1, 1);
    const p = Array.isArray(petal) ? petal[(r() * petal.length) | 0] : petal;
    px(g, p, x, y - 1); px(g, p, x - 1, y); px(g, p, x + 1, y); 
    px(g, p === '#ffd84a' ? '#e08a1f' : '#ffe15a', x, y);
  }
  return c;
}
function genTuft(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  const x = 4 + ((r() * 6) | 0), y = 6 + ((r() * 6) | 0);
  px(g, '#4a8c34', x, y + 2, 1, 4); px(g, '#5aa63e', x + 2, y, 1, 6); px(g, '#4a8c34', x + 4, y + 3, 1, 3);
  px(g, '#7fc055', x + 2, y, 1, 2); px(g, '#7fc055', x, y + 2, 1, 1);
  return c;
}
function genPebbles(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  for (let i = 0; i < 3; i++) {
    const x = 2 + ((r() * 11) | 0), y = 3 + ((r() * 10) | 0);
    px(g, '#7d7d86', x, y, 2, 1); px(g, '#b8b8c0', x, y - 1, 2, 1); px(g, '#5e5e66', x + 1, y + 1, 1, 1);
  }
  return c;
}
function genMushroom(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  const x = 4 + ((r() * 7) | 0), y = 7 + ((r() * 4) | 0);
  px(g, '#f1e4c8', x + 1, y + 2, 2, 3); px(g, '#c9b894', x + 2, y + 3, 1, 2);
  px(g, '#8e2a22', x, y, 4, 1); px(g, '#d64a3a', x, y + 1, 4, 1); px(g, '#d64a3a', x + 1, y - 1, 2, 1);
  px(g, '#fff', x + 1, y, 1, 1);
  return c;
}
function genLily(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  const x = 4 + ((r() * 4) | 0), y = 5 + ((r() * 4) | 0);
  ell(g, x + 3, y + 2, 4, 2.6, '#3f8f3a'); ell(g, x + 3, y + 2, 3, 1.8, '#58b04c');
  px(g, '#3b86d1', x + 3, y, 4, 1);
  if (r() < 0.5) { px(g, '#ff9ec4', x + 2, y + 1, 2, 2); px(g, '#ffe15a', x + 2, y + 2, 1, 1); }
  return c;
}
function genCrop(kind, stage) {
  const c = makeCanvas(16, 16), g = c.getContext('2d');
  if (stage === 0) {
    px(g, '#4a8c34', 8, 10, 1, 4); px(g, '#6cc04a', 6, 9, 2, 1); px(g, '#6cc04a', 9, 8, 2, 1);
    return c;
  }
  if (kind === 'wheat') {
    for (const x of [3, 6, 9, 12]) {
      if (stage === 1) { px(g, '#5aa63e', x, 7, 1, 7); px(g, '#7fc055', x, 7, 1, 1); }
      else {
        px(g, '#c9a23e', x, 5, 1, 9); px(g, '#e8c658', x, 2, 1, 4); px(g, '#f7dc7a', x - 1, 3, 1, 2);
        px(g, '#e8c658', x + 1, 3, 1, 2);
      }
    }
  } else if (kind === 'tomato') {
    const rng = mulberry32(5);
    const pal = { light: '#7fd25a', mid: '#4fa53a', shadow: '#3a8230', dark: '#2a5f26' };
    blob(g, 8, 9, stage === 1 ? 4.5 : 6, stage === 1 ? 4 : 5.5, pal, rng);
    if (stage === 2) for (const [x, y] of [[5, 8], [10, 7], [8, 11], [11, 11], [4, 11]]) { px(g, '#e03a2e', x, y, 2, 2); px(g, '#ff7a6a', x, y); }
  } else {
    px(g, '#4f9a3a', 3, 8, 4, 2); px(g, '#6cc04a', 3, 8, 4, 1); px(g, '#4f9a3a', 10, 9, 4, 2); px(g, '#6cc04a', 10, 9, 4, 1);
    if (stage === 2) {
      ell(g, 8, 10, 5, 4, '#a85a14'); ell(g, 8, 10, 4.2, 3.4, '#f08a24'); px(g, '#d06e14', 6, 8, 1, 5); px(g, '#d06e14', 10, 8, 1, 5);
      px(g, '#ffb860', 6, 8, 2, 1); px(g, '#4f9a3a', 8, 6, 1, 2);
    } else { ell(g, 8, 11, 2, 1.5, '#8bc34a'); }
  }
  return c;
}

Tex.deco = {
  flowers: [
    [0, 1, 2].map(i => genFlowers(100 + i, '#e8453c')),
    [0, 1, 2].map(i => genFlowers(120 + i, '#ffd84a')),
    [0, 1, 2].map(i => genFlowers(140 + i, '#ffffff')),
    [0, 1, 2].map(i => genFlowers(160 + i, '#b07be8')),
    [0, 1, 2].map(i => genFlowers(180 + i, ['#e8453c', '#ffd84a', '#ffffff', '#ff8fc0'])),
  ],
  tuft: [0, 1, 2, 3].map(i => genTuft(200 + i)),
  pebbles: [0, 1, 2].map(i => genPebbles(220 + i)),
  mushroom: [0, 1, 2].map(i => genMushroom(240 + i)),
  lily: [0, 1, 2, 3].map(i => genLily(260 + i)),
  crops: {
    wheat: [0, 1, 2].map(s => genCrop('wheat', s)),
    tomato: [0, 1, 2].map(s => genCrop('tomato', s)),
    pumpkin: [0, 1, 2].map(s => genCrop('pumpkin', s)),
  },
};

/* ---------------- Objetos (com colisão, ordenados por Y) ---------------- */
function genOak(seed) {
  const c = makeCanvas(32, 48), g = c.getContext('2d'), r = mulberry32(seed);
  px(g, '#3d2614', 12, 30, 8, 18); px(g, '#6b4423', 13, 30, 6, 17);
  px(g, '#8a5a30', 13, 30, 2, 17); px(g, '#4e301a', 17, 30, 2, 17);
  px(g, '#3d2614', 10, 45, 12, 3); px(g, '#6b4423', 11, 45, 10, 2);
  const pal = { light: '#86d65a', mid: '#5cb03d', shadow: '#3f8a2e', dark: '#2b5c24' };
  const j = () => ((r() * 3) | 0) - 1;
  blob(g, 8 + j(), 24 + j(), 8, 7, pal, r);
  blob(g, 24 + j(), 24 + j(), 8, 7, pal, r);
  blob(g, 16, 25, 11, 6, pal, r);
  blob(g, 16 + j(), 15 + j(), 14, 12.5, pal, r);
  return c;
}
function genPine(seed) {
  const c = makeCanvas(32, 48), g = c.getContext('2d'), r = mulberry32(seed);
  px(g, '#3d2614', 14, 38, 4, 10); px(g, '#6b4423', 15, 38, 2, 10);
  const light = '#4fa05a', mid = '#2f7a46', shadow = '#1f5a38', dark = '#14402a';
  const layers = [{ top: 1, h: 14, w: 9 }, { top: 11, h: 15, w: 12 }, { top: 22, h: 17, w: 15 }];
  for (const L of layers) {
    for (let i = 0; i < L.h; i++) {
      const hw = Math.round(1 + (L.w - 1) * i / (L.h - 1));
      const y = L.top + i;
      for (let x = 16 - hw; x < 16 + hw; x++) {
        const d = x - 16;
        let col = d < -hw * 0.35 ? light : d > hw * 0.3 ? shadow : mid;
        if (r() < 0.07) col = light;
        if (i >= L.h - 2) col = shadow;
        if (x === 16 - hw || x === 16 + hw - 1 || i === L.h - 1) col = dark;
        px(g, col, x, y);
      }
    }
  }
  return c;
}
function genBush(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  blob(g, 8, 9, 7.2, 5.6, { light: '#7fcf55', mid: '#55a93b', shadow: '#3c8630', dark: '#2a5c24' }, r);
  if (seed % 2) for (const [x, y] of [[5, 8], [10, 7], [8, 11]]) px(g, '#e8453c', x, y, 2, 2);
  return c;
}
function genRock(seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), r = mulberry32(seed);
  blob(g, 8, 10, 7, 5.2, { light: '#c9c9d2', mid: '#9d9da8', shadow: '#7a7a86', dark: '#42424c' }, r);
  px(g, '#5a8a3a', 4, 12, 2, 1);
  return c;
}
function genBarrel() {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), O = '#3a2418';
  px(g, O, 2, 1, 12, 14); px(g, O, 3, 0, 10, 16);
  px(g, '#9a6234', 3, 1, 10, 14); px(g, '#b87a44', 3, 1, 3, 14); px(g, '#7a4a24', 11, 1, 2, 14);
  px(g, '#5a5a66', 2, 4, 12, 1); px(g, '#5a5a66', 2, 11, 12, 1);
  px(g, '#c98f58', 5, 2, 6, 1); px(g, '#3a2418', 5, 2, 6, 0);
  return c;
}
function genCrate() {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), O = '#3a2418';
  px(g, O, 1, 2, 14, 14); px(g, '#b8844a', 2, 3, 12, 12); px(g, '#d49c5c', 2, 3, 12, 1);
  px(g, '#8a5a30', 2, 3, 2, 12); px(g, '#8a5a30', 12, 3, 2, 12); px(g, '#8a5a30', 2, 13, 12, 2);
  for (let i = 0; i < 8; i++) { px(g, '#8a5a30', 4 + i, 4 + i); px(g, '#8a5a30', 11 - i, 4 + i); }
  return c;
}
function genLamp() {
  const c = makeCanvas(16, 32), g = c.getContext('2d'), O = '#23232b';
  px(g, O, 6, 10, 4, 22); px(g, '#4a4a55', 7, 10, 2, 21);
  px(g, O, 4, 28, 8, 4); px(g, '#5a5a66', 5, 29, 6, 2);
  px(g, O, 3, 1, 10, 10); px(g, '#ffd86a', 4, 3, 8, 7); px(g, '#fff3b0', 5, 4, 3, 4);
  px(g, O, 2, 0, 12, 2); px(g, '#4a4a55', 3, 0, 10, 1);
  return c;
}
function genSign() {
  const c = makeCanvas(16, 24), g = c.getContext('2d'), O = '#3a2418';
  px(g, O, 6, 10, 4, 14); px(g, '#8a5a30', 7, 10, 2, 13);
  px(g, O, 1, 1, 14, 11); px(g, '#c9944f', 2, 2, 12, 9); px(g, '#e0ad66', 2, 2, 12, 1);
  px(g, '#5a3a20', 4, 4, 8, 1); px(g, '#5a3a20', 4, 7, 6, 1);
  return c;
}
function genWell() {
  const c = makeCanvas(32, 32), g = c.getContext('2d'), O = '#3a3a44';
  px(g, O, 3, 14, 26, 17); px(g, '#a9a9b4', 4, 15, 24, 15); px(g, '#c8c8d2', 4, 15, 24, 3);
  for (let x = 4; x < 28; x += 6) px(g, '#8a8a96', x, 18, 1, 12);
  px(g, '#7a7a86', 4, 27, 24, 3);
  ell(g, 16, 17, 9, 2.5, '#1f2f4a');
  px(g, O, 3, 2, 4, 20); px(g, '#8a5a30', 4, 3, 2, 19);
  px(g, O, 25, 2, 4, 20); px(g, '#8a5a30', 26, 3, 2, 19);
  px(g, O, 1, 0, 30, 4); px(g, '#c8452f', 2, 1, 28, 2);
  px(g, '#6e4524', 15, 4, 2, 9);
  return c;
}
function genFountain() {
  const c = makeCanvas(48, 48), g = c.getContext('2d'), O = '#3a3a44';
  ell(g, 24, 31, 23, 16, O);
  ell(g, 24, 30, 22.4, 15, '#7e7e8a');
  ell(g, 24, 27, 22.4, 15, '#c8c8d2');
  ell(g, 24, 28, 19, 12, '#8e8e9c');
  ell(g, 24, 29, 18, 11, '#3f8fd8');
  for (const [x, y, w] of [[9, 29, 5], [30, 33, 6], [15, 35, 4], [33, 26, 4]]) px(g, '#8ccaf3', x, y, w, 1);
  px(g, O, 20, 8, 8, 22); px(g, '#b4b4be', 21, 8, 6, 21); px(g, '#d8d8e0', 21, 8, 2, 21); px(g, '#8e8e9c', 26, 8, 1, 21);
  ell(g, 24, 9, 9.5, 4.5, O); ell(g, 24, 9, 8.5, 3.5, '#c8c8d2'); ell(g, 24, 9, 6.5, 2.2, '#4aa0e8');
  px(g, '#d9f3ff', 23, 1, 2, 9); px(g, '#8ccaf3', 21, 3, 1, 4); px(g, '#8ccaf3', 26, 3, 1, 4);
  px(g, '#d9f3ff', 20, 6, 1, 2); px(g, '#d9f3ff', 27, 6, 1, 2);
  return c;
}
function genFenceH() {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), O = '#3a2418';
  px(g, O, 0, 5, 16, 3); px(g, '#c9944f', 0, 5, 16, 2); px(g, '#e0ad66', 0, 5, 16, 1);
  px(g, O, 0, 10, 16, 3); px(g, '#b8844a', 0, 10, 16, 2); px(g, '#d49c5c', 0, 10, 16, 1);
  px(g, O, 6, 2, 5, 14); px(g, '#b8844a', 7, 3, 3, 12); px(g, '#e0ad66', 7, 3, 1, 12); px(g, '#8a5a30', 9, 3, 1, 12);
  return c;
}
function genFenceV() {
  const c = makeCanvas(16, 16), g = c.getContext('2d'), O = '#3a2418';
  px(g, O, 6, 0, 4, 16); px(g, '#b8844a', 7, 0, 2, 16); px(g, '#e0ad66', 7, 0, 1, 16);
  px(g, O, 4, 4, 8, 4); px(g, '#c9944f', 5, 5, 6, 2);
  return c;
}

const HOUSE_ROOFS = [
  { light: '#e8745e', mid: '#c8452f', dark: '#8f2e22' },
  { light: '#6f9ae8', mid: '#3f6fc4', dark: '#2c4f93' },
  { light: '#7bc96a', mid: '#4a9e3f', dark: '#33722c' },
  { light: '#e0a05a', mid: '#b8692e', dark: '#86481f' },
];
const HOUSE_WALLS = [
  { light: '#f6ead0', mid: '#e8d6a8', dark: '#c9b27c' },
  { light: '#e9eef2', mid: '#cfd8df', dark: '#a5b2bd' },
  { light: '#f3dcc4', mid: '#e0bf9a', dark: '#bf9a72' },
  { light: '#f6ead0', mid: '#e8d6a8', dark: '#c9b27c' },
];
function genHouse(roof, wall) {
  const W = 96, H = 80, c = makeCanvas(W, H), g = c.getContext('2d'), O = '#3a2a22';
  // paredes
  px(g, O, 5, 36, 86, 44); px(g, wall.mid, 6, 37, 84, 42);
  for (let x = 14; x < 90; x += 8) px(g, wall.dark, x, 48, 1, 25);
  // base de pedra
  px(g, O, 5, 72, 86, 8); px(g, '#8f8f98', 6, 73, 84, 6); px(g, '#a9a9b2', 6, 73, 84, 1);
  for (let x = 6; x < 90; x += 7) px(g, '#7a7a84', x, 74, 1, 5);
  // chaminé (atrás do telhado)
  px(g, O, 58, 0, 12, 26); px(g, '#a65b3a', 59, 1, 10, 25);
  for (let y = 3; y < 24; y += 4) px(g, '#7e3f27', 59, y, 10, 1);
  px(g, '#c27a56', 59, 1, 10, 1); px(g, O, 57, 0, 14, 2); px(g, '#8a8a96', 58, 0, 12, 1);
  // telhado (desenhado a partir de y=6)
  const oy = 6;
  for (let r = 0; r < 42; r++) {
    const inset = Math.round(Math.max(0, 37 - r) * 30 / 37);
    const x0 = inset, x1 = W - inset, band = Math.floor(r / 5);
    for (let x = x0; x < x1; x++) {
      let col;
      if (r >= 38) col = roof.dark;
      else {
        const rr = r % 5;
        col = rr === 4 ? roof.dark : ((x + (band % 2) * 3) % 6 === 0 ? roof.dark : ((x + r * 2) % 13 === 0 ? roof.light : roof.mid));
        if (r === 1) col = roof.light;
      }
      px(g, col, x, oy + r);
    }
    px(g, O, x0, oy + r); px(g, O, x1 - 1, oy + r);
    if (r === 0 || r === 41) px(g, O, x0, oy + r, x1 - x0, 1);
  }
  // porta
  px(g, O, 39, 52, 18, 28); px(g, '#8a5a30', 40, 53, 16, 27);
  for (const x of [44, 48, 52]) px(g, '#6e4524', x, 54, 1, 26);
  px(g, '#a87440', 40, 53, 16, 2); px(g, '#ffd54a', 52, 66, 2, 2);
  // janelas com floreira
  for (const x of [14, 68]) {
    const y = 49;
    px(g, O, x - 1, y - 1, 16, 16); px(g, '#8a5a30', x, y, 14, 14); px(g, '#9fd6f5', x + 2, y + 2, 10, 10);
    px(g, '#d3f0fd', x + 2, y + 2, 4, 3);
    px(g, '#8a5a30', x + 6, y + 2, 2, 10); px(g, '#8a5a30', x + 2, y + 6, 10, 2);
    px(g, O, x - 2, y + 14, 18, 5); px(g, '#8a5a30', x - 1, y + 15, 16, 3);
    for (let i = 0; i < 5; i++) { px(g, '#4f9a3a', x + i * 3, y + 13, 2, 2); px(g, ['#e0457b', '#ffd54a', '#ffffff'][i % 3], x + i * 3, y + 12, 2, 1); }
  }
  return c;
}

const OAKS = [301, 302, 303].map(genOak);
const PINES = [311, 312].map(genPine);

// def: sprites, deslocamento do sprite em relação ao tile âncora (canto sup. esq.), tiles sólidos relativos e sombra
Tex.defs = {
  oak:      { vars: OAKS,  ox: -8, oy: -32, fp: [[0, 0]], shadow: { cx: 8, cy: 12, rx: 13, ry: 5 } },
  pine:     { vars: PINES, ox: -8, oy: -32, fp: [[0, 0]], shadow: { cx: 8, cy: 12, rx: 11, ry: 4 } },
  bush:     { vars: [1, 2, 3, 4].map(genBush), ox: 0, oy: 0, fp: [[0, 0]], shadow: { cx: 8, cy: 13, rx: 7, ry: 3 } },
  rock:     { vars: [5, 6, 7].map(genRock), ox: 0, oy: 0, fp: [[0, 0]], shadow: { cx: 8, cy: 14, rx: 7, ry: 2.5 } },
  barrel:   { vars: [genBarrel()], ox: 0, oy: 0, fp: [[0, 0]], shadow: { cx: 8, cy: 14, rx: 7, ry: 2.5 } },
  crate:    { vars: [genCrate()], ox: 0, oy: 0, fp: [[0, 0]], shadow: { cx: 8, cy: 14, rx: 7, ry: 2.5 } },
  lamp:     { vars: [genLamp()], ox: 0, oy: -16, fp: [[0, 0]], shadow: { cx: 8, cy: 14, rx: 5, ry: 2 } },
  sign:     { vars: [genSign()], ox: 0, oy: -8, fp: [[0, 0]], shadow: { cx: 8, cy: 14, rx: 6, ry: 2 } },
  well:     { vars: [genWell()], ox: 0, oy: 0, fp: [[0, 0], [1, 0], [0, 1], [1, 1]], shadow: { cx: 16, cy: 28, rx: 15, ry: 4 } },
  fountain: { vars: [genFountain()], ox: 0, oy: 0, fp: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], shadow: null },
  fenceH:   { vars: [genFenceH()], ox: 0, oy: 0, fp: [[0, 0]], shadow: null },
  fenceV:   { vars: [genFenceV()], ox: 0, oy: 0, fp: [[0, 0]], shadow: null },
};
for (let i = 0; i < 4; i++) {
  const fp = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) fp.push([x, y]);
  Tex.defs['house' + i] = { vars: [genHouse(HOUSE_ROOFS[i], HOUSE_WALLS[i])], ox: 0, oy: 0, fp, shadow: { cx: 48, cy: 78, rx: 50, ry: 5 } };
}
