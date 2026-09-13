import * as THREE from 'three';
import { WEAPON_TYPES } from '../combat/weapons.js';

export class AIDriver {
  constructor(name, vehiclePhysics, carModel, options = {}) {
    this.name = name;
    this.physics = vehiclePhysics;
    this.model = carModel;
    this.isPlayer = false;

    this.weaponSlot = null;
    this.personality = {
      aggression: options.aggression || 0.7,      // Weapon trigger eagerness
      skill: options.skill || 0.85,                // Steering precision
      lookaheadT: options.lookaheadT || 0.035,     // Track spline lookahead
      laneOffset: options.laneOffset || 0.0        // Preferred racing line offset from center
    };

    this.fireCooldown = 2.0;
  }

  update(delta, track, allVehicles, weaponManager) {
    if (this.physics.isFalling) {
      this.physics.setInputs(0, 0, false);
      return;
    }

    if (this.fireCooldown > 0) this.fireCooldown -= delta;

    // 1. Tangent-based Curvature Lookahead & Cornering Speed
    const currentT = this.physics.trackT;
    const speed = this.physics.speed;

    const tanNow = track.getTrackTransformAt(currentT).tangent.clone().setY(0).normalize();
    const tanNear = track.getTrackTransformAt((currentT + 0.035) % 1.0).tangent.clone().setY(0).normalize();
    const tanFar = track.getTrackTransformAt((currentT + 0.070) % 1.0).tangent.clone().setY(0).normalize();

    const dotNear = tanNow.dot(tanNear);
    const dotFar = tanNow.dot(tanFar);
    const minDot = Math.min(dotNear, dotFar);

    // Calculate safe cornering target speed
    let targetSpeed = this.physics.maxSpeed;
    if (minDot < 0.45) {
      targetSpeed = 65; // tight hairpin
    } else if (minDot < 0.72) {
      targetSpeed = 82; // sharp curve
    } else if (minDot < 0.88) {
      targetSpeed = 105; // medium turn
    }

    // 2. Throttle & Braking Control
    let throttle = 1.0;
    let handbrake = false;

    if (speed > targetSpeed + 4) {
      throttle = -1.0; // Early, decisive braking before curve
    } else if (speed > targetSpeed) {
      throttle = 0.2; // Coasting into apex
    }

    // Centerline and road distance check
    const currentCenter = track.getTrackTransformAt(currentT).position;
    const toCenter = currentCenter.clone().sub(this.physics.position);
    toCenter.y = 0;
    const distFromCenter = toCenter.length();

    // Controlled handbrake drift only on sharp hairpins with safe margin
    if (minDot < 0.5 && speed > 55 && speed < 80 && distFromCenter < 2.0) {
      handbrake = true;
    }

    // 3. Dynamic Steering with Lateral Recovery
    const lookaheadT = THREE.MathUtils.clamp(0.015 + (speed / 140) * 0.02, 0.015, 0.032);
    const targetT = (currentT + lookaheadT) % 1.0;
    const targetInfo = track.getTrackTransformAt(targetT);

    // Calculate lateral lane offset (racing line)
    const targetPt = targetInfo.position.clone();
    const tangent = targetInfo.tangent.clone().setY(0).normalize();
    const binormal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    targetPt.addScaledVector(binormal, this.personality.laneOffset);

    // Centerline Recovery: Pull target back to center if drifting wide
    if (distFromCenter > 2.2) {
      targetPt.lerp(currentCenter, 0.6);
    }

    // Direction to target point
    const toTarget = targetPt.clone().sub(this.physics.position);
    toTarget.y = 0; // Project onto horizontal plane
    toTarget.normalize();

    const forward = this.physics.forward;

    // Invariant 2D Cross Product for Steering (+ right, - left)
    const cross = forward.x * toTarget.z - forward.z * toTarget.x;
    let steer = THREE.MathUtils.clamp(cross * 4.0 * this.personality.skill, -1.0, 1.0);

    // Apply inputs to physics
    this.physics.setInputs(throttle, steer, handbrake);

    // 3. AI Combat Decisions
    if (this.weaponSlot && this.fireCooldown <= 0) {
      this.evaluateWeaponUse(allVehicles, weaponManager);
    }
  }

  evaluateWeaponUse(allVehicles, weaponManager) {
    const weapon = this.weaponSlot;

    if (weapon === WEAPON_TYPES.NITRO) {
      // Fire Nitro on straights
      if (this.physics.speed > 75 && Math.abs(this.physics.steerInput) < 0.2) {
        weaponManager.fireWeapon(this, weapon, allVehicles);
        this.weaponSlot = null;
        this.fireCooldown = 3.0;
      }
    } else if (weapon === WEAPON_TYPES.SHIELD) {
      // Activate shield if opponent is nearby
      for (const v of allVehicles) {
        if (v === this) continue;
        if (this.physics.position.distanceTo(v.physics.position) < 35) {
          weaponManager.fireWeapon(this, weapon, allVehicles);
          this.weaponSlot = null;
          this.fireCooldown = 4.0;
          break;
        }
      }
    } else if (weapon === WEAPON_TYPES.MINE) {
      // Drop mine if opponent is close behind
      for (const v of allVehicles) {
        if (v === this) continue;
        const toOther = v.physics.position.clone().sub(this.physics.position);
        if (toOther.length() < 25 && toOther.dot(this.physics.forward) < -0.3) {
          weaponManager.fireWeapon(this, weapon, allVehicles);
          this.weaponSlot = null;
          this.fireCooldown = 3.5;
          break;
        }
      }
    } else if (weapon === WEAPON_TYPES.MISSILE || weapon === WEAPON_TYPES.EMP) {
      // Fire if opponent is in front
      for (const v of allVehicles) {
        if (v === this) continue;
        const toOther = v.physics.position.clone().sub(this.physics.position);
        if (toOther.length() < 90 && toOther.dot(this.physics.forward) > 0.6) {
          weaponManager.fireWeapon(this, weapon, allVehicles);
          this.weaponSlot = null;
          this.fireCooldown = 3.0;
          break;
        }
      }
    }
  }
}
