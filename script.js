// Init
updateTimerDisplay();
setProgress(0);
rotateQuote();
loadState();

// Save state on theme change
themeBtns.forEach(btn => btn.addEventListener('click', () => setTimeout(saveState, 50)));
modeBtns.forEach(btn => btn.addEventListener('click', () => setTimeout(saveState, 50)));
