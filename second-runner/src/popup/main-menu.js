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
    if (isInfinite) {
      timerDisplay.textContent = '--:--';
      timerDisplay.style.color = '#2c3e50'; // Default color
    } else {
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
  // 2- Store interval to handle later

  // Update both clocks every second
  const clockInterval = setInterval(() => {
    // Update session time (always counting up)
    sessionTime++;
    updateSessionDisplay();
    
    if (isInfinite) {
      // In infinite mode, timer stays as --:--, no need to update
      // Just make sure it's showing --:-- (already handled by updateTimerDisplay)
      updateTimerDisplay();
    } else {
      // Update countdown if not infinite and not finished
      if (!countdownFinished) {
        countdownTime--;
        
        if (countdownTime <= 0) {
          countdownFinished = true;
          // When countdown reaches 0, start counting up from 0
          countdownTime = 0;
        }
        
        updateTimerDisplay();
      } else if (countdownFinished) {
        // After countdown finishes, count up
        countdownTime++;
        updateTimerDisplay();
      }
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
    // 2- If selection isn't infinate update timer according to the minutes selected
    // 3- Calculate the initial session time and update the session clock
    // 4- Start the clocks

    isInfinite = result.isInfinite || false;
    
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
    } else {
      // For infinite mode, set a flag but don't hide the timer
      countdownTime = 0; // Initialize to 0
      updateTimerDisplay(); // This will show --:-- from the updated function
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

// Clean up intervals when popup closes
window.addEventListener('unload', () => {
  if (window.clockInterval) {
    clearInterval(window.clockInterval);
    // Also clear the reference
    window.clockInterval = null;
  }
});