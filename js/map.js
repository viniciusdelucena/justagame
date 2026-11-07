'use strict';
/* ============================================================
   Sistema de mapas.
   Para criar novos mapas no futuro:  World.register('id', () => mapa)
   Portais com `to: { map:'id', x, y }` levam o jogador para outro mapa.
   ============================================================ */
const World = (() => {
  const builders = {}, cache = {};
  return {
    register(id, fn) { builders[id] = fn; },
    has(id) { return !!builders[id]; },
    get(id) { return cache[id] || (cache[id] = builders[id]()); },
  };
})();

function createMap(id, name, w, h) {
  const m = {
    id, name, w, h,
    ground: new Uint8Array(w * h),
    gvar: new Uint8Array(w * h),
    solid: new Uint8Array(w * h),
    decoGrid: new Array(w * h),
    objects: [],
    portals: [],
    spawn: { x: w >> 1, y: h >> 1 },
  };
  m.at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : m.ground[y * w + x];
  m.setGround = (x, y, g) => { if (x >= 0 && y >= 0 && x < w && y < h) m.ground[y * w + x] = g; };
  m.canPlace = (def, tx, ty, allow = [GROUND.GRASS]) =>
    def.fp.every(([dx, dy]) => {
      const x = tx + dx, y = ty + dy;
      return allow.includes(m.at(x, y)) && !m.solid[y * w + x];
    });
  m.addObj = (name, tx, ty, variant = 0, allow) => {
    const def = Tex.defs[name];
    if (!m.canPlace(def, tx, ty, allow)) return false;
    let maxY = 0;
    for (const [dx, dy] of def.fp) { m.solid[(ty + dy) * w + tx + dx] = 1; maxY = Math.max(maxY, dy); }
    const spr = def.vars[variant % def.vars.length];
    m.objects.push({
      spr, x: tx * TILE + def.ox, y: ty * TILE + def.oy, w: spr.width, h: spr.height,
      sortY: (ty + maxY + 1) * TILE, tx, ty, shadow: def.shadow,
    });
    return true;
  };
  m.addDeco = (x, y, spr) => {
    const i = y * w + x;
    if (x < 0 || y < 0 || x >= w || y >= h || m.decoGrid[i] || m.solid[i]) return false;
    m.decoGrid[i] = spr; return true;
  };
  return m;
}

/* ============================================================
   Mapa 1 — Campos de Alvorada
   Praça central com fonte, casas, lago, fazenda e floresta.
   ============================================================ */
World.register('alvorada', () => {
  const W = 80, H = 60;
  const m = createMap('alvorada', 'Campos de Alvorada', W, H);
  const rng = mulberry32(20260507);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const G = GROUND;

  // ---- chão base: grama com variações
  for (let i = 0; i < W * H; i++) m.gvar[i] = Math.floor(rng() * 4);

  // ---- lagos
  function lake(cx, cy, rx, ry, seed) {
    const r = mulberry32(seed), ph = [r() * 6, r() * 6, r() * 6];
    for (let y = Math.floor(cy - ry * 1.6); y <= Math.ceil(cy + ry * 1.6); y++) {
      for (let x = Math.floor(cx - rx * 1.6); x <= Math.ceil(cx + rx * 1.6); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx);
        const wob = 1 + 0.14 * Math.sin(a * 3 + ph[0]) + 0.1 * Math.sin(a * 5 + ph[1]) + 0.06 * Math.sin(a * 2 + ph[2]);
        const d = Math.hypot(dx, dy) / wob;
        if (d < 1) { m.setGround(x, y, G.WATER); m.solid[y * W + x] = 1; }
        else if (d < 1.28 && m.at(x, y) === G.GRASS) m.setGround(x, y, G.SAND);
      }
    }
  }
  lake(11, 17, 8, 6, 7);
  lake(66, 20, 5, 3.5, 9);

  // ---- casas (fachada para o sul). Porta = 2 tiles centrais da base
  const houses = [
    { tx: 24, ty: 17, v: 0, label: 'Casa da Dona Lúcia' },
    { tx: 50, ty: 17, v: 1, label: 'Casa do Ferreiro' },
    { tx: 24, ty: 40, v: 2, label: 'Casa do Pescador' },
    { tx: 52, ty: 40, v: 3, label: 'Casa da Padeira' },
    { tx: 62, ty: 38, v: 0, label: 'Casa da Fazenda' },
  ];
  for (const h of houses) m.addObj('house' + h.v, h.tx, h.ty, 0);

  // ---- estradas (largura 2) com leve ondulação
  const road = (x, y) => { if (m.at(x, y) === G.GRASS || m.at(x, y) === G.SAND) m.setGround(x, y, G.DIRT); };
  const taper = (d, start, ramp) => clamp((d - start) / ramp, 0, 1);
  for (let y = 0; y < H; y++) {
    const amp = 2 * taper(Math.min(y, H - 1 - y), 0, 10) * taper(Math.abs(y - 30), 7, 6);
    const x0 = 39 + Math.round(amp * Math.sin(y * 0.2));
    road(x0, y); road(x0 + 1, y); road(x0 - 1, y);
  }
  for (let x = 0; x < W; x++) {
    const amp = 2 * taper(Math.min(x, W - 1 - x), 0, 10) * taper(Math.abs(x - 40), 9, 6);
    const y0 = 29 + Math.round(amp * Math.sin(x * 0.18));
    road(x, y0); road(x, y0 + 1);
  }
  for (let x = 20; x <= 68; x++) { road(x, 46); road(x, 47); }          // estrada sul
  const path = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) road(x, y); };
  path(26, 22, 27, 30); path(52, 22, 53, 30);                           // casas do norte
  path(26, 45, 27, 46); path(54, 45, 55, 46); path(64, 43, 65, 46);     // casas do sul
  path(64, 48, 65, 48);                                                 // portão da fazenda

  // ---- praça de pedra (cantos chanfrados)
  for (let y = 24; y <= 35; y++) for (let x = 31; x <= 48; x++) {
    const c = Math.min(x - 31, 48 - x) + Math.min(y - 24, 35 - y);
    if (c < 2) continue;
    if (m.at(x, y) !== G.WATER) m.setGround(x, y, G.COBBLE);
  }
  m.addObj('fountain', 39, 29, 0, [G.COBBLE]);
  for (const [x, y] of [[33, 25], [46, 25], [33, 34], [46, 34]]) m.addObj('lamp', x, y, 0, [G.COBBLE]);
  m.addObj('sign', 37, 34, 0, [G.COBBLE]);

  // ---- fazenda cercada com plantações
  for (let y = 49; y <= 54; y++) for (let x = 61; x <= 72; x++) m.setGround(x, y, G.SOIL);
  for (let x = 60; x <= 73; x++) {
    if (!(x === 64 || x === 65)) m.addObj('fenceH', x, 48, 0);
    m.addObj('fenceH', x, 55, 0);
  }
  for (let y = 49; y <= 54; y++) { m.addObj('fenceV', 60, y, 0); m.addObj('fenceV', 73, y, 0); }
  const crops = ['wheat', 'tomato', 'pumpkin'];
  [49, 51, 53].forEach((y, k) => {
    for (let x = 61; x <= 72; x++) {
      const st = rng() < 0.2 ? 0 : rng() < 0.5 ? 1 : 2;
      const set = Tex.deco.crops[crops[k]];
      m.decoGrid[y * W + x] = set[st];
    }
  });

  // ---- floresta de borda (deixa abertas as saídas das estradas)
  const nearPath = (x, y, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const g = m.at(x + dx, y + dy);
      if (g === G.DIRT || g === G.COBBLE) return true;
    }
    return false;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (d > 3 || (d === 3 && rng() < 0.5)) continue;
    if (m.at(x, y) !== G.GRASS || nearPath(x, y, 1)) continue;
    if (rng() < 0.5) m.addObj('pine', x, y, ri(0, 1)); else m.addObj('oak', x, y, ri(0, 2));
  }

  // ---- bosque no nordeste
  for (let y = 3; y < 15; y++) for (let x = 55; x < 78; x++) {
    const dx = (x - 67) / 11, dy = (y - 9) / 6;
    if (dx * dx + dy * dy > 1 || rng() > 0.42) continue;
    if (nearPath(x, y, 1)) continue;
    if (rng() < 0.4) m.addObj('pine', x, y, ri(0, 1)); else m.addObj('oak', x, y, ri(0, 2));
  }

  // ---- decoração solta (árvores, arbustos, pedras)
  const freeSpot = (x, y, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (m.at(x + dx, y + dy) !== G.GRASS || m.solid[(y + dy) * W + x + dx]) return false;
    }
    return true;
  };
  const scatter = (name, count, variants, r, tries = 900) => {
    let placed = 0;
    for (let i = 0; i < tries && placed < count; i++) {
      const x = ri(4, W - 5), y = ri(5, H - 5);
      if (!freeSpot(x, y, r)) continue;
      if (m.addObj(name, x, y, ri(0, variants - 1))) placed++;
    }
  };
  scatter('oak', 38, 3, 2);
  scatter('pine', 14, 2, 2);
  scatter('bush', 50, 4, 1);
  scatter('rock', 26, 3, 1);

  // objetos junto das casas
  m.addObj('barrel', 30, 21, 0); m.addObj('crate', 30, 20, 0);
  m.addObj('barrel', 22, 44, 0); m.addObj('crate', 56, 44, 0);
  m.addObj('crate', 68, 42, 0);
  m.addObj('well', 56, 26, 0);
  m.addObj('sign', 37, 5, 0); m.addObj('sign', 42, 54, 0);
  m.addObj('sign', 6, 27, 0); m.addObj('sign', 73, 27, 0);

  // ---- decorações sem colisão
  const grassFree = (x, y) => m.at(x, y) === G.GRASS && !m.decoGrid[y * W + x] && !m.solid[y * W + x];
  for (let k = 0; k < 46; k++) {
    const cx = ri(4, W - 5), cy = ri(4, H - 5), kind = ri(0, 4), n = ri(6, 11);
    for (let i = 0; i < n; i++) {
      const x = cx + ri(-2, 2), y = cy + ri(-2, 2);
      if (grassFree(x, y)) m.addDeco(x, y, Tex.deco.flowers[kind][ri(0, 2)]);
    }
  }
  for (let i = 0; i < 320; i++) { const x = ri(2, W - 3), y = ri(2, H - 3); if (grassFree(x, y)) m.addDeco(x, y, Tex.deco.tuft[ri(0, 3)]); }
  for (let i = 0; i < 40; i++) { const x = ri(2, W - 3), y = ri(2, H - 3); if (m.at(x, y) === G.DIRT) m.addDeco(x, y, Tex.deco.pebbles[ri(0, 2)]); }
  for (let i = 0; i < 90; i++) {
    const x = ri(4, W - 5), y = ri(4, H - 5);
    if (grassFree(x, y) && m.solid[y * W + x + 1]) m.addDeco(x, y, Tex.deco.mushroom[ri(0, 2)]);
  }
  for (let i = 0; i < 200; i++) {
    const x = ri(2, W - 3), y = ri(2, H - 3);
    if (m.at(x, y) !== G.WATER) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => m.at(x + dx, y + dy) === G.WATER) && !m.decoGrid[y * W + x])
      m.decoGrid[y * W + x] = Tex.deco.lily[ri(0, 3)];
  }

  // ---- portais (zonas em tiles). Sem `to` = "em breve"
  for (const h of houses) m.portals.push({ x: h.tx + 2, y: h.ty + 5, w: 2, h: 1, label: h.label, kind: 'door' });
  m.portals.push({ x: 36, y: 0, w: 7, h: 2, label: 'Floresta do Norte', kind: 'exit' });
  m.portals.push({ x: 36, y: H - 2, w: 7, h: 2, label: 'Estrada do Sul', kind: 'exit' });
  m.portals.push({ x: 0, y: 26, w: 2, h: 8, label: 'Vale do Oeste', kind: 'exit' });
  m.portals.push({ x: W - 2, y: 26, w: 2, h: 10, label: 'Costa do Leste', kind: 'exit' });

  m.spawn = { x: 40, y: 33 };
  m.objects.sort((a, b) => a.sortY - b.sortY);
  return m;
});
