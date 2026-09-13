import * as THREE from 'three';

export class VehiclePhysics {
  constructor(track, options = {}) {
    this.track = track;

    // Position & Orientation
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.forward = new THREE.Vector3(0, 0, -1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.right = new THREE.Vector3(1, 0, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quaternion = new THREE.Quaternion();

    // Tuning Parameters
    this.maxSpeed = options.maxSpeed || 140.0;          // km/h (smoother top speed)
    this.reverseMaxSpeed = 35.0;                      // km/h
    this.accelerationRate = options.accel || 45.0;    // km/h per sec (balanced, controllable acceleration)
    this.brakingRate = 90.0;                          // km/h per sec
    this.dragCoeff = 0.988;                           // natural slowing
    this.turnSpeed = options.turnSpeed || 2.2;        // rad/sec
    this.driftGripFactor = 0.94;                      // lateral slip resistance

    // Current State
    this.speed = 0.0;                                 // Current forward speed in km/h
    this.steerInput = 0.0;                            // -1 (left) to +1 (right)
    this.steerAngle = 0.0;                            // visual steer angle of front wheels
    this.throttleInput = 0.0;                         // -1 (reverse/brake) to +1 (gas)
    this.isDrifting = false;
    this.isBraking = false;
    this.isBoosting = false;
    this.boostTimer = 0.0;
    this.spinTimer = 0.0;
    this.empTimer = 0.0;
    this.hasShield = false;

    // Falling off track & Respawn State
    this.isFalling = false;
    this.fallVelocityY = 0.0;
    this.fallTimer = 0.0;
    this.lastSafeT = 0.0;
    this.respawnBlinkTimer = 0.0;
    this.onRespawn = null;

    // Track progression & lap data
    this.closestTrack = null;
    this.trackT = 0.0;
    this.currentLap = 1;
    this.lastCheckpoint = 0;
    this.checkpointsHit = new Set([0]);
    this.lapStartTime = 0;
    this.currentLapTime = 0;
    this.bestLapTime = Infinity;
    this.raceFinished = false;
  }

  resetAt(position, tangent) {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.speed = 0.0;

    // Point in tangent direction
    const forward = tangent.clone().normalize();
    const angle = Math.atan2(-forward.x, -forward.z);
    this.rotation.set(0, angle, 0);
    this.forward.copy(forward);
    this.right.set(-forward.z, 0, forward.x);
    this.closestTrack = this.track.getClosestTrackPoint(this.position);
    this.trackT = this.closestTrack.t;
    this.lastSafeT = this.trackT;

    this.isFalling = false;
    this.fallVelocityY = 0.0;
    this.fallTimer = 0.0;
    this.respawnBlinkTimer = 0.0;
  }

  setInputs(throttle, steer, handbrake) {
    if (this.isFalling) {
      this.throttleInput = 0;
      this.steerInput = 0;
      this.isDrifting = false;
      this.isBraking = false;
      return;
    }
    this.throttleInput = throttle;
    this.steerInput = steer;
    this.isDrifting = handbrake;
    this.isBraking = throttle < 0 && this.speed > 5;
  }

  triggerBoost(duration = 1.8) {
    if (this.isFalling) return;
    this.boostTimer = Math.max(this.boostTimer, duration);
  }

  triggerSpin(duration = 1.2) {
    if (this.isFalling || this.respawnBlinkTimer > 0) return false;
    if (this.hasShield) {
      this.hasShield = false;
      return false; // Absorbed!
    }
    this.spinTimer = duration;
    this.speed *= 0.35;
    return true;
  }

  triggerEmp(duration = 2.5) {
    if (this.isFalling || this.respawnBlinkTimer > 0) return false;
    if (this.hasShield) {
      this.hasShield = false;
      return false;
    }
    this.empTimer = duration;
    this.speed *= 0.5;
    return true;
  }

  respawn() {
    // Pick safe track position slightly behind where vehicle went off
    const safeT = (this.lastSafeT - 0.012 + 1.0) % 1.0;
    const info = this.track.getTrackTransformAt(safeT);

    // Place vehicle in center of track, slightly above road surface
    this.position.copy(info.position);
    this.position.y += 0.5;

    // Align with forward track direction
    const forward = info.tangent.clone().normalize();
    this.forward.copy(forward);
    this.right.set(-forward.z, 0, forward.x);
    const angle = Math.atan2(-forward.x, -forward.z);
    this.rotation.set(0, angle, 0);

    // Rolling start speed (25 km/h) in forward direction
    this.speed = 25.0;
    this.velocity.copy(this.forward).multiplyScalar(this.speed / 3.6);

    // Reset falling and status
    this.isFalling = false;
    this.fallVelocityY = 0.0;
    this.fallTimer = 0.0;
    this.spinTimer = 0.0;
    this.empTimer = 0.0;
    this.respawnBlinkTimer = 2.0; // 2 seconds of blinking invulnerability animation

    if (this.onRespawn) {
      this.onRespawn();
    }
  }

  update(delta) {
    if (delta > 0.1) delta = 0.1; // Clamp large step frame spikes

    // 0. Handle Respawn Blinking Timer
    if (this.respawnBlinkTimer > 0) {
      this.respawnBlinkTimer -= delta;
    }

    // 1. Handle Freefall when off track
    if (this.isFalling) {
      this.fallTimer += delta;
      this.fallVelocityY -= 36.0 * delta; // Gravity
      this.position.y += this.fallVelocityY * delta;

      // Tumbling rotation as car plummets into the synthwave abyss
      this.rotation.x += 2.0 * delta;
      this.rotation.z += 2.8 * delta;

      // Carry momentum outward
      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;

      // Natural air slowing
      this.speed *= Math.pow(0.85, delta * 60);

      // Height drop limit for respawn
      const trackPt = this.closestTrack ? this.closestTrack.point : null;
      const dropThreshold = trackPt ? (trackPt.y - 14.0) : -25.0;

      if (this.fallTimer > 1.2 || this.position.y < dropThreshold) {
        this.respawn();
      }
      return; // Skip normal track alignment while falling
    }

    // 2. Handle Status Timers (EMP, Spin, Boost)
    if (this.spinTimer > 0) {
      this.spinTimer -= delta;
      this.rotation.y += delta * 12.0; // Rapid spin out
    }

    if (this.empTimer > 0) {
      this.empTimer -= delta;
    }

    if (this.boostTimer > 0) {
      this.boostTimer -= delta;
      this.isBoosting = true;
    } else {
      this.isBoosting = false;
    }

    const currentMax = this.isBoosting ? (this.maxSpeed * 1.35) : (this.empTimer > 0 ? this.maxSpeed * 0.45 : this.maxSpeed);

    // 3. Acceleration / Deceleration
    if (this.spinTimer <= 0) {
      if (this.throttleInput > 0) {
        const boostMultiplier = this.isBoosting ? 1.6 : 1.0;
        const accel = (this.empTimer > 0 ? this.accelerationRate * 0.4 : this.accelerationRate) * boostMultiplier;
        this.speed += accel * this.throttleInput * delta;
      } else if (this.throttleInput < 0) {
        if (this.speed > 5) {
          // Braking
          this.speed -= this.brakingRate * delta;
        } else {
          // Reversing
          this.speed -= (this.accelerationRate * 0.5) * delta;
          if (this.speed < -this.reverseMaxSpeed) this.speed = -this.reverseMaxSpeed;
        }
      } else {
        // Natural air resistance / rolling drag
        this.speed *= Math.pow(this.dragCoeff, delta * 60);
      }
    }

    // Speed clamping
    if (this.speed > currentMax) {
      this.speed -= 40 * delta;
    }

    // 4. Steering & Yaw Rotation
    if (this.spinTimer <= 0) {
      const speedFactor = Math.min(1.0, Math.abs(this.speed) / 35.0);
      const driftMultiplier = this.isDrifting ? 1.45 : 1.0;
      const turnDelta = -this.steerInput * this.turnSpeed * driftMultiplier * speedFactor * delta;

      this.rotation.y += turnDelta;

      // Visual front wheel steering angle with smooth spring
      const targetSteerAngle = -this.steerInput * 0.45;
      this.steerAngle += (targetSteerAngle - this.steerAngle) * 12 * delta;
    }

    // 5. Update Forward & Right Direction Vectors
    this.forward.set(
      -Math.sin(this.rotation.y),
      0,
      -Math.cos(this.rotation.y)
    ).normalize();

    this.right.set(
      -this.forward.z,
      0,
      this.forward.x
    ).normalize();

    // 6. Velocity & Drift Mechanics
    const forwardSpeedMS = (this.speed / 3.6);
    const targetVel = this.forward.clone().multiplyScalar(forwardSpeedMS);

    if (this.isDrifting) {
      this.velocity.lerp(targetVel, 6 * delta);
    } else {
      this.velocity.lerp(targetVel, 18 * delta);
    }

    // Position step
    this.position.addScaledVector(this.velocity, delta);

    // 7. Track Alignment & Edge Checking
    this.handleTrackPhysics(delta);

    // 8. Checkpoints & Boost Pads (only if not falling)
    if (!this.isFalling) {
      this.handleCheckpoints();
      this.handleBoostPads();
    }
  }

  handleTrackPhysics(delta) {
    this.closestTrack = this.track.getClosestTrackPoint(this.position);
    this.trackT = this.closestTrack.t;
    const trackPt = this.closestTrack.point;
    const trackTan = this.closestTrack.tangent;

    // Calculate horizontal distance from track centerline
    const dx = this.position.x - trackPt.x;
    const dz = this.position.z - trackPt.z;
    const distToCenter = Math.sqrt(dx * dx + dz * dz);
    const halfRoadWidth = this.track.roadWidth / 2; // 9.0

    // Off-track check: road width is 18m (half = 9m). Allow small curb margin (+1.5m) before dropping off
    if (distToCenter > halfRoadWidth + 1.5) {
      this.isFalling = true;
      this.fallVelocityY = -6.0;
      this.fallTimer = 0.0;
      return;
    }

    // On track or curb: record as safe track position
    this.lastSafeT = this.trackT;

    // Track surface height with smooth suspension spring
    const targetY = trackPt.y;
    this.position.y += (targetY - this.position.y) * 15 * delta;

    // Pitch vehicle to match track slope
    const slopePitch = Math.atan2(trackTan.y, Math.sqrt(trackTan.x * trackTan.x + trackTan.z * trackTan.z));
    this.rotation.x += (slopePitch - this.rotation.x) * 10 * delta;

    // Corner banking / roll tilt into turns (synthwave arcade feel)
    const lateralG = -this.steerInput * (this.speed / this.maxSpeed) * (this.isDrifting ? 0.35 : 0.18);
    this.rotation.z += (lateralG - this.rotation.z) * 8 * delta;

    // Curb edge rumble/friction when riding outside edge
    if (distToCenter > halfRoadWidth - 0.5) {
      this.speed *= 0.985;
    }
  }

  handleBoostPads() {
    for (const pad of this.track.boostPads) {
      const d = this.position.distanceTo(pad.position);
      if (d < pad.radius) {
        this.triggerBoost(1.8);
      }
    }
  }

  handleCheckpoints() {
    const checkpoints = this.track.checkpoints;
    const numCheckpoints = checkpoints.length;

    // Check distance to next expected checkpoint
    const nextCpIdx = (this.lastCheckpoint + 1) % numCheckpoints;
    const cp = checkpoints[nextCpIdx];
    const dist = this.position.distanceTo(cp.position);

    if (dist < cp.radius) {
      this.lastCheckpoint = nextCpIdx;
      this.checkpointsHit.add(nextCpIdx);

      // Completed all checkpoints and crossed start/finish line (index 0)
      if (nextCpIdx === 0 && this.checkpointsHit.size >= numCheckpoints - 2) {
        this.currentLap++;
        this.checkpointsHit.clear();
        this.checkpointsHit.add(0);

        if (this.currentLapTime > 0 && this.currentLapTime < this.bestLapTime) {
          this.bestLapTime = this.currentLapTime;
        }
        this.currentLapTime = 0;
      }
    }
  }

  applyToMesh(mesh) {
    mesh.position.copy(this.position);
    mesh.rotation.copy(this.rotation);
  }
}
