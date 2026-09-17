import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TRACK_CONFIG, TRACK_WAYPOINTS } from '../../src/js/track/track-data.js';
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

  it('ensures background terrain hills maintain clear clearance from all track waypoints (especially Turn 1)', () => {
    const builder = new CircuitMeshBuilder(TRACK_WAYPOINTS, TRACK_CONFIG.trackWidth);
    const group = builder.build();

    const hills = [];
    group.traverse((child) => {
      if (child.name === 'background_hill') {
        hills.push({
          x: child.position.x,
          z: child.position.z,
          radius: child.geometry.parameters.radius
        });
      }
    });

    assert.ok(hills.length > 0, 'Circuit should contain background hills');

    // Check each hill against all track waypoints
    const halfWidth = TRACK_CONFIG.trackWidth * 0.5;
    for (const hill of hills) {
      for (let i = 0; i < TRACK_WAYPOINTS.length; i++) {
        const wp = TRACK_WAYPOINTS[i];
        const dist = Math.hypot(hill.x - wp.x, hill.z - wp.z);
        const minSafeDist = hill.radius + halfWidth;
        assert.ok(
          dist >= minSafeDist - 2.0,
          `Hill at (${hill.x}, ${hill.z}) with radius ${hill.radius} encroaches on waypoint ${i} (${wp.x}, ${wp.z}) (dist=${dist.toFixed(1)}, minSafe=${minSafeDist.toFixed(1)})`
        );
      }
    }
  });
});
