// When the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-button');
  if (!startBtn) return;

  startBtn.addEventListener('click', () => {
    window.location.href = 'main-menu.html';
  });
});