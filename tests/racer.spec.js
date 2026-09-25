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
    await expect(page.locator('.circuit-title')).toContainText('PINE VALLEY');
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
    const acceleratedSpeed = await page.evaluate(() => window.game.player.physics.speed);
    await page.keyboard.up('KeyW');

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

    // Verify active drift particles are emitted
    await page.waitForFunction(() => window.game.driftParticles && window.game.driftParticles.getActiveCount() > 0, { timeout: 4000 });
    const particleCount = await page.evaluate(() => window.game.driftParticles.getActiveCount());
    expect(particleCount).toBeGreaterThan(0);

    await page.keyboard.up('Space');
    await page.keyboard.up('KeyW');
  });

  test('Cornering in curves emits visible tire scrub particles', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Accelerate and steer hard into turn
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => window.game.player.physics.speed > 20, { timeout: 8000 });
    await page.keyboard.down('KeyA');
    const hasEmitted = await page.waitForFunction(
      () => window.game.driftParticles && window.game.driftParticles.getActiveCount() > 0,
      { timeout: 5000 }
    );
    expect(hasEmitted).toBeTruthy();

    await page.screenshot({ path: 'tests/screenshots/drift-particles-turn.png' });

    await page.keyboard.up('KeyA');
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

  test('Jump ramp exists in 3D scene and launches vehicle into air with visible height', async ({ page }) => {
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // 1. Verify 3D ramp object exists in scene
    const hasRampMesh = await page.evaluate(() => {
      let found = false;
      window.game.scene.traverse((obj) => {
        if (obj.name === 'jump_ramp_back_straight_ramp') found = true;
      });
      return found;
    });
    expect(hasRampMesh).toBe(true);

    // 2. Test vehicle jump trigger on ramp lane
    await page.evaluate(() => {
      // Place car right before the ramp heading -X at racing speed
      const ramp = window.game.circuitTrack.ramps[0];
      window.game.player.physics.x = ramp.x + 3.0; // approaching ramp from +X
      window.game.player.physics.z = ramp.z;       // on ramp lane
      window.game.player.physics.angle = Math.PI;  // heading -X
      window.game.player.physics.speed = 35;
      window.game.player.physics.vx = -35;
      window.game.player.physics.vz = 0;
    });

    // Run game loop for a few ticks to trigger ramp launch
    await page.waitForFunction(() => window.game.player.physics.isAirborne && window.game.player.physics.y > 0.5, { timeout: 4000 });

    const jumpData = await page.evaluate(() => ({
      isAirborne: window.game.player.physics.isAirborne,
      altitude: window.game.player.physics.y,
      meshY: window.game.player.mesh.position.y,
      shadowWorldY: window.game.player.mesh.position.y + window.game.player.shadowMesh.position.y
    }));

    expect(jumpData.isAirborne).toBe(true);
    expect(jumpData.altitude).toBeGreaterThan(0.5);
    expect(jumpData.meshY).toBe(jumpData.altitude);
    expect(Math.abs(jumpData.shadowWorldY - 0.03)).toBeLessThan(0.01);

    // Capture screenshot of airborne jump
    await page.screenshot({ path: 'tests/screenshots/jump-ramp-flight.png' });
  });

  test('Track selector switches circuit to Alpine Summit Pass and renders 3D mountain tunnel', async ({ page }) => {
    // Check initial track is Pine Valley
    await expect(page.locator('#circuit-title')).toContainText('PINE VALLEY');
    await expect(page.locator('#btn-track-pine')).toHaveClass(/active/);

    // Switch to Alpine Summit
    await page.click('#btn-track-alpine');
    await expect(page.locator('#circuit-title')).toContainText('ALPINE SUMMIT');
    await expect(page.locator('#btn-track-alpine')).toHaveClass(/active/);
    await expect(page.locator('#btn-track-pine')).not.toHaveClass(/active/);

    // Verify game state loaded Alpine track and tunnel
    const tunnelInfo = await page.evaluate(() => {
      let hasTunnel = false;
      let hasEntrance = false;
      let hasExit = false;
      window.game.scene.traverse((obj) => {
        if (obj.name === 'tunnel_structure') hasTunnel = true;
        if (obj.name === 'tunnel_portal_entrance') hasEntrance = true;
        if (obj.name === 'tunnel_portal_exit') hasExit = true;
      });
      return {
        trackId: window.game.currentTrackId,
        hasTunnel,
        hasEntrance,
        hasExit
      };
    });

    expect(tunnelInfo.trackId).toBe('alpine-summit');
    expect(tunnelInfo.hasTunnel).toBe(true);
    expect(tunnelInfo.hasEntrance).toBe(true);
    expect(tunnelInfo.hasExit).toBe(true);

    // Start race on Alpine Summit
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Teleport player vehicle near the tunnel entrance to view the tunnel structure
    await page.evaluate(() => {
      const tunnel = window.game.currentTrackConfig.tunnels[0];
      window.game.player.physics.x = tunnel.entrance.x;
      window.game.player.physics.z = tunnel.entrance.z;
      window.game.player.physics.angle = -Math.PI * 0.75;
      window.game.updateCamera(0.016);
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/alpine-summit-tunnel.png' });
  });
});
