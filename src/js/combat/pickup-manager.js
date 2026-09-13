import * as THREE from 'three';
import { WEAPON_TYPES } from './weapons.js';

export class PickupManager {
  constructor(scene, track, audioSynth) {
    this.scene = scene;
    this.track = track;
    this.audioSynth = audioSynth;

    this.pickups = [];
    this.spawnPickups();
  }

  spawnPickups() {
    // Distribute 8 pickup stations along the circuit
    const pickupLocations = [0.08, 0.22, 0.38, 0.52, 0.65, 0.78, 0.88, 0.96];

    pickupLocations.forEach((t, idx) => {
      const info = this.track.getTrackTransformAt(t);
      const pt = info.position.clone();
      const tan = info.tangent.clone().normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tan, normal).normalize();

      // Row of 2 pickup boxes side by side across road width
      const offsets = [-4.0, 4.0];
      offsets.forEach((offset, subIdx) => {
        const pos = pt.clone().addScaledVector(binormal, offset);
        pos.y += 1.4;

        // Outer Wireframe Crystal Cube
        const outerGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        const outerMat = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          wireframe: true,
          transparent: true,
          opacity: 0.85
        });
        const outerCube = new THREE.Mesh(outerGeo, outerMat);

        // Inner glowing core
        const innerGeo = new THREE.OctahedronGeometry(0.8);
        const innerMat = new THREE.MeshBasicMaterial({
          color: 0xff00ff,
          wireframe: false
        });
        const innerCube = new THREE.Mesh(innerGeo, innerMat);
        outerCube.add(innerCube);

        outerCube.position.copy(pos);
        this.scene.add(outerCube);

        this.pickups.push({
          id: `pickup_${idx}_${subIdx}`,
          mesh: outerCube,
          inner: innerCube,
          baseY: pos.y,
          position: pos,
          active: true,
          respawnTimer: 0.0,
          radius: 2.8
        });
      });
    });
  }

  getRandomWeapon(racePosition = 1) {
    // Mario Kart style rubberband weapon distribution
    // If in 4th (last), very high chance of Nitro or Missile
    // If in 1st, high chance of Shield or Mine
    const pool = [];
    if (racePosition >= 3) {
      // Behind: aggressive comeback items
      pool.push(WEAPON_TYPES.NITRO, WEAPON_TYPES.NITRO, WEAPON_TYPES.MISSILE, WEAPON_TYPES.MISSILE, WEAPON_TYPES.EMP);
    } else if (racePosition === 2) {
      // Mid: balanced items
      pool.push(WEAPON_TYPES.MISSILE, WEAPON_TYPES.EMP, WEAPON_TYPES.NITRO, WEAPON_TYPES.MINE, WEAPON_TYPES.SHIELD);
    } else {
      // 1st place: defense & traps
      pool.push(WEAPON_TYPES.MINE, WEAPON_TYPES.MINE, WEAPON_TYPES.SHIELD, WEAPON_TYPES.SHIELD, WEAPON_TYPES.EMP);
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  checkCollisions(vehicle, racePosition = 1) {
    if (vehicle.weaponSlot) return null; // Already holding weapon

    for (const p of this.pickups) {
      if (!p.active) continue;

      const d = vehicle.physics.position.distanceTo(p.position);
      if (d < p.radius) {
        // Collect!
        p.active = false;
        p.mesh.visible = false;
        p.respawnTimer = 6.0; // Respawn after 6 seconds

        const weapon = this.getRandomWeapon(racePosition);
        if (this.audioSynth && vehicle.isPlayer) {
          this.audioSynth.playPickup();
        }
        return weapon;
      }
    }
    return null;
  }

  update(delta) {
    const time = Date.now() * 0.002;

    this.pickups.forEach((p) => {
      if (!p.active) {
        p.respawnTimer -= delta;
        if (p.respawnTimer <= 0) {
          p.active = true;
          p.mesh.visible = true;
        }
      } else {
        // Idle floating & rotation animation
        p.mesh.rotation.y += delta * 1.8;
        p.mesh.rotation.x += delta * 0.8;
        p.inner.rotation.y -= delta * 3.0;
        p.mesh.position.y = p.baseY + Math.sin(time + p.position.x) * 0.3;
      }
    });
  }
}
