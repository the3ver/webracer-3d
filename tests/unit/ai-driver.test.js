import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RacerAI } from '../../src/js/ai/racer-ai.js';
import { ArcadePhysics } from '../../src/js/physics/arcade-physics.js';

describe('RacerAI Driver', () => {
  it('calculates steering and throttle towards upcoming waypoint', () => {
    const waypoints = [
      { x: 0, z: 0 },
      { x: 50, z: 50 },
      { x: 100, z: 50 },
      { x: 100, z: 0 }
    ];

    const car = new ArcadePhysics({
      x: 0,
      z: 0,
      angle: 0, // facing +X
      speed: 20
    });

    const ai = new RacerAI({
      waypoints,
      lookaheadDistance: 20,
      aggressiveness: 1.0
    });

    const input = ai.computeInput(car, 1); // target waypoint index 1: (50, 50)

    assert.ok(input.throttle > 0, 'AI should apply positive throttle');
    // Target is to the right/left in 2D angle (angle 0 is +X, (50, 50) is +Z so angle +PI/4)
    assert.ok(input.steer > 0, 'AI should steer towards waypoint');
    assert.ok(input.steer <= 1.0, 'Steering input should not exceed 1.0');
  });

  it('slows down or brakes when approaching a sharp corner at high speed', () => {
    const waypoints = [
      { x: 0, z: 0 },
      { x: 0, z: 50 } // 90 degree turn perpendicular to car heading
    ];

    const car = new ArcadePhysics({
      x: 0,
      z: 0,
      angle: 0, // facing +X
      speed: 100, // travelling fast
      maxSpeed: 100
    });

    const ai = new RacerAI({ waypoints });
    const input = ai.computeInput(car, 1);

    // Because car is moving at 100 towards a 90 deg turn (targetSpeed is ~42), it must brake
    assert.ok(input.throttle < 0, `Throttle (${input.throttle}) should be negative (braking) before sharp turn`);
  });
});
