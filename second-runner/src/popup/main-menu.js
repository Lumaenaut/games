// Initialize the menu
document.addEventListener('DOMContentLoaded', () => {
  // Add null checks for game buttons
  const tennisBtn = document.getElementById('game-tennis');
  if (tennisBtn) {
    tennisBtn.addEventListener('click', () => {
      window.location.href = '../games/tennis/tennis.html';
    });
  }
  
  const hockeyBtn = document.getElementById('game-hockey');
  if (hockeyBtn) {
    hockeyBtn.addEventListener('click', () => {
      console.log('Hockey selected');
      // Future: navigate to hockey game
      // window.location.href = '../games/hockey/hockey.html';
    });
  }
  
  const handballBtn = document.getElementById('game-handball');
  if (handballBtn) {
    handballBtn.addEventListener('click', () => {
      console.log('Handball selected');
      // Future: navigate to handball game
      // window.location.href = '../games/handball/handball.html';
    });
  }
});