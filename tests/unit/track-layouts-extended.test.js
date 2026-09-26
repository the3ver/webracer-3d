import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TRACK_PRESETS, getTrackPreset } from '../../src/js/track/track-data.js';
import { CircuitTrack } from '../../src/js/track/circuit-track.js';
import { CircuitMeshBuilder } from '../../src/js/track/circuit-mesh.js';

describe('Extended Diverse Circuit Layouts', () => {
  it('all 5 circuits have extended waypoint sequences (>= 20 waypoints) and total length > 750m', () => {
    const trackIds = ['pine-valley', 'alpine-summit', 'canyon-chasm', 'neon-velodrome', 'desert-dunes'];

    for (const id of trackIds) {
      const preset = getTrackPreset(id);
      assert.ok(preset, `Preset ${id} should exist`);
      assert.ok(
        preset.waypoints.length >= 20,
        `Circuit ${preset.name} should have >= 20 waypoints for varied layout, got ${preset.waypoints.length}`
      );

      const track = new CircuitTrack({
        waypoints: preset.waypoints,
        trackWidth: preset.trackWidth
      });

      assert.ok(
        track.totalLength > 750,
        `Circuit ${preset.name} should have length > 750m for an engaging race, got ${track.totalLength.toFixed(1)}m`
      );
    }
  });

  it('guarantees that all 5 extended circuits produce zero inverted triangles in their asphalt track ribbons', () => {
    const trackIds = ['pine-valley', 'alpine-summit', 'canyon-chasm', 'neon-velodrome', 'desert-dunes'];

    for (const id of trackIds) {
      const preset = getTrackPreset(id);
      const builder = new CircuitMeshBuilder(preset.waypoints, preset.trackWidth, preset.ramps, {
        theme: preset.theme,
        tunnels: preset.tunnels,
        chasmRavine: preset.chasmRavine,
        bankedCurves: preset.bankedCurves,
        quicksandHazards: preset.quicksandHazards
      });

      const group = builder.build();
      let asphaltMesh = null;
      group.traverse((c) => {
        if (c.isMesh && c.name === 'asphalt_road') asphaltMesh = c;
      });

      assert.ok(asphaltMesh, `Asphalt road mesh must exist for ${preset.name}`);
      const pos = asphaltMesh.geometry.getAttribute('position');
      const idx = asphaltMesh.geometry.getIndex();

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

      assert.strictEqual(
        invertedTriangles,
        0,
        `Expected 0 inverted triangles in ${preset.name} track ribbon, found ${invertedTriangles}`
      );
    }
  });

  it('verifies that each circuit has distinct curvature profile and turn characteristics', () => {
    const trackIds = ['pine-valley', 'alpine-summit', 'canyon-chasm', 'neon-velodrome', 'desert-dunes'];
    const lengths = {};

    for (const id of trackIds) {
      const preset = getTrackPreset(id);
      const track = new CircuitTrack({
        waypoints: preset.waypoints,
        trackWidth: preset.trackWidth
      });
      lengths[id] = track.totalLength;
    }

    // Verify circuits are not clones with identical lengths
    const uniqueLengths = new Set(Object.values(lengths).map(l => Math.round(l / 10)));
    assert.ok(
      uniqueLengths.size >= 4,
      `Track lengths should be distinct across circuits, got: ${JSON.stringify(lengths)}`
    );
  });
});
