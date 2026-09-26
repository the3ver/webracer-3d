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
    await expect(page.locator('#btn-to-menu')).toBeVisible();

    // Click "ZUR STRECKENAUSWAHL" to return to main menu overlay
    await page.click('#btn-to-menu');
    await expect(finishModal).toHaveClass(/hidden/);
    const overlay = page.locator('#overlay-screen');
    await expect(overlay).toBeVisible();
    expect(await page.evaluate(() => window.game.state)).toBe('MENU');
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

    // Spot 1: Eastern approach curve (x=100, z=130) where mountain previously covered the track
    await page.evaluate(() => {
      window.game.player.physics.x = 100;
      window.game.player.physics.z = 130;
      window.game.player.physics.angle = Math.PI * 0.8;
      window.game.player.mesh.position.set(100, 0, 130);
      window.game.updateCamera(0.016);
      window.game.renderer.render(window.game.scene, window.game.camera);
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/screenshots/alpine-approach-curve.png' });

    // Spot 2: Western descent & hairpin sweep (x=-130, z=25) where mountain previously covered the track
    await page.evaluate(() => {
      window.game.player.physics.x = -130;
      window.game.player.physics.z = 25;
      window.game.player.physics.angle = -Math.PI * 0.4;
      window.game.player.mesh.position.set(-130, 0, 25);
      window.game.updateCamera(0.016);
      window.game.renderer.render(window.game.scene, window.game.camera);
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/screenshots/alpine-western-sweep.png' });
  });

  test('Bot count and difficulty selector updates grid vehicles and AI skill profiles', async ({ page }) => {
    // Default initial state: 3 Bots (4 vehicles total) on medium difficulty
    expect(await page.evaluate(() => window.game.botCount)).toBe(3);
    expect(await page.evaluate(() => window.game.botDifficulty)).toBe('medium');
    expect(await page.evaluate(() => window.game.vehicles.length)).toBe(4);

    // Switch to 1 Bot (Duell)
    await page.click('button[data-bots="1"]');
    expect(await page.evaluate(() => window.game.botCount)).toBe(1);
    expect(await page.evaluate(() => window.game.vehicles.length)).toBe(2);
    expect(await page.evaluate(() => window.game.aiDrivers.length)).toBe(1);

    // Switch to Profi difficulty
    await page.click('button[data-difficulty="pro"]');
    expect(await page.evaluate(() => window.game.botDifficulty)).toBe('pro');
    expect(await page.evaluate(() => window.game.aiDrivers[0].profile.id)).toBe('pro');
    expect(await page.evaluate(() => window.game.vehicles[1].physics.maxSpeed)).toBe(50); // 100% fair top speed

    // Switch to 5 Bots
    await page.click('button[data-bots="5"]');
    expect(await page.evaluate(() => window.game.botCount)).toBe(5);
    expect(await page.evaluate(() => window.game.vehicles.length)).toBe(6);
    expect(await page.evaluate(() => window.game.aiDrivers.length)).toBe(5);

    // Switch to Anfänger difficulty
    await page.click('button[data-difficulty="beginner"]');
    expect(await page.evaluate(() => window.game.botDifficulty)).toBe('beginner');
    expect(await page.evaluate(() => window.game.aiDrivers[0].profile.id)).toBe('beginner');
  });

  test('Vehicle selection switches car types and updates telemetry attributes', async ({ page }) => {
    // Default vehicle is red-fire
    expect(await page.evaluate(() => window.game.selectedCarTypeId)).toBe('red-fire');
    expect(await page.evaluate(() => window.game.player.carType.id)).toBe('red-fire');

    // Switch to Thunder Muscle
    await page.click('button[data-car="thunder-muscle"]');
    expect(await page.evaluate(() => window.game.selectedCarTypeId)).toBe('thunder-muscle');
    expect(await page.evaluate(() => window.game.player.carType.id)).toBe('thunder-muscle');
    expect(await page.evaluate(() => window.game.player.physics.maxSpeed)).toBe(54);
    await expect(page.locator('#car-stats-title')).toHaveText('Thunder Muscle');

    // Switch to Apex Formula
    await page.click('button[data-car="apex-formula"]');
    expect(await page.evaluate(() => window.game.selectedCarTypeId)).toBe('apex-formula');
    expect(await page.evaluate(() => window.game.player.physics.steerSpeed)).toBe(3.4);

    // Switch to Mud Raider
    await page.click('button[data-car="mud-raider"]');
    expect(await page.evaluate(() => window.game.selectedCarTypeId)).toBe('mud-raider');
    expect(await page.evaluate(() => window.game.player.physics.offroadResist)).toBe(0.85);

    // Switch to Drift King
    await page.click('button[data-car="drift-king"]');
    expect(await page.evaluate(() => window.game.selectedCarTypeId)).toBe('drift-king');
    expect(await page.evaluate(() => window.game.player.physics.driftGrip)).toBe(1.5);
  });

  test('Circuit switching updates 3D scene, track HUD and leaderboard records across all 5 tracks', async ({ page }) => {
    const tracks = ['pine-valley', 'alpine-summit', 'canyon-chasm', 'neon-velodrome', 'desert-dunes'];
    for (const trackId of tracks) {
      await page.click(`button[data-track="${trackId}"]`);
      expect(await page.evaluate(() => window.game.currentTrackId)).toBe(trackId);
      const activeBtn = page.locator(`button[data-track="${trackId}"]`);
      await expect(activeBtn).toHaveClass(/active/);
      await expect(page.locator('#track-best-widget')).toBeVisible();
    }

    // Submit a mock record to leaderboard and verify UI update
    await page.evaluate(() => {
      window.game.leaderboard.submitRecord('canyon-chasm', {
        lapTime: 28.45,
        raceTime: 87.20,
        carName: 'Apex Formula'
      });
      window.game.updateLeaderboardUI();
    });

    await page.click('button[data-track="canyon-chasm"]');
    await expect(page.locator('#best-lap-display')).toContainText('00:28.45');
    await expect(page.locator('#best-lap-display')).toContainText('Apex Formula');
    await expect(page.locator('#best-race-display')).toContainText('01:27.20');
  });

  test('Detailed 3D Car Geometry, Procedural Liveries, and Suspension are active in browser runtime', async ({ page }) => {
    // 1. Check player car geometry features
    const carDetails = await page.evaluate(() => {
      const player = window.game.player;
      let hasSplitter = false;
      let hasDiffuser = false;
      let hasFenders = false;
      let hasTexture = false;
      let hasBrakeCaliper = false;

      player.mesh.traverse((c) => {
        if (c.name && c.name.includes('splitter')) hasSplitter = true;
        if (c.name && c.name.includes('diffuser')) hasDiffuser = true;
        if (c.name && c.name.includes('fender')) hasFenders = true;
        if (c.name && c.name.includes('caliper')) hasBrakeCaliper = true;
        if (c.material && c.material.map) hasTexture = true;
      });

      return {
        hasSplitter,
        hasDiffuser,
        hasFenders,
        hasBrakeCaliper,
        hasTexture,
        hasSuspensionState: !!player.suspension
      };
    });

    expect(carDetails.hasSplitter).toBe(true);
    expect(carDetails.hasDiffuser).toBe(true);
    expect(carDetails.hasFenders).toBe(true);
    expect(carDetails.hasBrakeCaliper).toBe(true);
    expect(carDetails.hasTexture).toBe(true);
    expect(carDetails.hasSuspensionState).toBe(true);

    // 2. Start race and capture close-up screenshots of cars on track
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });
    
    // Zoom camera to show full vehicle in isometric 3D view
    await page.evaluate(() => {
      window.game.camera.zoom = 24;
      window.game.camera.updateProjectionMatrix();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/screenshots/car-detail-supercar.png' });

    // Switch to Mud Raider to show offroad coilovers & knobby tires
    await page.evaluate(() => {
      window.game.setCarType('mud-raider');
      window.game.camera.zoom = 24;
      window.game.camera.updateProjectionMatrix();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/screenshots/car-detail-buggy.png' });

    // Switch to Apex Formula to show open-cockpit, canards and massive rear slicks
    await page.evaluate(() => {
      window.game.setCarType('apex-formula');
      window.game.camera.zoom = 24;
      window.game.camera.updateProjectionMatrix();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/screenshots/car-detail-formula.png' });
  });

  test('Configurable lap count (3, 6, 10 laps) updates HUD and triggers race finish when reached', async ({ page }) => {
    // 1. Initial state defaults to 3 laps
    expect(await page.evaluate(() => window.game.totalLaps)).toBe(3);
    await expect(page.locator('#lap-val')).toContainText('/3');

    // 2. Select 6 laps
    await page.click('#btn-laps-6');
    expect(await page.evaluate(() => window.game.totalLaps)).toBe(6);
    expect(await page.evaluate(() => window.game.circuitTrack.totalLaps)).toBe(6);
    await expect(page.locator('#lap-val')).toContainText('/6');

    // 3. Select 10 laps
    await page.click('#btn-laps-10');
    expect(await page.evaluate(() => window.game.totalLaps)).toBe(10);
    expect(await page.evaluate(() => window.game.circuitTrack.totalLaps)).toBe(10);
    await expect(page.locator('#lap-val')).toContainText('/10');

    // 4. Set back to 3 laps and simulate race completion
    await page.click('#btn-laps-3');
    expect(await page.evaluate(() => window.game.totalLaps)).toBe(3);
    await expect(page.locator('#lap-val')).toContainText('/3');

    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Simulate player completing 3 laps
    await page.evaluate(() => {
      const g = window.game;
      const t = g.playerTracker;
      const wps = g.circuitTrack.waypoints;
      
      for (let lap = 0; lap < 3; lap++) {
        for (let i = 1; i < wps.length; i++) {
          g.circuitTrack.updateTracker(t, wps[i], 0.1);
        }
        g.circuitTrack.updateTracker(t, wps[0], 0.1);
      }
      g.updateTrackProgression(0.016);
    });

    // Game state should become FINISHED and finish modal should appear
    expect(await page.evaluate(() => window.game.playerTracker.isFinished)).toBe(true);
    expect(await page.evaluate(() => window.game.state)).toBe('FINISHED');
    await expect(page.locator('#finish-modal')).toBeVisible({ timeout: 4000 });
  });
});


