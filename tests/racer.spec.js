import { test, expect } from '@playwright/test';

test.describe('APEX CIRCUIT // 3D Isometric Arcade Racer Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Game initializes with Canvas, OrthographicCamera, HUD and Start Screen', async ({ page }) => {
    // 1. Canvas
    const canvas = page.locator('#racer-canvas');
    await expect(canvas).toBeVisible();

    // 2. Start Screen
    const overlay = page.locator('#overlay-screen');
    await expect(overlay).toBeVisible();
    await expect(page.locator('.circuit-title')).toContainText('APEX CIRCUIT');
    await expect(page.locator('#btn-start')).toBeVisible();

    // 3. HUD
    await expect(page.locator('#speed-val')).toContainText('000');
    await expect(page.locator('#pos-val')).toContainText('1');
    await expect(page.locator('#lap-val')).toContainText('1');
    await expect(page.locator('#radar-canvas')).toBeVisible();

    // 4. Game instance & camera
    const hasGame = await page.evaluate(() => !!window.game);
    expect(hasGame).toBe(true);

    const isOrthographic = await page.evaluate(() => window.game.camera.isOrthographicCamera);
    expect(isOrthographic).toBe(true);

    const vehicleCount = await page.evaluate(() => window.game.vehicles.length);
    expect(vehicleCount).toBe(4); // 1 Player + 3 AI rivals
  });

  test('Race start transitions through countdown to RACING state', async ({ page }) => {
    await page.click('#btn-start');

    // Overlay should disappear
    const overlay = page.locator('#overlay-screen');
    await expect(overlay).toHaveClass(/hidden/);

    // Countdown message should appear
    const centerMsg = page.locator('#center-message');
    await expect(centerMsg).toBeVisible();

    // Wait until game state becomes RACING
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    const state = await page.evaluate(() => window.game.state);
    expect(state).toBe('RACING');
  });

  test('Player vehicle accelerates with W and steers with A/D', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Initial speed should be near 0
    const initialSpeed = await page.evaluate(() => window.game.player.physics.speed);
    expect(initialSpeed).toBeLessThan(5);

    // Accelerate with W
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => window.game.player.physics.speed > 15, { timeout: 8000 });
    await page.keyboard.up('KeyW');

    const acceleratedSpeed = await page.evaluate(() => window.game.player.physics.speed);
    expect(acceleratedSpeed).toBeGreaterThan(15);

    // Speedometer displays speed
    const speedText = await page.locator('#speed-val').innerText();
    expect(parseInt(speedText, 10)).toBeGreaterThan(15);

    // Steer with A
    const initialAngle = await page.evaluate(() => window.game.player.physics.angle);
    await page.keyboard.down('KeyA');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(600);
    await page.keyboard.up('KeyA');
    await page.keyboard.up('KeyW');

    const newAngle = await page.evaluate(() => window.game.player.physics.angle);
    expect(newAngle).not.toEqual(initialAngle);
  });

  test('Handbrake engages drift state at speed', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Accelerate to speed
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => window.game.player.physics.speed > 25, { timeout: 8000 });

    // Press Space (Handbrake)
    await page.keyboard.down('Space');
    await page.waitForFunction(() => window.game.player.physics.isDrifting || window.game.keys.handbrake, { timeout: 4000 });

    const isHandbraking = await page.evaluate(() => window.game.keys.handbrake);
    expect(isHandbraking).toBe(true);

    await page.keyboard.up('Space');
    await page.keyboard.up('KeyW');
  });

  test('AI rivals navigate track with positive speed', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Wait 2 seconds for AI to drive
    await page.waitForTimeout(2000);

    const aiSpeeds = await page.evaluate(() => {
      return [
        window.game.vehicles[1].physics.speed,
        window.game.vehicles[2].physics.speed,
        window.game.vehicles[3].physics.speed
      ];
    });

    for (const speed of aiSpeeds) {
      expect(speed).toBeGreaterThan(5);
    }
  });

  test('Audio mute toggles with M key', async ({ page }) => {
    await page.click('#btn-start');

    const initialMuted = await page.evaluate(() => window.game.audioSynth.muted);
    expect(initialMuted).toBe(false);

    await page.keyboard.press('KeyM');
    const mutedAfterPress = await page.evaluate(() => window.game.audioSynth.muted);
    expect(mutedAfterPress).toBe(true);

    await page.keyboard.press('KeyM');
    const unmuted = await page.evaluate(() => window.game.audioSynth.muted);
    expect(unmuted).toBe(false);
  });

  test('Settings modal opens and closes via button', async ({ page }) => {
    const settingsModal = page.locator('#settings-modal');
    await expect(settingsModal).toHaveClass(/hidden/);

    // Open from start screen
    await page.click('#btn-settings-start');
    await expect(settingsModal).not.toHaveClass(/hidden/);

    // Close
    await page.click('#btn-close-settings');
    await expect(settingsModal).toHaveClass(/hidden/);
  });

  test('Finish modal displays podium standings when race completes', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Simulate player completing all laps
    await page.evaluate(() => {
      window.game.playerTracker.completedLaps = window.game.totalLaps;
      window.game.playerTracker.isFinished = true;
      window.game.playerTracker.bestLapTime = 34.52;
      window.game.updateTrackProgression(0.01);
    });

    const finishModal = page.locator('#finish-modal');
    await expect(finishModal).not.toHaveClass(/hidden/, { timeout: 4000 });
    await expect(page.locator('#podium-list')).toBeVisible();
    await expect(page.locator('#btn-restart')).toBeVisible();
  });
});
