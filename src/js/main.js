import { Game } from './game.js';

function init() {
  const game = new Game();
  window.game = game;

  // Start Button (Start Screen)
  const btnStart = document.getElementById('btn-start');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      btnStart.blur();
      game.startRace();
    });
  }

  // Restart Button (Finish Podium Screen)
  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      btnRestart.blur();
      game.restartRace();
    });
  }

  // Return to Menu Button (Finish Podium Screen)
  const btnToMenu = document.getElementById('btn-to-menu');
  if (btnToMenu) {
    btnToMenu.addEventListener('click', () => {
      btnToMenu.blur();
      game.returnToMenu();
    });
  }

  // Settings Buttons & Modals
  const btnSettingsStart = document.getElementById('btn-settings-start');
  if (btnSettingsStart) {
    btnSettingsStart.addEventListener('click', () => {
      btnSettingsStart.blur();
      game.openSettings();
    });
  }

  const btnSettingsHud = document.getElementById('btn-settings-hud');
  if (btnSettingsHud) {
    btnSettingsHud.addEventListener('click', () => {
      btnSettingsHud.blur();
      game.toggleSettings();
    });
  }

  const btnCloseSettings = document.getElementById('btn-close-settings');
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      btnCloseSettings.blur();
      game.closeSettings();
    });
  }

  // Mute toggle in modal
  const btnToggleMuteModal = document.getElementById('btn-toggle-mute-modal');
  if (btnToggleMuteModal) {
    btnToggleMuteModal.addEventListener('click', () => {
      btnToggleMuteModal.blur();
      game.toggleMute();
    });
  }

  // Audition SFX button
  const btnTestSfx = document.getElementById('btn-test-sfx');
  if (btnTestSfx) {
    btnTestSfx.addEventListener('click', () => {
      btnTestSfx.blur();
      game.audioSynth.init();
      game.audioSynth.playBeep(true);
    });
  }

  // Initialize UI values
  game.syncSettingsUI();

  // Keyboard Event Listeners
  window.addEventListener('keydown', (e) => game.handleKeyDown(e));
  window.addEventListener('keyup', (e) => game.handleKeyUp(e));

  // Animation Loop
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    game.update(delta);
    game.render();
  }

  requestAnimationFrame(animate);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

