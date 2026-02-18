// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = false;
let animationFrame;
let playerScore = 0;
let computerScore = 0;
let winningScore = 5; // First to 5 points wins

// Paddle positions (y coordinate)
let playerY = canvas.height / 2 - 40;
let computerY = canvas.height / 2 - 40;

// Paddle constants
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const PLAYER_SPEED = 8;

// Ball
let ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: 5,
  dy: 3,
  radius: 5
};

// Keyboard controls
let keys = {
  ArrowUp: false,
  ArrowDown: false
};

function init() {
  // Reset ball position and direction
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  
  // Randomize initial direction (left or right, slight vertical variation)
  ball.dx = (Math.random() > 0.5 ? 5 : -5);
  ball.dy = (Math.random() * 4) - 2; // between -2 and 2
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
  
  // Player paddle (right side)
  ctx.fillRect(canvas.width - PADDLE_WIDTH - 10, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  
  // Computer paddle (left side)
  ctx.fillRect(10, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  
  // Draw ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

// Update game logic
function update() {
  if (!gameRunning) return;
  
  // Move player paddle
  if (keys.ArrowUp && playerY > 0) {
    playerY -= PLAYER_SPEED;
  }
  if (keys.ArrowDown && playerY < canvas.height - PADDLE_HEIGHT) {
    playerY += PLAYER_SPEED;
  }
  
  // Computer AI - simple tracking of ball
  const computerPaddleCenter = computerY + PADDLE_HEIGHT / 2;
  const computerSpeed = 4; // Slightly slower than player for fairness
  
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
  // Player paddle (right side)
  if (ball.x + ball.radius > canvas.width - PADDLE_WIDTH - 10 && 
      ball.x - ball.radius < canvas.width - 10 &&
      ball.y > playerY && 
      ball.y < playerY + PADDLE_HEIGHT) {
    
    // Calculate bounce angle based on where ball hits paddle
    const relativeIntersectY = (ball.y - (playerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8; // Max 80% angle
    
    ball.dx = -ball.dx; // Reverse horizontal direction
    ball.dy = bounceAngle * 5; // New vertical speed based on hit position
    
    // Ensure minimum speed
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
  }
  
  // Computer paddle (left side)
  if (ball.x - ball.radius < 10 + PADDLE_WIDTH && 
      ball.x + ball.radius > 10 &&
      ball.y > computerY && 
      ball.y < computerY + PADDLE_HEIGHT) {
    
    const relativeIntersectY = (ball.y - (computerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8;
    
    ball.dx = -ball.dx;
    ball.dy = bounceAngle * 5;
    
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
  }
  
  // Check for scoring
  if (ball.x - ball.radius < 0) {
    // Computer missed, player scores
    playerScore++;
    updateScore();
    resetBall('player');
  } else if (ball.x + ball.radius > canvas.width) {
    // Player missed, computer scores
    computerScore++;
    updateScore();
    resetBall('computer');
  }
}

// Reset ball after a point
function resetBall(scorer) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  
  // Ball goes toward the scorer (makes it more exciting)
  if (scorer === 'player') {
    ball.dx = 5; // Toward computer
  } else {
    ball.dx = -5; // Toward player
  }
  
  ball.dy = (Math.random() * 4) - 2;
  
  // Check for win condition
  if (playerScore >= winningScore || computerScore >= winningScore) {
    gameRunning = false;
    alert(`${playerScore >= winningScore ? 'Player' : 'Computer'} wins!`);
  }
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

// Event listeners
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); // Prevent page scrolling
    keys[e.key] = true;
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    keys[e.key] = false;
  }
});

// Start button
document.getElementById('start-button').addEventListener('click', () => {
  if (!gameRunning) {
    // Reset scores if starting fresh
    if (playerScore >= winningScore || computerScore >= winningScore) {
      playerScore = 0;
      computerScore = 0;
      updateScore();
    }
    gameRunning = true;
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