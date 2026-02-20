/**
 * Starts the arcade-style animated background on the greeting screen.
 * Renders a ball bouncing off paddles and blocks, with a grid and border.
 */
function startArcadeBackground(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const colors = readThemeColors();

  // Shared state: canvas size, scale factors, ball, two edge paddles, static blocks, last frame time
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

  // Design-space dimensions; layout is defined in this space then scaled to canvas
  const DESIGN_W = 320;
  const DESIGN_H = 240;

  /** Reads the 4-color greyscale palette from CSS custom properties (--darkest, --dark, --light, --lightest). */
  function readThemeColors() {
    const s = getComputedStyle(document.documentElement);
    const darkest = s.getPropertyValue('--darkest').trim() || '#2a2a2a';
    const dark = s.getPropertyValue('--dark').trim() || '#5a5a5a';
    const light = s.getPropertyValue('--light').trim() || '#a0a0a0';
    const lightest = s.getPropertyValue('--lightest').trim() || '#e8e8e8';
    return { darkest, dark, light, lightest };
  }

  /**
   * Resizes the canvas to match its display size (with device pixel ratio),
   * updates scale factors, and repositions/scales ball, paddles, and blocks.
   */
  function resize() {
    // Device pixel ratio (e.g. 2 on Retina); we draw at that resolution so the canvas stays sharp.
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    // Set canvas internal size = display size × DPR so 1 CSS pixel can map to multiple device pixels.
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    // Store canvas size and scale from design space (DESIGN_W × DESIGN_H) to current canvas pixels.
    state.bw = canvas.width;
    state.bh = canvas.height;
    state.scaleX = state.bw / DESIGN_W;
    state.scaleY = state.bh / DESIGN_H;

    // Ball: use the smaller scale so the ball stays round; place at ~25% from left, 35% from top; scale speed to canvas.
    const scale = Math.min(state.scaleX, state.scaleY);
    state.ball.r = Math.max(1, 2 * scale);
    state.ball.x = Math.floor(state.bw * 0.25);
    state.ball.y = Math.floor(state.bh * 0.35);
    state.ball.vx = 0.95 * state.scaleX;
    state.ball.vy = 0.75 * state.scaleY;

    // Left paddle: fixed position and size in design units, scaled to canvas; vertical speed scaled.
    state.paddles[0].x = 6 * state.scaleX;
    state.paddles[0].y = 10 * state.scaleY;
    state.paddles[0].w = 2 * state.scaleX;
    state.paddles[0].h = 14 * state.scaleY;
    state.paddles[0].vy = 0.35 * state.scaleY;
    // Right paddle: x is set each frame in stepPhysics; here we only set width, height, and vertical speed.
    state.paddles[1].w = 2 * state.scaleX;
    state.paddles[1].h = 14 * state.scaleY;
    state.paddles[1].vy = -0.28 * state.scaleY;

    // Rebuild block layout in design space, then scale each block's position and size to canvas.
    const designBlocks = buildBlocks(DESIGN_W, DESIGN_H);
    state.blocks = designBlocks.map((b) => ({
      x: b.x * state.scaleX,
      y: b.y * state.scaleY,
      w: b.w * state.scaleX,
      h: b.h * state.scaleY
    }));

    // Crisp pixels (no smoothing) for the retro look.
    ctx.imageSmoothingEnabled = false;
  }

  /** Returns an array of block rects in design space: corners, full-height side rails, and top/bottom gates. */
  function buildBlocks(w, h) {
    const blocks = [];
    const railH = Math.max(10, h - 40);

    // Four corner bumpers.
    blocks.push({ x: 10, y: 8, w: 12, h: 3 });
    blocks.push({ x: w - 22, y: 8, w: 12, h: 3 });
    blocks.push({ x: 10, y: h - 11, w: 12, h: 3 });
    blocks.push({ x: w - 22, y: h - 11, w: 12, h: 3 });

    // Left and right vertical rails (full height).
    blocks.push({ x: 16, y: 18, w: 3, h: railH });
    blocks.push({ x: w - 19, y: 18, w: 3, h: railH });

    // Top and bottom horizontal gates.
    blocks.push({ x: Math.floor(w * 0.35), y: 14, w: 16, h: 2 });
    blocks.push({ x: Math.floor(w * 0.55), y: h - 16, w: 16, h: 2 });

    return blocks;
  }

  /** Game loop: compute delta time, run physics, draw, then schedule next frame. */
  function tick(t) {
    // This computation makes the animation frame-rate independent.
    const dt = Math.min(1.5, Math.max(0.016, (t - state.lastT) / 16.67));
    state.lastT = t;

    // Update the world state based on how much time has passed.
    stepPhysics(dt);
    // Render the current state.
    drawFrame(t);
    // Request the next frame.
    requestAnimationFrame(tick);
  }

  /**
   * Updates positions and collisions for one frame.
   * Ball moves and bounces off canvas edges; paddles move vertically and bounce ball;
   * static blocks bounce ball. Ball can pass behind the title until it hits a paddle or block.
   */
  function stepPhysics(dt) {
    const { ball } = state;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Bounce ball off canvas edges (left, right, top, bottom).
    if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; }
    if (ball.x > state.bw - ball.r) { ball.x = state.bw - ball.r; ball.vx *= -1; }
    if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; }
    if (ball.y > state.bh - ball.r) { ball.y = state.bh - ball.r; ball.vy *= -1; }

    // Update paddles: position right paddle, move vertically, clamp to bounds, then resolve ball collision.
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

    // Verify potential collision of ball to any block
    for (const r of state.blocks) bounceOffRect(ball, r, 0.02);
  }

  /**
   * If the ball overlaps the given rect, reflects velocity (horizontal or vertical by largest overlap),
   * nudges ball out, and applies a small speed-up up to a max velocity.
   */
  function bounceOffRect(ball, rect, speedup) {
    if (!circleIntersectsRect(ball, rect)) return;

    // Closest point on the rect to the ball's center; dx, dy are the penetration vector (ball center → that point).
    const closestX = clamp(ball.x, rect.x, rect.x + rect.w);
    const closestY = clamp(ball.y, rect.y, rect.y + rect.h);
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;

    // Bounce on the axis with larger penetration: flip that velocity and nudge the ball out so it no longer overlaps.
    if (Math.abs(dx) > Math.abs(dy)) {
      ball.vx *= -1;
      ball.x += Math.sign(dx || ball.vx) * (ball.r + 1);
    } else {
      ball.vy *= -1;
      ball.y += Math.sign(dy || ball.vy) * (ball.r + 1);
    }

    // Slight speed-up for arcade feel, clamped so velocity does not exceed max.
    const maxV = 2.1 * Math.max(state.scaleX, state.scaleY);
    ball.vx = clamp(ball.vx * (1 + speedup), -maxV, maxV);
    ball.vy = clamp(ball.vy * (1 + speedup), -maxV, maxV);
  }

  /** True if the circle (ball) overlaps the axis-aligned rectangle. */
  function circleIntersectsRect(ball, rect) {
    // Closest point on the rect to the ball's center; dx, dy from that point to the ball.
    const cx = clamp(ball.x, rect.x, rect.x + rect.w);
    const cy = clamp(ball.y, rect.y, rect.y + rect.h);
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    // Overlap when distance from closest point to ball center ≤ radius; squared comparison avoids sqrt.
    return (dx * dx + dy * dy) <= (ball.r * ball.r);
  }

  /** Clamps a value between lo and hi. */
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /** Draws one frame: background, grid, border, blocks, paddles, ball, and a moving shimmer line. */
  function drawFrame(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Solid background.
    ctx.fillStyle = colors.darkest;
    ctx.fillRect(0, 0, state.bw, state.bh);

    // Horizontal and vertical grid lines.
    const gridStepX = Math.max(1, 12 * state.scaleX);
    const gridStepY = Math.max(1, 10 * state.scaleY);
    ctx.fillStyle = colors.dark;
    for (let y = 0; y < state.bh; y += gridStepY) ctx.fillRect(0, y, state.bw, 1);
    for (let x = 0; x < state.bw; x += gridStepX) ctx.fillRect(x, 0, 1, state.bh);

    // Outer border.
    ctx.strokeStyle = colors.light;
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, state.bw - 2, state.bh - 2);

    // Static blocks (bumpers and gates).
    ctx.fillStyle = colors.dark;
    for (const r of state.blocks) ctx.fillRect(r.x, r.y, r.w, r.h);

    // Two moving paddles.
    ctx.fillStyle = colors.light;
    for (let i = 0; i < state.paddles.length; i++) {
      const p = state.paddles[i];
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
    }

    // Ball.
    ctx.fillStyle = colors.lightest;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();

    // Animated shimmer line (steps down the grid over time).
    ctx.fillStyle = colors.dark;
    const shimmerY = (Math.floor(t / 45) % 12) * gridStepY;
    ctx.fillRect(0, shimmerY, state.bw, 1);
  }

  resize();
  window.addEventListener('resize', resize);
  state.lastT = performance.now();
  requestAnimationFrame(tick);
}

// On load: start the arcade background on #bg-canvas, make the whole page clickable to go to main menu.
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('bg-canvas');
  if (canvas) startArcadeBackground(canvas);

  document.body.addEventListener('click', () => {
    window.location.href = 'main-menu.html';
  });

  document.body.style.cursor = 'pointer';
});
