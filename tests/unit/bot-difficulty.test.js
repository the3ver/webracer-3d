import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RacerAI, DIFFICULTY_PROFILES, getBotCarConfig } from '../../src/js/ai/racer-ai.js';
import { ArcadePhysics } from '../../src/js/physics/arcade-physics.js';
import { getGridSpots } from '../../src/js/track/track-data.js';

describe('Bot Difficulty & AI Driving Profiles', () => {
  it('exposes difficulty profiles for beginner, medium, and pro', () => {
    assert.ok(DIFFICULTY_PROFILES.beginner, 'beginner profile should exist');
    assert.ok(DIFFICULTY_PROFILES.medium, 'medium profile should exist');
    assert.ok(DIFFICULTY_PROFILES.pro, 'pro profile should exist');

    assert.ok(DIFFICULTY_PROFILES.beginner.cornerSpeedHairpin < DIFFICULTY_PROFILES.pro.cornerSpeedHairpin,
      'Pro should carry higher cornering speed than beginner');
    assert.ok(DIFFICULTY_PROFILES.pro.canDrift === true, 'Pro profile should enable power-drifting');
    assert.ok(DIFFICULTY_PROFILES.beginner.canDrift === false, 'Beginner profile should not power-drift');
  });

  it('pro level AI initiates controlled handbrake drift when entering sharp corner at speed', () => {
    const waypoints = [
      { x: 0, z: 0 },
      { x: 0, z: 40 } // 90 degree sharp corner
    ];

    const car = new ArcadePhysics({
      x: 0,
      z: 0,
      angle: 0, // facing +X
      speed: 40,
      maxSpeed: 50,
      acceleration: 22
    });

    const proAI = new RacerAI({
      waypoints,
      difficulty: 'pro'
    });

    const input = proAI.computeInput(car, 1);
    assert.strictEqual(input.handbrake, true, 'Pro bot should engage handbrake to rotate quickly through hairpin');

    const beginnerAI = new RacerAI({
      waypoints,
      difficulty: 'beginner'
    });
    const beginnerInput = beginnerAI.computeInput(car, 1);
    assert.strictEqual(beginnerInput.handbrake, false, 'Beginner bot should never engage handbrake');
  });

  it('computes fair vehicle performance parameters across difficulty tiers', () => {
    const playerParams = { maxSpeed: 50, acceleration: 22 };

    const proBot1 = getBotCarConfig('pro', 0);
    const proBot2 = getBotCarConfig('pro', 1);

    // Pro bots must not exceed player parameters (no unfair cheating)
    assert.strictEqual(proBot1.maxSpeed, playerParams.maxSpeed, 'Pro bot maxSpeed should match player maxSpeed');
    assert.strictEqual(proBot1.acceleration, playerParams.acceleration, 'Pro bot acceleration should match player');
    assert.strictEqual(proBot2.maxSpeed, playerParams.maxSpeed, 'All pro bots should have fair maxSpeed');

    const mediumBot = getBotCarConfig('medium', 0);
    assert.ok(mediumBot.maxSpeed < playerParams.maxSpeed, 'Medium bot should be moderately paced');

    const beginnerBot = getBotCarConfig('beginner', 0);
    assert.ok(beginnerBot.maxSpeed < mediumBot.maxSpeed, 'Beginner bot should be slower and gentle');
  });

  it('provides configurable grid spots for variable bot counts (1 to 5 bots)', () => {
    const spots1 = getGridSpots('pine-valley', 1);
    assert.strictEqual(spots1.length, 2, '1 bot should yield 2 total vehicles (Player + 1 Bot)');

    const spots2 = getGridSpots('pine-valley', 2);
    assert.strictEqual(spots2.length, 3, '2 bots should yield 3 total vehicles');

    const spots3 = getGridSpots('pine-valley', 3);
    assert.strictEqual(spots3.length, 4, '3 bots should yield 4 total vehicles (default)');

    const spots5 = getGridSpots('pine-valley', 5);
    assert.strictEqual(spots5.length, 6, '5 bots should yield 6 total vehicles');

    // Spots should maintain safe spacing so cars do not spawn inside each other
    for (let i = 0; i < spots5.length; i++) {
      for (let j = i + 1; j < spots5.length; j++) {
        const d = Math.hypot(spots5[i].x - spots5[j].x, spots5[i].z - spots5[j].z);
        assert.ok(d >= 5.0, `Grid spots ${i} and ${j} should maintain >= 5m clearance`);
      }
    }
  });
});
