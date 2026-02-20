
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');


let gameRunning = false;
let gamePaused = false;
let animationFrame;
let playerScore = 0;
let computerScore = 0;
let winningScore = 5; // First to 5 points wins


let rallyCount = 0;
const BASE_BALL_SPEED = 5;
const MAX_SPEED_MULTIPLIER = 2.5; // Max 2.5x speed
let currentSpeedMultiplier = 1;


let playerY = canvas.height / 2 - 40;
let computerY = canvas.height / 2 - 40;


const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BASE_COMPUTER_SPEED = 4;


let ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: BASE_BALL_SPEED,
  dy: 3,
  radius: 5,
  baseSpeed: BASE_BALL_SPEED
};



let mouseY = canvas.height / 2 - 40;


let mouseInsideCanvas = false;

function init() {

  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  

  rallyCount = 0;
  currentSpeedMultiplier = 1;
  ball.baseSpeed = BASE_BALL_SPEED;
  

  ball.dx = (Math.random() > 0.5 ? BASE_BALL_SPEED : -BASE_BALL_SPEED);
  ball.dy = (Math.random() * 4) - 2; // between -2 and 2
}


function resetForNextMatch() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  

  rallyCount = 0;
  currentSpeedMultiplier = 1;
  ball.baseSpeed = BASE_BALL_SPEED;
  


  ball.dx = (Math.random() > 0.5 ? BASE_BALL_SPEED : -BASE_BALL_SPEED);
  ball.dy = (Math.random() * 4) - 2;
  

  gameRunning = false;
  gamePaused = true;
}


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


function draw() {

  ctx.fillStyle = theme.lightest;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  

  ctx.strokeStyle = theme.dark;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  

  ctx.fillStyle = theme.darkest;
  
  ctx.fillRect(10, mouseY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(canvas.width - PADDLE_WIDTH - 10, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = theme.darkest;
  ctx.fill();
  

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

    ctx.fillStyle = theme.lightest;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.darkest;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLICK TO START', canvas.width / 2, canvas.height / 2);
  }
  

  if (gameRunning && rallyCount > 0) {
    ctx.fillStyle = theme.darkest;
    ctx.globalAlpha = 0.5;
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Rally: ${rallyCount} x${currentSpeedMultiplier.toFixed(1)}`, canvas.width - 20, 30);
    ctx.globalAlpha = 1;
  }
}


function updateDifficulty() {

  rallyCount++;
  


  currentSpeedMultiplier = Math.min(1 + (Math.floor(rallyCount / 2) * 0.1), MAX_SPEED_MULTIPLIER);
  

  const directionX = ball.dx > 0 ? 1 : -1;
  const directionY = ball.dy > 0 ? 1 : -1;
  
  ball.baseSpeed = BASE_BALL_SPEED * currentSpeedMultiplier;
  ball.dx = directionX * ball.baseSpeed;
  ball.dy = Math.abs(ball.dy) * directionY;
}


function update() {
  if (!gameRunning) return;
  


  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY));
  

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
  

  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.dy *= -1;
  }
  


  if (ball.x - ball.radius < 10 + PADDLE_WIDTH && 
      ball.x + ball.radius > 10 &&
      ball.y > playerY && 
      ball.y < playerY + PADDLE_HEIGHT) {
    

    const relativeIntersectY = (ball.y - (playerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8; // Max 80% angle
    
    ball.dx = -ball.dx; // Reverse horizontal direction
    ball.dy = bounceAngle * ball.baseSpeed; // Use baseSpeed for consistent feel
    

    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
    

    updateDifficulty();
  }
  

  if (ball.x + ball.radius > canvas.width - PADDLE_WIDTH - 10 && 
      ball.x - ball.radius < canvas.width - 10 &&
      ball.y > computerY && 
      ball.y < computerY + PADDLE_HEIGHT) {
    
    const relativeIntersectY = (ball.y - (computerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
    const bounceAngle = relativeIntersectY * 0.8;
    
    ball.dx = -ball.dx;
    ball.dy = bounceAngle * ball.baseSpeed;
    
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = ball.dy > 0 ? 1.5 : -1.5;
    }
    

    updateDifficulty();
  }
  

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


function checkWinCondition() {
  if (playerScore >= winningScore || computerScore >= winningScore) {
    gameRunning = false;
    gamePaused = true;
  }
}


function resetBall(scorer) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  

  if (scorer === 'player') {
    ball.dx = -BASE_BALL_SPEED; // Toward computer (right side)
  } else {
    ball.dx = BASE_BALL_SPEED; // Toward player (left side)
  }
  
  ball.dy = (Math.random() * 4) - 2;
  rallyCount = 0;
  currentSpeedMultiplier = 1;
  ball.baseSpeed = BASE_BALL_SPEED;
}


function updateScore() {
  document.getElementById('player-score').textContent = playerScore;
  document.getElementById('computer-score').textContent = computerScore;
}


function gameLoop() {
  if (gameRunning) {
    update();
  }
  draw();
  animationFrame = requestAnimationFrame(gameLoop);
}


canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const mouseCanvasY = (e.clientY - rect.top) * scaleY;
  

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