// When the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {

  // 1- Get all buttons that match the selectors
  // 2- Add an event listener to each
  
  // .querySelectorAll() - returns a NodeList of the elements that match the
  //    the group of selectors
  const buttons = document.querySelectorAll('.time-button, .infinity-button');
  
  buttons.forEach(button => {
    button.addEventListener('click', (e) => {

      // 1- Get the text of the button
      // 2- Get the amount of time selected
      // 3- Store tiem data as object and got to main menu if data was successfully stored
      
      // Assign buttonText the text content of the current button / target
      const buttonText = e.target.textContent;
      let selectedTime = null;
      let isInfinite = false;
      
      if (buttonText.includes('min')) {
        // Extract number from the button's text content
        selectedTime = parseInt(buttonText);
      } else if (buttonText === '∞') {
        isInfinite = true;
      }
      
      // Store the selection in object
      chrome.storage.local.set({
        selectedTime: selectedTime,
        isInfinite: isInfinite,
        startTime: Date.now() // Recording time when selection was made
      }, () => {
        // Go to main menu
        window.location.href = 'main-menu.html';
      });
    });
  });
});