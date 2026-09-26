/**
 * 2.5D Arcade Vehicle Physics Model
 * Provides responsive handling, acceleration, braking, drifting (slip angle),
 * surface friction transitions, and elastic collision response.
 */
export class ArcadePhysics {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.z = options.z || 0;
    this.angle = options.angle || 0; // heading in radians (0 = +X, PI/2 = +Z)
    this.speed = options.speed || 0;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vz = Math.sin(this.angle) * this.speed;
    this.slipAngle = 0;
    this.isDrifting = false;

    this.maxSpeed = options.maxSpeed || 120;
    this.reverseMaxSpeed = options.reverseMaxSpeed || 35;
    this.acceleration = options.acceleration || 45;
    this.brakeDecel = options.brakeDecel || 65;
    this.friction = options.friction || 15;
    this.steerSpeed = options.steerSpeed || 2.5;
    this.normalGrip = options.normalGrip || 8.0; // lateral friction coefficient
    this.driftGrip = options.driftGrip || 2.2;   // lower lateral friction when drifting/handbrake
    this.offroadResist = options.offroadResist !== undefined ? options.offroadResist : 0.50;
    this.mass = options.mass || 1.0;
    this.radius = options.radius || 1.8; // collision bounding radius

    // Vertical / Jump Physics
    this.y = options.y || 0;
    this.vy = options.vy || 0;
    this.isAirborne = false;
    this.justLanded = false;
    this.pitch = 0;
    this.roll = 0;
  }

  launchJump(verticalVelocity = 12.0) {
    if (this.isAirborne) return;
    this.vy = Math.max(7.0, verticalVelocity);
    this.isAirborne = true;
    this.justLanded = false;
  }

  update(dt, input = {}, surface = { friction: 1.0, maxSpeedMultiplier: 1.0, grip: 1.0 }) {
    const { throttle = 0, steer = 0, handbrake = false } = input;
    const surfaceFriction = surface?.friction ?? 1.0;
    const baseMult = surface?.maxSpeedMultiplier ?? 1.0;
    const effectiveMult = baseMult < 1.0
      ? Math.min(1.0, baseMult * (this.offroadResist / 0.50))
      : baseMult;
    const surfaceMaxSpeed = this.maxSpeed * effectiveMult;
    const surfaceGrip = surface?.grip ?? 1.0;
    const roadY = (surface && surface.roadY !== undefined) ? surface.roadY : 0;
    const targetRoll = (surface && surface.bankRoll !== undefined) ? surface.bankRoll : 0;
    this.roll = this.roll !== undefined ? (this.roll + (targetRoll - this.roll) * Math.min(1.0, 10 * dt)) : targetRoll;

    // Vertical Jump / Gravity Integration
    if (this.isAirborne || this.y > roadY) {
      const gravity = 22.0;
      this.vy -= gravity * dt;
      this.y += this.vy * dt;
      this.pitch = Math.max(-0.28, Math.min(0.28, this.vy * 0.022));

      if (this.y <= roadY) {
        this.y = roadY;
        this.vy = 0;
        this.isAirborne = false;
        this.justLanded = true;
        this.pitch = 0;
      }
    } else {
      this.y = roadY;
      this.justLanded = false;
    }

    // If vehicle is airborne in flight: preserve ballistic momentum and disable ground steering
    if (this.isAirborne || this.y > 0) {
      this.speed = Math.hypot(this.vx, this.vz);
      this.slipAngle = 0;
      this.isDrifting = false;

      // Position integration in mid-air
      this.x += this.vx * dt;
      this.z += this.vz * dt;
      return;
    }

    // Longitudinal acceleration / braking (ground contact)
    if (throttle > 0) {
      if (this.speed < surfaceMaxSpeed) {
        this.speed += this.acceleration * throttle * surfaceFriction * dt;
        if (this.speed > surfaceMaxSpeed) this.speed = surfaceMaxSpeed;
      }
    } else if (throttle < 0) {
      if (this.speed > 0) {
        this.speed += this.brakeDecel * throttle * dt;
        if (this.speed < 0) this.speed = 0;
      } else {
        this.speed += this.acceleration * 0.5 * throttle * dt;
        if (this.speed < -this.reverseMaxSpeed) this.speed = -this.reverseMaxSpeed;
      }
    } else {
      if (this.speed > 0) {
        this.speed -= this.friction * dt;
        if (this.speed < 0) this.speed = 0;
      } else if (this.speed < 0) {
        this.speed += this.friction * dt;
        if (this.speed > 0) this.speed = 0;
      }
    }

    // Steering adjusts heading (ground contact)
    if (Math.abs(this.speed) > 0.5) {
      const dir = this.speed >= 0 ? 1 : -1;
      const steerMultiplier = handbrake ? 1.3 : 1.0; // slightly more rotation authority during drift
      this.angle += steer * this.steerSpeed * steerMultiplier * dir * dt;
    }

    // Direction unit vectors
    const fX = Math.cos(this.angle);
    const fZ = Math.sin(this.angle);
    const rX = -fZ; // right vector
    const rZ = fX;

    // Decompose current velocity into forward and lateral components
    const vForward = this.vx * fX + this.vz * fZ;
    const vLateral = this.vx * rX + this.vz * rZ;

    // Apply lateral grip damping
    const gripCoeff = (handbrake ? this.driftGrip : this.normalGrip) * surfaceGrip;
    const newVLateral = vLateral * Math.max(0, 1 - gripCoeff * dt);

    // Blend forward speed towards current throttle-driven target
    const newVForward = this.speed;

    // Reconstruct velocity vector
    this.vx = fX * newVForward + rX * newVLateral;
    this.vz = fZ * newVForward + rZ * newVLateral;

    // Calculate slip angle (radians between heading and velocity)
    const currentSpeed = Math.hypot(this.vx, this.vz);
    if (currentSpeed > 2.0) {
      this.slipAngle = Math.atan2(Math.abs(newVLateral), Math.max(0.1, Math.abs(newVForward)));
    } else {
      this.slipAngle = 0;
    }

    this.isDrifting = (handbrake || this.slipAngle > 0.20) && currentSpeed > 10;

    // Position integration
    this.x += this.vx * dt;
    this.z += this.vz * dt;
  }

  /**
   * Resolves collision against a track barrier or wall
   * @param {Object} barrier { normal: {x, z}, penetration: number }
   * @param {number} restitution Elastic bounce factor (0 = no bounce, 1 = perfectly elastic)
   */
  resolveBarrierCollision(barrier, restitution = 0.4) {
    if (!barrier || barrier.penetration <= 0) return false;

    const nx = barrier.normal.x;
    const nz = barrier.normal.z;

    // Displace vehicle out of barrier along normal
    this.x += nx * barrier.penetration;
    this.z += nz * barrier.penetration;

    // Normal dot product with velocity
    const dot = this.vx * nx + this.vz * nz;
    if (dot < 0) {
      this.vx -= (1 + restitution) * dot * nx;
      this.vz -= (1 + restitution) * dot * nz;

      // Update speed scalar
      const fX = Math.cos(this.angle);
      const fZ = Math.sin(this.angle);
      this.speed = this.vx * fX + this.vz * fZ;
    }

    return true;
  }

  /**
   * Resolves circle-to-circle collision between this vehicle and another
   * @param {ArcadePhysics} other
   * @param {number} restitution
   */
  resolveVehicleCollision(other, restitution = 0.5) {
    const dx = other.x - this.x;
    const dz = other.z - this.z;
    const dist = Math.hypot(dx, dz);
    const minDist = this.radius + other.radius;

    if (dist >= minDist || dist < 0.0001) return false;

    // Normal pointing from this -> other
    const nx = dx / dist;
    const nz = dz / dist;
    const penetration = minDist - dist;

    // Displace both cars half of the penetration depth
    this.x -= nx * penetration * 0.5;
    this.z -= nz * penetration * 0.5;
    other.x += nx * penetration * 0.5;
    other.z += nz * penetration * 0.5;

    // Relative velocity
    const rvx = other.vx - this.vx;
    const rvz = other.vz - this.vz;
    const velAlongNormal = rvx * nx + rvz * nz;

    if (velAlongNormal < 0) {
      const impulse = -(1 + restitution) * velAlongNormal * 0.5;
      this.vx -= impulse * nx;
      this.vz -= impulse * nz;
      other.vx += impulse * nx;
      other.vz += impulse * nz;

      // Re-sync forward speed
      const fX1 = Math.cos(this.angle);
      const fZ1 = Math.sin(this.angle);
      this.speed = this.vx * fX1 + this.vz * fZ1;

      const fX2 = Math.cos(other.angle);
      const fZ2 = Math.sin(other.angle);
      other.speed = other.vx * fX2 + other.vz * fZ2;
    }

    return true;
  }
}
