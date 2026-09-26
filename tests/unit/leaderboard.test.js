import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Leaderboard } from '../../src/js/storage/leaderboard.js';

describe('Leaderboard Storage & Lap Time Tracking', () => {
  let storageMock;
  let store;

  beforeEach(() => {
    store = {};
    storageMock = {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  });

  it('initializes with empty records and retrieves null for unset tracks', () => {
    const lb = new Leaderboard(storageMock);
    const record = lb.getRecord('pine-valley');
    assert.strictEqual(record.bestLapTime, null);
    assert.strictEqual(record.bestRaceTime, null);
    assert.strictEqual(record.lapRecordHolder, null);
  });

  it('records new best lap time and race time if lower than previous', () => {
    const lb = new Leaderboard(storageMock);

    // Initial race
    const res1 = lb.submitRecord('pine-valley', {
      lapTime: 18.45,
      raceTime: 56.20,
      carName: 'Red Fire',
      playerName: 'Player'
    });

    assert.strictEqual(res1.isNewBestLap, true);
    assert.strictEqual(res1.isNewBestRace, true);

    const record = lb.getRecord('pine-valley');
    assert.strictEqual(record.bestLapTime, 18.45);
    assert.strictEqual(record.bestRaceTime, 56.20);
    assert.strictEqual(record.lapRecordHolder, 'Red Fire');

    // Slower race: should NOT overwrite records
    const res2 = lb.submitRecord('pine-valley', {
      lapTime: 19.10,
      raceTime: 58.00,
      carName: 'Thunder Muscle',
      playerName: 'Player'
    });

    assert.strictEqual(res2.isNewBestLap, false);
    assert.strictEqual(res2.isNewBestRace, false);

    const recordAfterSlower = lb.getRecord('pine-valley');
    assert.strictEqual(recordAfterSlower.bestLapTime, 18.45);
    assert.strictEqual(recordAfterSlower.bestRaceTime, 56.20);

    // Faster lap but slower race: should update ONLY lap record
    const res3 = lb.submitRecord('pine-valley', {
      lapTime: 17.80,
      raceTime: 59.00,
      carName: 'Apex Formula',
      playerName: 'Player'
    });

    assert.strictEqual(res3.isNewBestLap, true);
    assert.strictEqual(res3.isNewBestRace, false);

    const recordAfterFasterLap = lb.getRecord('pine-valley');
    assert.strictEqual(recordAfterFasterLap.bestLapTime, 17.80);
    assert.strictEqual(recordAfterFasterLap.lapRecordHolder, 'Apex Formula');
    assert.strictEqual(recordAfterFasterLap.bestRaceTime, 56.20);
  });

  it('tracks records independently across different tracks', () => {
    const lb = new Leaderboard(storageMock);

    lb.submitRecord('pine-valley', { lapTime: 20.0, raceTime: 60.0, carName: 'Red Fire' });
    lb.submitRecord('alpine-summit', { lapTime: 25.0, raceTime: 75.0, carName: 'Mud Raider' });

    assert.strictEqual(lb.getRecord('pine-valley').bestLapTime, 20.0);
    assert.strictEqual(lb.getRecord('alpine-summit').bestLapTime, 25.0);
    assert.strictEqual(lb.getRecord('alpine-summit').lapRecordHolder, 'Mud Raider');
  });

  it('formats lap times into mm:ss.ms string accurately', () => {
    const lb = new Leaderboard(storageMock);
    assert.strictEqual(lb.formatTime(0), '--:--.--');
    assert.strictEqual(lb.formatTime(null), '--:--.--');
    assert.strictEqual(lb.formatTime(65.432), '01:05.43');
    assert.strictEqual(lb.formatTime(9.05), '00:09.05');
  });
});
