import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TRACK_PRESETS, getTrackPreset, TRACK_CONFIG } from '../../src/js/track/track-data.js';
import { CircuitMeshBuilder } from '../../src/js/track/circuit-mesh.js';

describe('Track Presets & Alpine Summit Circuit', () => {
  it('defines both Pine Valley and Alpine Summit track presets', () => {
    assert.ok(TRACK_PRESETS, 'TRACK_PRESETS map should exist');
    assert.ok(TRACK_PRESETS['pine-valley'], 'Pine Valley preset should exist');
    assert.ok(TRACK_PRESETS['alpine-summit'], 'Alpine Summit preset should exist');

    const pine = getTrackPreset('pine-valley');
    assert.match(pine.name, /Pine Valley/);
    assert.ok(pine.waypoints.length >= 10);
    assert.ok(pine.ramps && pine.ramps.length > 0, 'Pine Valley should feature jump ramp');

    const alpine = getTrackPreset('alpine-summit');
    assert.match(alpine.name, /Alpine/);
    assert.ok(alpine.waypoints.length >= 10);
    assert.ok(alpine.tunnels && alpine.tunnels.length > 0, 'Alpine Summit should feature tunnel structure');
  });

  it('builds Alpine Summit circuit mesh with 3D tunnel structure and mountain scenery', () => {
    const alpine = getTrackPreset('alpine-summit');
    const builder = new CircuitMeshBuilder(alpine.waypoints, alpine.trackWidth, alpine.ramps, {
      theme: 'alpine-summit',
      tunnels: alpine.tunnels
    });
    const group = builder.build();

    let tunnelFound = false;
    let portalEntranceFound = false;
    let portalExitFound = false;

    group.traverse((child) => {
      if (child.name === 'tunnel_structure') tunnelFound = true;
      if (child.name === 'tunnel_portal_entrance') portalEntranceFound = true;
      if (child.name === 'tunnel_portal_exit') portalExitFound = true;
    });

    assert.ok(tunnelFound, 'Scene should contain 3D tunnel structure');
    assert.ok(portalEntranceFound, 'Tunnel entrance portal should exist');
    assert.ok(portalExitFound, 'Tunnel exit portal should exist');
  });

  it('guarantees that Alpine Summit track ribbon has zero inverted triangles', () => {
    const alpine = getTrackPreset('alpine-summit');
    const builder = new CircuitMeshBuilder(alpine.waypoints, alpine.trackWidth, alpine.ramps, {
      theme: 'alpine-summit',
      tunnels: alpine.tunnels
    });
    const group = builder.build();

    let asphalt = null;
    group.traverse((o) => {
      if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === '1f2022') {
        asphalt = o;
      }
    });

    assert.ok(asphalt, 'Alpine asphalt mesh should exist');
    const pos = asphalt.geometry.getAttribute('position');
    const idx = asphalt.geometry.getIndex();

    let invertedTriangles = 0;
    for (let i = 0; i < idx.count; i += 3) {
      const i0 = idx.getX(i);
      const i1 = idx.getX(i + 1);
      const i2 = idx.getX(i + 2);
      const p0 = { x: pos.getX(i0), z: pos.getZ(i0) };
      const p1 = { x: pos.getX(i1), z: pos.getZ(i1) };
      const p2 = { x: pos.getX(i2), z: pos.getZ(i2) };

      const signedArea = 0.5 * ((p1.x - p0.x) * (p2.z - p0.z) - (p2.x - p0.x) * (p1.z - p0.z));
      if (signedArea <= 0.0) {
        invertedTriangles++;
      }
    }

    assert.equal(invertedTriangles, 0, `Expected zero inverted triangles in Alpine Summit track ribbon, found ${invertedTriangles}`);
  });

  it('ensures Alpine Summit mountain peaks maintain clearance from track and avoid z-fighting on snow-caps', () => {
    const alpine = getTrackPreset('alpine-summit');
    const builder = new CircuitMeshBuilder(alpine.waypoints, alpine.trackWidth, alpine.ramps, {
      theme: 'alpine-summit',
      tunnels: alpine.tunnels
    });
    const group = builder.build();

    const curvePoints = alpine.waypoints.map(w => new THREE.Vector3(w.x, 0, w.z));
    const curve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal');
    const trackPts = curve.getPoints(300);
    const halfW = alpine.trackWidth * 0.5;

    let backgroundHillsCount = 0;
    const peaks = [];

    group.traverse((child) => {
      if (child.name === 'background_hill') {
        backgroundHillsCount++;
      }
      if (child.name === 'alpine_peak') {
        let baseMesh = null;
        let capMesh = null;
        child.traverse(c => {
          if (c.isMesh && c.geometry instanceof THREE.ConeGeometry) {
            if (!baseMesh) baseMesh = c;
            else capMesh = c;
          }
        });
        peaks.push({
          x: child.position.x,
          z: child.position.z,
          radius: baseMesh ? baseMesh.geometry.parameters.radius : 0,
          baseMesh,
          capMesh
        });
      }
    });

    // Pine Valley background hills should not be added to Alpine Summit
    assert.equal(backgroundHillsCount, 0, 'Alpine Summit should not contain Pine Valley background hills');
    assert.ok(peaks.length > 0, 'Alpine Summit should contain alpine peaks');

    // Every peak must be completely clear of the track
    for (const p of peaks) {
      let minDist = Infinity;
      for (const pt of trackPts) {
        const d = Math.hypot(p.x - pt.x, p.z - pt.z);
        if (d < minDist) minDist = d;
      }
      assert.ok(
        minDist >= p.radius + halfW,
        `Peak at (${p.x}, ${p.z}) with radius ${p.radius} encroaches on track! MinDist: ${minDist.toFixed(1)}, required: ${(p.radius + halfW).toFixed(1)}`
      );

      // Verify snow-cap prevents z-fighting (has polygonOffset or radial scale offset)
      if (p.capMesh && p.capMesh.material) {
        const hasOffset = p.capMesh.material.polygonOffset === true || p.capMesh.scale.x > 1.01;
        assert.ok(hasOffset, `Snow-cap on peak at (${p.x}, ${p.z}) must use polygonOffset or radial scale offset to eliminate z-fighting`);
      }
    }
  });

  it('defines 3 additional diverse circuit presets with special obstacles', () => {
    const canyon = getTrackPreset('canyon-chasm');
    assert.ok(canyon, 'Canyon Chasm preset should exist');
    assert.match(canyon.name, /Canyon/);
    assert.ok(canyon.ramps && canyon.ramps.length > 0, 'Canyon Chasm should feature canyon jump ramp');
    assert.ok(canyon.chasmRavine, 'Canyon Chasm should define chasm ravine obstacle');

    const velodrome = getTrackPreset('neon-velodrome');
    assert.ok(velodrome, 'Neon Velodrome preset should exist');
    assert.match(velodrome.name, /Neon|Velodrome/);
    assert.ok(velodrome.bankedCurves && velodrome.bankedCurves.length > 0, 'Neon Velodrome should feature banked curve');

    const desert = getTrackPreset('desert-dunes');
    assert.ok(desert, 'Desert Dunes preset should exist');
    assert.match(desert.name, /Mirage|Desert/);
    assert.ok(desert.quicksandHazards && desert.quicksandHazards.length > 0, 'Desert Dunes should feature quicksand hazards');
  });

  it('builds unique 3D thematic decor and special obstacles for all new circuits', () => {
    // 1. Canyon Chasm 3D mesh
    const canyon = getTrackPreset('canyon-chasm');
    const canyonBuilder = new CircuitMeshBuilder(canyon.waypoints, canyon.trackWidth, canyon.ramps, {
      theme: 'canyon-chasm',
      chasmRavine: canyon.chasmRavine
    });
    const canyonMesh = canyonBuilder.build();
    let hasCanyonRock = false;
    canyonMesh.traverse(c => {
      if (c.name && (c.name.includes('canyon') || c.name.includes('mesa') || c.name.includes('chasm') || c.name.includes('spire'))) {
        hasCanyonRock = true;
      }
    });
    assert.ok(hasCanyonRock, 'Canyon mesh should generate canyon rock spires and chasm ravine');

    // 2. Neon Velodrome 3D mesh
    const velodrome = getTrackPreset('neon-velodrome');
    const veloBuilder = new CircuitMeshBuilder(velodrome.waypoints, velodrome.trackWidth, velodrome.ramps, {
      theme: 'neon-velodrome',
      bankedCurves: velodrome.bankedCurves
    });
    const veloMesh = veloBuilder.build();
    let hasNeonDecor = false;
    veloMesh.traverse(c => {
      if (c.name && (c.name.includes('neon') || c.name.includes('banked') || c.name.includes('light_strip'))) {
        hasNeonDecor = true;
      }
    });
    assert.ok(hasNeonDecor, 'Neon velodrome mesh should generate neon light strips and banked curve decor');

    // 3. Desert Dunes 3D mesh
    const desert = getTrackPreset('desert-dunes');
    const desertBuilder = new CircuitMeshBuilder(desert.waypoints, desert.trackWidth, desert.ramps, {
      theme: 'desert-dunes',
      quicksandHazards: desert.quicksandHazards
    });
    const desertMesh = desertBuilder.build();
    let hasDuneDecor = false;
    desertMesh.traverse(c => {
      if (c.name && (c.name.includes('dune') || c.name.includes('quicksand') || c.name.includes('palm') || c.name.includes('oasis'))) {
        hasDuneDecor = true;
      }
    });
    assert.ok(hasDuneDecor, 'Desert dunes mesh should generate sand dunes, quicksand patches, and oasis decor');
  });

  it('builds Neon Velodrome track ribbon with true 3D banking and outer edge elevation', () => {
    const velodrome = getTrackPreset('neon-velodrome');
    const veloBuilder = new CircuitMeshBuilder(velodrome.waypoints, velodrome.trackWidth, velodrome.ramps, {
      theme: 'neon-velodrome',
      bankedCurves: velodrome.bankedCurves
    });
    const veloMesh = veloBuilder.build();

    let asphaltMesh = null;
    veloMesh.traverse(child => {
      if (child.isMesh && child.name === 'asphalt_road') asphaltMesh = child;
    });

    assert.ok(asphaltMesh, 'Asphalt road mesh should exist');
    const pos = asphaltMesh.geometry.getAttribute('position');
    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > maxY) maxY = y;
    }

    assert.ok(maxY >= 3.5, `Banked curve should elevate outer road vertices to >= 3.5m, got ${maxY}`);
  });

  it('builds Canyon Chasm with an open road gap and visible chasm trench with bridge wreckage', () => {
    const canyon = getTrackPreset('canyon-chasm');
    const canyonBuilder = new CircuitMeshBuilder(canyon.waypoints, canyon.trackWidth, canyon.ramps, {
      theme: 'canyon-chasm',
      chasmRavine: canyon.chasmRavine
    });
    const canyonMesh = canyonBuilder.build();

    let hasBridgeWreckage = false;
    let hasCliffWall = false;
    let hasChasmTrench = false;

    canyonMesh.traverse(child => {
      if (child.name && child.name.includes('wreckage')) hasBridgeWreckage = true;
      if (child.name && child.name.includes('cliff_wall')) hasCliffWall = true;
      if (child.name && child.name.includes('chasm_ravine')) hasChasmTrench = true;
    });

    assert.ok(hasChasmTrench, 'Canyon chasm ravine should be generated');
    assert.ok(hasBridgeWreckage, 'Ravine bottom should contain collapsed bridge wreckage');
    assert.ok(hasCliffWall, 'Ravine should have vertical rock cliff walls');
  });

  it('verifies that Canyon Chasm track ribbon has an actual open gap with no asphalt triangles across the ravine', () => {
    const canyon = getTrackPreset('canyon-chasm');
    const canyonBuilder = new CircuitMeshBuilder(canyon.waypoints, canyon.trackWidth, canyon.ramps, {
      theme: 'canyon-chasm',
      chasmRavine: canyon.chasmRavine
    });
    const canyonMesh = canyonBuilder.build();

    let asphaltMesh = null;
    canyonMesh.traverse(child => {
      if (child.isMesh && child.name === 'asphalt_road') asphaltMesh = child;
    });

    assert.ok(asphaltMesh, 'Asphalt mesh must exist');
    const pos = asphaltMesh.geometry.getAttribute('position');
    const idx = asphaltMesh.geometry.getIndex();

    // Verify there are no triangles whose centroid lies completely inside the chasm void (x: 10..30, z: 82..102)
    let trianglesInChasmVoid = 0;
    for (let i = 0; i < idx.count; i += 3) {
      const i0 = idx.getX(i);
      const i1 = idx.getX(i + 1);
      const i2 = idx.getX(i + 2);

      const cx = (pos.getX(i0) + pos.getX(i1) + pos.getX(i2)) / 3;
      const cz = (pos.getZ(i0) + pos.getZ(i1) + pos.getZ(i2)) / 3;

      if (cx > 10 && cx < 30 && cz > 82 && cz < 102) {
        trianglesInChasmVoid++;
      }
    }

    assert.equal(trianglesInChasmVoid, 0, `Expected 0 asphalt triangles in chasm void, found ${trianglesInChasmVoid}`);
  });
});

