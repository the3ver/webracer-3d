import { test, expect } from '@playwright/test';

test.describe('Neon Drift // Cyber Circuit 3D Racer Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Game initializes with Canvas, HUD elements and Start Overlay', async ({ page }) => {
    // 1. Check Canvas
    const canvas = page.locator('#racer-canvas');
    await expect(canvas).toBeVisible();

    // 2. Check Overlay Screen with Title & Start Button
    const overlay = page.locator('#overlay-screen');
    await expect(overlay).toBeVisible();
    await expect(page.locator('.glitch-title')).toContainText('NEON DRIFT');
    const startBtn = page.locator('#btn-start');
    await expect(startBtn).toBeVisible();

    // 3. Check HUD elements
    await expect(page.locator('#speed-val')).toContainText('000');
    await expect(page.locator('#pos-val')).toContainText('/4');
    await expect(page.locator('#lap-val')).toContainText('1/3');
    await expect(page.locator('#radar-canvas')).toBeVisible();

    // Check window.game object
    const hasGame = await page.evaluate(() => !!window.game);
    expect(hasGame).toBe(true);

    const vehicleCount = await page.evaluate(() => window.game.vehicles.length);
    expect(vehicleCount).toBe(4); // Player + 3 AI rivals
  });

  test('Race start transitions through countdown to RACING state', async ({ page }) => {
    // Click Start Button
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

    // Hold 'W' key to accelerate
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => window.game.player.physics.speed > 15, { timeout: 8000 });
    await page.keyboard.up('KeyW');

    // Speed should have increased significantly
    const acceleratedSpeed = await page.evaluate(() => window.game.player.physics.speed);
    expect(acceleratedSpeed).toBeGreaterThan(15);

    // Speedometer text should reflect speed
    const speedText = await page.locator('#speed-val').innerText();
    expect(parseInt(speedText, 10)).toBeGreaterThan(10);

    // Steer left with 'A'
    const initialRotation = await page.evaluate(() => window.game.player.physics.rotation.y);
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(600);
    await page.keyboard.up('KeyA');
    const newRotation = await page.evaluate(() => window.game.player.physics.rotation.y);
    expect(newRotation).not.toEqual(initialRotation);
  });

  test('Camera toggles modes with C key and Audio mutes with M key', async ({ page }) => {
    await page.click('#btn-start');

    // Camera mode toggle
    const initialCamMode = await page.evaluate(() => window.game.cameraController.mode);
    expect(initialCamMode).toBe('chase');

    await page.keyboard.press('KeyC');
    const nextCamMode = await page.evaluate(() => window.game.cameraController.mode);
    expect(nextCamMode).toBe('close');

    // Audio mute toggle
    const initialMuted = await page.evaluate(() => window.game.audioSynth.isMuted);
    expect(initialMuted).toBe(false);

    await page.keyboard.press('KeyM');
    const mutedAfterPress = await page.evaluate(() => window.game.audioSynth.isMuted);
    expect(mutedAfterPress).toBe(true);
  });

  test('Combat system fires weapons and updates HUD and projectiles', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Give player a missile for test
    await page.evaluate(() => {
      window.game.player.weaponSlot = 'MISSILE';
      window.game.updateWeaponHUD();
    });

    const weaponText = await page.locator('#weapon-icon').innerText();
    expect(weaponText).toContain('Homing Missile');

    // Fire weapon with 'F' key
    await page.keyboard.press('KeyF');

    // Weapon slot should be empty now
    const weaponAfterFire = await page.evaluate(() => window.game.player.weaponSlot);
    expect(weaponAfterFire).toBeNull();

    // Projectiles array should contain missile
    const projCount = await page.evaluate(() => window.game.weaponManager.projectiles.length);
    expect(projCount).toBeGreaterThanOrEqual(1);
  });

  test('AI opponents drive and advance along the track', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Record initial AI positions
    const initialAiPositions = await page.evaluate(() => {
      return window.game.vehicles
        .filter(v => !v.isPlayer)
        .map(v => ({ name: v.name, z: v.physics.position.z, t: v.physics.trackT }));
    });

    // Drive and race alongside AI
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(2500);
    await page.keyboard.up('KeyW');

    const updatedAiPositions = await page.evaluate(() => {
      return window.game.vehicles
        .filter(v => !v.isPlayer)
        .map(v => ({ name: v.name, z: v.physics.position.z, t: v.physics.trackT }));
    });

    // Verify AI vehicles moved
    for (let i = 0; i < initialAiPositions.length; i++) {
      expect(updatedAiPositions[i].z).not.toEqual(initialAiPositions[i].z);
    }

    // Take screenshot of race action
    await page.screenshot({ path: 'tests/screenshots/gameplay_action.png' });
  });

  test('Vehicle falls off track when driving over edge and respawns on track with blinking animation', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Move player laterally beyond track bounds (over the curb into the abyss)
    await page.evaluate(() => {
      window.game.player.physics.position.x += 25.0;
    });

    // Wait for physics step to trigger isFalling
    await page.waitForFunction(() => window.game.player.physics.isFalling, { timeout: 3000 });

    const isFalling = await page.evaluate(() => window.game.player.physics.isFalling);
    expect(isFalling).toBe(true);

    // Wait for respawn trigger
    await page.waitForFunction(() => !window.game.player.physics.isFalling && window.game.player.physics.respawnBlinkTimer > 0, { timeout: 4000 });

    const respawnData = await page.evaluate(() => ({
      isFalling: window.game.player.physics.isFalling,
      blinkTimer: window.game.player.physics.respawnBlinkTimer,
      speed: window.game.player.physics.speed,
      meshVisible: window.game.player.model.mesh.visible
    }));

    expect(respawnData.isFalling).toBe(false);
    expect(respawnData.blinkTimer).toBeGreaterThan(0);
    expect(respawnData.speed).toBeGreaterThan(20); // Smooth rolling restart

    // Take screenshot during blinking respawn
    await page.screenshot({ path: 'tests/screenshots/respawn_blink.png' });
  });

  test('Vehicle activates contoured Energy Shield and renders snug aerodynamic cocoon', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Activate Energy Shield
    await page.evaluate(() => {
      window.game.player.physics.hasShield = true;
      window.game.weaponManager.audioSynth.playShield();
    });

    await page.waitForTimeout(500);

    const shieldState = await page.evaluate(() => ({
      hasShield: window.game.player.physics.hasShield,
      shieldVisible: window.game.player.model.shieldGroup.visible,
      scaleX: window.game.player.model.shieldGroup.scale.x,
      scaleZ: window.game.player.model.shieldGroup.scale.z
    }));

    expect(shieldState.hasShield).toBe(true);
    expect(shieldState.shieldVisible).toBe(true);
    expect(shieldState.scaleX).toBeGreaterThan(1.1);
    expect(shieldState.scaleZ).toBeGreaterThan(2.3);

    // Save screenshot of aerodynamic energy shield
    await page.screenshot({ path: 'tests/screenshots/energy_shield.png' });
  });

  test('Settings menu opens, adjusts Music and SFX volume separately, and pauses race', async ({ page }) => {
    // 1. Open settings from start screen
    await page.click('#btn-settings-start');
    const isModalVisible = await page.locator('#settings-modal').isVisible();
    expect(isModalVisible).toBe(true);

    // Save screenshot of settings modal
    await page.screenshot({ path: 'tests/screenshots/settings_menu.png' });

    // 2. Adjust Music volume slider to 40%
    await page.fill('#slider-music-vol', '40');
    await page.dispatchEvent('#slider-music-vol', 'input');
    const musicText = await page.locator('#music-vol-val').innerText();
    expect(musicText).toBe('40%');
    const musicVol = await page.evaluate(() => window.game.audioSynth.getMusicVolume());
    expect(musicVol).toBeCloseTo(0.4, 2);

    // 3. Adjust SFX volume slider to 90%
    await page.fill('#slider-sfx-vol', '90');
    await page.dispatchEvent('#slider-sfx-vol', 'input');
    const sfxText = await page.locator('#sfx-vol-val').innerText();
    expect(sfxText).toBe('90%');
    const sfxVol = await page.evaluate(() => window.game.audioSynth.getSfxVolume());
    expect(sfxVol).toBeCloseTo(0.9, 2);

    // 4. Close settings modal
    await page.click('#btn-close-settings');
    const isHiddenAfterClose = await page.evaluate(() => document.getElementById('settings-modal').classList.contains('hidden'));
    expect(isHiddenAfterClose).toBe(true);

    // 5. Start race and test Escape key toggle and game pause
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Press Escape to pause and open settings
    await page.keyboard.press('Escape');
    const isPaused = await page.evaluate(() => window.game.isPaused);
    const isModalOpenInRace = await page.locator('#settings-modal').isVisible();
    expect(isPaused).toBe(true);
    expect(isModalOpenInRace).toBe(true);

    // Press Escape to unpause and resume race
    await page.keyboard.press('Escape');
    const isPausedAfterResume = await page.evaluate(() => window.game.isPaused);
    expect(isPausedAfterResume).toBe(false);
  });
});
