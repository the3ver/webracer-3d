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
});
