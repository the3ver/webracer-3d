import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitTrack } from '../../src/js/track/circuit-track.js';

describe('CircuitTrack Progression & Laps', () => {
  it('counts a lap only when all checkpoints have been cleared sequentially', () => {
    // 4 checkpoints around a simple square track:
    // CP0 (Start/Finish): (0, 0)
    // CP1: (100, 0)
    // CP2: (100, 100)
    // CP3: (0, 100)
    const waypoints = [
      { x: 0, z: 0 },
      { x: 100, z: 0 },
      { x: 100, z: 100 },
      { x: 0, z: 100 }
    ];

    const track = new CircuitTrack({ waypoints, trackWidth: 16 });
    const tracker = track.createVehicleTracker('player');

    assert.equal(tracker.currentLap, 1);
    assert.equal(tracker.completedLaps, 0);

    // Crossing start/finish without visiting other CPs should NOT complete a lap
    track.updateTracker(tracker, { x: 0, z: 5 }, 1.0);
    assert.equal(tracker.completedLaps, 0);

    // Visit CP1
    track.updateTracker(tracker, { x: 95, z: 0 }, 1.0);
    assert.equal(tracker.nextCheckpointIndex, 2);

    // Visit CP2
    track.updateTracker(tracker, { x: 100, z: 95 }, 1.0);
    assert.equal(tracker.nextCheckpointIndex, 3);

    // Visit CP3
    track.updateTracker(tracker, { x: 5, z: 100 }, 1.0);
    assert.equal(tracker.nextCheckpointIndex, 0);

    // Now cross Start/Finish (CP0) to complete Lap 1
    track.updateTracker(tracker, { x: 0, z: 0 }, 1.0);
    assert.equal(tracker.completedLaps, 1);
    assert.equal(tracker.currentLap, 2);
    assert.ok(tracker.lastLapTime > 0, 'Last lap time should be recorded');
  });

  it('ranks racers accurately based on completed laps and distance along track', () => {
    const waypoints = [
      { x: 0, z: 0 },
      { x: 100, z: 0 },
      { x: 100, z: 100 },
      { x: 0, z: 100 }
    ];
    const track = new CircuitTrack({ waypoints, trackWidth: 16 });

    const racer1 = track.createVehicleTracker('racer1');
    const racer2 = track.createVehicleTracker('racer2');

    // Racer 1 has completed 1 lap and is at x: 20
    racer1.completedLaps = 1;
    track.updateTracker(racer1, { x: 20, z: 0 }, 0.1);

    // Racer 2 is still on Lap 1, but at x: 80
    racer2.completedLaps = 0;
    track.updateTracker(racer2, { x: 80, z: 0 }, 0.1);

    const standings = track.calculateStandings([racer2, racer1]);

    assert.equal(standings[0].id, 'racer1', 'Racer 1 should be P1 because of lap lead');
    assert.equal(standings[1].id, 'racer2', 'Racer 2 should be P2');
  });
});
