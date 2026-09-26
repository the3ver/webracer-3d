import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitTrack } from '../../src/js/track/circuit-track.js';
import { TRACK_PRESETS } from '../../src/js/track/track-data.js';

describe('Race Laps & Finish Mechanics', () => {
  it('CircuitTrack respects totalLaps option and marks tracker as finished when reaching totalLaps', () => {
    const waypoints = [
      { x: 0, z: 0 },
      { x: 40, z: 0 },
      { x: 40, z: 40 },
      { x: 0, z: 40 }
    ];

    const track = new CircuitTrack({
      waypoints,
      trackWidth: 14,
      totalLaps: 3
    });

    assert.strictEqual(track.totalLaps, 3, 'CircuitTrack must assign this.totalLaps from options');

    const tracker = track.createVehicleTracker('player');
    assert.strictEqual(tracker.completedLaps, 0);
    assert.strictEqual(tracker.currentLap, 1);
    assert.strictEqual(tracker.isFinished, false);

    // Simulate completing 3 laps sequentially
    for (let lap = 1; lap <= 3; lap++) {
      // Visit waypoint 1, 2, 3, then 0
      track.updateTracker(tracker, waypoints[1], 1.0);
      assert.strictEqual(tracker.nextCheckpointIndex, 2);

      track.updateTracker(tracker, waypoints[2], 1.0);
      assert.strictEqual(tracker.nextCheckpointIndex, 3);

      track.updateTracker(tracker, waypoints[3], 1.0);
      assert.strictEqual(tracker.nextCheckpointIndex, 0);

      track.updateTracker(tracker, waypoints[0], 1.0);
      assert.strictEqual(tracker.completedLaps, lap, `Lap ${lap} should be counted`);

      if (lap < 3) {
        assert.strictEqual(tracker.isFinished, false);
        assert.strictEqual(tracker.currentLap, lap + 1);
      } else {
        assert.strictEqual(tracker.isFinished, true, 'Tracker should be marked isFinished upon completing lap 3');
        assert.strictEqual(tracker.currentLap, 3, 'Current lap should remain at totalLaps (3) upon finish');
      }
    }

    // Subsequent updates after finishing should not alter finished status or lap count
    track.updateTracker(tracker, waypoints[1], 1.0);
    assert.strictEqual(tracker.isFinished, true);
    assert.strictEqual(tracker.completedLaps, 3);
  });

  it('supports configurable race lengths (3, 6, 10 laps) dynamically updating finish threshold', () => {
    const waypoints = [
      { x: 0, z: 0 },
      { x: 40, z: 0 },
      { x: 40, z: 40 },
      { x: 0, z: 40 }
    ];

    const track = new CircuitTrack({
      waypoints,
      trackWidth: 14,
      totalLaps: 6
    });

    assert.strictEqual(track.totalLaps, 6);
    const tracker = track.createVehicleTracker('player');

    // Complete 3 laps
    for (let lap = 1; lap <= 3; lap++) {
      track.updateTracker(tracker, waypoints[1], 1.0);
      track.updateTracker(tracker, waypoints[2], 1.0);
      track.updateTracker(tracker, waypoints[3], 1.0);
      track.updateTracker(tracker, waypoints[0], 1.0);
    }

    assert.strictEqual(tracker.completedLaps, 3);
    assert.strictEqual(tracker.isFinished, false, 'Should NOT be finished at 3 laps when configured for 6 laps');
    assert.strictEqual(tracker.currentLap, 4, 'Current lap should be 4');

    // Complete laps 4, 5, 6
    for (let lap = 4; lap <= 6; lap++) {
      track.updateTracker(tracker, waypoints[1], 1.0);
      track.updateTracker(tracker, waypoints[2], 1.0);
      track.updateTracker(tracker, waypoints[3], 1.0);
      track.updateTracker(tracker, waypoints[0], 1.0);
    }

    assert.strictEqual(tracker.completedLaps, 6);
    assert.strictEqual(tracker.isFinished, true, 'Should be finished after completing 6 laps');
    assert.strictEqual(tracker.currentLap, 6);
  });
});
