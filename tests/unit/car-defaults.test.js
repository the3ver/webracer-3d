import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IsometricCar } from '../../src/js/vehicles/isometric-car.js';

describe('IsometricCar Pacing & Tuning', () => {
  it('initializes with comfortable cruising arcade speeds (top speed <= 55)', () => {
    const playerCar = new IsometricCar({ isAI: false });
    assert.ok(playerCar.physics.maxSpeed <= 55, `Player maxSpeed (${playerCar.physics.maxSpeed}) should be <= 55`);
    assert.ok(playerCar.physics.acceleration <= 25, `Player acceleration (${playerCar.physics.acceleration}) should be <= 25`);

    const aiCar = new IsometricCar({ isAI: true });
    assert.ok(aiCar.physics.maxSpeed <= 48, `AI maxSpeed (${aiCar.physics.maxSpeed}) should be <= 48`);
    assert.ok(aiCar.physics.maxSpeed < playerCar.physics.maxSpeed, 'AI maxSpeed should be slightly lower than player');
  });
});
