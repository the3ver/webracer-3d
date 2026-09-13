import * as THREE from 'three';

export const WEAPON_TYPES = {
  MISSILE: 'MISSILE',
  EMP: 'EMP',
  MINE: 'MINE',
  NITRO: 'NITRO',
  SHIELD: 'SHIELD'
};

export const WEAPON_INFO = {
  MISSILE: { name: 'Homing Missile', icon: '🚀', color: '#ff3366' },
  EMP: { name: 'EMP Shockwave', icon: '⚡', color: '#00ffff' },
  MINE: { name: 'Cyber Mine', icon: '💣', color: '#ff007f' },
  NITRO: { name: 'Nitro Surge', icon: '🔥', color: '#ffe600' },
  SHIELD: { name: 'Energy Shield', icon: '🛡️', color: '#00ffcc' }
};

export class WeaponManager {
  constructor(scene, audioSynth) {
    this.scene = scene;
    this.audioSynth = audioSynth;

    this.projectiles = [];
    this.mines = [];
    this.particles = [];
  }

  // Fire or activate weapon for a vehicle
  fireWeapon(vehicle, weaponType, allVehicles) {
    if (!weaponType) return false;

    switch (weaponType) {
      case WEAPON_TYPES.MISSILE:
        this.launchMissile(vehicle, allVehicles);
        if (this.audioSynth) this.audioSynth.playShoot('missile');
        return true;

      case WEAPON_TYPES.EMP:
        this.launchEmp(vehicle, allVehicles);
        if (this.audioSynth) this.audioSynth.playShoot('emp');
        return true;

      case WEAPON_TYPES.MINE:
        this.dropMine(vehicle);
        if (this.audioSynth) this.audioSynth.playShoot('mine');
        return true;

      case WEAPON_TYPES.NITRO:
        vehicle.physics.triggerBoost(2.8);
        if (this.audioSynth) this.audioSynth.playBoost();
        return true;

      case WEAPON_TYPES.SHIELD:
        vehicle.physics.hasShield = true;
        if (this.audioSynth) this.audioSynth.playShield();
        return true;
    }
    return false;
  }

  launchMissile(firer, allVehicles) {
    // Find target in front
    let bestTarget = null;
    let bestDist = 180.0; // Max locking range

    for (const v of allVehicles) {
      if (v === firer) continue;
      const toTarget = v.physics.position.clone().sub(firer.physics.position);
      const dist = toTarget.length();
      if (dist < bestDist) {
        // Must be roughly ahead (dot product > 0.3)
        const forward = firer.physics.forward;
        if (toTarget.clone().normalize().dot(forward) > 0.25) {
          bestTarget = v;
          bestDist = dist;
        }
      }
    }

    // Missile 3D Mesh (Glowing rocket with neon trail)
    const missileGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.2, 8);
    missileGeo.rotateX(Math.PI / 2);
    const missileMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const mesh = new THREE.Mesh(missileGeo, missileMat);

    // Initial position slightly in front of firing vehicle
    mesh.position.copy(firer.physics.position).addScaledVector(firer.physics.forward, 3.0);
    mesh.position.y += 0.5;

    // Glowing exhaust light
    const glowGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = 0.6;
    mesh.add(glow);

    this.scene.add(mesh);

    this.projectiles.push({
      type: 'missile',
      mesh,
      firer,
      target: bestTarget,
      velocity: firer.physics.forward.clone().multiplyScalar(120), // fast missile
      life: 3.5 // seconds
    });
  }

  launchEmp(firer, allVehicles) {
    // EMP Energy Orb
    const empGeo = new THREE.SphereGeometry(0.6, 12, 12);
    const empMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true
    });
    const mesh = new THREE.Mesh(empGeo, empMat);
    mesh.position.copy(firer.physics.position).addScaledVector(firer.physics.forward, 3.0);
    mesh.position.y += 0.6;

    this.scene.add(mesh);

    this.projectiles.push({
      type: 'emp',
      mesh,
      firer,
      velocity: firer.physics.forward.clone().multiplyScalar(95),
      life: 2.2
    });
  }

  dropMine(firer) {
    // Spiky Cyber Mine Mesh
    const mineGroup = new THREE.Group();
    const coreGeo = new THREE.DodecahedronGeometry(0.65);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x111116,
      roughness: 0.3,
      metalness: 0.9
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    mineGroup.add(core);

    const ringGeo = new THREE.TorusGeometry(0.8, 0.08, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    mineGroup.add(ring);

    // Drop behind car
    mineGroup.position.copy(firer.physics.position).addScaledVector(firer.physics.forward, -3.2);
    mineGroup.position.y += 0.4;

    this.scene.add(mineGroup);

    this.mines.push({
      mesh: mineGroup,
      ring,
      firer,
      armTime: 0.6, // Arm delay so dropping car doesn't trigger it
      radius: 2.5,
      life: 45.0 // last long until hit
    });
  }

  createExplosion(position, colorHex = 0xff0055, count = 25) {
    if (this.audioSynth) this.audioSynth.playExplosion();

    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true });
      const pMesh = new THREE.Mesh(geo, mat);
      pMesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        Math.random() * 20 + 5,
        (Math.random() - 0.5) * 30
      );

      this.scene.add(pMesh);
      this.particles.push({
        mesh: pMesh,
        vel,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2
      });
    }
  }

  update(delta, allVehicles) {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Homing guidance for missiles
      if (p.type === 'missile' && p.target) {
        const toTarget = p.target.physics.position.clone().sub(p.mesh.position).normalize();
        p.velocity.lerp(toTarget.multiplyScalar(135), 6 * delta);
        p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), p.velocity.clone().normalize());
      } else if (p.type === 'emp') {
        p.mesh.rotation.y += delta * 6;
        p.mesh.rotation.x += delta * 4;
      }

      p.mesh.position.addScaledVector(p.velocity, delta);

      // Check hit with vehicles
      let hit = false;
      for (const v of allVehicles) {
        if (v === p.firer) continue;
        const d = p.mesh.position.distanceTo(v.physics.position);
        if (d < 3.0) {
          hit = true;
          if (p.type === 'missile') {
            v.physics.triggerSpin(1.4);
            this.createExplosion(p.mesh.position, 0xff0055, 30);
          } else if (p.type === 'emp') {
            v.physics.triggerEmp(2.5);
            this.createExplosion(p.mesh.position, 0x00ffff, 25);
          }
          break;
        }
      }

      if (hit) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Mines
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.armTime -= delta;
      m.life -= delta;
      m.mesh.rotation.y += delta * 3.0;

      // Pulse ring scale
      const pulse = 1.0 + Math.sin(Date.now() * 0.01) * 0.2;
      m.ring.scale.set(pulse, pulse, pulse);

      if (m.life <= 0) {
        this.scene.remove(m.mesh);
        this.mines.splice(i, 1);
        continue;
      }

      if (m.armTime <= 0) {
        for (const v of allVehicles) {
          const d = m.mesh.position.distanceTo(v.physics.position);
          if (d < m.radius) {
            v.physics.triggerSpin(1.5);
            this.createExplosion(m.mesh.position, 0xff007f, 35);
            this.scene.remove(m.mesh);
            this.mines.splice(i, 1);
            break;
          }
        }
      }
    }

    // 3. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= delta;
      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      pt.vel.y -= 25 * delta; // Gravity
      pt.mesh.position.addScaledVector(pt.vel, delta);
      pt.mesh.material.opacity = pt.life / pt.maxLife;
      pt.mesh.rotation.x += delta * 5;
      pt.mesh.rotation.y += delta * 5;
    }
  }
}
