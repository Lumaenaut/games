// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = false;
let gamePaused = false;
let animationFrame;
let playerScore = 0;
let computerScore = 0;

// Rally counter for difficulty scaling
let rallyCount = 0;
const BASE_BALL_SPEED = 5;
const MAX_SPEED_MULTIPLIER = 2.5; // Max 2.5x speed
let currentSpeedMultiplier = 1;

// Paddle positions (y coordinate)
let playerY = canvas.height / 2 - 40;
let computerY = canvas.height / 2 - 40;

// Paddle constants
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;

// Both paddles are on the left; "forwardness" indicates whose turn it is
const BACK_X = 10;
const FORWARD_X = 28;
let turn = 'player'; // 'player' | 'computer'
let swapPending = false;

// Ball
let ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: BASE_BALL_SPEED,
  dy: 3,
  radius: 5,
  baseSpeed: BASE_BALL_SPEED
};

// Mouse tracking
let mouseY = canvas.height / 2 - 40;

// Track if mouse is inside canvas
let mouseInsideCanvas = false;

function init() {
  // Reset ball position and direction
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  
  // Reset difficulty
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  ball.baseSpeed = BASE_BALL_SPEED;
  
  // Start by sending the ball away from the left wall
  ball.dx = Math.abs(BASE_BALL_SPEED); // Always moving right initially
  ball.dy = (Math.random() * 4) - 2; // between -2 and 2
}

function resetForNextRound(nextTurn) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  
  // Reset difficulty but keep score
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  ball.baseSpeed = BASE_BALL_SPEED;
  
  // Ball goes away from left wall
  ball.dx = Math.abs(BASE_BALL_SPEED);
  ball.dy = (Math.random() * 4) - 2;

  turn = nextTurn;
  swapPending = false;
  
  // Pause game until user clicks
  gameRunning = false;
  gamePaused = true;
}

// Draw everything
function draw() {
  // Clear canvas
  ctx.fillStyle = '#eaeaea';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw bounce zones (top, right, bottom walls)
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  // Top wall
  ctx.strokeRect(0, 0, canvas.width, 5);
  // Right wall
  ctx.strokeRect(canvas.width - 5, 0, 5, canvas.height);
  // Bottom wall
  ctx.strokeRect(0, canvas.height - 5, canvas.width, 5);
  ctx.lineWidth = 1;
  
  const playerX = (turn === 'player' ? FORWARD_X : BACK_X);
  const compX = (turn === 'computer' ? FORWARD_X : BACK_X);

  // Draw paddles (both left side, different grey levels)
  ctx.fillStyle = '#000'; // player: black
  ctx.fillRect(playerX, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);

  ctx.fillStyle = '#777'; // computer: grayer
  ctx.fillRect(compX, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  
  // Draw ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();
  
  // Draw pause message if game is paused
  if (gamePaused && !gameRunning) {
    ctx.fillStyle = 'rgba(234, 234, 234, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#111';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLICK TO CONTINUE', canvas.width / 2, canvas.height / 2);
  } else if (!gameRunning && !gamePaused) {
    // Draw start message if game hasn't started
    ctx.fillStyle = 'rgba(234, 234, 234, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#111';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLICK TO START', canvas.width / 2, canvas.height / 2);
  }
  
  // Draw rally counter for difficulty feedback
  if (gameRunning && rallyCount > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Rally: ${rallyCount} x${currentSpeedMultiplier.toFixed(1)}`, canvas.width - 20, 30);
  }
}

// Update difficulty based on rally count
function updateDifficulty() {
  // Increase rally count on each hit
  rallyCount++;
  
  // Calculate speed multiplier (caps at MAX_SPEED_MULTIPLIER)
  // Increases by 0.1 every 2 hits, max 2.5x
  currentSpeedMultiplier = Math.min(1 + (Math.floor(rallyCount / 2) * 0.1), MAX_SPEED_MULTIPLIER);
  
  // Apply to ball speed (preserve direction)
  const directionX = ball.dx > 0 ? 1 : -1;
  const directionY = ball.dy > 0 ? 1 : -1;
  
  ball.baseSpeed = BASE_BALL_SPEED * currentSpeedMultiplier;
  ball.dx = directionX * ball.baseSpeed;
  ball.dy = Math.abs(ball.dy) * directionY;
}

// Update game logic
function update() {
  // Update paddle positions (allow movement even when game not running)
  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY));

  // Simple computer AI: tracks the ball during play, recenters otherwise
  const computerTargetY = gameRunning ? (ball.y - PADDLE_HEIGHT / 2) : (canvas.height / 2 - PADDLE_HEIGHT / 2);
  const computerSpeed = gameRunning ? 4 : 2;
  if (computerY < computerTargetY) computerY += computerSpeed;
  if (computerY > computerTargetY) computerY -= computerSpeed;
  computerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, computerY));
  
  if (!gameRunning) return;
  
  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // After a hit, swap forwardness when the ball reaches mid-court going right
  if (swapPending && ball.dx > 0 && ball.x >= canvas.width / 2) {
    turn = (turn === 'player' ? 'computer' : 'player');
    swapPending = false;
  }
  
  // Ball collision with top wall (bounces)
  if (ball.y - ball.radius < 0) {
    ball.dy *= -1;
    ball.y = ball.radius;
  }
  
  // Ball collision with bottom wall (bounces)
  if (ball.y + ball.radius > canvas.height) {
    ball.dy *= -1;
    ball.y = canvas.height - ball.radius;
  }
  
  // Ball collision with right wall (bounces)
  if (ball.x + ball.radius > canvas.width) {
    ball.dx *= -1;
    ball.x = canvas.width - ball.radius;
  }
  
  const playerX = (turn === 'player' ? FORWARD_X : BACK_X);
  const compX = (turn === 'computer' ? FORWARD_X : BACK_X);
  const activeX = (turn === 'player' ? playerX : compX);
  const activeY = (turn === 'player' ? playerY : computerY);

  // Active paddle collision (only the forward/turn paddle can deflect)
  if (ball.dx < 0 &&
      ball.x - ball.radius < activeX + PADDLE_WIDTH && 
      ball.x + ball.radius > activeX &&
      ball.y > activeY && 
      ball.y < activeY + PADDLE_HEIGHT) {
    
    // Calculate bounce angle based on where ball hits paddle
    const relativeIntersectY = (ball.y - (activeY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8; // Max 80% angle
    
    ball.dx = Math.abs(ball.dx); // Always bounce away from left wall
    ball.dy = bounceAngle * ball.baseSpeed;
    
    // Ensure minimum speed
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
    
    // Increase difficulty on hit
    updateDifficulty();

    // Swap will occur once the ball reaches mid-court
    swapPending = true;
  }
  
  // Point scored if ball touches left wall (active player missed)
  if (ball.x - ball.radius < 0) {
    const scorer = (turn === 'player') ? 'computer' : 'player';
    if (scorer === 'player') playerScore++;
    else computerScore++;
    updateScore();
    resetForNextRound(scorer);
  }
}

// Update score display
function updateScore() {
  document.getElementById('player-score').textContent = playerScore;
  document.getElementById('computer-score').textContent = computerScore;
}

// Game loop
function gameLoop() {
  update(); // Always update (for paddle movement even when game not running)
  draw();
  animationFrame = requestAnimationFrame(gameLoop);
}

// Mouse event listeners
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const mouseCanvasY = (e.clientY - rect.top) * scaleY;
  
  // Update mouseY position, constrained to paddle height
  mouseY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseCanvasY - PADDLE_HEIGHT/2));
});

canvas.addEventListener('mouseenter', () => {
  mouseInsideCanvas = true;
  canvas.style.cursor = 'none'; // Hide cursor when over canvas
});

canvas.addEventListener('mouseleave', () => {
  mouseInsideCanvas = false;
  canvas.style.cursor = 'default'; // Show cursor when leaving canvas
});

// Function to start or continue the game
function startOrContinueGame() {
  if (gamePaused) {
    gamePaused = false;
    gameRunning = true;
  } else if (!gameRunning && !gamePaused) {
    // Starting fresh
    playerScore = 0;
    computerScore = 0;
    updateScore();
    gameRunning = true;
    gamePaused = false;
    turn = 'player';
    swapPending = false;
    init();
  }
}

// Click anywhere to start/continue (except on back button)
document.addEventListener('click', (e) => {
  // Don't start game if clicking the back button
  if (e.target.closest('.back-button')) {
    return;
  }
  
  startOrContinueGame();
});

// Back button
document.getElementById('back-button').addEventListener('click', () => {
  window.location.href = '../../popup/main-menu.html';
});

// Initialize game on load
init();
gameLoop();

// Clean up animation frame when leaving
window.addEventListener('unload', () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});
