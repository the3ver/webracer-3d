import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.game = game;

  // Start Button
  const btnStart = document.getElementById('btn-start');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      btnStart.blur();
      game.startRace();
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

  // Volume Sliders
  const sliderMusic = document.getElementById('slider-music-vol');
  const txtMusic = document.getElementById('music-vol-val');
  if (sliderMusic) {
    sliderMusic.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      game.audioSynth.setMusicVolume(val / 100);
      if (txtMusic) txtMusic.innerText = `${val}%`;
    });
  }

  const sliderSfx = document.getElementById('slider-sfx-vol');
  const txtSfx = document.getElementById('sfx-vol-val');
  if (sliderSfx) {
    sliderSfx.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      game.audioSynth.setSfxVolume(val / 100);
      if (txtSfx) txtSfx.innerText = `${val}%`;
    });
  }

  // Mute toggle in modal
  const btnToggleMuteModal = document.getElementById('btn-toggle-mute-modal');
  if (btnToggleMuteModal) {
    btnToggleMuteModal.addEventListener('click', () => {
      btnToggleMuteModal.blur();
      game.audioSynth.toggleMute();
      game.syncSettingsUI();
    });
  }

  // Audition SFX button
  const btnTestSfx = document.getElementById('btn-test-sfx');
  if (btnTestSfx) {
    btnTestSfx.addEventListener('click', () => {
      btnTestSfx.blur();
      game.audioSynth.init();
      game.audioSynth.playPickup();
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
});
