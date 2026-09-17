import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IsometricCar } from '../../src/js/vehicles/isometric-car.js';

describe('IsometricCar Pacing & Tuning', () => {
  it('initializes with relaxed arcade speeds (top speed <= 75)', () => {
    const playerCar = new IsometricCar({ isAI: false });
    assert.ok(playerCar.physics.maxSpeed <= 75, `Player maxSpeed (${playerCar.physics.maxSpeed}) should be <= 75`);
    assert.ok(playerCar.physics.acceleration <= 35, `Player acceleration (${playerCar.physics.acceleration}) should be <= 35`);

    const aiCar = new IsometricCar({ isAI: true });
    assert.ok(aiCar.physics.maxSpeed <= 70, `AI maxSpeed (${aiCar.physics.maxSpeed}) should be <= 70`);
    assert.ok(aiCar.physics.maxSpeed < playerCar.physics.maxSpeed, 'AI maxSpeed should be slightly lower than player');
  });
});
