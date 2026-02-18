// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = false;
let gamePaused = false;
let animationFrame;
let playerScore = 0;

// Rally counter for difficulty scaling
let rallyCount = 0;
const BASE_BALL_SPEED = 5;
const MAX_SPEED_MULTIPLIER = 2.5; // Max 2.5x speed
let currentSpeedMultiplier = 1;

// Paddle position (y coordinate)
let playerY = canvas.height / 2 - 40;

// Paddle constants
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;

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
  
  // Randomize initial direction (away from left wall, slight vertical variation)
  ball.dx = Math.abs(BASE_BALL_SPEED); // Always moving right initially
  ball.dy = (Math.random() * 4) - 2; // between -2 and 2
}

// Reset for next round
function resetForNextRound() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  
  // Reset difficulty but keep score
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  ball.baseSpeed = BASE_BALL_SPEED;
  
  // Ball goes away from left wall
  ball.dx = Math.abs(BASE_BALL_SPEED);
  ball.dy = (Math.random() * 4) - 2;
  
  // Pause game until user clicks
  gameRunning = false;
  gamePaused = true;
}

// Draw everything
function draw() {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw bounce zones (top, right, bottom walls)
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  // Top wall
  ctx.strokeRect(0, 0, canvas.width, 5);
  // Right wall
  ctx.strokeRect(canvas.width - 5, 0, 5, canvas.height);
  // Bottom wall
  ctx.strokeRect(0, canvas.height - 5, canvas.width, 5);
  ctx.lineWidth = 1;
  
  // Draw paddle
  ctx.fillStyle = '#fff';
  // Player paddle (left side)
  ctx.fillRect(10, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  
  // Draw ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  
  // Draw pause message if game is paused
  if (gamePaused && !gameRunning) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLICK TO CONTINUE', canvas.width / 2, canvas.height / 2);
  } else if (!gameRunning && !gamePaused) {
    // Draw start message if game hasn't started
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLICK TO START', canvas.width / 2, canvas.height / 2);
  }
  
  // Draw rally counter for difficulty feedback
  if (gameRunning && rallyCount > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
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
  // Update player paddle position based on mouse
  // Constrain to canvas bounds (allow movement even when game not running)
  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY));
  
  if (!gameRunning) return;
  
  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;
  
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
  
  // Ball collision with paddle (left side)
  if (ball.x - ball.radius < 10 + PADDLE_WIDTH && 
      ball.x + ball.radius > 10 &&
      ball.y > playerY && 
      ball.y < playerY + PADDLE_HEIGHT) {
    
    // Calculate bounce angle based on where ball hits paddle
    const relativeIntersectY = (ball.y - (playerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8; // Max 80% angle
    
    ball.dx = Math.abs(ball.dx); // Always bounce away from left wall
    ball.dy = bounceAngle * ball.baseSpeed;
    
    // Ensure minimum speed
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
    
    // Increase score on successful hit
    playerScore++;
    updateScore();
    
    // Increase difficulty on hit
    updateDifficulty();
  }
  
  // Check for game over (ball touches left wall)
  if (ball.x - ball.radius < 0) {
    // Player missed - game over, reset
    playerScore = 0;
    updateScore();
    resetForNextRound();
  }
}

// Update score display
function updateScore() {
  document.getElementById('player-score').textContent = playerScore;
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
    updateScore();
    gameRunning = true;
    gamePaused = false;
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
