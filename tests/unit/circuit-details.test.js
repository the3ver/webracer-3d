import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
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

  it('aligns grandstand and pit building parallel to the start/finish straight', () => {
    // Straight track section from (0, -40) to (50, -40) along +X
    const waypoints = [
      { x: 0, z: -40 },
      { x: 50, z: -40 },
      { x: 50, z: 20 },
      { x: 0, z: 20 }
    ];
    const dir = new THREE.Vector3(50, 0, 0).normalize();
    const builder = new CircuitMeshBuilder(waypoints, 16);
    const group = builder.build();

    let grandstand = null;
    let pitBuilding = null;
    group.traverse((child) => {
      if (child.name === 'grandstand') grandstand = child;
      if (child.name === 'pit_building') pitBuilding = child;
    });

    assert.ok(grandstand, 'Grandstand should exist in scene');
    grandstand.updateMatrixWorld(true);

    // The grandstand's long axis (width 32) is along local X:
    const standLongAxis = new THREE.Vector3(1, 0, 0).transformDirection(grandstand.matrixWorld).normalize();
    const standDot = Math.abs(standLongAxis.dot(dir));
    assert.ok(standDot > 0.95, `Grandstand long axis must be parallel to track straight (dot=${standDot.toFixed(3)})`);

    // Verify grandstand faces towards the track (-norm)
    // Tiers step back along local +Z, so front view is looking along local -Z
    const norm = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const standFacing = new THREE.Vector3(0, 0, -1).transformDirection(grandstand.matrixWorld).normalize();
    const facingDot = standFacing.dot(new THREE.Vector3(-norm.x, 0, -norm.z));
    assert.ok(facingDot > 0.95, `Grandstand must face towards the track (got dot=${facingDot.toFixed(3)})`);

    if (pitBuilding) {
      pitBuilding.updateMatrixWorld(true);
      const pitLongAxis = new THREE.Vector3(1, 0, 0).transformDirection(pitBuilding.matrixWorld).normalize();
      const pitDot = Math.abs(pitLongAxis.dot(dir));
      assert.ok(pitDot > 0.95, `Pit building long axis must be parallel to track straight (dot=${pitDot.toFixed(3)})`);
    }
  });

  it('builds seamless continuous alternating red and white curb strips without overlapping box geometries', () => {
    // Sharp curve where discrete boxes previously overlapped
    const waypoints = [
      { x: 0, z: 0 },
      { x: 30, z: 0 },
      { x: 30, z: 20 },
      { x: 0, z: 20 }
    ];
    const builder = new CircuitMeshBuilder(waypoints, 16);
    const group = builder.build();

    let curbsRed = null;
    let curbsWhite = null;
    let discreteOverlappingBoxes = 0;

    group.traverse((child) => {
      if (child.name === 'curbs_red') curbsRed = child;
      if (child.name === 'curbs_white') curbsWhite = child;
      if (child.geometry instanceof THREE.BoxGeometry && child.geometry.parameters.height === 0.14) {
        discreteOverlappingBoxes++;
      }
    });

    assert.equal(discreteOverlappingBoxes, 0, 'No discrete overlapping box meshes should be used for curbs');
    assert.ok(curbsRed && curbsWhite, 'Curbs should be built as unified red and white ribbon geometries');
    assert.ok(curbsRed.geometry.getAttribute('position').count > 0);
    assert.ok(curbsWhite.geometry.getAttribute('position').count > 0);
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
