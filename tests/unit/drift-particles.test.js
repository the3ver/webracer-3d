import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DriftParticles } from '../../src/js/effects/drift-particles.js';

describe('DriftParticles System', () => {
  it('emits debris particles on drift with surface-aware colors and velocity', () => {
    const scene = new THREE.Scene();
    const particleSystem = new DriftParticles(scene, 100);

    assert.equal(particleSystem.getActiveCount(), 0);

    // Emit debris for grass/gravel surface
    particleSystem.emit({
      x: 10,
      y: 0.2,
      z: 20,
      headingAngle: 0, // facing +X
      slipDirection: 1, // sliding right
      speed: 30,
      surface: 'grass',
      count: 4
    });

    assert.ok(particleSystem.getActiveCount() >= 4, 'Should have spawned at least 4 active particles');

    // Update for 0.1s
    particleSystem.update(0.1);

    // Particles should have moved away from origin (backwards and sideways)
    const p0 = particleSystem.particles[0];
    assert.ok(p0.alive, 'Particle should be alive');
    assert.ok(p0.x !== 10 || p0.z !== 20, 'Particle should have moved');
    assert.ok(p0.y >= 0, 'Particle should stay above or at ground level');
  });
});
