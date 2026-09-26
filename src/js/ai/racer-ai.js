/**
 * RacerAI: Autonomous racing driver logic for AI grid opponents.
 * Follows waypoints along the racing line, modulates speed through curves,
 * and maintains spacing to avoid running directly into competitors.
 * Supports configurable skill profiles: 'beginner' (Anfänger), 'medium' (Mittelmaß), and 'pro' (Profi).
 */

export const DIFFICULTY_PROFILES = {
  beginner: {
    id: 'beginner',
    label: 'Anfänger',
    lookaheadDistance: 10,
    aggressiveness: 0.78,
    cornerSpeedHairpin: 0.38,
    cornerSpeedMedium: 0.58,
    cornerSpeedFast: 0.90,
    brakeThreshold: 5.0,
    canDrift: false,
    steerSmoothing: 1.6,
    steeringJitter: 0.04
  },
  medium: {
    id: 'medium',
    label: 'Mittelmaß',
    lookaheadDistance: 15,
    aggressiveness: 0.92,
    cornerSpeedHairpin: 0.46,
    cornerSpeedMedium: 0.70,
    cornerSpeedFast: 0.98,
    brakeThreshold: 7.0,
    canDrift: false,
    steerSmoothing: 2.0,
    steeringJitter: 0.0
  },
  pro: {
    id: 'pro',
    label: 'Profi',
    lookaheadDistance: 22,
    aggressiveness: 1.04,
    cornerSpeedHairpin: 0.60,
    cornerSpeedMedium: 0.82,
    cornerSpeedFast: 1.00,
    brakeThreshold: 9.0, // late and efficient trail braking
    canDrift: true,      // controlled power-drift through sharp hairpins
    steerSmoothing: 2.5,
    steeringJitter: 0.0
  }
};

export function resolveDifficultyProfile(key = 'medium') {
  if (!key) return DIFFICULTY_PROFILES.medium;
  const normalized = key.toLowerCase();
  if (normalized === 'beginner' || normalized === 'anfänger' || normalized === 'anfaenger' || normalized === 'easy') {
    return DIFFICULTY_PROFILES.beginner;
  }
  if (normalized === 'pro' || normalized === 'profi' || normalized === 'hard' || normalized === 'expert') {
    return DIFFICULTY_PROFILES.pro;
  }
  return DIFFICULTY_PROFILES.medium;
}

/**
 * Computes vehicle performance configuration for an AI rival.
 * For 'pro' difficulty, the bot is given exactly identical speed and acceleration
 * to the player car (no cheating / unfair advantages).
 */
export function getBotCarConfig(difficulty = 'medium', botIndex = 0) {
  const profile = resolveDifficultyProfile(difficulty);
  if (profile.id === 'pro') {
    // 100% fair: Identical to Player car limits
    return {
      maxSpeed: 50,
      acceleration: 22
    };
  }
  if (profile.id === 'beginner') {
    return {
      maxSpeed: 38 + Math.min(botIndex * 0.8, 3.0),
      acceleration: 16 + Math.min(botIndex * 0.5, 2.0)
    };
  }
  // Medium default
  return {
    maxSpeed: 44 + Math.min(botIndex * 1.0, 3.5),
    acceleration: 19 + Math.min(botIndex * 0.6, 2.0)
  };
}

export class RacerAI {
  constructor(options = {}) {
    this.waypoints = options.waypoints || [];

    const profile = resolveDifficultyProfile(options.difficulty || 'medium');
    this.profile = profile;

    this.lookaheadDistance = options.lookaheadDistance !== undefined ? options.lookaheadDistance : profile.lookaheadDistance;
    this.aggressiveness = options.aggressiveness !== undefined ? options.aggressiveness : profile.aggressiveness;
    this.skill = options.skill !== undefined ? options.skill : 1.0;
  }

  /**
   * Computes driving inputs for an AI vehicle
   * @param {ArcadePhysics} car Current physics state of this AI car
   * @param {number} targetWpIndex Next target waypoint index
   * @param {Array<ArcadePhysics>} otherCars Other vehicles on track
   * @returns {{ throttle: number, steer: number, handbrake: boolean }}
   */
  computeInput(car, targetWpIndex = 0, otherCars = []) {
    if (!this.waypoints || this.waypoints.length === 0) {
      return { throttle: 1, steer: 0, handbrake: false };
    }

    const nWp = this.waypoints.length;
    const targetWp = this.waypoints[targetWpIndex % nWp];
    
    // For Pro AI: Blend target waypoint with upcoming waypoint for smooth apex entry at speed
    let aimX = targetWp.x;
    let aimZ = targetWp.z;
    if (this.profile.canDrift && nWp > 2 && car.speed > 25) {
      const nextWp = this.waypoints[(targetWpIndex + 1) % nWp];
      aimX = targetWp.x * 0.7 + nextWp.x * 0.3;
      aimZ = targetWp.z * 0.7 + nextWp.z * 0.3;
    }

    const dx = aimX - car.x;
    const dz = aimZ - car.z;

    const targetAngle = Math.atan2(dz, dx);
    let angleDiff = targetAngle - car.angle;

    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Steering proportional to angle difference
    let steer = Math.max(-1.0, Math.min(1.0, angleDiff * this.profile.steerSmoothing));

    // Optional mild steering jitter for beginner to simulate human hesitation
    if (this.profile.steeringJitter > 0 && Math.abs(steer) > 0.15) {
      steer += (Math.sin(car.x * 0.5 + car.z * 0.5) * this.profile.steeringJitter);
      steer = Math.max(-1.0, Math.min(1.0, steer));
    }

    // Look at upcoming curve severity to modulate speed based on profile
    const turnSharpness = Math.abs(angleDiff);
    let targetSpeed = car.maxSpeed * this.aggressiveness;

    if (turnSharpness > 1.0) {
      // Very sharp corner (hairpin)
      targetSpeed = car.maxSpeed * this.profile.cornerSpeedHairpin;
    } else if (turnSharpness > 0.5) {
      // Medium corner
      targetSpeed = car.maxSpeed * this.profile.cornerSpeedMedium;
    } else {
      // Fast curve or straight
      targetSpeed = car.maxSpeed * this.profile.cornerSpeedFast;
    }

    let throttle = 1.0;
    const brakeThresh = this.profile.brakeThreshold;
    if (car.speed > targetSpeed + brakeThresh) {
      // Over target speed: apply brake
      throttle = -0.7;
    } else if (car.speed > targetSpeed) {
      // Coasting
      throttle = 0.25;
    } else {
      // Accelerating
      throttle = 1.0;
    }

    // Power drift logic for Pro AI:
    // If approaching or in a sharp corner at high speed, trigger handbrake to rotate quickly around apex
    let handbrake = false;
    if (this.profile.canDrift && turnSharpness > 0.75 && car.speed > car.maxSpeed * 0.55) {
      handbrake = true;
    }

    // Vehicle avoidance
    for (const other of otherCars) {
      if (!other || other === car) continue;
      const ox = other.x - car.x;
      const oz = other.z - car.z;
      const dist = Math.hypot(ox, oz);

      if (dist < 7.0) {
        // Project onto car forward vector
        const fX = Math.cos(car.angle);
        const fZ = Math.sin(car.angle);
        const forwardProj = ox * fX + oz * fZ;

        if (forwardProj > 0 && forwardProj < 6.0) {
          // Car directly ahead: nudge steering to overtake or back off
          const rX = -fZ;
          const rZ = fX;
          const lateralProj = ox * rX + oz * rZ;

          if (lateralProj > 0) {
            steer -= 0.3; // steer left
          } else {
            steer += 0.3; // steer right
          }
          if (dist < 4.0 && car.speed > other.speed) {
            throttle = -0.3; // tap brakes to avoid ramming
          }
        }
      }
    }

    steer = Math.max(-1.0, Math.min(1.0, steer));

    return {
      throttle,
      steer,
      handbrake
    };
  }
}
