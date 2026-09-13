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
    this.maxSpeed = options.maxSpeed || 190.0;          // km/h
    this.reverseMaxSpeed = 45.0;                      // km/h
    this.accelerationRate = options.accel || 95.0;    // km/h per sec
    this.brakingRate = 140.0;                         // km/h per sec
    this.dragCoeff = 0.985;                           // natural slowing
    this.turnSpeed = options.turnSpeed || 2.4;        // rad/sec
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
  }

  setInputs(throttle, steer, handbrake) {
    this.throttleInput = throttle;
    this.steerInput = steer;
    this.isDrifting = handbrake;
    this.isBraking = throttle < 0 && this.speed > 5;
  }

  triggerBoost(duration = 1.8) {
    this.boostTimer = Math.max(this.boostTimer, duration);
  }

  triggerSpin(duration = 1.2) {
    if (this.hasShield) {
      this.hasShield = false;
      return false; // Absorbed!
    }
    this.spinTimer = duration;
    this.speed *= 0.35;
    return true;
  }

  triggerEmp(duration = 2.5) {
    if (this.hasShield) {
      this.hasShield = false;
      return false;
    }
    this.empTimer = duration;
    this.speed *= 0.5;
    return true;
  }

  update(delta) {
    if (delta > 0.1) delta = 0.1; // Clamp large step frame spikes

    // 1. Handle Timers (EMP, Spin, Boost)
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

    const currentMax = this.isBoosting ? (this.maxSpeed * 1.45) : (this.empTimer > 0 ? this.maxSpeed * 0.45 : this.maxSpeed);

    // 2. Acceleration / Deceleration
    if (this.spinTimer <= 0) {
      if (this.throttleInput > 0) {
        const boostMultiplier = this.isBoosting ? 2.2 : 1.0;
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

    // 3. Steering & Yaw Rotation
    if (this.spinTimer <= 0) {
      // Steer responsiveness depends on forward speed (can't turn when completely still)
      const speedFactor = Math.min(1.0, Math.abs(this.speed) / 35.0);
      const driftMultiplier = this.isDrifting ? 1.45 : 1.0;
      const turnDelta = -this.steerInput * this.turnSpeed * driftMultiplier * speedFactor * delta;

      this.rotation.y += turnDelta;

      // Visual front wheel steering angle with smooth spring
      const targetSteerAngle = -this.steerInput * 0.45;
      this.steerAngle += (targetSteerAngle - this.steerAngle) * 12 * delta;
    }

    // 4. Update Forward & Right Direction Vectors
    this.forward.set(
      -Math.sin(this.rotation.y),
      0,
      -Math.cos(this.rotation.y)
    ).normalize();

    this.right.set(
      this.forward.z,
      0,
      -this.forward.x
    ).normalize();

    // 5. Velocity & Drift Mechanics
    // Convert speed (km/h) to m/s: km/h / 3.6
    const forwardSpeedMS = (this.speed / 3.6);
    const targetVel = this.forward.clone().multiplyScalar(forwardSpeedMS);

    if (this.isDrifting) {
      // Slip angle: retain portion of old lateral velocity
      this.velocity.lerp(targetVel, 6 * delta);
    } else {
      this.velocity.lerp(targetVel, 18 * delta);
    }

    // Position step
    this.position.addScaledVector(this.velocity, delta);

    // 6. Track Alignment & Guardrail Collision
    this.handleTrackPhysics(delta);

    // 7. Checkpoints & Boost Pads
    this.handleCheckpoints();
    this.handleBoostPads();
  }

  handleTrackPhysics(delta) {
    this.closestTrack = this.track.getClosestTrackPoint(this.position);
    this.trackT = this.closestTrack.t;
    const trackPt = this.closestTrack.point;
    const trackTan = this.closestTrack.tangent;

    // Track surface height with smooth suspension spring
    const targetY = trackPt.y;
    this.position.y += (targetY - this.position.y) * 15 * delta;

    // Pitch vehicle to match track slope
    const slopePitch = Math.atan2(trackTan.y, Math.sqrt(trackTan.x * trackTan.x + trackTan.z * trackTan.z));
    this.rotation.x += (slopePitch - this.rotation.x) * 10 * delta;

    // Corner banking / roll tilt into turns (synthwave arcade feel)
    const lateralG = -this.steerInput * (this.speed / this.maxSpeed) * (this.isDrifting ? 0.35 : 0.18);
    this.rotation.z += (lateralG - this.rotation.z) * 8 * delta;

    // Track Guardrail / Boundary collision
    // Vector from track center to vehicle
    const toVehicle = this.position.clone().sub(trackPt);
    toVehicle.y = 0; // Horizontal plane distance
    const distToCenter = toVehicle.length();
    const maxTrackDistance = (this.track.roadWidth / 2) - 1.2;

    if (distToCenter > maxTrackDistance) {
      // Push back onto track
      const pushDir = toVehicle.clone().normalize().negate();
      const penetration = distToCenter - maxTrackDistance;
      this.position.addScaledVector(pushDir.negate(), -penetration);

      // Deflect velocity and damp speed on wall impact
      this.speed *= 0.82;
      this.velocity.multiplyScalar(0.85);

      // Bounce impulse away from wall
      this.velocity.addScaledVector(pushDir, 12);
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
