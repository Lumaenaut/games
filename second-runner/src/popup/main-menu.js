let countdownTime; // seconds
let sessionTime = 0;
let isInfinite = false;
let countdownFinished = false;

function updateTimerDisplay() {

  // 1- Get timerDisplay element
  // 2- Set the minutes and seconds variables
  // 3- Set timerDisplay text
  // 4- If the countdown is finished, set different color of the element
  
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    const mins = Math.floor(Math.abs(countdownTime) / 60);
    const secs = Math.abs(countdownTime) % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Set different color if the count down has already reached zero
    if (countdownFinished) {
      timerDisplay.style.color = '#e67e22'; // orange for overtime
    } else {
      // Reset color when not finished
      timerDisplay.style.color = '#2c3e50'; // back to default
    }
  }
}

function updateSessionDisplay() {

  // 1- Get sessionDisplay element
  // 2- Set the minutes and seconds variables
  // 3- Set timerDisplay text

  const sessionDisplay = document.getElementById('session-display');
  if (sessionDisplay) {
    const mins = Math.floor(sessionTime / 60);
    const secs = sessionTime % 60;
    sessionDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

function startClocks() {

  // 1- Update displays every second
  // 2- Store interval

  // Update both clocks every second
  const clockInterval = setInterval(() => {

    // 1- Add one second to the session time
    // 2- update the session clock
    // 3- If infinite button was selected and countdown isn't finished, update
    //    countdown. If countdown is less or reaches zero, set countdownFinished
    //    to true and set countdownTime to zero to set up the clock to count up.
    //    Update the the timer
    // 4- If the selection wasn't infinite and countdown is finished, let
    //    countdownTime start counting up and update the timer

    // Update session time (always counting up)
    sessionTime++;
    updateSessionDisplay();
    
    // Update countdown if not infinite and not finished
    if (!isInfinite && !countdownFinished) {
      countdownTime--;
      
      if (countdownTime <= 0) {
        countdownFinished = true;
        // When countdown reaches 0, start counting up from 0
        countdownTime = 0;
      }
      
      updateTimerDisplay();
    } else if (!isInfinite && countdownFinished) {
      // After countdown finishes, count up
      countdownTime++;
      updateTimerDisplay();
    }
  }, 1000);
  
  // Store interval to potentially clear later
  window.clockInterval = clockInterval;
}

// Initialize the menu
document.addEventListener('DOMContentLoaded', () => {
  // Get stored time data
  chrome.storage.local.get(['selectedTime', 'isInfinite', 'startTime'], (result) => {
    
    // 1- Set clocks according to the user's time selection
    // 2- If selection was infinite hide the timer, else update timer according to the minutes selected
    // 3- Calculate the initial session time and update the session clock
    // 4- Start the clocks

    isInfinite = result.isInfinite || false;
    
    // Check if timer-clock element exists before hiding
    const timerClock = document.getElementById('timer-clock');
    if (timerClock) {
      // Hide timer clock if infinite mode
      timerClock.style.display = isInfinite ? 'none' : 'flex';
    }
    
    if (!isInfinite) {
      // Set countdown time from selected minutes
      const selectedMinutes = result.selectedTime;
      // Validate selectedMinutes
      if (selectedMinutes && !isNaN(selectedMinutes)) {
        countdownTime = selectedMinutes * 60;
      } else {
        console.error('Invalid selected time:', selectedMinutes);
        countdownTime = 0;
      }
      updateTimerDisplay();
    }
    
    // Calculate initial session time
    // Safely calculate elapsed seconds
    if (result.startTime) {
      const elapsedSeconds = Math.floor((Date.now() - result.startTime) / 1000);
      sessionTime = Math.max(0, elapsedSeconds);
    } else {
      sessionTime = 0;
    }
    updateSessionDisplay();
    
    // Start both clocks
    startClocks();
  });
  
  // Add null checks for game buttons
  const pinballBtn = document.getElementById('game-pinball');
  if (pinballBtn) {
    pinballBtn.addEventListener('click', () => {
      console.log('Pinball game selected');
      // Future: navigate to pinball game
    });
  }
  
  const spaceInvadersBtn = document.getElementById('game-spaceinvaders');
  if (spaceInvadersBtn) {
    spaceInvadersBtn.addEventListener('click', () => {
      console.log('Space Invaders selected');
      // Future: navigate to space invaders
    });
  }
  
  const mentalMathBtn = document.getElementById('game-mentalmath');
  if (mentalMathBtn) {
    mentalMathBtn.addEventListener('click', () => {
      console.log('Mental Math selected');
      // Future: navigate to mental math
    });
  }
});

// Clean up intervals when popup closes
window.addEventListener('unload', () => {
  if (window.clockInterval) {
    clearInterval(window.clockInterval);
    // Also clear the reference
    window.clockInterval = null;
  }
});