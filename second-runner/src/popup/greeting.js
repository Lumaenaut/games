function startArcadeBackground(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const colors = readThemeColors();

  const state = {
    bw: 0,
    bh: 0,
    scaleX: 1,
    scaleY: 1,
    ball: { x: 0, y: 0, vx: 0.9, vy: 0.7, r: 2 },
    paddles: [
      { x: 6, y: 10, w: 2, h: 14, vy: 0.35 },
      { x: 0, y: 0, w: 2, h: 14, vy: -0.28 }
    ],
    blocks: [],
    lastT: performance.now()
  };

  const DESIGN_W = 320;
  const DESIGN_H = 240;

  function readThemeColors() {
    const s = getComputedStyle(document.documentElement);
    const darkest = s.getPropertyValue('--darkest').trim() || '#2a2a2a';
    const dark = s.getPropertyValue('--dark').trim() || '#5a5a5a';
    const light = s.getPropertyValue('--light').trim() || '#a0a0a0';
    const lightest = s.getPropertyValue('--lightest').trim() || '#e8e8e8';
    return { darkest, dark, light, lightest };
  }

  function resize() {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    state.bw = canvas.width;
    state.bh = canvas.height;
    state.scaleX = state.bw / DESIGN_W;
    state.scaleY = state.bh / DESIGN_H;

    const scale = Math.min(state.scaleX, state.scaleY);
    state.ball.r = Math.max(1, 2 * scale);
    state.ball.x = Math.floor(state.bw * 0.25);
    state.ball.y = Math.floor(state.bh * 0.35);
    state.ball.vx = 0.95 * state.scaleX;
    state.ball.vy = 0.75 * state.scaleY;

    state.paddles[0].x = 6 * state.scaleX;
    state.paddles[0].y = 10 * state.scaleY;
    state.paddles[0].w = 2 * state.scaleX;
    state.paddles[0].h = 14 * state.scaleY;
    state.paddles[0].vy = 0.35 * state.scaleY;
    state.paddles[1].w = 2 * state.scaleX;
    state.paddles[1].h = 14 * state.scaleY;
    state.paddles[1].vy = -0.28 * state.scaleY;

    const designBlocks = buildBlocks(DESIGN_W, DESIGN_H);
    state.blocks = designBlocks.map((b) => ({
      x: b.x * state.scaleX,
      y: b.y * state.scaleY,
      w: b.w * state.scaleX,
      h: b.h * state.scaleY
    }));

    ctx.imageSmoothingEnabled = false;
  }

  function tick(t) {
    const dt = Math.min(1.5, Math.max(0.016, (t - state.lastT) / 16.67));
    state.lastT = t;

    stepPhysics(dt);
    drawFrame(t);

    requestAnimationFrame(tick);
  }

  function stepPhysics(dt) {
    const { ball } = state;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; }
    if (ball.x > state.bw - ball.r) { ball.x = state.bw - ball.r; ball.vx *= -1; }
    if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; }
    if (ball.y > state.bh - ball.r) { ball.y = state.bh - ball.r; ball.vy *= -1; }

    for (let i = 0; i < state.paddles.length; i++) {
      const p = state.paddles[i];
      const sx = state.scaleX;
      const sy = state.scaleY;
      if (i === 1) p.x = state.bw - 8 * sx;
      p.y += p.vy * dt;
      if (p.y < 8 * sy) { p.y = 8 * sy; p.vy *= -1; }
      if (p.y > state.bh - 8 * sy - p.h) { p.y = state.bh - 8 * sy - p.h; p.vy *= -1; }
      bounceOffRect(ball, p, 0.06);
    }

    for (const r of state.blocks) bounceOffRect(ball, r, 0.02);

    const safe = centerSafeRect(state.bw, state.bh);
    if (circleIntersectsRect(ball, safe)) {
      const dxLeft = Math.abs((safe.x - ball.x));
      const dxRight = Math.abs((safe.x + safe.w - ball.x));
      const dyTop = Math.abs((safe.y - ball.y));
      const dyBottom = Math.abs((safe.y + safe.h - ball.y));
      const min = Math.min(dxLeft, dxRight, dyTop, dyBottom);
      if (min === dxLeft) { ball.x = safe.x - ball.r - 1; ball.vx = -Math.abs(ball.vx); }
      else if (min === dxRight) { ball.x = safe.x + safe.w + ball.r + 1; ball.vx = Math.abs(ball.vx); }
      else if (min === dyTop) { ball.y = safe.y - ball.r - 1; ball.vy = -Math.abs(ball.vy); }
      else { ball.y = safe.y + safe.h + ball.r + 1; ball.vy = Math.abs(ball.vy); }
    }
  }

  function drawFrame(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = colors.darkest;
    ctx.fillRect(0, 0, state.bw, state.bh);

    const gridStepX = Math.max(1, 12 * state.scaleX);
    const gridStepY = Math.max(1, 10 * state.scaleY);
    ctx.fillStyle = colors.dark;
    for (let y = 0; y < state.bh; y += gridStepY) ctx.fillRect(0, y, state.bw, 1);
    for (let x = 0; x < state.bw; x += gridStepX) ctx.fillRect(x, 0, 1, state.bh);

    ctx.strokeStyle = colors.light;
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, state.bw - 2, state.bh - 2);

    ctx.fillStyle = colors.dark;
    for (const r of state.blocks) ctx.fillRect(r.x, r.y, r.w, r.h);

    ctx.fillStyle = colors.light;
    for (let i = 0; i < state.paddles.length; i++) {
      const p = state.paddles[i];
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
    }

    ctx.fillStyle = colors.lightest;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.dark;
    const shimmerY = (Math.floor(t / 45) % 12) * gridStepY;
    ctx.fillRect(0, shimmerY, state.bw, 1);
  }

  function buildBlocks(w, h) {
    const safe = centerSafeRect(w, h);
    const blocks = [];

    blocks.push({ x: 10, y: 8, w: 12, h: 3 });
    blocks.push({ x: w - 22, y: 8, w: 12, h: 3 });
    blocks.push({ x: 10, y: h - 11, w: 12, h: 3 });
    blocks.push({ x: w - 22, y: h - 11, w: 12, h: 3 });

    blocks.push({ x: 16, y: 18, w: 3, h: Math.max(10, safe.y - 22) });
    blocks.push({
      x: 16,
      y: safe.y + safe.h + 4,
      w: 3,
      h: Math.max(10, h - (safe.y + safe.h) - 22)
    });
    blocks.push({ x: w - 19, y: 18, w: 3, h: Math.max(10, safe.y - 22) });
    blocks.push({
      x: w - 19,
      y: safe.y + safe.h + 4,
      w: 3,
      h: Math.max(10, h - (safe.y + safe.h) - 22)
    });

    blocks.push({ x: Math.floor(w * 0.35), y: 14, w: 16, h: 2 });
    blocks.push({ x: Math.floor(w * 0.55), y: h - 16, w: 16, h: 2 });

    return blocks;
  }

  function centerSafeRect(w, h) {
    const sw = clampInt(Math.floor(w * 0.62), 90, w - 40);
    const sh = clampInt(Math.floor(h * 0.42), 55, h - 40);
    return { x: Math.floor((w - sw) / 2), y: Math.floor((h - sh) / 2), w: sw, h: sh };
  }

  function bounceOffRect(ball, rect, speedup) {
    if (!circleIntersectsRect(ball, rect)) return;

    const closestX = clamp(ball.x, rect.x, rect.x + rect.w);
    const closestY = clamp(ball.y, rect.y, rect.y + rect.h);
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;

    if (Math.abs(dx) > Math.abs(dy)) {
      ball.vx *= -1;
      ball.x += Math.sign(dx || ball.vx) * (ball.r + 1);
    } else {
      ball.vy *= -1;
      ball.y += Math.sign(dy || ball.vy) * (ball.r + 1);
    }

    const maxV = 2.1 * Math.max(state.scaleX, state.scaleY);
    ball.vx = clamp(ball.vx * (1 + speedup), -maxV, maxV);
    ball.vy = clamp(ball.vy * (1 + speedup), -maxV, maxV);
  }

  function circleIntersectsRect(ball, rect) {
    const cx = clamp(ball.x, rect.x, rect.x + rect.w);
    const cy = clamp(ball.y, rect.y, rect.y + rect.h);
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    return (dx * dx + dy * dy) <= (ball.r * ball.r);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function clampInt(v, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.floor(v)));
  }

  resize();
  window.addEventListener('resize', resize);
  state.lastT = performance.now();
  requestAnimationFrame(tick);
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('bg-canvas');
  if (canvas) startArcadeBackground(canvas);

  document.body.addEventListener('click', () => {
    window.location.href = 'main-menu.html';
  });

  document.body.style.cursor = 'pointer';
});
