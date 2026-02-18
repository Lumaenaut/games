// When the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Make entire page clickable
  document.body.addEventListener('click', () => {
    window.location.href = 'main-menu.html';
  });
  
  // Also make it clear it's clickable
  document.body.style.cursor = 'pointer';
});