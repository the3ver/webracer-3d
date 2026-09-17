import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArcadePhysics } from '../../src/js/physics/arcade-physics.js';

describe('ArcadePhysics', () => {
  it('accelerates forward when throttle is positive', () => {
    const physics = new ArcadePhysics({
      x: 0,
      z: 0,
      angle: 0, // facing along +X
      maxSpeed: 100,
      acceleration: 40
    });

    assert.equal(physics.speed, 0);
    assert.equal(physics.x, 0);
    assert.equal(physics.z, 0);

    // Update with full throttle for 0.5 seconds
    physics.update(0.5, { throttle: 1, steer: 0, handbrake: false });

    // Speed should have increased: 0 + 40 * 0.5 = 20
    assert.ok(physics.speed > 0, 'Speed should be greater than 0');
    assert.equal(Math.round(physics.speed), 20);
    assert.ok(physics.x > 0, 'Position X should have advanced forward');
    assert.equal(physics.z, 0, 'Position Z should remain unchanged along heading');
  });

  it('brakes to zero when moving forward and reverses when stopped', () => {
    const physics = new ArcadePhysics({
      x: 0,
      z: 0,
      angle: 0,
      speed: 30,
      brakeDecel: 60,
      reverseMaxSpeed: 20,
      acceleration: 40
    });

    // Braking while moving forward
    physics.update(0.5, { throttle: -1, steer: 0 });
    // Speed should drop from 30: 30 - 60 * 0.5 = 0
    assert.equal(physics.speed, 0, 'Speed should reach 0 after braking');

    // Continuing negative throttle should now engage reverse
    physics.update(0.5, { throttle: -1, steer: 0 });
    assert.ok(physics.speed < 0, 'Speed should be negative in reverse');
    assert.equal(physics.speed, -10); // 0 - (40*0.5)*0.5 = -10
  });

  it('induces lateral slide and drift when handbrake is engaged during cornering', () => {
    const physics = new ArcadePhysics({
      x: 0,
      z: 0,
      angle: 0,
      speed: 60,
      steerSpeed: 3.0
    });

    // Run a frame without handbrake: heading turns, velocity follows closely
    physics.update(0.1, { throttle: 1, steer: 1, handbrake: false });
    const normalSlip = physics.slipAngle;

    // Run another frame with handbrake engaged: grip should be lower, slip angle higher
    physics.update(0.1, { throttle: 1, steer: 1, handbrake: true });
    assert.ok(physics.isDrifting, 'Car should be in drift state when handbraking at speed');
    assert.ok(physics.slipAngle > normalSlip, 'Slip angle should be higher during handbrake drift');
  });

  it('restricts top speed and acceleration on off-track grass surface', () => {
    const physics = new ArcadePhysics({
      x: 0,
      z: 0,
      angle: 0,
      maxSpeed: 100,
      acceleration: 50
    });

    const grassSurface = {
      friction: 0.5,
      maxSpeedMultiplier: 0.4, // top speed on grass is 40
      grip: 0.5
    };

    // Accelerate on grass for 3 seconds
    for (let i = 0; i < 30; i++) {
      physics.update(0.1, { throttle: 1, steer: 0 }, grassSurface);
    }

    assert.ok(physics.speed <= 40.01, `Speed on grass (${physics.speed}) should not exceed grass maxSpeed (40)`);
    assert.ok(physics.speed >= 35, `Speed should have accelerated close to grass cap`);
  });

  it('reflects velocity and resolves penetration upon colliding with a barrier', () => {
    const physics = new ArcadePhysics({
      x: 10,
      z: 0,
      angle: 0,
      speed: 50
    });
    physics.vx = 50;
    physics.vz = 0;

    // Suppose there is a barrier plane at x = 11 with normal (-1, 0)
    // Vehicle with radius 1.8 has penetrated by (10 + 1.8 - 11) = 0.8
    const barrier = {
      closestPoint: { x: 11, z: 0 },
      normal: { x: -1, z: 0 }, // pointing back into the track
      penetration: 0.8
    };

    const collisionOccurred = physics.resolveBarrierCollision(barrier, 0.5); // restitution = 0.5
    assert.equal(collisionOccurred, true);
    // Position should be pushed back along normal: 10 + (-1 * -0.8) -> x <= 10 - 0.8 = 9.2
    assert.ok(physics.x <= 9.25, `Vehicle x (${physics.x}) should be pushed out of barrier`);
    // Velocity vx was +50, after reflection against normal (-1, 0) with restitution 0.5:
    // v'x = 50 - (1 + 0.5)*(50 * -1)*(-1) = 50 - 75 = -25
    assert.ok(physics.vx < 0, `Velocity X (${physics.vx}) should have reflected backwards`);
    assert.equal(Math.round(physics.vx), -25);
  });

  it('separates two colliding vehicles and exchanges momentum', () => {
    const carA = new ArcadePhysics({
      x: 0,
      z: 0,
      radius: 2.0,
      speed: 30
    });
    carA.vx = 30;
    carA.vz = 0;

    const carB = new ArcadePhysics({
      x: 3.0, // overlap: dist is 3.0, sum of radii is 4.0 -> penetration 1.0
      z: 0,
      radius: 2.0,
      speed: 0
    });
    carB.vx = 0;
    carB.vz = 0;

    const collided = carA.resolveVehicleCollision(carB, 0.5);
    assert.equal(collided, true);

    // Positions should now be separated by at least radii sum (4.0)
    const newDist = Math.hypot(carB.x - carA.x, carB.z - carA.z);
    assert.ok(newDist >= 3.99, `Cars should be pushed apart (actual dist: ${newDist})`);

    // Car B should gain forward momentum from Car A
    assert.ok(carB.vx > 0, `Car B should gain positive X momentum`);
    assert.ok(carA.vx < 30, `Car A should lose speed upon bumping Car B`);
  });
});
