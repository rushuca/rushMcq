(function () {
  // --- Configuration ---
  const validCodes = ["TEST456","RUSH2024", "SURGERY6"]; // Add your valid unlock codes here

  // --- Get References to All Three Main Page Sections ---
  const lockOverlay = document.getElementById('lockOverlay');
  const splashScreen = document.getElementById('splash-screen');
  const appContainer = document.getElementById('app');
  
  // --- Get Lock Screen Interactive Elements ---
  const unlockBtn = document.getElementById("unlockBtn");
  const codeInput = document.getElementById("unlockCodeInput");
  const errorMsg = document.getElementById("unlockMessage");
  const startTrialBtn = document.getElementById("startTrialBtn");

  // This function is called ONLY when the app is confirmed to be unlocked.
  function startApplication() {
    if (lockOverlay) {
      lockOverlay.remove();
    }
    if (appContainer) {
      appContainer.style.display = 'block'; 
    }
    if (typeof initApp === 'function') {
      initApp(); 
    }
  }

  // This function is called if the user is NOT unlocked.
  function showLockScreenOnly() {
    if (splashScreen) {
      splashScreen.style.display = 'none'; 
    }
    if (appContainer) {
      appContainer.style.display = 'none';
    }
    if (lockOverlay) {
      lockOverlay.style.display = 'flex';
    }
  }

  // --- Define Event Handlers ---
  function handleTrialClick() {
    sessionStorage.setItem('appMode', 'trial');
    startApplication();
  }

  function handleUnlockClick() {
    const code = codeInput.value.trim();
    if (validCodes.includes(code)) {
      sessionStorage.setItem('appMode', 'full');
      startApplication();
    } else {
      if (errorMsg) errorMsg.style.display = 'block';
    }
  }

  // --- Main Execution Logic ---
  if (startTrialBtn) {
    startTrialBtn.addEventListener('click', handleTrialClick);
  }
  if (unlockBtn) {
    unlockBtn.addEventListener('click', handleUnlockClick);
  }

  const appMode = sessionStorage.getItem('appMode');
  if (appMode === 'full' || appMode === 'trial') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startApplication);
    } else {
      startApplication();
    }
  } else {
    showLockScreenOnly();
  }

})();
