/**
 * RacerAI: Autonomous racing driver logic for AI grid opponents.
 * Follows waypoints along the racing line, modulates speed through curves,
 * and maintains spacing to avoid running directly into competitors.
 */
export class RacerAI {
  constructor(options = {}) {
    this.waypoints = options.waypoints || [];
    this.lookaheadDistance = options.lookaheadDistance || 18;
    this.aggressiveness = options.aggressiveness || 1.0; // 0.8 (safe) to 1.2 (aggressive)
    this.skill = options.skill || 1.0;
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

    const targetWp = this.waypoints[targetWpIndex % this.waypoints.length];
    const dx = targetWp.x - car.x;
    const dz = targetWp.z - car.z;

    const targetAngle = Math.atan2(dz, dx);
    let angleDiff = targetAngle - car.angle;

    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Steering proportional to angle difference
    let steer = Math.max(-1.0, Math.min(1.0, angleDiff * 2.0));

    // Look at upcoming curve severity to modulate speed
    const turnSharpness = Math.abs(angleDiff);
    let targetSpeed = car.maxSpeed * this.aggressiveness;

    if (turnSharpness > 1.0) {
      // Very sharp corner (hairpin)
      targetSpeed = car.maxSpeed * 0.42;
    } else if (turnSharpness > 0.5) {
      // Medium corner
      targetSpeed = car.maxSpeed * 0.68;
    } else {
      // Fast curve or straight
      targetSpeed = car.maxSpeed * 0.98;
    }

    let throttle = 1.0;
    if (car.speed > targetSpeed + 8) {
      // Over target speed: apply brake
      throttle = -0.6;
    } else if (car.speed > targetSpeed) {
      // Coasting
      throttle = 0.2;
    } else {
      // Accelerating
      throttle = 1.0;
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
      handbrake: false
    };
  }
}
