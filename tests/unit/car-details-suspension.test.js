import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IsometricCar } from '../../src/js/vehicles/isometric-car.js';

describe('Detailed Vehicle Geometry & Staggered Wheel Proportions', () => {
  it('configures distinct staggered wheel dimensions and rim designs per vehicle class', () => {
    // 1. Apex Formula: Slim front slicks vs massive wide rear slicks
    const formula = new IsometricCar({ typeId: 'apex-formula' });
    assert.ok(formula.wheelConfig, 'Formula should define wheelConfig');
    assert.ok(
      formula.wheelConfig.rearWidth > formula.wheelConfig.frontWidth * 1.3,
      `Formula rear wheels (${formula.wheelConfig.rearWidth}) should be significantly wider than front (${formula.wheelConfig.frontWidth})`
    );

    // 2. Thunder Muscle: Staggered drag setup (taller & wider rear tires)
    const muscle = new IsometricCar({ typeId: 'thunder-muscle' });
    assert.ok(
      muscle.wheelConfig.rearRadius > muscle.wheelConfig.frontRadius,
      `Muscle rear radius (${muscle.wheelConfig.rearRadius}) should be larger than front (${muscle.wheelConfig.frontRadius}) for aggressive drag rake`
    );

    // 3. Mud Raider: Massive knobby off-road tires on all 4 corners
    const buggy = new IsometricCar({ typeId: 'mud-raider' });
    assert.ok(
      buggy.wheelConfig.frontRadius >= 0.58 && buggy.wheelConfig.rearRadius >= 0.58,
      `Mud raider should have giant offroad tires (>= 0.58), got ${buggy.wheelConfig.frontRadius}`
    );

    // 4. Wheels should contain alloy rims and brake caliper details
    let hasRimSpokes = false;
    let hasBrakeCaliper = false;
    formula.mesh.traverse((child) => {
      if (child.name && child.name.includes('rim')) hasRimSpokes = true;
      if (child.name && child.name.includes('caliper')) hasBrakeCaliper = true;
    });
    assert.ok(hasRimSpokes, 'Wheel assembly should include detailed rim geometry');
    assert.ok(hasBrakeCaliper, 'Wheel assembly should include colored brake calipers');
  });

  it('simulates independent 4-wheel suspension compression based on surface and weight transfer', () => {
    const car = new IsometricCar({ typeId: 'red-fire' });
    assert.ok(car.suspension, 'Car should initialize suspension state for 4 wheels');
    assert.strictEqual(typeof car.suspension.fl, 'number');
    assert.strictEqual(typeof car.suspension.fr, 'number');
    assert.strictEqual(typeof car.suspension.rl, 'number');
    assert.strictEqual(typeof car.suspension.rr, 'number');

    const baseFrontY = car.wheels.fl.position.y;
    const baseRearY = car.wheels.rl.position.y;

    // 1. Driving on rough curb or offroad surface creates suspension movement
    car.physics.speed = 30;
    car.physics.vx = 30;
    car.update(0.05, { throttle: 1, steer: 0 }, { surface: 'curb' });
    
    // Position of wheel should be modified by suspension travel
    assert.notStrictEqual(
      car.wheels.fl.position.y,
      baseFrontY,
      'Curb surface should induce dynamic suspension displacement on front wheels'
    );

    // 2. Hard braking transfers weight forward (front compresses, rear extends)
    const brakeCar = new IsometricCar({ typeId: 'thunder-muscle' });
    brakeCar.physics.speed = 40;
    brakeCar.physics.vx = 40;
    brakeCar.update(0.1, { throttle: -1, steer: 0 }, { surface: 'asphalt' });

    assert.ok(
      brakeCar.suspension.fl > brakeCar.suspension.rl,
      `Front suspension (${brakeCar.suspension.fl}) should compress more than rear (${brakeCar.suspension.rl}) during hard braking`
    );

    // 3. Mud Raider should feature visible 3D coilover suspension springs
    const buggy = new IsometricCar({ typeId: 'mud-raider' });
    let hasSprings = false;
    buggy.mesh.traverse((child) => {
      if (child.name && (child.name.includes('spring') || child.name.includes('shock') || child.name.includes('suspension'))) {
        hasSprings = true;
      }
    });
    assert.ok(hasSprings, 'Mud raider should have visible 3D coilover suspension springs');
  });

  it('generates curved aerodynamic body contours and high-detail procedural livery textures', () => {
    const supercar = new IsometricCar({ typeId: 'red-fire' });
    
    // 1. Should feature procedural racing livery texture with clearcoat material
    let bodyMesh = null;
    supercar.mesh.traverse((child) => {
      if (child.name === 'car_main_body' || child.name === 'car_aero_shell') {
        bodyMesh = child;
      }
    });

    assert.ok(bodyMesh, 'Main car body mesh should exist');
    assert.ok(bodyMesh.material, 'Body material should be assigned');
    assert.ok(bodyMesh.material.map, 'Body material should feature procedural livery texture map');

    // 2. Body should feature aerodynamic curved components (splitter, diffuser, curved fenders)
    let hasSplitter = false;
    let hasDiffuser = false;
    let hasCurvedFenders = false;

    supercar.mesh.traverse((child) => {
      if (child.name && child.name.includes('splitter')) hasSplitter = true;
      if (child.name && child.name.includes('diffuser')) hasDiffuser = true;
      if (child.name && (child.name.includes('fender') || child.name.includes('arch'))) hasCurvedFenders = true;
    });

    assert.ok(hasSplitter, 'Supercar should have aerodynamic front splitter');
    assert.ok(hasDiffuser, 'Supercar should have rear aerodynamic diffuser');
    assert.ok(hasCurvedFenders, 'Supercar should have sculpted curved wheel arch fenders');
  });
});
