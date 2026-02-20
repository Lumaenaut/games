
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');


let gameRunning = false;
let gamePaused = false;
let animationFrame;
let playerScore = 0;
let computerScore = 0;
let winningScore = 5; // First to 5 points wins


let rallyCount = 0;
const BASE_PUCK_SPEED = 5;
const MAX_SPEED_MULTIPLIER = 2.5; // Max 2.5x speed
let currentSpeedMultiplier = 1;


const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 40;
const BASE_COMPUTER_SPEED = 4;


let playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;

const PLAYER_GOALIE_X = 40;

const COMPUTER_GOALIE_X = canvas.width - PADDLE_WIDTH - 40;
const CENTER_X = canvas.width / 2;

const DISTANCE_FROM_CENTER = (COMPUTER_GOALIE_X - CENTER_X) * 0.4; // 40% of distance from center to goalie
const PLAYER_FORWARD_X = Math.floor(CENTER_X + DISTANCE_FROM_CENTER); // Right side, closer to center


let computerY = canvas.height / 2 - PADDLE_HEIGHT / 2;


const COMPUTER_FORWARD_X = Math.floor(CENTER_X - DISTANCE_FROM_CENTER); // Left side, same distance from center



const BOUNCE_ZONE_TOP = 100; // Top section height (larger = smaller scoring zone)
const BOUNCE_ZONE_BOTTOM = 100; // Bottom section height (larger = smaller scoring zone)


let puck = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: BASE_PUCK_SPEED,
  dy: 3,
  radius: 5,
  baseSpeed: BASE_PUCK_SPEED
};


let mouseY = canvas.height / 2 - PADDLE_HEIGHT / 2;


let mouseInsideCanvas = false;

function init() {

  puck.x = canvas.width / 2;
  puck.y = canvas.height / 2;
  

  rallyCount = 0;
  currentSpeedMultiplier = 1;
  puck.baseSpeed = BASE_PUCK_SPEED;
  

  puck.dx = (Math.random() > 0.5 ? BASE_PUCK_SPEED : -BASE_PUCK_SPEED);
  puck.dy = (Math.random() * 4) - 2; // between -2 and 2
}


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
  
  const cX = canvas.width / 2;
  const rinkW = canvas.width;
  const rinkH = canvas.height;
  

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
  

  ctx.strokeStyle = theme.dark;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 5, BOUNCE_ZONE_TOP);
  ctx.strokeRect(0, canvas.height - BOUNCE_ZONE_BOTTOM, 5, BOUNCE_ZONE_BOTTOM);
  ctx.strokeRect(canvas.width - 5, 0, 5, BOUNCE_ZONE_TOP);
  ctx.strokeRect(canvas.width - 5, canvas.height - BOUNCE_ZONE_BOTTOM, 5, BOUNCE_ZONE_BOTTOM);
  ctx.lineWidth = 1;
  

  ctx.fillStyle = theme.darkest;
  
  ctx.fillRect(PLAYER_GOALIE_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(PLAYER_FORWARD_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(COMPUTER_GOALIE_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(COMPUTER_FORWARD_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  

  ctx.beginPath();
  ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
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
  

  const directionX = puck.dx > 0 ? 1 : -1;
  const directionY = puck.dy > 0 ? 1 : -1;
  
  puck.baseSpeed = BASE_PUCK_SPEED * currentSpeedMultiplier;
  puck.dx = directionX * puck.baseSpeed;
  puck.dy = Math.abs(puck.dy) * directionY;
}


function checkPaddleCollision(paddleX, paddleY, paddleWidth, paddleHeight, allowDeflection = true) {
  if (puck.x + puck.radius > paddleX && 
      puck.x - puck.radius < paddleX + paddleWidth &&
      puck.y + puck.radius > paddleY && 
      puck.y - puck.radius < paddleY + paddleHeight) {
    

    if (!allowDeflection) {
      return false;
    }
    

    const relativeIntersectY = (puck.y - (paddleY + paddleHeight/2)) / (paddleHeight/2);
    const bounceAngle = relativeIntersectY * 0.8; // Max 80% angle
    

    puck.dx = -puck.dx;
    puck.dy = bounceAngle * puck.baseSpeed;
    

    if (Math.abs(puck.dy) < 1.5) {
      puck.dy = puck.dy > 0 ? 1.5 : -1.5;
    }
    

    updateDifficulty();
    return true;
  }
  return false;
}


function update() {


  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY));
  
  if (!gameRunning) return;
  

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
  

  if (puck.y - puck.radius < 0 || puck.y + puck.radius > canvas.height) {
    puck.dy *= -1;
  }
  


  if (checkPaddleCollision(PLAYER_GOALIE_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, true)) {

  }

  else if (checkPaddleCollision(PLAYER_FORWARD_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, puck.dx < 0)) {

  }

  else if (checkPaddleCollision(COMPUTER_GOALIE_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT, true)) {

  }

  else if (checkPaddleCollision(COMPUTER_FORWARD_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT, puck.dx > 0)) {

  }
  


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
  }

  else if (puck.x + puck.radius > canvas.width) {

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


function checkWinCondition() {
  if (playerScore >= winningScore || computerScore >= winningScore) {
    gameRunning = false;
    gamePaused = true;
  }
}


function updateScore() {
  document.getElementById('player-score').textContent = playerScore;
  document.getElementById('computer-score').textContent = computerScore;
}


function gameLoop() {
  update(); // Always update (for paddle movement even when game not running)
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
