// When the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('bg-canvas');
  if (canvas) startArcadeBackground(canvas);

  // Make entire page clickable
  document.body.addEventListener('click', () => {
    window.location.href = 'main-menu.html';
  });
  // Also make it clear it's clickable
  document.body.style.cursor = 'pointer';
});

function startArcadeBackground(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const buffer = document.createElement('canvas');
  const bctx = buffer.getContext('2d', { alpha: false });
  if (!bctx) return;

  const colors = readThemeColors();

  const state = {
    scale: 4,
    bw: 0,
    bh: 0,
    ball: { x: 0, y: 0, vx: 0.9, vy: 0.7, r: 2 },
    paddles: [
      { x: 6, y: 10, w: 2, h: 14, vy: 0.35 },
      { x: 0, y: 0, w: 2, h: 14, vy: -0.28 }
    ],
    blocks: [],
    lastT: performance.now()
  };

  function resize() {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    // Low-res buffer for pixel feel
    const targetBw = clampInt(Math.floor(rect.width / state.scale), 160, 320);
    const targetBh = clampInt(Math.floor(rect.height / state.scale), 120, 240);
    buffer.width = targetBw;
    buffer.height = targetBh;
    state.bw = targetBw;
    state.bh = targetBh;

    // Place ball and rebuild blocks
    state.ball.x = Math.floor(state.bw * 0.25);
    state.ball.y = Math.floor(state.bh * 0.35);
    state.ball.vx = 0.95;
    state.ball.vy = 0.75;
    state.blocks = buildBlocks(state.bw, state.bh);

    ctx.imageSmoothingEnabled = false;
    bctx.imageSmoothingEnabled = false;
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

    // World bounds
    const left = 2 + ball.r;
    const right = state.bw - 3 - ball.r;
    const top = 2 + ball.r;
    const bottom = state.bh - 3 - ball.r;

    if (ball.x < left) { ball.x = left; ball.vx *= -1; }
    if (ball.x > right) { ball.x = right; ball.vx *= -1; }
    if (ball.y < top) { ball.y = top; ball.vy *= -1; }
    if (ball.y > bottom) { ball.y = bottom; ball.vy *= -1; }

    // Moving “paddles” on edges (arcade vibe)
    for (let i = 0; i < state.paddles.length; i++) {
      const p = state.paddles[i];
      if (i === 1) p.x = state.bw - 8;
      p.y += p.vy * dt;
      if (p.y < 8) { p.y = 8; p.vy *= -1; }
      if (p.y > state.bh - 8 - p.h) { p.y = state.bh - 8 - p.h; p.vy *= -1; }
      bounceOffRect(ball, p, 0.06);
    }

    // Static blocks
    for (const r of state.blocks) bounceOffRect(ball, r, 0.02);

    // Keep middle “reserved” zone clear: if ball enters, nudge it out
    const safe = centerSafeRect(state.bw, state.bh);
    if (circleIntersectsRect(ball, safe)) {
      // Push out along smallest overlap axis
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
    // Background fill
    bctx.fillStyle = colors.darkest;
    bctx.fillRect(0, 0, state.bw, state.bh);

    // Subtle grid
    bctx.fillStyle = colors.dark;
    for (let y = 0; y < state.bh; y += 10) bctx.fillRect(0, y, state.bw, 1);
    for (let x = 0; x < state.bw; x += 12) bctx.fillRect(x, 0, 1, state.bh);

    // Border frame
    bctx.strokeStyle = colors.light;
    bctx.lineWidth = 1;
    bctx.strokeRect(1, 1, state.bw - 2, state.bh - 2);

    // Blocks
    bctx.fillStyle = colors.dark;
    for (const r of state.blocks) bctx.fillRect(r.x, r.y, r.w, r.h);

    // Moving paddles
    bctx.fillStyle = colors.light;
    for (let i = 0; i < state.paddles.length; i++) {
      const p = state.paddles[i];
      bctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
    }

    // Reserved center area (kept visually “blank”)
    const safe = centerSafeRect(state.bw, state.bh);

    // Ball
    bctx.fillStyle = colors.lightest;
    const bx = Math.round(state.ball.x);
    const by = Math.round(state.ball.y);
    bctx.fillRect(bx - 1, by - 1, 3, 3);
    bctx.fillStyle = colors.light;
    bctx.fillRect(bx, by, 1, 1);

    // Scanline shimmer (very subtle)
    bctx.fillStyle = colors.dark;
    const shimmerY = (Math.floor(t / 45) % 12) * 10;
    bctx.fillRect(0, shimmerY, state.bw, 1);

    // Blit buffer to screen canvas (nearest neighbor)
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);
  }

  function buildBlocks(w, h) {
    const safe = centerSafeRect(w, h);
    const blocks = [];

    // Corner bumpers
    blocks.push({ x: 10, y: 8, w: 12, h: 3 });
    blocks.push({ x: w - 22, y: 8, w: 12, h: 3 });
    blocks.push({ x: 10, y: h - 11, w: 12, h: 3 });
    blocks.push({ x: w - 22, y: h - 11, w: 12, h: 3 });

    // Side “rails” that avoid the safe center zone
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

    // Top/bottom small gates
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

    // Tiny speed-up for “arcade” feel (clamped)
    const maxV = 2.1;
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

  function readThemeColors() {
    const s = getComputedStyle(document.documentElement);
    const darkest = s.getPropertyValue('--darkest').trim() || '#2a2a2a';
    const dark = s.getPropertyValue('--dark').trim() || '#5a5a5a';
    const light = s.getPropertyValue('--light').trim() || '#a0a0a0';
    const lightest = s.getPropertyValue('--lightest').trim() || '#e8e8e8';
    return { darkest, dark, light, lightest };
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
