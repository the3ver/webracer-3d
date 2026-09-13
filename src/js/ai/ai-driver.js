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
    if (this.fireCooldown > 0) this.fireCooldown -= delta;

    // 1. Spline Waypoint Tracking
    const currentT = this.physics.trackT;
    const targetT = (currentT + this.personality.lookaheadT) % 1.0;
    const targetInfo = track.getTrackTransformAt(targetT);

    // Calculate lateral lane offset (racing line)
    const targetPt = targetInfo.position.clone();
    const tangent = targetInfo.tangent.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    targetPt.addScaledVector(binormal, this.personality.laneOffset);

    // Direction to target point
    const toTarget = targetPt.clone().sub(this.physics.position);
    toTarget.y = 0; // Project onto horizontal plane
    const distToTarget = toTarget.length();

    // Calculate steering angle needed
    const forward = this.physics.forward;
    const right = this.physics.right;

    toTarget.normalize();
    const dotForward = forward.dot(toTarget);
    const dotRight = right.dot(toTarget);

    // Steer input: proportional to how far off-axis the target is
    let steer = THREE.MathUtils.clamp(dotRight * 2.2, -1.0, 1.0);

    // 2. Throttle & Drift Control
    let throttle = 1.0;
    let handbrake = false;

    // Slow down slightly on sharp hairpin turns (low dotForward)
    if (dotForward < 0.65) {
      if (this.physics.speed > 80) {
        throttle = 0.2;
        handbrake = true; // Initiate drift
      }
    } else if (dotForward < 0.85) {
      if (this.physics.speed > 105) {
        throttle = 0.6;
      }
    }

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
