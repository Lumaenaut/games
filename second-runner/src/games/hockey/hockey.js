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
const BASE_PUCK_SPEED = 5;
const MAX_SPEED_MULTIPLIER = 2.5; // Max 2.5x speed
let currentSpeedMultiplier = 1;

// Paddle constants
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 40;
const BASE_COMPUTER_SPEED = 4;

// Player paddles (both mirror each other - same Y position)
let playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
// Player goalie (near left goal, moved closer to center)
const PLAYER_GOALIE_X = 40;
// Player forward (on right side, symmetrical distance from center)
const COMPUTER_GOALIE_X = canvas.width - PADDLE_WIDTH - 40;
const CENTER_X = canvas.width / 2;
// Move forward paddles a third closer to center (from 60% to 40% of distance from center to goalie)
const DISTANCE_FROM_CENTER = (COMPUTER_GOALIE_X - CENTER_X) * 0.4; // 40% of distance from center to goalie
const PLAYER_FORWARD_X = Math.floor(CENTER_X + DISTANCE_FROM_CENTER); // Right side, closer to center

// Computer paddles (both mirror each other - same Y position)
let computerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
// Computer goalie (near right goal, moved closer to center)
// Computer forward (on left side, symmetrical distance from center)
const COMPUTER_FORWARD_X = Math.floor(CENTER_X - DISTANCE_FROM_CENTER); // Left side, same distance from center

// Bounce zones on side walls (where puck bounces instead of scoring)
// Top and bottom sections of side walls bounce, middle section scores
const BOUNCE_ZONE_TOP = 100; // Top section height (larger = smaller scoring zone)
const BOUNCE_ZONE_BOTTOM = 100; // Bottom section height (larger = smaller scoring zone)

// Puck
let puck = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: BASE_PUCK_SPEED,
  dy: 3,
  radius: 5,
  baseSpeed: BASE_PUCK_SPEED
};

// Mouse tracking (Y coordinate - controls both player paddles)
let mouseY = canvas.height / 2 - PADDLE_HEIGHT / 2;

// Track if mouse is inside canvas
let mouseInsideCanvas = false;

function init() {
  // Reset puck position and direction
  puck.x = canvas.width / 2;
  puck.y = canvas.height / 2;
  
  // Reset difficulty
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  puck.baseSpeed = BASE_PUCK_SPEED;
  
  // Randomize initial direction (left or right, slight vertical variation)
  puck.dx = (Math.random() > 0.5 ? BASE_PUCK_SPEED : -BASE_PUCK_SPEED);
  puck.dy = (Math.random() * 4) - 2; // between -2 and 2
}

// Reset for next match without full reinit
function resetForNextMatch() {
  puck.x = canvas.width / 2;
  puck.y = canvas.height / 2;
  
  // Reset difficulty but keep scores
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  puck.baseSpeed = BASE_PUCK_SPEED;
  
  // Puck goes toward the loser of last point for fairness
  // For simplicity, random direction
  puck.dx = (Math.random() > 0.5 ? BASE_PUCK_SPEED : -BASE_PUCK_SPEED);
  puck.dy = (Math.random() * 4) - 2;
  
  // Pause game until user clicks
  gameRunning = false;
  gamePaused = true;
}

// Draw everything
function draw() {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw center line (vertical, dotted)
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  
  // Reset line dash
  ctx.setLineDash([]);
  
  // Draw bounce zones on side walls (scoring zone is invisible - gap between bounce zones)
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  // Left wall - bounce zones (top and bottom)
  ctx.strokeRect(0, 0, 5, BOUNCE_ZONE_TOP);
  ctx.strokeRect(0, canvas.height - BOUNCE_ZONE_BOTTOM, 5, BOUNCE_ZONE_BOTTOM);
  // Right wall - bounce zones (top and bottom)
  ctx.strokeRect(canvas.width - 5, 0, 5, BOUNCE_ZONE_TOP);
  ctx.strokeRect(canvas.width - 5, canvas.height - BOUNCE_ZONE_BOTTOM, 5, BOUNCE_ZONE_BOTTOM);
  ctx.lineWidth = 1;
  
  // Draw paddles
  ctx.fillStyle = '#fff';
  
  // Player paddles (both mirror each other - same Y)
  // Player goalie (left side, near goal)
  ctx.fillRect(PLAYER_GOALIE_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  // Player forward (right side, midway between center and computer goalie)
  ctx.fillRect(PLAYER_FORWARD_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  
  // Computer paddles (both mirror each other - same Y)
  // Computer goalie (right side, near goal)
  ctx.fillRect(COMPUTER_GOALIE_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  // Computer forward (left side, midway between center and player goalie)
  ctx.fillRect(COMPUTER_FORWARD_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  
  // Draw puck
  ctx.beginPath();
  ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
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
      ctx.fillText('Click for next match', canvas.width / 2, canvas.height / 2 + 10);
    } else {
      // Point ended
      ctx.fillText('CLICK TO CONTINUE', canvas.width / 2, canvas.height / 2);
    }
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
  
  // Apply to puck speed (preserve direction)
  const directionX = puck.dx > 0 ? 1 : -1;
  const directionY = puck.dy > 0 ? 1 : -1;
  
  puck.baseSpeed = BASE_PUCK_SPEED * currentSpeedMultiplier;
  puck.dx = directionX * puck.baseSpeed;
  puck.dy = Math.abs(puck.dy) * directionY;
}

// Check collision with paddle
function checkPaddleCollision(paddleX, paddleY, paddleWidth, paddleHeight, allowDeflection = true) {
  if (puck.x + puck.radius > paddleX && 
      puck.x - puck.radius < paddleX + paddleWidth &&
      puck.y + puck.radius > paddleY && 
      puck.y - puck.radius < paddleY + paddleHeight) {
    
    // If deflection not allowed, paddle doesn't affect puck
    if (!allowDeflection) {
      return false;
    }
    
    // Calculate bounce angle based on where puck hits paddle
    const relativeIntersectY = (puck.y - (paddleY + paddleHeight/2)) / (paddleHeight/2);
    const bounceAngle = relativeIntersectY * 0.8; // Max 80% angle
    
    // Reverse horizontal direction
    puck.dx = -puck.dx;
    puck.dy = bounceAngle * puck.baseSpeed;
    
    // Ensure minimum speed
    if (Math.abs(puck.dy) < 1.5) {
      puck.dy = puck.dy > 0 ? 1.5 : -1.5;
    }
    
    // Increase difficulty on hit
    updateDifficulty();
    return true;
  }
  return false;
}

// Update game logic
function update() {
  // Update player paddle positions (both mirror each other - same Y)
  // Constrain to canvas bounds (allow movement even when game not running)
  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY));
  
  if (!gameRunning) return;
  
  // Computer AI - gets faster as difficulty increases
  const computerPaddleCenter = computerY + PADDLE_HEIGHT / 2;
  // Computer speed increases with difficulty (but not as much as puck)
  const computerSpeed = BASE_COMPUTER_SPEED * (1 + (currentSpeedMultiplier - 1) * 0.5);
  
  if (computerPaddleCenter < puck.y - 10) {
    computerY += computerSpeed;
  } else if (computerPaddleCenter > puck.y + 10) {
    computerY -= computerSpeed;
  }
  
  // Keep computer paddle in bounds
  computerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, computerY));
  
  // Move puck
  puck.x += puck.dx;
  puck.y += puck.dy;
  
  // Puck collision with top/bottom walls
  if (puck.y - puck.radius < 0 || puck.y + puck.radius > canvas.height) {
    puck.dy *= -1;
  }
  
  // Puck collision with paddles
  // Player goalie (left side, near goal) - always deflects
  if (checkPaddleCollision(PLAYER_GOALIE_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, true)) {
    // Collision handled in function
  }
  // Player forward (right side) - only deflects when puck moving away from computer goal (left)
  else if (checkPaddleCollision(PLAYER_FORWARD_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, puck.dx < 0)) {
    // Collision handled in function
  }
  // Computer goalie (right side, near goal) - always deflects
  else if (checkPaddleCollision(COMPUTER_GOALIE_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT, true)) {
    // Collision handled in function
  }
  // Computer forward (left side) - only deflects when puck moving away from player goal (right)
  else if (checkPaddleCollision(COMPUTER_FORWARD_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT, puck.dx > 0)) {
    // Collision handled in function
  }
  
  // Check for scoring and wall bounces
  // Left wall
  if (puck.x - puck.radius < 0) {
    // Check if puck is in bounce zone (top or bottom) or scoring zone (middle)
    if (puck.y < BOUNCE_ZONE_TOP || puck.y > canvas.height - BOUNCE_ZONE_BOTTOM) {
      // Bounce zone - puck bounces off wall
      puck.dx *= -1;
      puck.x = puck.radius;
    } else {
      // Scoring zone (middle section) - computer scores
      computerScore++;
      updateScore();
      checkWinCondition();
      if (!gamePaused) resetForNextMatch();
    }
  }
  // Right wall
  else if (puck.x + puck.radius > canvas.width) {
    // Check if puck is in bounce zone (top or bottom) or scoring zone (middle)
    if (puck.y < BOUNCE_ZONE_TOP || puck.y > canvas.height - BOUNCE_ZONE_BOTTOM) {
      // Bounce zone - puck bounces off wall
      puck.dx *= -1;
      puck.x = canvas.width - puck.radius;
    } else {
      // Scoring zone (middle section) - player scores
      playerScore++;
      updateScore();
      checkWinCondition();
      if (!gamePaused) resetForNextMatch();
    }
  }
}

// Check win condition without auto-reset
function checkWinCondition() {
  if (playerScore >= winningScore || computerScore >= winningScore) {
    gameRunning = false;
    gamePaused = true;
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

// Mouse event listeners (track vertical movement for both paddles)
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const mouseCanvasY = (e.clientY - rect.top) * scaleY;
  
  // Update mouseY position, constrained to paddle height
  // This controls both player paddles (goalie and forward)
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
    
    if (playerScore >= winningScore || computerScore >= winningScore) {
      // Match ended, reset scores for new match
      playerScore = 0;
      computerScore = 0;
      updateScore();
      init();
    }
    
    gameRunning = true;
  } else if (!gameRunning && !gamePaused) {
    // Starting fresh
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
