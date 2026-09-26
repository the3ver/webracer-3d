import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Visual Track Inspections', () => {
  test('Captures screenshots of Canyon Chasm and Neon Speedway banked curve', async ({ page }) => {
    test.setTimeout(60000);
    fs.mkdirSync('tests/screenshots', { recursive: true });

    await page.goto('/');

    // 1. Red Rock Canyon: Jump Ramp & 22m Ravine Gap
    await page.click('#btn-track-canyon');
    await expect(page.locator('#circuit-title')).toContainText('CANYON');
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Position player just before the ravine jump ramp facing west into the gorge
    await page.evaluate(() => {
      window.game.player.physics.x = 58;
      window.game.player.physics.z = 92;
      window.game.player.physics.angle = Math.PI;
      window.game.player.physics.speed = 0;
      window.game.updateCamera(0.016);
    });

    await page.waitForTimeout(600);
    const canyonPath = 'tests/screenshots/canyon-chasm-gap.png';
    await page.screenshot({ path: canyonPath });
    expect(fs.existsSync(canyonPath)).toBe(true);

    // 2. Return to Menu & Switch to Neon Velodrome
    await page.evaluate(() => {
      window.game.playerTracker.completedLaps = window.game.totalLaps;
      window.game.playerTracker.isFinished = true;
      window.game.playerTracker.bestLapTime = 38.45;
      window.game.updateTrackProgression(0.01);
    });
    await expect(page.locator('#finish-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#btn-to-menu')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/finish-menu-button.png' });

    await page.click('#btn-to-menu');
    await expect(page.locator('#overlay-screen')).toHaveClass(/visible/);

    // 3. Neon Velodrome: Elevated Banked Curve & Cyberpunk Skyline
    await page.click('#btn-track-velodrome');
    await expect(page.locator('#circuit-title')).toContainText('VELODROME');
    await page.click('#btn-start');
    await page.waitForFunction(() => window.game && window.game.state === 'RACING', { timeout: 8000 });

    // Position player right on the high-banked sweeper
    await page.evaluate(() => {
      window.game.player.physics.x = 125;
      window.game.player.physics.z = 25;
      window.game.player.physics.angle = Math.PI * 0.5;
      window.game.player.physics.speed = 25;
      window.game.updateCamera(0.016);
    });

    await page.waitForTimeout(600);
    const veloPath = 'tests/screenshots/neon-velodrome-banking.png';
    await page.screenshot({ path: veloPath });
    expect(fs.existsSync(veloPath)).toBe(true);
  });
});
