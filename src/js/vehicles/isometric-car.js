import * as THREE from 'three';
import { ArcadePhysics } from '../physics/arcade-physics.js';

/**
 * Low-poly 3D racing car for isometric view.
 * Features animated rotating wheels, front wheel steering angles,
 * soft drop-shadow, and particle trail integration.
 */
export class IsometricCar {
  constructor(options = {}) {
    this.name = options.name || 'Racer';
    this.color = options.color || 0xe63946;
    this.isAI = options.isAI || false;

    // Physics instance
    this.physics = new ArcadePhysics({
      x: options.x || 0,
      z: options.z || 0,
      angle: options.angle || 0,
      speed: 0,
      maxSpeed: options.maxSpeed || (this.isAI ? 44 : 50),
      acceleration: options.acceleration || 22,
      brakeDecel: options.brakeDecel || 40,
      steerSpeed: options.steerSpeed || 1.85,
      radius: 2.0
    });

    this.wheelRotation = 0;
    this.frontSteerAngle = 0;
    this.mesh = this.createCarMesh();
  }

  createCarMesh() {
    const carGroup = new THREE.Group();

    // Chassis / Body
    const bodyGeo = new THREE.BoxGeometry(4.0, 0.9, 2.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.3,
      metalness: 0.4
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    body.castShadow = true;
    carGroup.add(body);

    // Cockpit / Cabin
    const cabinGeo = new THREE.BoxGeometry(2.0, 0.7, 1.6);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.1,
      metalness: 0.8
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(-0.3, 1.4, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Rear Spoiler Wing
    const wingGeo = new THREE.BoxGeometry(0.5, 0.1, 2.2);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x222225 });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(-1.8, 1.45, 0);
    wing.castShadow = true;
    carGroup.add(wing);

    // Wing Struts
    const strutGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
    const strutL = new THREE.Mesh(strutGeo, wingMat);
    strutL.position.set(-1.8, 1.15, 0.7);
    carGroup.add(strutL);
    const strutR = new THREE.Mesh(strutGeo, wingMat);
    strutR.position.set(-1.8, 1.15, -0.7);
    carGroup.add(strutR);

    // Headlights
    const lightGeo = new THREE.BoxGeometry(0.15, 0.2, 0.4);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const lightL = new THREE.Mesh(lightGeo, lightMat);
    lightL.position.set(2.0, 0.7, 0.7);
    carGroup.add(lightL);
    const lightR = new THREE.Mesh(lightGeo, lightMat);
    lightR.position.set(2.0, 0.7, -0.7);
    carGroup.add(lightR);

    // Taillights
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const tailL = new THREE.Mesh(lightGeo, tailMat);
    tailL.position.set(-2.0, 0.7, 0.7);
    carGroup.add(tailL);
    const tailR = new THREE.Mesh(lightGeo, tailMat);
    tailR.position.set(-2.0, 0.7, -0.7);
    carGroup.add(tailR);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.4, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

    this.wheels = {
      fl: new THREE.Group(),
      fr: new THREE.Group(),
      rl: new THREE.Group(),
      rr: new THREE.Group()
    };

    const makeWheel = () => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.castShadow = true;
      return w;
    };

    this.wheelMeshes = {
      fl: makeWheel(),
      fr: makeWheel(),
      rl: makeWheel(),
      rr: makeWheel()
    };

    this.wheels.fl.add(this.wheelMeshes.fl);
    this.wheels.fr.add(this.wheelMeshes.fr);
    this.wheels.rl.add(this.wheelMeshes.rl);
    this.wheels.rr.add(this.wheelMeshes.rr);

    this.wheels.fl.position.set(1.3, 0.48, 1.15);
    this.wheels.fr.position.set(1.3, 0.48, -1.15);
    this.wheels.rl.position.set(-1.3, 0.48, 1.15);
    this.wheels.rr.position.set(-1.3, 0.48, -1.15);

    carGroup.add(this.wheels.fl);
    carGroup.add(this.wheels.fr);
    carGroup.add(this.wheels.rl);
    carGroup.add(this.wheels.rr);

    // Drop shadow plane
    const shadowGeo = new THREE.PlaneGeometry(4.8, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.03;
    carGroup.add(shadowMesh);

    return carGroup;
  }

  update(dt, input = {}, surface = {}) {
    this.physics.update(dt, input, surface);

    // Update 3D mesh position and rotation
    this.mesh.position.x = this.physics.x;
    this.mesh.position.z = this.physics.z;
    // Three.js rotation: in our coordinate system, heading 0 is +X, heading PI/2 is +Z
    // In Three.js: rotation.y = -physics.angle
    this.mesh.rotation.y = -this.physics.angle;

    // Wheel animation
    const speed = Math.hypot(this.physics.vx, this.physics.vz);
    const wheelRotSpeed = (speed / 0.48) * dt;
    this.wheelRotation += (this.physics.speed >= 0 ? 1 : -1) * wheelRotSpeed;

    for (const key of ['fl', 'fr', 'rl', 'rr']) {
      this.wheelMeshes[key].rotation.y = this.wheelRotation;
    }

    // Front wheel steering angle
    const targetSteerAngle = (input.steer || 0) * 0.45;
    this.frontSteerAngle += (targetSteerAngle - this.frontSteerAngle) * Math.min(1.0, 15 * dt);
    this.wheels.fl.rotation.y = this.frontSteerAngle;
    this.wheels.fr.rotation.y = this.frontSteerAngle;
  }
}
