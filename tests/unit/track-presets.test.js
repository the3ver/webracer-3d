import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
});
