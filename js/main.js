'use strict';
/* ============================================================
   Loop principal, câmera, renderização e transições entre mapas.
   ============================================================ */
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const placeEl = document.getElementById('place');
  const coordsEl = document.getElementById('coords');
  const toastEl = document.getElementById('toast');
  const bannerEl = document.getElementById('banner');
  const hintEl = document.getElementById('hint');
  const fadeEl = document.getElementById('fade');

  const player = new Player();
  const game = { map: null, t: 0 };
  let VW = 0, VH = 0, camX = 0, camY = 0;

  /* ---------- tela: zoom inteiro em pixels do dispositivo = pixels nítidos ---------- */
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = innerWidth, h = innerHeight;
    const cssZoom = h > w ? Math.max(2, Math.round(w / (14 * TILE))) : Math.max(2, Math.min(6, Math.round(h / (15 * TILE))));
    const zoom = Math.max(1, Math.round(cssZoom * dpr));
    VW = Math.ceil(w * dpr / zoom); VH = Math.ceil(h * dpr / zoom);
    canvas.width = VW; canvas.height = VH;
    canvas.style.width = (VW * zoom / dpr) + 'px';
    canvas.style.height = (VH * zoom / dpr) + 'px';
    ctx.imageSmoothingEnabled = false;
  }
  addEventListener('resize', resize);
  addEventListener('orientationchange', resize);
  resize();

  /* ---------- HUD ---------- */
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }
  function showBanner(text) {
    bannerEl.textContent = text; bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
  }
  function updateHint() {
    hintEl.innerHTML = Input.mode === 'touch'
      ? 'Arraste na tela para <b>andar</b>'
      : '<b>W A S D</b> ou setas para andar · <b>Shift</b> corre';
    hintEl.classList.add('show');
    clearTimeout(updateHint.t); updateHint.t = setTimeout(() => hintEl.classList.remove('show'), 7000);
  }
  Input.onModeChange(updateHint);

  /* ---------- mapas ---------- */
  function loadMap(id, spawn) {
    const m = World.get(id);
    game.map = m;
    const s = spawn || m.spawn;
    player.x = s.x * TILE + 8; player.y = s.y * TILE + 14;
    placeEl.textContent = m.name;
    showBanner(m.name);
    player.currentPortal = null;
  }

  let transitioning = false;
  function travel(to) {
    if (transitioning) return;
    transitioning = true; fadeEl.classList.add('on');
    setTimeout(() => { loadMap(to.map, { x: to.x, y: to.y }); fadeEl.classList.remove('on'); setTimeout(() => (transitioning = false), 350); }, 350);
  }
  function checkPortals() {
    const m = game.map, tx = player.x / TILE, ty = (player.y - 3) / TILE;
    let hit = null;
    for (const p of m.portals) if (tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) { hit = p; break; }
    if (hit === player.currentPortal) return;
    player.currentPortal = hit;
    if (!hit) return;
    if (hit.to && World.has(hit.to.map)) travel(hit.to);
    else toast(hit.kind === 'exit' ? `${hit.label} — em breve` : `${hit.label} — interior em breve`);
  }

  /* ---------- atualização ---------- */
  function update(dt) {
    if (transitioning) return;
    player.update(dt, Input.vector(), Input.run, game.map);
    checkPortals();
    const m = game.map;
    camX = Math.round(player.x - VW / 2); camY = Math.round(player.y - 10 - VH / 2);
    const mw = m.w * TILE, mh = m.h * TILE;
    camX = mw <= VW ? Math.round((mw - VW) / 2) : Math.max(0, Math.min(mw - VW, camX));
    camY = mh <= VH ? Math.round((mh - VH) / 2) : Math.max(0, Math.min(mh - VH, camY));
    coordsEl.textContent = `X ${Math.floor(player.x / TILE)}  Y ${Math.floor(player.y / TILE)}`;
  }

  /* ---------- desenho ---------- */
  const N = 1, E = 2, S = 4, Wd = 8;
  function drawGround(m, x0, y0, x1, y1) {
    const water = Tex.ground[GROUND.WATER][Math.floor(game.t * 1.6) % 2];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * m.w + tx, id = m.ground[i];
        const dx = tx * TILE - camX, dy = ty * TILE - camY;
        const set = Tex.ground[id];
        ctx.drawImage(id === GROUND.WATER ? water : set[m.gvar[i] % set.length], dx, dy);
        const nb = (ox, oy) => m.at(tx + ox, ty + oy);
        if (id === GROUND.WATER) {
          let mask = 0;
          if (nb(0, -1) !== GROUND.WATER && nb(0, -1) !== -1) mask |= N;
          if (nb(1, 0) !== GROUND.WATER && nb(1, 0) !== -1) mask |= E;
          if (nb(0, 1) !== GROUND.WATER && nb(0, 1) !== -1) mask |= S;
          if (nb(-1, 0) !== GROUND.WATER && nb(-1, 0) !== -1) mask |= Wd;
          if (mask) ctx.drawImage(Tex.edge('shore', mask), dx, dy);
        } else if (id !== GROUND.GRASS) {
          let mask = 0;
          if (nb(0, -1) === GROUND.GRASS) mask |= N;
          if (nb(1, 0) === GROUND.GRASS) mask |= E;
          if (nb(0, 1) === GROUND.GRASS) mask |= S;
          if (nb(-1, 0) === GROUND.GRASS) mask |= Wd;
          if (mask) ctx.drawImage(Tex.edge('grass', mask), dx, dy);
        }
        const d = m.decoGrid[i];
        if (d) ctx.drawImage(d, dx, dy);
      }
    }
  }

  function shadow(cx, cy, rx, ry, a = 0.2) {
    ctx.fillStyle = `rgba(20,30,10,${a})`;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
  }

  function draw() {
    const m = game.map;
    ctx.fillStyle = '#1b2a1b'; ctx.fillRect(0, 0, VW, VH);
    const x0 = Math.max(0, Math.floor(camX / TILE)), y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(m.w - 1, Math.floor((camX + VW) / TILE)), y1 = Math.min(m.h - 1, Math.floor((camY + VH) / TILE));
    drawGround(m, x0, y0, x1, y1);

    // entidades visíveis ordenadas por Y (profundidade)
    const list = [];
    for (const o of m.objects) {
      if (o.x + o.w < camX || o.x > camX + VW || o.y + o.h < camY - 8 || o.y > camY + VH) continue;
      list.push(o);
    }
    for (const o of list) if (o.shadow) shadow(o.tx * TILE + o.shadow.cx - camX, o.ty * TILE + o.shadow.cy - camY, o.shadow.rx, o.shadow.ry);
    shadow(player.x - camX, player.y - camY - 1, 6, 2.5, 0.25);
    list.push({ player: true, sortY: player.y });
    list.sort((a, b) => a.sortY - b.sortY);
    for (const o of list) {
      if (o.player) {
        const bob = player.moving && [1, 2].includes(player.frame()) ? -1 : 0;
        ctx.drawImage(player.sprite(), Math.round(player.x - 8 - camX), Math.round(player.y - 22 - camY + bob));
      } else ctx.drawImage(o.spr, o.x - camX, o.y - camY);
    }
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    game.t += dt;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  loadMap('alvorada');
  document.getElementById('loading').classList.add('done');
  updateHint();
  requestAnimationFrame(frame);

  // expõe para depuração/expansão futura
  window.Game = { game, player, loadMap, toast, World };
})();
