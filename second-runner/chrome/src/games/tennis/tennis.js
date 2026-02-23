/**
 * tennis.js
 * Single-player tennis: player vs computer paddles, ball bounces off top/bottom walls.
 * First to winningScore points wins. Difficulty (ball and computer speed) increases with
 * rally count and starts at INITIAL_SPEED_MULTIPLIER. Click to start/continue; back
 * button returns to main menu.
 */

/* -------------------------------------------------------------------------- */
/* Canvas and DOM                                                             */
/* -------------------------------------------------------------------------- */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

/* -------------------------------------------------------------------------- */
/* Game state flags and scores                                                */
/* -------------------------------------------------------------------------- */

let gameRunning = false;
let gamePaused = false;
let animationFrame;
let playerScore = 0;
let computerScore = 0;
let winningScore = 5;

/* -------------------------------------------------------------------------- */
/* Rally-based difficulty (speed increases with consecutive hits)              */
/* -------------------------------------------------------------------------- */

let rallyCount = 0;
const BASE_BALL_SPEED = 5;
/** Game starts at this multiplier so it feels challenging sooner (1 = original). Speed increases with rally, no cap. */
const INITIAL_SPEED_MULTIPLIER = 1.7;
let currentSpeedMultiplier = INITIAL_SPEED_MULTIPLIER;

/* -------------------------------------------------------------------------- */
/* Paddles and ball                                                            */
/* -------------------------------------------------------------------------- */

// Player paddle Y (follows mouse); computer paddle Y (AI).
let playerY = canvas.height / 2 - 40;
let computerY = canvas.height / 2 - 40;

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BASE_COMPUTER_SPEED = 4;

// Ball: position, velocity (dx/dy), radius, and base speed (scaled by difficulty).
let ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: BASE_BALL_SPEED,
  dy: 3,
  radius: 5,
  baseSpeed: BASE_BALL_SPEED
};

// Mouse Y mapped to canvas (clamped to paddle range); used when cursor is inside canvas.
let mouseY = canvas.height / 2 - 40;

/**
 * Reads the four-color greyscale palette from CSS custom properties on the document.
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
 * Resets ball to center and gives it a random horizontal direction and slight
 * vertical variation. Resets rally count and applies INITIAL_SPEED_MULTIPLIER.
 */
function init() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;

  rallyCount = 0;
  currentSpeedMultiplier = INITIAL_SPEED_MULTIPLIER;
  ball.baseSpeed = BASE_BALL_SPEED * currentSpeedMultiplier;

  ball.dx = (Math.random() > 0.5 ? ball.baseSpeed : -ball.baseSpeed);
  ball.dy = (Math.random() * 4) - 2;
}

/**
 * Draws the court (background, center line), paddles, ball, and overlays.
 * Overlays: pause (winner or "CLICK TO CONTINUE"), start ("CLICK TO START"),
 * and when running a rally counter with speed multiplier in the top-right.
 */
function draw() {
  ctx.fillStyle = theme.lightest;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Center line (dashed).
  ctx.strokeStyle = theme.dark;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Player (left) and computer (right) paddles.
  ctx.fillStyle = theme.darkest;
  ctx.fillRect(10, mouseY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(canvas.width - PADDLE_WIDTH - 10, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);

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

  // Rally counter and speed multiplier (subtle, top-right) when game is running.
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
 * Increases rally count, bumps speed multiplier (no cap), and applies it to ball
 * velocity while preserving direction. Base is INITIAL_SPEED_MULTIPLIER so first
 * hit doesn't drop speed. Called on each paddle hit.
 */
function updateDifficulty() {
  rallyCount++;
  currentSpeedMultiplier = INITIAL_SPEED_MULTIPLIER + (Math.floor(rallyCount / 2) * 0.1);
  const directionX = ball.dx > 0 ? 1 : -1;
  const directionY = ball.dy > 0 ? 1 : -1;
  ball.baseSpeed = BASE_BALL_SPEED * currentSpeedMultiplier;
  ball.dx = directionX * ball.baseSpeed;
  ball.dy = Math.abs(ball.dy) * directionY;
}

/**
 * Moves paddles and ball, handles top/bottom wall bounces, paddle bounces
 * (with angle and difficulty bump), and scoring when ball leaves left or right.
 */
function update() {
  if (!gameRunning) return;

  // Player paddle follows mouse, clamped to canvas.
  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY));

  // Computer AI: move toward ball with speed that scales with current difficulty.
  const computerPaddleCenter = computerY + PADDLE_HEIGHT / 2;
  const computerSpeed = BASE_COMPUTER_SPEED * (1 + (currentSpeedMultiplier - 1) * 0.5);
  if (computerPaddleCenter < ball.y - 10) {
    computerY += computerSpeed;
  } else if (computerPaddleCenter > ball.y + 10) {
    computerY -= computerSpeed;
  }
  computerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, computerY));

  ball.x += ball.dx;
  ball.y += ball.dy;

  // Top and bottom walls: reflect vertical velocity.
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.dy *= -1;
  }

  // Player paddle (left): AABB overlap then angle-based bounce and difficulty bump.
  if (ball.x - ball.radius < 10 + PADDLE_WIDTH &&
      ball.x + ball.radius > 10 &&
      ball.y > playerY &&
      ball.y < playerY + PADDLE_HEIGHT) {
    const wasMovingRight = ball.dx > 0;
    const relativeIntersectY = (ball.y - (playerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8;
    ball.dx = -ball.dx;
    ball.dy = bounceAngle * ball.baseSpeed;
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
    // Move ball outside paddle so it doesn't overlap next frame and bounce again.
    if (wasMovingRight) {
      ball.x = 10 - ball.radius;
    } else {
      ball.x = 10 + PADDLE_WIDTH + ball.radius;
    }
    updateDifficulty();
  }

  // Computer paddle (right): same bounce logic and position resolve.
  if (ball.x + ball.radius > canvas.width - PADDLE_WIDTH - 10 &&
      ball.x - ball.radius < canvas.width - 10 &&
      ball.y > computerY &&
      ball.y < computerY + PADDLE_HEIGHT) {
    const wasMovingRight = ball.dx > 0;
    const relativeIntersectY = (ball.y - (computerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8;
    ball.dx = -ball.dx;
    ball.dy = bounceAngle * ball.baseSpeed;
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
    // Resolve: after bounce, ball is either left or right of the computer paddle.
    if (wasMovingRight) {
      ball.x = canvas.width - 10 - PADDLE_WIDTH - ball.radius;
    } else {
      ball.x = canvas.width - 10 + ball.radius;
    }
    updateDifficulty();
  }

  // Scoring: ball past left edge = computer scores; past right = player scores.
  if (ball.x - ball.radius < 0) {
    computerScore++;
    updateScore();
    checkWinCondition();
    if (!gamePaused) resetForNextMatch();
  } else if (ball.x + ball.radius > canvas.width) {
    playerScore++;
    updateScore();
    checkWinCondition();
    if (!gamePaused) resetForNextMatch();
  }
}

/**
 * Stops the game and shows win overlay when either side reaches winningScore.
 */
function checkWinCondition() {
  if (playerScore >= winningScore || computerScore >= winningScore) {
    gameRunning = false;
    gamePaused = true;
  }
}

/**
 * Writes current player and computer scores to the DOM elements.
 */
function updateScore() {
  document.getElementById('player-score').textContent = playerScore;
  document.getElementById('computer-score').textContent = computerScore;
}

/**
 * Resets ball and difficulty for the next point; pauses until user clicks to continue.
 * Used after a goal; gameLoop keeps drawing the overlay until the user clicks.
 */
function resetForNextMatch() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;

  rallyCount = 0;
  currentSpeedMultiplier = INITIAL_SPEED_MULTIPLIER;
  ball.baseSpeed = BASE_BALL_SPEED * currentSpeedMultiplier;

  ball.dx = (Math.random() > 0.5 ? ball.baseSpeed : -ball.baseSpeed);
  ball.dy = (Math.random() * 4) - 2;

  gameRunning = false;
  gamePaused = true;
}

/**
 * RequestAnimationFrame loop: update when game is running, then draw every frame.
 */
function gameLoop() {
  if (gameRunning) {
    update();
  }
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

// Map mouse Y to canvas Y and clamp to paddle range.
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
