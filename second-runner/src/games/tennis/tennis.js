// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = false;
let gamePaused = false;
let animationFrame;
let playerScore = 0;
let computerScore = 0;
let winningScore = 5; // First to 5 points wins

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
const BASE_COMPUTER_SPEED = 4;

// Ball
let ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: BASE_BALL_SPEED,
  dy: 3,
  radius: 5,
  baseSpeed: BASE_BALL_SPEED
};

// Keyboard controls (keep for pausing)
let keys = {
  Space: false
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
  
  // Randomize initial direction (left or right, slight vertical variation)
  ball.dx = (Math.random() > 0.5 ? BASE_BALL_SPEED : -BASE_BALL_SPEED);
  ball.dy = (Math.random() * 4) - 2; // between -2 and 2
}

// Reset for next match without full reinit
function resetForNextMatch() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  
  // Reset difficulty but keep scores
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  ball.baseSpeed = BASE_BALL_SPEED;
  
  // Ball goes toward the loser of last point for fairness
  // For simplicity, random direction
  ball.dx = (Math.random() > 0.5 ? BASE_BALL_SPEED : -BASE_BALL_SPEED);
  ball.dy = (Math.random() * 4) - 2;
  
  // Pause game until space is pressed
  gameRunning = false;
  gamePaused = true;
}

// Draw everything
function draw() {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw center line (dotted)
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  
  // Reset line dash
  ctx.setLineDash([]);
  
  // Draw paddles
  ctx.fillStyle = '#fff';
  
  // Player paddle (right side) - use mouseY instead of playerY
  ctx.fillRect(canvas.width - PADDLE_WIDTH - 10, mouseY, PADDLE_WIDTH, PADDLE_HEIGHT);
  
  // Computer paddle (left side)
  ctx.fillRect(10, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  
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
    
    if (playerScore >= winningScore || computerScore >= winningScore) {
      // Match ended
      const winnerText = playerScore >= winningScore ? 'PLAYER WINS!' : 'COMPUTER WINS!';
      ctx.fillText(winnerText, canvas.width / 2, canvas.height / 2 - 30);
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Press SPACE for next match', canvas.width / 2, canvas.height / 2 + 10);
    } else {
      // Point ended
      ctx.fillText('PRESS SPACE TO CONTINUE', canvas.width / 2, canvas.height / 2);
    }
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
  if (!gameRunning) return;
  
  // Update player paddle position based on mouse
  // Constrain to canvas bounds
  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY));
  
  // Computer AI - gets faster as difficulty increases
  const computerPaddleCenter = computerY + PADDLE_HEIGHT / 2;
  // Computer speed increases with difficulty (but not as much as ball)
  const computerSpeed = BASE_COMPUTER_SPEED * (1 + (currentSpeedMultiplier - 1) * 0.5);
  
  if (computerPaddleCenter < ball.y - 10) {
    computerY += computerSpeed;
  } else if (computerPaddleCenter > ball.y + 10) {
    computerY -= computerSpeed;
  }
  
  // Keep computer paddle in bounds
  computerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, computerY));
  
  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;
  
  // Ball collision with top/bottom walls
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.dy *= -1;
  }
  
  // Ball collision with paddles
  // Player paddle (right side) - use playerY but it's now synced with mouseY
  if (ball.x + ball.radius > canvas.width - PADDLE_WIDTH - 10 && 
      ball.x - ball.radius < canvas.width - 10 &&
      ball.y > playerY && 
      ball.y < playerY + PADDLE_HEIGHT) {
    
    // Calculate bounce angle based on where ball hits paddle
    const relativeIntersectY = (ball.y - (playerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8; // Max 80% angle
    
    ball.dx = -ball.dx; // Reverse horizontal direction
    ball.dy = bounceAngle * ball.baseSpeed; // Use baseSpeed for consistent feel
    
    // Ensure minimum speed
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
    
    // Increase difficulty on hit
    updateDifficulty();
  }
  
  // Computer paddle (left side)
  if (ball.x - ball.radius < 10 + PADDLE_WIDTH && 
      ball.x + ball.radius > 10 &&
      ball.y > computerY && 
      ball.y < computerY + PADDLE_HEIGHT) {
    
    const relativeIntersectY = (ball.y - (computerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8;
    
    ball.dx = -ball.dx;
    ball.dy = bounceAngle * ball.baseSpeed;
    
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
    
    // Increase difficulty on hit
    updateDifficulty();
  }
  
  // Check for scoring
  if (ball.x - ball.radius < 0) {
    // Computer missed, player scores
    playerScore++;
    updateScore();
    checkWinCondition();
    if (!gamePaused) resetForNextMatch();
  } else if (ball.x + ball.radius > canvas.width) {
    // Player missed, computer scores
    computerScore++;
    updateScore();
    checkWinCondition();
    if (!gamePaused) resetForNextMatch();
  }
}

// Check win condition without auto-reset
function checkWinCondition() {
  if (playerScore >= winningScore || computerScore >= winningScore) {
    gameRunning = false;
    gamePaused = true;
  }
}

// Reset ball after a point (now only used for initial setup)
function resetBall(scorer) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  
  // Ball goes toward the scorer
  if (scorer === 'player') {
    ball.dx = BASE_BALL_SPEED; // Toward computer
  } else {
    ball.dx = -BASE_BALL_SPEED; // Toward player
  }
  
  ball.dy = (Math.random() * 4) - 2;
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  ball.baseSpeed = BASE_BALL_SPEED;
}

// Update score display
function updateScore() {
  document.getElementById('player-score').textContent = playerScore;
  document.getElementById('computer-score').textContent = computerScore;
}

// Game loop
function gameLoop() {
  if (gameRunning) {
    update();
  }
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

// Keyboard events (now only for space)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault(); // Prevent page scrolling
    
    // Handle space for continuing match
    if (gamePaused) {
      gamePaused = false;
      
      if (playerScore >= winningScore || computerScore >= winningScore) {
        // Match ended, reset scores for new match
        playerScore = 0;
        computerScore = 0;
        updateScore();
        init();
      }
      
      gameRunning = true;
    }
  }
});

// Start button
document.getElementById('start-button').addEventListener('click', () => {
  if (!gameRunning && !gamePaused) {
    // Reset scores if starting fresh
    if (playerScore >= winningScore || computerScore >= winningScore) {
      playerScore = 0;
      computerScore = 0;
      updateScore();
    }
    gameRunning = true;
    gamePaused = false;
    init();
  }
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