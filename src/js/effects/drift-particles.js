import * as THREE from 'three';

/**
 * DriftParticles: High-performance instanced particle system for drift effects.
 * Throws pebbles, mud chunks, and rubber debris sideways and backwards from the
 * rear tires when drifting, with realistic gravity, bounce, and surface-adapted colors.
 */
export class DriftParticles {
  constructor(scene, maxParticles = 250) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.particles = [];
    this.nextIndex = 0;

    // Single draw-call instanced mesh for 3D tire smoke puffs, pebbles and debris
    const geo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.1
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    if (this.scene) {
      this.scene.add(this.mesh);
    }

    const dummy = new THREE.Object3D();
    dummy.position.set(0, -999, 0);
    dummy.updateMatrix();

    for (let i = 0; i < maxParticles; i++) {
      this.mesh.setMatrixAt(i, dummy.matrix);
      this.mesh.setColorAt(i, new THREE.Color(0x333333));
      this.particles.push({
        alive: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        rotSpeedX: 0,
        rotSpeedY: 0,
        scale: 1.0,
        life: 0,
        maxLife: 0.6
      });
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    this.dummy = new THREE.Object3D();
  }

  getActiveCount() {
    return this.particles.filter(p => p.alive).length;
  }

  /**
   * Spawns debris particles from a tire contact patch
   */
  emit(options = {}) {
    const {
      x = 0,
      y = 0.2,
      z = 0,
      headingAngle = 0,
      slipDirection = 1, // +1 right, -1 left
      speed = 20,
      surface = 'asphalt',
      count = 3
    } = options;

    let colors;
    if (surface === 'grass') {
      // Mud chunks and grass turf
      colors = [0x582f0e, 0x7f4f24, 0x936639, 0x472d17, 0x55a630];
    } else if (surface === 'curb') {
      // Paint chips, sparks and rubber
      colors = [0xd90429, 0xffffff, 0xffd166, 0x222222];
    } else {
      // High-contrast billowy white/silver tire smoke & friction sparks
      colors = [0xffffff, 0xf2f4f7, 0xd8dde4, 0xffe169, 0xcccccc, 0x333333];
    }

    const fX = Math.cos(headingAngle);
    const fZ = Math.sin(headingAngle);
    const rX = -fZ;
    const rZ = fX;

    for (let i = 0; i < count; i++) {
      const p = this.particles[this.nextIndex];
      p.alive = true;
      p.life = 0;
      p.maxLife = 0.55 + Math.random() * 0.45;
      p.scale = (surface === 'grass' ? 1.6 : 1.35) + Math.random() * 0.55;

      p.x = x + (Math.random() - 0.5) * 0.4;
      p.y = Math.max(0.25, y + Math.random() * 0.2);
      p.z = z + (Math.random() - 0.5) * 0.4;

      // Sprays backwards and outwards according to slip angle
      const backwardSpeed = (speed * 0.35 + 3.5 + Math.random() * 6);
      const sidewaysSpeed = (slipDirection * (5 + Math.random() * 8));
      const upwardSpeed = (surface === 'grass' ? 6.0 : 4.2) + Math.random() * 4.0;

      p.vx = -fX * backwardSpeed + rX * sidewaysSpeed + (Math.random() - 0.5) * 2.5;
      p.vy = upwardSpeed;
      p.vz = -fZ * backwardSpeed + rZ * sidewaysSpeed + (Math.random() - 0.5) * 2.5;

      p.rotX = Math.random() * Math.PI * 2;
      p.rotY = Math.random() * Math.PI * 2;
      p.rotZ = Math.random() * Math.PI * 2;
      p.rotSpeedX = (Math.random() - 0.5) * 14;
      p.rotSpeedY = (Math.random() - 0.5) * 14;

      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      this.mesh.setColorAt(this.nextIndex, new THREE.Color(chosenColor));

      this.nextIndex = (this.nextIndex + 1) % this.maxParticles;
    }

    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  update(dt) {
    const gravity = 18.0;
    let needsMatrixUpdate = false;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.alive) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.alive = false;
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.set(0.001, 0.001, 0.001);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        needsMatrixUpdate = true;
        continue;
      }

      // Physics integration
      p.vy -= gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Keep particles visibly resting or bouncing on top of the track/grass plane
      if (p.y < 0.22) {
        p.y = 0.22;
        p.vy = -p.vy * 0.35; // bounce
        p.vx *= 0.7;
        p.vz *= 0.7;
      }

      p.rotX += p.rotSpeedX * dt;
      p.rotY += p.rotSpeedY * dt;

      const progress = p.life / p.maxLife;
      const expand = 1.0 + progress * 0.75; // Smoke billows and expands outwards
      const currentScale = Math.max(0.2, p.scale * expand * (1.0 - progress * 0.45));

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
      this.dummy.scale.set(currentScale, currentScale, currentScale);
      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(i, this.dummy.matrix);
      needsMatrixUpdate = true;
    }

    if (needsMatrixUpdate) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
