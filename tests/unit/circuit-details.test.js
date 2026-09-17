import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TRACK_CONFIG } from '../../src/js/track/track-data.js';
import { CircuitMeshBuilder } from '../../src/js/track/circuit-mesh.js';

describe('Pine Valley Circuit Theme & Details', () => {
  it('defines the Pine Valley Circuit theme name in track config', () => {
    assert.match(TRACK_CONFIG.name, /Pine Valley|Kiefernwald/, 'Track config should have the Pine Valley circuit theme name');
  });

  it('builds detailed circuit props including grandstand, sponsor banners, and gravel traps', () => {
    const waypoints = [
      { x: 0, z: -40 },
      { x: 40, z: -40 },
      { x: 40, z: 40 },
      { x: 0, z: 40 }
    ];
    const builder = new CircuitMeshBuilder(waypoints, 16);
    const group = builder.build();

    let hasGrandstand = false;
    let hasBanners = false;
    let hasGravel = false;

    group.traverse((child) => {
      if (child.name === 'grandstand') hasGrandstand = true;
      if (child.name === 'sponsor_banner') hasBanners = true;
      if (child.name === 'gravel_trap') hasGravel = true;
    });

    assert.ok(hasGrandstand, 'Scene should contain at least one grandstand structure');
    assert.ok(hasBanners, 'Track should feature sponsor advertising barriers');
    assert.ok(hasGravel, 'Track corners should feature gravel runoff traps');
  });
});
