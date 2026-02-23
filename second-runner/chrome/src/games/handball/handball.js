/**
 * handball.js
 * Single-player handball: both sides have two paddles on the left (back and forward);
 * only the "forward" paddle (by turn) can deflect the ball. Ball bounces off top,
 * right, and bottom; left wall is the goal. Turn swaps after a deflection when ball
 * crosses mid-court. First to winningScore wins. Difficulty starts at
 * INITIAL_SPEED_MULTIPLIER and increases with rally count. Click to start/continue;
 * back button returns to main menu.
 */

/* -------------------------------------------------------------------------- */
/* Canvas and DOM                                                             */
/* -------------------------------------------------------------------------- */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

/* -------------------------------------------------------------------------- */
/* Game state and scores                                                      */
/* -------------------------------------------------------------------------- */

let gameRunning = false;
let gamePaused = false;
let animationFrame;
let playerScore = 0;
let computerScore = 0;
let winningScore = 5;

/* -------------------------------------------------------------------------- */
/* Rally-based difficulty (same pattern as tennis/hockey)                     */
/* -------------------------------------------------------------------------- */

let rallyCount = 0;
const BASE_BALL_SPEED = 5;
/** Game starts at this multiplier so it feels challenging sooner (1 = original). Speed increases with rally, no cap. */
const INITIAL_SPEED_MULTIPLIER = 1.7;
let currentSpeedMultiplier = INITIAL_SPEED_MULTIPLIER;

/* -------------------------------------------------------------------------- */
/* Paddles and ball                                                            */
/* -------------------------------------------------------------------------- */

let playerY = canvas.height / 2 - 40;
let computerY = canvas.height / 2 - 40;

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;

// Both paddles on the left: back (x=10) and forward (x=28). Turn decides who is "forward" and can deflect.
const BACK_X = 10;
const FORWARD_X = 28;
let turn = 'player';
let swapPending = false;

let ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: BASE_BALL_SPEED,
  dy: 3,
  radius: 5,
  baseSpeed: BASE_BALL_SPEED
};

let mouseY = canvas.height / 2 - 40;

/* -------------------------------------------------------------------------- */
/* Functions (in order of use in script)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Reads the four-color greyscale palette from CSS custom properties.
 * Fallbacks used if theme does not define --darkest, --dark, --light, --lightest.
 *
 * @returns {{ darkest: string, dark: string, light: string, lightest: string }}
 */
function getThemeColors() {
  const s = getComputedStyle(document.documentElement);
  return {
    darkest: (s.getPropertyValue('--darkest') || '#2a2a2a').trim(),
    dark: (s.getPropertyValue('--dark') || '#5a5a5a').trim(),
    light: (s.getPropertyValue('--light') || '#a0a0a0').trim(),
    lightest: (s.getPropertyValue('--lightest') || '#e8e8e8').trim()
  };
}
const theme = getThemeColors();

/**
 * Resets ball to center moving right and resets difficulty. Called on first
 * load and when starting a new match after a win.
 */
function init() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  rallyCount = 0;
  currentSpeedMultiplier = INITIAL_SPEED_MULTIPLIER;
  ball.baseSpeed = BASE_BALL_SPEED * currentSpeedMultiplier;
  ball.dx = ball.baseSpeed;
  ball.dy = (Math.random() * 4) - 2;
}

/**
 * Resets ball and difficulty, sets who serves (nextTurn), and pauses until click.
 * Used after a goal; the scorer becomes the one who "serves" (ball goes toward their side).
 *
 * @param {'player'|'computer'} nextTurn - Who serves next (ball will move toward their goal).
 */
function resetForNextRound(nextTurn) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  rallyCount = 0;
  currentSpeedMultiplier = INITIAL_SPEED_MULTIPLIER;
  ball.baseSpeed = BASE_BALL_SPEED * currentSpeedMultiplier;
  ball.dx = ball.baseSpeed;
  ball.dy = (Math.random() * 4) - 2;
  turn = nextTurn;
  swapPending = false;
  gameRunning = false;
  gamePaused = true;
}

/**
 * Draws the court (background, horizontal center line, top/right/bottom walls),
 * two paddles (position by turn: forward vs back), ball, and overlays (pause, start, win, rally).
 */
function draw() {
  ctx.fillStyle = theme.lightest;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Horizontal center line (dashed).
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bounce zones: top, right, bottom (left is goal).
  ctx.strokeStyle = theme.dark;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, 5);
  ctx.strokeRect(canvas.width - 5, 0, 5, canvas.height);
  ctx.strokeRect(0, canvas.height - 5, canvas.width, 5);
  ctx.lineWidth = 1;

  // Paddle positions depend on turn: forward paddle is the one that can deflect.
  const playerX = (turn === 'player' ? FORWARD_X : BACK_X);
  const compX = (turn === 'computer' ? FORWARD_X : BACK_X);
  ctx.fillStyle = theme.darkest;
  ctx.fillRect(playerX, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillStyle = theme.light;
  ctx.fillRect(compX, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);

  // Ball.
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = theme.darkest;
  ctx.fill();

  // Pause overlay: winner text or "CLICK TO CONTINUE".
  if (gamePaused && !gameRunning) {
    ctx.fillStyle = theme.lightest;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.darkest;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    if (playerScore >= winningScore || computerScore >= winningScore) {
      const winnerText = playerScore >= winningScore ? 'PLAYER WINS!' : 'COMPUTER WINS!';
      ctx.fillText(winnerText, canvas.width / 2, canvas.height / 2 - 30);
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Click for next match', canvas.width / 2, canvas.height / 2 + 10);
    } else {
      ctx.fillText('CLICK TO CONTINUE', canvas.width / 2, canvas.height / 2);
    }
  } else if (!gameRunning && !gamePaused) {
    // Start overlay: "CLICK TO START".
    ctx.fillStyle = theme.lightest;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.darkest;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLICK TO START', canvas.width / 2, canvas.height / 2);
  }

  // Rally counter and speed multiplier (top-right) when game is running.
  if (gameRunning && rallyCount > 0) {
    ctx.fillStyle = theme.darkest;
    ctx.globalAlpha = 0.5;
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Rally: ${rallyCount} x${currentSpeedMultiplier.toFixed(1)}`, canvas.width - 20, 30);
    ctx.globalAlpha = 1;
  }
}

/**
 * Bumps rally count and speed multiplier; applies to ball velocity
 * while preserving direction. Base is INITIAL_SPEED_MULTIPLIER so first hit doesn't drop speed; no cap.
 * Called when the forward paddle deflects the ball.
 */
function updateDifficulty() {
  rallyCount++;
  // Base multiplier on INITIAL_SPEED_MULTIPLIER so first hit doesn't drop speed; no cap.
  currentSpeedMultiplier = INITIAL_SPEED_MULTIPLIER + (Math.floor(rallyCount / 2) * 0.1);
  const directionX = ball.dx > 0 ? 1 : -1;
  const directionY = ball.dy > 0 ? 1 : -1;
  ball.baseSpeed = BASE_BALL_SPEED * currentSpeedMultiplier;
  ball.dx = directionX * ball.baseSpeed;
  ball.dy = Math.abs(ball.dy) * directionY;
}

/**
 * Moves paddles and ball; only the "forward" paddle (by turn) can deflect. Ball
 * bounces off top, right, and bottom; left wall is goal. Turn swaps when ball
 * crosses mid-court after a deflection.
 */
function update() {
  // Player paddle follows mouse, clamped to canvas.
  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY));

  // Computer AI: track ball when running, else center paddle.
  const computerTargetY = gameRunning ? (ball.y - PADDLE_HEIGHT / 2) : (canvas.height / 2 - PADDLE_HEIGHT / 2);
  const computerSpeed = gameRunning ? 7 : 2;
  if (computerY < computerTargetY) computerY += computerSpeed;
  if (computerY > computerTargetY) computerY -= computerSpeed;
  computerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, computerY));

  if (!gameRunning) return;

  ball.x += ball.dx;
  ball.y += ball.dy;

  // After a hit, swap who is "forward" when ball crosses mid-court going right.
  if (swapPending && ball.dx > 0 && ball.x >= canvas.width / 2) {
    turn = (turn === 'player' ? 'computer' : 'player');
    swapPending = false;
  }

  // Top wall: reflect vertical velocity.
  if (ball.y - ball.radius < 0) {
    ball.dy *= -1;
    ball.y = ball.radius;
  }
  // Bottom wall: reflect and clamp.
  if (ball.y + ball.radius > canvas.height) {
    ball.dy *= -1;
    ball.y = canvas.height - ball.radius;
  }
  // Right wall: bounce.
  if (ball.x + ball.radius > canvas.width) {
    ball.dx *= -1;
    ball.x = canvas.width - ball.radius;
  }

  // Which paddle is "forward" (can deflect) depends on turn.
  const playerX = (turn === 'player' ? FORWARD_X : BACK_X);
  const compX = (turn === 'computer' ? FORWARD_X : BACK_X);
  const activeX = (turn === 'player' ? playerX : compX);
  const activeY = (turn === 'player' ? playerY : computerY);

  // Active (forward) paddle collision: ball must be moving left; then bounce right and schedule turn swap.
  if (ball.dx < 0 &&
      ball.x - ball.radius < activeX + PADDLE_WIDTH &&
      ball.x + ball.radius > activeX &&
      ball.y > activeY &&
      ball.y < activeY + PADDLE_HEIGHT) {
    const relativeIntersectY = (ball.y - (activeY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8;
    ball.dx = Math.abs(ball.dx);
    ball.dy = bounceAngle * ball.baseSpeed;
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
    updateDifficulty();
    swapPending = true;
  }

  // Left wall = goal: the side that missed (opposite of turn) concedes; the other scores.
  if (ball.x - ball.radius < 0) {
    const scorer = (turn === 'player') ? 'computer' : 'player';
    if (scorer === 'player') playerScore++;
    else computerScore++;
    updateScore();
    checkWinCondition();
    if (!gamePaused) resetForNextRound(scorer);
  }
}

/**
 * Stops the game when either side reaches winningScore.
 */
function checkWinCondition() {
  if (playerScore >= winningScore || computerScore >= winningScore) {
    gameRunning = false;
    gamePaused = true;
  }
}

/**
 * Writes current player and computer scores to the DOM.
 */
function updateScore() {
  document.getElementById('player-score').textContent = playerScore;
  document.getElementById('computer-score').textContent = computerScore;
}

/**
 * RequestAnimationFrame loop: update (paddles and ball) then draw every frame.
 */
function gameLoop() {
  update();
  draw();
  animationFrame = requestAnimationFrame(gameLoop);
}

/**
 * Resumes from pause or starts a new game. If resuming after a win, resets
 * scores, turn, and swapPending, then calls init() before setting gameRunning.
 */
function startOrContinueGame() {
  if (gamePaused) {
    gamePaused = false;

    if (playerScore >= winningScore || computerScore >= winningScore) {

      playerScore = 0;
      computerScore = 0;
      updateScore();
      turn = 'player';
      swapPending = false;
      init();
    }

    gameRunning = true;
  } else if (!gameRunning && !gamePaused) {

    if (playerScore >= winningScore || computerScore >= winningScore) {
      playerScore = 0;
      computerScore = 0;
      updateScore();
    }
    gameRunning = true;
    gamePaused = false;
    turn = 'player';
    swapPending = false;
    init();
  }
}

/* -------------------------------------------------------------------------- */
/* Event listeners and startup                                                 */
/* -------------------------------------------------------------------------- */

window.addEventListener('unload', () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});

// Click to start/continue; ignore if user clicked the back button.
document.addEventListener('click', (e) => {
  if (e.target.closest('.back-button')) {
    return;
  }
  startOrContinueGame();
});

document.getElementById('back-button').addEventListener('click', () => {
  window.location.href = '../../popup/main-menu.html';
});

// Map mouse Y to canvas and clamp to paddle range.
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const mouseCanvasY = (e.clientY - rect.top) * scaleY;
  mouseY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseCanvasY - PADDLE_HEIGHT/2));
});

canvas.addEventListener('mouseenter', () => {
  canvas.style.cursor = 'none';
});

canvas.addEventListener('mouseleave', () => {
  canvas.style.cursor = 'default';
});

init();
gameLoop();
