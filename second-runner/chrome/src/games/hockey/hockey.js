/**
 * hockey.js
 * Single-player hockey: player and computer each control a goalie and a forward
 * paddle; puck bounces off top/bottom walls and off goal zones on the sides;
 * middle of each side is the goal. First to winningScore wins. Difficulty
 * (puck and computer speed) increases with rally count. Click to start/continue;
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
/* Rally-based difficulty (same pattern as tennis)                            */
/* -------------------------------------------------------------------------- */

let rallyCount = 0;
const BASE_PUCK_SPEED = 5;
let currentSpeedMultiplier = 1;

/* -------------------------------------------------------------------------- */
/* Paddles and puck                                                            */
/* -------------------------------------------------------------------------- */

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 40;
const BASE_COMPUTER_SPEED = 4;

// Player controls goalie and forward with same Y; computer mirrors on the other side.
let playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
const PLAYER_GOALIE_X = 40;
const COMPUTER_GOALIE_X = canvas.width - PADDLE_WIDTH - 40;
const CENTER_X = canvas.width / 2;
const DISTANCE_FROM_CENTER = (COMPUTER_GOALIE_X - CENTER_X) * 0.4;
const PLAYER_FORWARD_X = Math.floor(CENTER_X + DISTANCE_FROM_CENTER);

let computerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
const COMPUTER_FORWARD_X = Math.floor(CENTER_X - DISTANCE_FROM_CENTER);

// Side walls: top/bottom segments bounce; middle segment is the goal.
const BOUNCE_ZONE_TOP = 100;
const BOUNCE_ZONE_BOTTOM = 100;

let puck = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: BASE_PUCK_SPEED,
  dy: 3,
  radius: 5,
  baseSpeed: BASE_PUCK_SPEED
};

let mouseY = canvas.height / 2 - PADDLE_HEIGHT / 2;

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
 * Resets puck to center with random horizontal direction and resets difficulty.
 * Called on first load and when starting a new match after a win.
 */
function init() {
  puck.x = canvas.width / 2;
  puck.y = canvas.height / 2;
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  puck.baseSpeed = BASE_PUCK_SPEED;
  puck.dx = (Math.random() > 0.5 ? BASE_PUCK_SPEED : -BASE_PUCK_SPEED);
  puck.dy = (Math.random() * 4) - 2;
}

/**
 * Draws the rink (background, center line, blue lines, bounce zones), four
 * paddles, puck, and overlays (pause, start, win, rally counter).
 */
function draw() {
  ctx.fillStyle = theme.lightest;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cX = canvas.width / 2;
  const rinkW = canvas.width;
  const rinkH = canvas.height;

  // Center line and blue lines (dashed).
  ctx.strokeStyle = theme.dark;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(cX, 0);
  ctx.lineTo(cX, rinkH);
  ctx.stroke();
  const blueLineOffset = rinkW * 0.25;
  ctx.beginPath();
  ctx.moveTo(blueLineOffset, 0);
  ctx.lineTo(blueLineOffset, rinkH);
  ctx.moveTo(rinkW - blueLineOffset, 0);
  ctx.lineTo(rinkW - blueLineOffset, rinkH);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bounce zones on side walls (top and bottom segments; middle is goal).
  ctx.strokeStyle = theme.dark;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 5, BOUNCE_ZONE_TOP);
  ctx.strokeRect(0, canvas.height - BOUNCE_ZONE_BOTTOM, 5, BOUNCE_ZONE_BOTTOM);
  ctx.strokeRect(canvas.width - 5, 0, 5, BOUNCE_ZONE_TOP);
  ctx.strokeRect(canvas.width - 5, canvas.height - BOUNCE_ZONE_BOTTOM, 5, BOUNCE_ZONE_BOTTOM);
  ctx.lineWidth = 1;

  // Four paddles: player goalie and forward, computer goalie and forward.
  ctx.fillStyle = theme.darkest;
  ctx.fillRect(PLAYER_GOALIE_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(PLAYER_FORWARD_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(COMPUTER_GOALIE_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(COMPUTER_FORWARD_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);

  // Puck.
  ctx.beginPath();
  ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
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
 * Bumps rally count and speed multiplier (no cap), applies to puck velocity
 * while preserving direction. Called on each paddle deflection.
 */
function updateDifficulty() {
  rallyCount++;
  currentSpeedMultiplier = 1 + (Math.floor(rallyCount / 2) * 0.1);
  const directionX = puck.dx > 0 ? 1 : -1;
  const directionY = puck.dy > 0 ? 1 : -1;
  puck.baseSpeed = BASE_PUCK_SPEED * currentSpeedMultiplier;
  puck.dx = directionX * puck.baseSpeed;
  puck.dy = Math.abs(puck.dy) * directionY;
}

/**
 * If puck overlaps the given paddle rect: when allowDeflection is true, bounce
 * and call updateDifficulty(); otherwise no effect (forward only deflects when
 * puck is moving toward our goal). Returns true if a collision occurred.
 *
 * @param {number} paddleX - Left edge of paddle.
 * @param {number} paddleY - Top edge of paddle.
 * @param {number} paddleWidth - Paddle width.
 * @param {number} paddleHeight - Paddle height.
 * @param {boolean} [allowDeflection=true] - If false, overlap is ignored for deflection.
 * @returns {boolean}
 */
function checkPaddleCollision(paddleX, paddleY, paddleWidth, paddleHeight, allowDeflection = true) {
  if (puck.x + puck.radius > paddleX &&
      puck.x - puck.radius < paddleX + paddleWidth &&
      puck.y + puck.radius > paddleY &&
      puck.y - puck.radius < paddleY + paddleHeight) {
    if (!allowDeflection) {
      return false;
    }
    // Remember which face we hit so we can resolve position and avoid getting stuck inside the paddle.
    const wasMovingRight = puck.dx > 0;
    const relativeIntersectY = (puck.y - (paddleY + paddleHeight/2)) / (paddleHeight/2);
    const bounceAngle = relativeIntersectY * 0.8;
    puck.dx = -puck.dx;
    puck.dy = bounceAngle * puck.baseSpeed;
    if (Math.abs(puck.dy) < 1.5) {
      puck.dy = puck.dy > 0 ? 1.5 : -1.5;
    }
    // Move puck outside the paddle so it doesn't overlap next frame and bounce again.
    if (wasMovingRight) {
      puck.x = paddleX - puck.radius;
    } else {
      puck.x = paddleX + paddleWidth + puck.radius;
    }
    updateDifficulty();
    return true;
  }
  return false;
}

/**
 * Moves player and computer paddles, puck; handles paddle collisions (with
 * deflection rules), top/bottom wall bounces, and side walls (bounce zones vs goal).
 */
function update() {
  // Player paddles follow mouse, clamped to canvas.
  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY));
  if (!gameRunning) return;

  // Computer AI: move both paddles toward puck with speed that scales with difficulty.
  const computerPaddleCenter = computerY + PADDLE_HEIGHT / 2;
  const computerSpeed = BASE_COMPUTER_SPEED * (1 + (currentSpeedMultiplier - 1) * 0.5);
  if (computerPaddleCenter < puck.y - 10) {
    computerY += computerSpeed;
  } else if (computerPaddleCenter > puck.y + 10) {
    computerY -= computerSpeed;
  }
  computerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, computerY));

  puck.x += puck.dx;
  puck.y += puck.dy;

  // Top and bottom walls: reflect vertical velocity.
  if (puck.y - puck.radius < 0 || puck.y + puck.radius > canvas.height) {
    puck.dy *= -1;
  }

  // Paddle collisions: goalies always deflect; forwards only when puck moves toward our goal.
  if (checkPaddleCollision(PLAYER_GOALIE_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, true)) {
  } else if (checkPaddleCollision(PLAYER_FORWARD_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, puck.dx < 0)) {
  } else if (checkPaddleCollision(COMPUTER_GOALIE_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT, true)) {
  } else if (checkPaddleCollision(COMPUTER_FORWARD_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT, puck.dx > 0)) {
  }

  // Left wall: bounce in top/bottom zones; goal (computer scores) in middle.
  if (puck.x - puck.radius < 0) {
    if (puck.y < BOUNCE_ZONE_TOP || puck.y > canvas.height - BOUNCE_ZONE_BOTTOM) {
      puck.dx *= -1;
      puck.x = puck.radius;
    } else {
      computerScore++;
      updateScore();
      checkWinCondition();
      if (!gamePaused) resetForNextMatch();
    }
  } else if (puck.x + puck.radius > canvas.width) {
    if (puck.y < BOUNCE_ZONE_TOP || puck.y > canvas.height - BOUNCE_ZONE_BOTTOM) {
      puck.dx *= -1;
      puck.x = canvas.width - puck.radius;
    } else {
      playerScore++;
      updateScore();
      checkWinCondition();
      if (!gamePaused) resetForNextMatch();
    }
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
 * Resets puck and difficulty for the next point; pauses until user clicks.
 * Used after a goal; overlay is drawn until click.
 */
function resetForNextMatch() {
  puck.x = canvas.width / 2;
  puck.y = canvas.height / 2;
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  puck.baseSpeed = BASE_PUCK_SPEED;
  puck.dx = (Math.random() > 0.5 ? BASE_PUCK_SPEED : -BASE_PUCK_SPEED);
  puck.dy = (Math.random() * 4) - 2;
  gameRunning = false;
  gamePaused = true;
}

/**
 * RequestAnimationFrame loop: update (paddle and puck) then draw every frame.
 */
function gameLoop() {
  update();
  draw();
  animationFrame = requestAnimationFrame(gameLoop);
}

/**
 * Resumes from pause or starts a new game. If resuming after a win, resets
 * scores and calls init() before setting gameRunning.
 */
function startOrContinueGame() {
  if (gamePaused) {
    gamePaused = false;

    if (playerScore >= winningScore || computerScore >= winningScore) {

      playerScore = 0;
      computerScore = 0;
      updateScore();
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
    init();
  }
}

/* -------------------------------------------------------------------------- */
/* Event listeners and startup                                                 */
/* -------------------------------------------------------------------------- */

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

init();
gameLoop();

window.addEventListener('unload', () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});
