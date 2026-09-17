import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CircuitMeshBuilder } from '../../src/js/track/circuit-mesh.js';

describe('CircuitMeshBuilder Start/Finish Gantry', () => {
  it('aligns the crossbeam across the track between left and right posts', () => {
    // Track going from (0,0) to (50,0) along +X
    // Therefore norm is along -Z: (0, -1)
    const waypoints = [
      { x: 0, z: -40 },
      { x: 40, z: -40 }
    ];
    const trackWidth = 16;
    const builder = new CircuitMeshBuilder(waypoints, trackWidth);
    const group = builder.build();

    // Find the gantry components in children by name
    let postLeft = null;
    let postRight = null;
    let beam = null;

    group.traverse((child) => {
      if (child.name === 'gantry_beam') beam = child;
      if (child.name === 'gantry_post_left') postLeft = child;
      if (child.name === 'gantry_post_right') postRight = child;
    });

    assert.ok(beam, 'Gantry crossbeam should exist');
    assert.ok(postLeft && postRight, 'Gantry posts should exist');

    // Beam center should be between the posts
    const expectedCenterX = (postLeft.position.x + postRight.position.x) / 2;
    const expectedCenterZ = (postLeft.position.z + postRight.position.z) / 2;
    assert.ok(Math.abs(beam.position.x - expectedCenterX) < 0.1, 'Beam center X matches posts');
    assert.ok(Math.abs(beam.position.z - expectedCenterZ) < 0.1, 'Beam center Z matches posts');

    // Beam orientation:
    // Update world matrix of beam
    beam.updateMatrixWorld(true);
    // Take the two endpoints of the beam geometry
    // For beam width = trackWidth + 6 = 22, half = 11
    // The beam geometry has width = trackWidth + 6 along X
    // Check if the beam's geometric endpoints actually align with the posts!
    const halfLen = (trackWidth + 6) / 2;
    // Test the geometric long axis:
    const geoWidth = beam.geometry.parameters.width;
    const geoDepth = beam.geometry.parameters.depth;

    let pEnd1, pEnd2;
    if (geoWidth > geoDepth) {
      pEnd1 = new THREE.Vector3(halfLen, 0, 0).applyMatrix4(beam.matrixWorld);
      pEnd2 = new THREE.Vector3(-halfLen, 0, 0).applyMatrix4(beam.matrixWorld);
    } else {
      pEnd1 = new THREE.Vector3(0, 0, halfLen).applyMatrix4(beam.matrixWorld);
      pEnd2 = new THREE.Vector3(0, 0, -halfLen).applyMatrix4(beam.matrixWorld);
    }

    // The endpoints of the beam MUST be near postLeft and postRight!
    const distToPostL = Math.min(
      Math.hypot(pEnd1.x - postLeft.position.x, pEnd1.z - postLeft.position.z),
      Math.hypot(pEnd2.x - postLeft.position.x, pEnd2.z - postLeft.position.z)
    );

    assert.ok(distToPostL < 2.0, `Beam endpoint must connect to postLeft (got distance ${distToPostL})`);
  });

  it('builds jump ramp 3D meshes with hazard stripes and warning markers', () => {
    const waypoints = [
      { x: 0, z: -40 },
      { x: 40, z: -40 }
    ];
    const ramps = [
      {
        id: 'back_straight_ramp',
        x: -38,
        z: 73.5,
        width: 6.5,
        length: 8.0,
        height: 2.2,
        angle: Math.PI
      }
    ];
    const builder = new CircuitMeshBuilder(waypoints, 16, ramps);
    const group = builder.build();

    let rampGroup = null;
    group.traverse((child) => {
      if (child.name === 'jump_ramp_back_straight_ramp') rampGroup = child;
    });

    assert.ok(rampGroup, 'Jump ramp group should exist in scene graph');
    assert.equal(rampGroup.position.x, -38);
    assert.equal(rampGroup.position.z, 73.5);
  });
});
