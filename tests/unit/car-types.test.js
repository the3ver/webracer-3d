import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CAR_TYPES, getCarTypeConfig } from '../../src/js/vehicles/car-types.js';
import { IsometricCar } from '../../src/js/vehicles/isometric-car.js';

describe('Vehicle Types & Trait Variations', () => {
  it('defines 5 unique playable vehicle classes with distinct gameplay traits', () => {
    assert.ok(CAR_TYPES['red-fire'], 'red-fire should exist');
    assert.ok(CAR_TYPES['thunder-muscle'], 'thunder-muscle should exist');
    assert.ok(CAR_TYPES['apex-formula'], 'apex-formula should exist');
    assert.ok(CAR_TYPES['mud-raider'], 'mud-raider should exist');
    assert.ok(CAR_TYPES['drift-king'], 'drift-king should exist');

    const red = getCarTypeConfig('red-fire');
    const muscle = getCarTypeConfig('thunder-muscle');
    const formula = getCarTypeConfig('apex-formula');
    const buggy = getCarTypeConfig('mud-raider');
    const tuner = getCarTypeConfig('drift-king');

    // Muscle Car: Highest top speed and straight line launch, but heavier
    assert.ok(muscle.maxSpeed > red.maxSpeed, 'Muscle car should have higher top speed than balanced red-fire');
    assert.ok(muscle.acceleration > red.acceleration, 'Muscle car should accelerate harder');

    // Formula: Razor-sharp steering and high cornering grip
    assert.ok(formula.steerSpeed > red.steerSpeed, 'Formula should steer faster and sharper');
    assert.ok(formula.normalGrip > red.normalGrip, 'Formula should have higher cornering grip');

    // Mud Raider: Superior offroad endurance on grass and dunes
    assert.ok(buggy.offroadResist > red.offroadResist, 'Mud raider should resist offroad slow-down better');

    // Drift King: Lower drift lateral grip for prolonged sliding
    assert.ok(tuner.driftGrip < red.driftGrip, 'Drift King should slide more easily during drifts');
  });

  it('creates IsometricCar instance with custom type geometry props and physics', () => {
    const buggy = new IsometricCar({
      typeId: 'mud-raider',
      x: 0,
      z: 0
    });

    assert.strictEqual(buggy.typeId, 'mud-raider');
    assert.strictEqual(buggy.physics.maxSpeed, 47);
    assert.strictEqual(buggy.physics.offroadResist, 0.85);

    // Check that buggy has specialized rollcage or roof decor in mesh
    let hasSpecialVisual = false;
    buggy.mesh.traverse((child) => {
      if (child.name && (child.name.includes('rollcage') || child.name.includes('spotlight') || child.name.includes('buggy'))) {
        hasSpecialVisual = true;
      }
    });
    assert.ok(hasSpecialVisual, 'Mud raider mesh should include unique offroad visual elements');

    const formula = new IsometricCar({
      typeId: 'apex-formula',
      x: 0,
      z: 0
    });
    let hasFormulaAero = false;
    formula.mesh.traverse((child) => {
      if (child.name && (child.name.includes('wing') || child.name.includes('nose') || child.name.includes('canard'))) {
        hasFormulaAero = true;
      }
    });
    assert.ok(hasFormulaAero, 'Apex formula should include aerodynamic wings and nosecone');
  });
});
