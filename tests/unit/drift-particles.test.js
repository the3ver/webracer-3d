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

  it('emits high-contrast tire smoke and debris on asphalt with visible size and colors', () => {
    const scene = new THREE.Scene();
    const particleSystem = new DriftParticles(scene, 50);

    particleSystem.emit({
      x: 0,
      y: 0.2,
      z: 0,
      headingAngle: 0,
      slipDirection: 1,
      speed: 25,
      surface: 'asphalt',
      count: 10
    });

    const activeParticles = particleSystem.particles.filter(p => p.alive);
    assert.equal(activeParticles.length, 10);

    // Particle scale should be well-proportioned and subtle (between 0.6 and 1.5)
    for (const p of activeParticles) {
      assert.ok(p.scale >= 0.6 && p.scale <= 1.5, `Particle scale (${p.scale}) should be subtle and well-proportioned`);
    }

    // Check that at least some particles have high-contrast bright smoke colors
    let hasBrightSmoke = false;
    const color = new THREE.Color();
    for (let i = 0; i < 10; i++) {
      particleSystem.mesh.getColorAt(i, color);
      const luminance = (color.r + color.g + color.b) / 3;
      if (luminance > 0.5) {
        hasBrightSmoke = true;
        break;
      }
    }
    assert.ok(hasBrightSmoke, 'Asphalt drift should emit high-contrast white/light-grey smoke particles');
  });

  it('disables frustum culling on InstancedMesh so particles are not culled when camera tracks away from origin', () => {
    const scene = new THREE.Scene();
    const particleSystem = new DriftParticles(scene, 100);

    assert.equal(particleSystem.mesh.frustumCulled, false, 'InstancedMesh must have frustumCulled set to false');
    assert.equal(particleSystem.mesh.material.vertexColors, false, 'Material should not use vertexColors without geometry vertex colors');
  });
});
