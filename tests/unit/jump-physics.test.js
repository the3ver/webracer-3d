import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArcadePhysics } from '../../src/js/physics/arcade-physics.js';
import { CircuitTrack } from '../../src/js/track/circuit-track.js';
import { IsometricCar } from '../../src/js/vehicles/isometric-car.js';

describe('ArcadePhysics Jump Mechanics', () => {
  it('launches vehicle into the air, follows ballistic arc and lands cleanly', () => {
    const car = new ArcadePhysics({
      x: 0,
      z: 0,
      angle: 0,
      speed: 40
    });

    assert.equal(car.y, 0);
    assert.equal(car.isAirborne, false);

    // Launch off ramp with vertical impulse
    car.launchJump(12.0); // 12 m/s vertical lift

    assert.equal(car.isAirborne, true);
    assert.ok(car.vy > 0, 'Vertical velocity should be positive');

    // Simulate airborne physics for 0.3s
    car.update(0.3, { throttle: 1, steer: 0 });
    assert.ok(car.y > 1.5, `Car should be elevated in the air (got y=${car.y})`);
    assert.equal(car.isAirborne, true);

    // Simulate until landing (e.g. 1.2s total)
    for (let i = 0; i < 20; i++) {
      car.update(0.06, { throttle: 1, steer: 0 });
    }

    assert.equal(car.y, 0, 'Car should land at ground level');
    assert.equal(car.isAirborne, false, 'Car should no longer be airborne after landing');
    assert.equal(car.vy, 0, 'Vertical velocity should reset to 0');
  });

  it('detects ramp collision on the ramp lane but leaves the bypass lane clear', () => {
    const waypoints = [
      { x: 0, z: 70 },
      { x: -100, z: 70 }
    ];
    const ramps = [
      {
        id: 'back_straight_ramp',
        x: -40,
        z: 73.5, // placed on one side of track centerline (z=70)
        width: 6.0,
        length: 7.0,
        height: 2.2,
        liftVelocity: 14.0
      }
    ];

    const track = new CircuitTrack({ waypoints, trackWidth: 16, ramps });

    // 1. Car driving straight onto the ramp lane (z = 73.5)
    const rampHit = track.checkRamp(-40, 73.5, 1.8);
    assert.ok(rampHit, 'Car on ramp lane should hit the ramp');
    assert.equal(rampHit.liftVelocity, 14.0);

    // 2. Car driving on the bypass lane (z = 66.0, on other side of track)
    const bypass = track.checkRamp(-40, 66.0, 1.8);
    assert.equal(bypass, null, 'Bypass lane should not trigger ramp jump');
  });

  it('elevates IsometricCar mesh and preserves grounded drop shadow when airborne', () => {
    const car = new IsometricCar({ x: 0, z: 0 });
    car.physics.launchJump(12.0);
    car.update(0.2, { throttle: 1 });

    assert.ok(car.physics.isAirborne, 'Car should be airborne');
    assert.ok(car.physics.y > 0, 'Physics y should be > 0');
    assert.equal(car.mesh.position.y, car.physics.y, 'Car mesh y should match physics y');
    assert.ok(car.shadowMesh, 'Car should have shadowMesh property');
    const worldShadowY = car.mesh.position.y + car.shadowMesh.position.y;
    assert.ok(Math.abs(worldShadowY - 0.03) < 0.001, 'Drop shadow should stay on ground plane');
    assert.ok(car.shadowMesh.material.opacity < 0.45, 'Shadow should diffuse/fade as car gains altitude');
  });

  it('disables steering heading change and preserves horizontal velocity while airborne', () => {
    const car = new ArcadePhysics({
      x: 0,
      z: 0,
      angle: Math.PI,
      speed: 30
    });

    const initialAngle = car.angle;
    const initialVx = car.vx;
    const initialVz = car.vz;

    // Launch into air
    car.launchJump(14.0);
    assert.equal(car.isAirborne, true);

    // Try hard steering while airborne
    car.update(0.2, { throttle: 1, steer: 1.0 });

    assert.equal(car.angle, initialAngle, 'Heading angle should not rotate while airborne');
    assert.equal(car.vx, initialVx, 'Horizontal vx should remain unaffected by steering while airborne');
    assert.equal(car.vz, initialVz, 'Horizontal vz should remain unaffected by steering while airborne');
  });
});
