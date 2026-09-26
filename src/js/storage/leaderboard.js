/**
 * Leaderboard: Persistent high score and lap-time tracking per circuit track.
 * Stores personal best lap times, full race times, and vehicle records.
 */

const STORAGE_KEY = 'webracer_3d_leaderboard_v1';

export class Leaderboard {
  constructor(customStorage = null) {
    if (customStorage) {
      this.storage = customStorage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      // Memory fallback for headless / server environments
      this._memStore = {};
      this.storage = {
        getItem: (k) => this._memStore[k] || null,
        setItem: (k, v) => { this._memStore[k] = String(v); },
        removeItem: (k) => { delete this._memStore[k]; },
        clear: () => { this._memStore = {}; }
      };
    }
  }

  /**
   * Loads all track records from storage
   * @returns {Object.<string, Object>}
   */
  _loadAll() {
    try {
      const data = this.storage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Saves all track records to storage
   * @param {Object} data
   */
  _saveAll(data) {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Leaderboard save failed:', e);
    }
  }

  /**
   * Retrieves high score record for a given track ID
   * @param {string} trackId
   * @returns {{ bestLapTime: number|null, bestRaceTime: number|null, lapRecordHolder: string|null, raceRecordHolder: string|null, date: string|null }}
   */
  getRecord(trackId) {
    const all = this._loadAll();
    const rec = all[trackId];
    if (!rec) {
      return {
        bestLapTime: null,
        bestRaceTime: null,
        lapRecordHolder: null,
        raceRecordHolder: null,
        date: null
      };
    }
    return {
      bestLapTime: typeof rec.bestLapTime === 'number' ? rec.bestLapTime : null,
      bestRaceTime: typeof rec.bestRaceTime === 'number' ? rec.bestRaceTime : null,
      lapRecordHolder: rec.lapRecordHolder || null,
      raceRecordHolder: rec.raceRecordHolder || null,
      date: rec.date || null
    };
  }

  /**
   * Submits a completed race / lap time for a track
   * @param {string} trackId
   * @param {{ lapTime?: number, raceTime?: number, carName?: string, playerName?: string }} entry
   * @returns {{ isNewBestLap: boolean, isNewBestRace: boolean }}
   */
  submitRecord(trackId, entry = {}) {
    const all = this._loadAll();
    const current = this.getRecord(trackId);
    let isNewBestLap = false;
    let isNewBestRace = false;

    const carName = entry.carName || 'Player';
    const nowIso = new Date().toISOString();

    // Check lap record
    if (typeof entry.lapTime === 'number' && entry.lapTime > 0) {
      if (current.bestLapTime === null || entry.lapTime < current.bestLapTime) {
        current.bestLapTime = Math.round(entry.lapTime * 100) / 100;
        current.lapRecordHolder = carName;
        current.date = nowIso;
        isNewBestLap = true;
      }
    }

    // Check race record
    if (typeof entry.raceTime === 'number' && entry.raceTime > 0) {
      if (current.bestRaceTime === null || entry.raceTime < current.bestRaceTime) {
        current.bestRaceTime = Math.round(entry.raceTime * 100) / 100;
        current.raceRecordHolder = carName;
        current.date = nowIso;
        isNewBestRace = true;
      }
    }

    if (isNewBestLap || isNewBestRace) {
      all[trackId] = current;
      this._saveAll(all);
    }

    return { isNewBestLap, isNewBestRace };
  }

  /**
   * Formats a time in seconds to mm:ss.ms string (e.g. 01:23.45)
   * @param {number|null} seconds
   * @returns {string}
   */
  formatTime(seconds) {
    if (typeof seconds !== 'number' || seconds <= 0 || isNaN(seconds)) {
      return '--:--.--';
    }
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const ms = Math.round(seconds * 100) % 100;

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
}
