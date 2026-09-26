/**
 * CircuitTrack: Manages track geometry, waypoints, surface detection,
 * barrier collisions, checkpoint tracking, and race positions.
 */
export class CircuitTrack {
  constructor(options = {}) {
    this.waypoints = options.waypoints || [];
    this.trackWidth = options.trackWidth || 16;
    this.ramps = options.ramps || [];
    this.quicksandHazards = options.quicksandHazards || [];
    this.iceHazards = options.iceHazards || [];
    this.chasmRavine = options.chasmRavine || null;
    this.bankedCurves = options.bankedCurves || [];
    this.segments = [];
    this.totalLength = 0;

    this.initSegments();
  }

  initSegments() {
    this.segments = [];
    this.totalLength = 0;
    const n = this.waypoints.length;
    if (n < 2) return;

    for (let i = 0; i < n; i++) {
      const p1 = this.waypoints[i];
      const p2 = this.waypoints[(i + 1) % n];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.hypot(dx, dz);

      this.segments.push({
        p1,
        p2,
        dx,
        dz,
        length,
        startDistance: this.totalLength,
        nx: length > 0.0001 ? -dz / length : 0,
        nz: length > 0.0001 ? dx / length : 0
      });
      this.totalLength += length;
    }
  }

  createVehicleTracker(id = 'player') {
    return {
      id,
      currentLap: 1,
      completedLaps: 0,
      nextCheckpointIndex: 1,
      checkpointsVisited: 0,
      lapProgress: 0, // 0.0 to 1.0
      totalRaceDistance: 0,
      currentLapTime: 0,
      lastLapTime: 0,
      bestLapTime: null,
      isFinished: false
    };
  }

  updateTracker(tracker, position, dt = 0) {
    if (tracker.isFinished) return;

    tracker.currentLapTime += dt;

    if (this.waypoints.length === 0) return;

    const nextWp = this.waypoints[tracker.nextCheckpointIndex];
    const distToNext = Math.hypot(position.x - nextWp.x, position.z - nextWp.z);
    const triggerRadius = Math.max(16, this.trackWidth * 1.25);

    if (distToNext < triggerRadius) {
      // Reached next checkpoint
      tracker.checkpointsVisited++;
      const prevIdx = tracker.nextCheckpointIndex;
      tracker.nextCheckpointIndex = (tracker.nextCheckpointIndex + 1) % this.waypoints.length;

      // Check if finished a full lap (reached checkpoint 0 after visiting all checkpoints)
      if (tracker.nextCheckpointIndex === 1 && prevIdx === 0 && tracker.checkpointsVisited >= this.waypoints.length) {
        tracker.completedLaps++;
        tracker.lastLapTime = tracker.currentLapTime;

        if (tracker.bestLapTime === null || tracker.lastLapTime < tracker.bestLapTime) {
          tracker.bestLapTime = tracker.lastLapTime;
        }

        tracker.currentLapTime = 0;
        tracker.checkpointsVisited = 0;

        if (tracker.completedLaps >= this.totalLaps) {
          tracker.isFinished = true;
          tracker.currentLap = this.totalLaps;
        } else {
          tracker.currentLap = tracker.completedLaps + 1;
        }
      }
    }

    // Calculate approximate progress along the track
    const segIdx = (tracker.nextCheckpointIndex - 1 + this.waypoints.length) % this.waypoints.length;
    const seg = this.segments[segIdx];
    if (seg && seg.length > 0) {
      const p1 = seg.p1;
      const vx = position.x - p1.x;
      const vz = position.z - p1.z;
      const proj = Math.max(0, Math.min(seg.length, (vx * seg.dx + vz * seg.dz) / seg.length));
      const distFromStart = seg.startDistance + proj;
      tracker.lapProgress = distFromStart / this.totalLength;
      tracker.totalRaceDistance = (tracker.completedLaps * this.totalLength) + distFromStart;
    }
  }

  /**
   * Identifies the track surface at a given 2D world position
   * @param {number} x
   * @param {number} z
   * @returns {{ surface: 'asphalt'|'curb'|'grass', friction: number, maxSpeedMultiplier: number, grip: number }}
   */
  getTrackSurfaceAt(x, z) {
    if (this.chasmRavine) {
      const ch = this.chasmRavine;
      if (x >= ch.minX && x <= ch.maxX && z >= ch.minZ && z <= ch.maxZ) {
        return {
          surface: 'chasm_void',
          isChasmGap: true,
          friction: 0.1,
          maxSpeedMultiplier: 0.2,
          grip: 0.1
        };
      }
    }

    if (this.iceHazards && this.iceHazards.length > 0) {
      for (let i = 0; i < this.iceHazards.length; i++) {
        const ice = this.iceHazards[i];
        const dist = Math.hypot(x - ice.x, z - ice.z);
        if (dist <= ice.radius) {
          return {
            surface: 'ice',
            friction: ice.friction || 0.22,
            maxSpeedMultiplier: 1.05,
            grip: ice.grip || 0.3
          };
        }
      }
    }

    if (this.quicksandHazards && this.quicksandHazards.length > 0) {
      for (let i = 0; i < this.quicksandHazards.length; i++) {
        const h = this.quicksandHazards[i];
        const dist = Math.hypot(x - h.x, z - h.z);
        if (dist <= h.radius) {
          return {
            surface: 'quicksand',
            friction: h.dragFactor || 0.35,
            maxSpeedMultiplier: 0.38,
            grip: 0.4
          };
        }
      }
    }

    let roadY = 0;
    let bankRoll = 0;

    if (this.bankedCurves && this.bankedCurves.length > 0) {
      for (let i = 0; i < this.bankedCurves.length; i++) {
        const b = this.bankedCurves[i];
        const dist = Math.hypot(x - b.center.x, z - b.center.z);
        if (dist < b.radius + 20) {
          const factor = Math.max(0, 1.0 - Math.abs(dist - b.radius) / 25);
          if (factor > 0) {
            roadY = (b.elevation || 4.5) * factor;
            bankRoll = (b.bankAngle || 0.52) * factor;
          }
        }
      }
    }

    let minDistance = Infinity;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const p1 = seg.p1;
      const p2 = seg.p2;

      const l2 = seg.length * seg.length;
      if (l2 === 0) continue;

      let t = ((x - p1.x) * (p2.x - p1.x) + (z - p1.z) * (p2.z - p1.z)) / l2;
      t = Math.max(0, Math.min(1, t));

      const projX = p1.x + t * (p2.x - p1.x);
      const projZ = p1.z + t * (p2.z - p1.z);
      const d = Math.hypot(x - projX, z - projZ);

      if (d < minDistance) {
        minDistance = d;
      }
    }

    const halfTrack = this.trackWidth * 0.5;
    const curbWidth = 2.0;

    if (minDistance <= halfTrack) {
      return { surface: 'asphalt', friction: 1.0, maxSpeedMultiplier: bankRoll > 0.1 ? 1.15 : 1.0, grip: bankRoll > 0.1 ? 1.25 : 1.0, roadY, bankRoll };
    } else if (minDistance <= halfTrack + curbWidth) {
      return { surface: 'curb', friction: 0.9, maxSpeedMultiplier: 0.88, grip: 0.85, roadY, bankRoll };
    } else {
      return { surface: 'grass', friction: 0.5, maxSpeedMultiplier: 0.45, grip: 0.55, roadY: 0, bankRoll: 0 };
    }
  }

  /**
   * Tests whether a vehicle collides with outer or inner track barriers
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @returns {null|{ normal: {x, z}, penetration: number }}
   */
  checkBarrierCollision(x, z, radius = 1.8) {
    let minDistance = Infinity;
    let closestSegment = null;
    let closestProj = null;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const p1 = seg.p1;
      const p2 = seg.p2;
      const l2 = seg.length * seg.length;
      if (l2 === 0) continue;

      let t = ((x - p1.x) * (p2.x - p1.x) + (z - p1.z) * (p2.z - p1.z)) / l2;
      t = Math.max(0, Math.min(1, t));

      const projX = p1.x + t * (p2.x - p1.x);
      const projZ = p1.z + t * (p2.z - p1.z);
      const d = Math.hypot(x - projX, z - projZ);

      if (d < minDistance) {
        minDistance = d;
        closestSegment = seg;
        closestProj = { x: projX, z: projZ };
      }
    }

    // Barrier boundary is located outside curbs: halfTrack + 4.5
    const barrierDist = this.trackWidth * 0.5 + 4.5;
    if (minDistance + radius > barrierDist && closestSegment && closestProj) {
      const dx = x - closestProj.x;
      const dz = z - closestProj.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.0001) {
        // Normal pointing back towards the track centerline
        const nx = -dx / len;
        const nz = -dz / len;
        const penetration = (minDistance + radius) - barrierDist;
        return {
          normal: { x: nx, z: nz },
          penetration: Math.max(0.1, penetration)
        };
      }
    }

    return null;
  }

  /**
   * Sorts an array of vehicle trackers in order of current race ranking (1st to Nth)
   * @param {Array<Object>} trackers
   * @returns {Array<Object>}
   */
  calculateStandings(trackers) {
    return [...trackers].sort((a, b) => {
      if (b.completedLaps !== a.completedLaps) {
        return b.completedLaps - a.completedLaps;
      }
      return (b.totalRaceDistance || 0) - (a.totalRaceDistance || 0);
    });
  }

  /**
   * Checks if a vehicle drives onto a jump ramp
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @returns {Object|null}
   */
  checkRamp(x, z, radius = 1.8) {
    if (!this.ramps || this.ramps.length === 0) return null;

    for (const ramp of this.ramps) {
      const halfLen = ramp.length * 0.5;
      const halfWidth = ramp.width * 0.5;
      const inX = Math.abs(x - ramp.x) <= (halfLen + radius * 0.4);
      const inZ = Math.abs(z - ramp.z) <= (halfWidth + radius * 0.4);

      if (inX && inZ) {
        return ramp;
      }
    }
    return null;
  }
}
