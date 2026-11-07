'use strict';
/* ============================================================
   Personagem masculino (sprite 16x24) gerado por código.
   Direções: down, up, left, right. Ciclo de caminhada: 0,1,0,2
   ============================================================ */
const PLAYER_COLORS = {
  hair: '#4a2f1b', hairL: '#6e4a2c',
  skin: '#f2c79b', skinS: '#d9a679',
  eye: '#2a1a14',
  shirt: '#3b6fd4', shirtL: '#5b8ff0', shirtD: '#2c54a8',
  pants: '#6a5236', pantsD: '#4f3b26',
  boots: '#3a2a1f', belt: '#2e2018', buckle: '#e8c658',
};

function genPlayerFrame(dir, f) {
  const C = PLAYER_COLORS;
  const c = makeCanvas(16, 24), g = c.getContext('2d');
  const r = (x, y, w, h, col) => px(g, col, x, y, w, h);
  // posição das pernas por quadro
  const lLen = f === 1 ? 3 : f === 2 ? 5 : 4;   // perna esquerda (quem olha)
  const rLen = f === 2 ? 3 : f === 1 ? 5 : 4;
  const bob = (f === 1 || f === 2) ? 0 : 0;

  if (dir === 'down' || dir === 'up') {
    // pernas
    r(4, 17, 4, lLen, C.pants); r(8, 17, 4, rLen, C.pants);
    r(4, 17 + lLen - 1, 4, 2, C.boots); r(8, 17 + rLen - 1, 4, 2, C.boots);
    r(7, 17, 2, 2, C.pantsD);
    // corpo
    r(4, 10 + bob, 8, 6, C.shirt); r(4, 10 + bob, 2, 6, C.shirtL); r(10, 10 + bob, 2, 6, C.shirtD);
    r(4, 16, 8, 1, C.belt); r(7, 16, 2, 1, C.buckle);
    // braços
    const swing = f === 1 ? 1 : f === 2 ? -1 : 0;
    r(2, 10 + swing, 2, 5, C.shirt); r(2, 15 + swing, 2, 2, C.skin);
    r(12, 10 - swing, 2, 5, C.shirtD); r(12, 15 - swing, 2, 2, C.skin);
    if (dir === 'down') {
      r(3, 2, 10, 3, C.hair); r(4, 1, 8, 1, C.hair); r(5, 2, 3, 1, C.hairL);
      r(3, 5, 1, 3, C.hair); r(12, 5, 1, 3, C.hair);
      r(4, 5, 8, 5, C.skin); r(4, 5, 8, 1, C.hair); r(4, 9, 8, 1, C.skinS);
      r(6, 7, 1, 2, C.eye); r(9, 7, 1, 2, C.eye);
      r(4, 5, 2, 1, C.hair); r(10, 5, 2, 1, C.hair);
    } else {
      r(3, 1, 10, 9, C.hair); r(4, 0, 8, 1, C.hair); r(5, 2, 4, 2, C.hairL);
      r(4, 9, 8, 1, C.skinS);
    }
  } else {
    // vista lateral (olhando para a esquerda)
    const a = f === 1 ? -2 : f === 2 ? 2 : 0;
    // perna de trás e da frente
    r(7 - a, 17, 4, 4, C.pantsD); r(7 - a, 20, 4, 2, C.boots);
    r(5 + a, 17, 4, 4, C.pants); r(4 + a, 20, 5, 2, C.boots);
    // corpo
    r(5, 10, 6, 6, C.shirt); r(5, 10, 2, 6, C.shirtL); r(9, 10, 2, 6, C.shirtD);
    r(5, 16, 6, 1, C.belt);
    // braço da frente
    const s = f === 1 ? 1 : f === 2 ? -1 : 0;
    r(6 + s, 10, 3, 5, C.shirtD); r(6 + s, 15, 3, 2, C.skin);
    // cabeça
    r(3, 2, 10, 3, C.hair); r(4, 1, 8, 1, C.hair); r(5, 2, 3, 1, C.hairL);
    r(3, 5, 6, 5, C.skin); r(9, 5, 4, 5, C.hair); r(3, 5, 6, 1, C.hair);
    r(4, 7, 1, 2, C.eye); r(3, 8, 1, 1, C.skinS); r(3, 9, 6, 1, C.skinS);
  }
  return outline(c, '#2a1c16');
}

function flipH(src) {
  const c = makeCanvas(src.width, src.height), g = c.getContext('2d');
  g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
}

Tex.player = (() => {
  const frames = { down: [], up: [], left: [], right: [] };
  for (let f = 0; f < 3; f++) {
    frames.down.push(genPlayerFrame('down', f));
    frames.up.push(genPlayerFrame('up', f));
    const l = genPlayerFrame('left', f);
    frames.left.push(l);
    frames.right.push(flipH(l));
  }
  return frames;
})();

class Player {
  constructor() {
    this.x = 0; this.y = 0;       // posição dos pés (px do mundo)
    this.dir = 'down';
    this.anim = 0;
    this.moving = false;
    this.walkSpeed = 62;           // px/s
    this.runSpeed = 108;
    this.hw = 5; this.hh = 6;      // hitbox: meia largura e altura (nos pés)
  }
  collides(map, x, y) {
    const l = x - this.hw, r = x + this.hw, t = y - this.hh, b = y;
    if (l < 0 || t < 0 || r > map.w * TILE || b > map.h * TILE) return true;
    const x0 = Math.floor(l / TILE), x1 = Math.floor((r - 0.001) / TILE);
    const y0 = Math.floor(t / TILE), y1 = Math.floor((b - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (map.solid[ty * map.w + tx]) return true;
    return false;
  }
  update(dt, vec, run, map) {
    const mag = Math.min(1, Math.hypot(vec.x, vec.y));
    this.moving = mag > 0.05;
    if (!this.moving) { this.anim = 0; return; }
    const nx = vec.x / Math.hypot(vec.x, vec.y), ny = vec.y / Math.hypot(vec.x, vec.y);
    const sp = (run ? this.runSpeed : this.walkSpeed) * mag * dt;
    if (Math.abs(vec.x) > Math.abs(vec.y) * 1.1) this.dir = vec.x < 0 ? 'left' : 'right';
    else if (Math.abs(vec.y) > Math.abs(vec.x) * 1.1) this.dir = vec.y < 0 ? 'up' : 'down';
    let moved = false;
    const tx = this.x + nx * sp, ty = this.y + ny * sp;
    if (!this.collides(map, tx, this.y)) { this.x = tx; moved = true; }
    if (!this.collides(map, this.x, ty)) { this.y = ty; moved = true; }
    this.anim += dt * (run ? 11 : 7.5) * (moved ? 1 : 0.2);
  }
  frame() {
    if (!this.moving) return 0;
    return [0, 1, 0, 2][Math.floor(this.anim) % 4];
  }
  sprite() { return Tex.player[this.dir][this.frame()]; }
}
