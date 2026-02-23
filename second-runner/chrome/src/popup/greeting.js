/**
 * greeting.js
 * Arcade-style animated background on the greeting (welcome) screen.
 * Renders a ball bouncing off two moving paddles and static blocks, with a grid
 * and border. Layout is defined in a fixed design space (320×240) and scaled
 * to the canvas. On DOMContentLoaded we start the animation loop and make the
 * whole page clickable to navigate to the main menu.
 */

/* -------------------------------------------------------------------------- */
/* Canvas and design constants                                                */
/* -------------------------------------------------------------------------- */

// The full-screen background canvas in greeting.html; may be null if script runs before DOM.
const canvas = document.getElementById('bg-canvas');
// 2D context with alpha disabled for a solid background; null if canvas is missing.
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

// Design-space dimensions: all layout (paddles, blocks, grid) is defined in this coordinate system.
const DESIGN_W = 320;
const DESIGN_H = 240;

/* -------------------------------------------------------------------------- */
/* Theme colors (filled on DOMContentLoaded from CSS custom properties)       */
/* -------------------------------------------------------------------------- */

let colors = {};

/* -------------------------------------------------------------------------- */
/* Shared animation state                                                     */
/* -------------------------------------------------------------------------- */

const state = {
  bw: 0,           // Canvas width in pixels (after resize).
  bh: 0,           // Canvas height in pixels.
  scaleX: 1,       // Scale from design width to canvas width.
  scaleY: 1,       // Scale from design height to canvas height.
  ball: { x: 0, y: 0, vx: 0.9, vy: 0.7, r: 2 },
  paddles: [
    { x: 6, y: 10, w: 2, h: 14, vy: 0.35 },   // Left paddle.
    { x: 0, y: 0, w: 2, h: 14, vy: -0.28 }    // Right paddle (x set each frame).
  ],
  blocks: [],      // Static obstacles; built in design space and scaled in resize().
  lastT: performance.now()   // Last animation frame time for delta-time calculation.
};

/**
 * Reads the four-color greyscale palette from CSS custom properties on the document.
 * Used for background, grid, border, blocks, paddles, ball, and shimmer.
 * Fallbacks are used if the theme does not define --darkest, --dark, --light, --lightest.
 *
 * @returns {{ darkest: string, dark: string, light: string, lightest: string }}
 */
function readThemeColors() {
  const s = getComputedStyle(document.documentElement);
  return {
    darkest: (s.getPropertyValue('--darkest') || '#2a2a2a').trim(),
    dark: (s.getPropertyValue('--dark') || '#5a5a5a').trim(),
    light: (s.getPropertyValue('--light') || '#a0a0a0').trim(),
    lightest: (s.getPropertyValue('--lightest') || '#e8e8e8').trim()
  };
}

/**
 * Resizes the canvas to match its display size (including device pixel ratio for sharpness),
 * then updates state: scale factors, ball position/size/velocity, paddle positions/sizes,
 * and block rects. Called on load and on window resize.
 * No-op if canvas or ctx is missing.
 */
function resize() {
  if (!canvas || !ctx) return;

  // Use device pixel ratio so the canvas stays crisp on high-DPI screens.
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  // Store canvas size and scale factors from design space to pixels.
  state.bw = canvas.width;
  state.bh = canvas.height;
  state.scaleX = state.bw / DESIGN_W;
  state.scaleY = state.bh / DESIGN_H;

  // Ball: use the smaller scale so it stays round; place at ~25% from left, 35% from top.
  const scale = Math.min(state.scaleX, state.scaleY);
  state.ball.r = Math.max(1, 2 * scale);
  state.ball.x = Math.floor(state.bw * 0.25);
  state.ball.y = Math.floor(state.bh * 0.35);
  state.ball.vx = 0.95 * state.scaleX;
  state.ball.vy = 0.75 * state.scaleY;

  // Left paddle: position and size in design units, scaled to canvas; vertical speed scaled.
  state.paddles[0].x = 6 * state.scaleX;
  state.paddles[0].y = 10 * state.scaleY;
  state.paddles[0].w = 2 * state.scaleX;
  state.paddles[0].h = 14 * state.scaleY;
  state.paddles[0].vy = 0.35 * state.scaleY;
  // Right paddle: x is set every frame in stepPhysics; here we only set size and vertical speed.
  state.paddles[1].w = 2 * state.scaleX;
  state.paddles[1].h = 14 * state.scaleY;
  state.paddles[1].vy = -0.28 * state.scaleY;

  // Build block layout in design space, then scale each block to canvas pixels.
  const designBlocks = buildBlocks(DESIGN_W, DESIGN_H);
  state.blocks = designBlocks.map((b) => ({
    x: b.x * state.scaleX,
    y: b.y * state.scaleY,
    w: b.w * state.scaleX,
    h: b.h * state.scaleY
  }));

  // Disable image smoothing for a crisp, retro look.
  ctx.imageSmoothingEnabled = false;
}

/**
 * Returns an array of static block rectangles in design-space coordinates.
 * Includes four corner bumpers, two full-height vertical rails, and two horizontal gates.
 * Used by resize() to populate state.blocks (then scaled to pixels).
 *
 * @param {number} w - Design width (e.g. DESIGN_W).
 * @param {number} h - Design height (e.g. DESIGN_H).
 * @returns {Array<{ x: number, y: number, w: number, h: number }>}
 */
function buildBlocks(w, h) {
  const blocks = [];
  // Height of the vertical rails (nearly full height with margin).
  const railH = Math.max(10, h - 40);

  // Four corner bumpers (top-left, top-right, bottom-left, bottom-right).
  blocks.push({ x: 10, y: 8, w: 12, h: 3 });
  blocks.push({ x: w - 22, y: 8, w: 12, h: 3 });
  blocks.push({ x: 10, y: h - 11, w: 12, h: 3 });
  blocks.push({ x: w - 22, y: h - 11, w: 12, h: 3 });

  // Left and right vertical rails.
  blocks.push({ x: 16, y: 18, w: 3, h: railH });
  blocks.push({ x: w - 19, y: 18, w: 3, h: railH });

  // Top and bottom horizontal gates (centered horizontally at 35% and 55% of width).
  blocks.push({ x: Math.floor(w * 0.35), y: 14, w: 16, h: 2 });
  blocks.push({ x: Math.floor(w * 0.55), y: h - 16, w: 16, h: 2 });

  return blocks;
}

/**
 * One tick of the animation loop: compute delta time from last frame, run physics,
 * draw the current frame, then schedule the next tick. Makes the animation
 * frame-rate independent by using elapsed time.
 *
 * @param {number} t - Current timestamp from requestAnimationFrame.
 */
function tick(t) {
  if (!canvas || !ctx) return;

  // Clamp dt to avoid huge jumps after tab switch; ~60fps base (16.67ms per frame).
  const dt = Math.min(1.5, Math.max(0.016, (t - state.lastT) / 16.67));
  state.lastT = t;

  stepPhysics(dt);
  drawFrame(t);
  requestAnimationFrame(tick);
}

/**
 * Updates positions and collisions for one frame. Moves the ball, bounces it off
 * canvas edges, updates both paddles (right paddle x and both paddles' y with bounds),
 * then resolves ball–paddle and ball–block collisions.
 *
 * @param {number} dt - Delta time in a unit where ~1 is one frame at 60fps.
 */
function stepPhysics(dt) {
  const { ball } = state;

  // Move ball by velocity scaled by time.
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Bounce off canvas edges (left, right, top, bottom).
  if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; }
  if (ball.x > state.bw - ball.r) { ball.x = state.bw - ball.r; ball.vx *= -1; }
  if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; }
  if (ball.y > state.bh - ball.r) { ball.y = state.bh - ball.r; ball.vy *= -1; }

  // Update paddles: set right paddle x, move vertically, clamp to bounds, then check ball collision.
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
  // Check ball against every static block.
  for (const r of state.blocks) bounceOffRect(ball, r, 0.02);
}

/**
 * If the ball overlaps the given axis-aligned rectangle, reflects the ball's velocity
 * on the axis of largest penetration (horizontal or vertical), nudges the ball out
 * of the rect, and applies a small speed-up (capped by a max velocity). Used for
 * paddle and block collisions.
 *
 * @param {{ x: number, y: number, vx: number, vy: number, r: number }} ball - Ball state (mutated).
 * @param {{ x: number, y: number, w: number, h: number }} rect - Rectangle in canvas pixels.
 * @param {number} speedup - Fractional speed increase per bounce (e.g. 0.06).
 */
function bounceOffRect(ball, rect, speedup) {
  if (!circleIntersectsRect(ball, rect)) return;

  // Closest point on the rect to the ball center; dx, dy form the penetration vector.
  const closestX = clamp(ball.x, rect.x, rect.x + rect.w);
  const closestY = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;

  // Bounce on the axis with larger penetration: flip that velocity and nudge ball out.
  if (Math.abs(dx) > Math.abs(dy)) {
    ball.vx *= -1;
    ball.x += Math.sign(dx || ball.vx) * (ball.r + 1);
  } else {
    ball.vy *= -1;
    ball.y += Math.sign(dy || ball.vy) * (ball.r + 1);
  }

  // Slight speed-up for arcade feel; clamp so velocity does not exceed max.
  const maxV = 2.1 * Math.max(state.scaleX, state.scaleY);
  ball.vx = clamp(ball.vx * (1 + speedup), -maxV, maxV);
  ball.vy = clamp(ball.vy * (1 + speedup), -maxV, maxV);
}

/**
 * Returns true if the circle (ball) overlaps the axis-aligned rectangle.
 * Uses the closest point on the rect to the ball center and compares squared distance to radius.
 *
 * @param {{ x: number, y: number, r: number }} ball
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @returns {boolean}
 */
function circleIntersectsRect(ball, rect) {
  const cx = clamp(ball.x, rect.x, rect.x + rect.w);
  const cy = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  return (dx * dx + dy * dy) <= (ball.r * ball.r);
}

/**
 * Clamps a numeric value between lo and hi (inclusive).
 *
 * @param {number} v - Value to clamp.
 * @param {number} lo - Minimum.
 * @param {number} hi - Maximum.
 * @returns {number}
 */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Draws one frame: solid background, grid lines, outer border, static blocks,
 * two paddles, ball, and an animated shimmer line that steps down the grid over time.
 * Uses the global colors and state.
 *
 * @param {number} t - Current timestamp (used for shimmer position).
 */
function drawFrame(t) {
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Solid background using darkest theme color.
  ctx.fillStyle = colors.darkest;
  ctx.fillRect(0, 0, state.bw, state.bh);

  // Grid lines (horizontal and vertical) using dark theme color; step scales with canvas.
  const gridStepX = Math.max(1, 12 * state.scaleX);
  const gridStepY = Math.max(1, 10 * state.scaleY);
  ctx.fillStyle = colors.dark;
  for (let y = 0; y < state.bh; y += gridStepY) ctx.fillRect(0, y, state.bw, 1);
  for (let x = 0; x < state.bw; x += gridStepX) ctx.fillRect(x, 0, 1, state.bh);

  // Outer border (one pixel inset) using light theme color.
  ctx.strokeStyle = colors.light;
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, state.bw - 2, state.bh - 2);

  // Static blocks (bumpers and gates) in dark.
  ctx.fillStyle = colors.dark;
  for (const r of state.blocks) ctx.fillRect(r.x, r.y, r.w, r.h);

  // Two moving paddles in light color; positions rounded for crisp pixels.
  ctx.fillStyle = colors.light;
  for (let i = 0; i < state.paddles.length; i++) {
    const p = state.paddles[i];
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
  }

  // Ball in lightest color.
  ctx.fillStyle = colors.lightest;
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
  ctx.fill();

  // Animated shimmer line: steps down the grid every 45ms, wraps every 12 steps.
  ctx.fillStyle = colors.dark;
  const shimmerY = (Math.floor(t / 45) % 12) * gridStepY;
  ctx.fillRect(0, shimmerY, state.bw, 1);
}

/* -------------------------------------------------------------------------- */
/* Startup: run when the DOM is ready                                         */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // Start the arcade background if we have a valid canvas and context.
  if (canvas && ctx) {
    colors = readThemeColors();
    resize();
    window.addEventListener('resize', resize);
    state.lastT = performance.now();
    requestAnimationFrame(tick);
  }

  // Click anywhere on the page to go to the main menu.
  document.body.addEventListener('click', () => {
    window.location.href = 'main-menu.html';
  });

  document.body.style.cursor = 'pointer';
});
