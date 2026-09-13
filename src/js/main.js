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
