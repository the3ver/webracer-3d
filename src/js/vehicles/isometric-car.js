import * as THREE from 'three';
import { ArcadePhysics } from '../physics/arcade-physics.js';
import { getCarTypeConfig } from './car-types.js';

/**
 * Low-poly 3D racing car for isometric view.
 * Supports multiple distinct vehicle types (Sport, Muscle, Formula, Offroad Buggy, Tuner Drift)
 * with dedicated 3D aerodynamic parts, animated rotating wheels, steering angle, and drop shadows.
 */
export class IsometricCar {
  constructor(options = {}) {
    const typeCfg = getCarTypeConfig(options.typeId || 'red-fire');
    this.typeId = typeCfg.id;
    this.carType = typeCfg;
    this.name = options.name || typeCfg.name;
    this.color = options.color !== undefined ? options.color : typeCfg.color;
    this.accentColor = typeCfg.accentColor || 0xffffff;
    this.isAI = options.isAI || false;

    // Physics instance with vehicle-specific handling characteristics
    this.physics = new ArcadePhysics({
      x: options.x || 0,
      z: options.z || 0,
      angle: options.angle || 0,
      speed: 0,
      maxSpeed: options.maxSpeed !== undefined ? options.maxSpeed : (this.isAI ? Math.min(44, typeCfg.maxSpeed - 6) : typeCfg.maxSpeed),
      acceleration: options.acceleration !== undefined ? options.acceleration : typeCfg.acceleration,
      brakeDecel: options.brakeDecel !== undefined ? options.brakeDecel : typeCfg.brakeDecel,
      steerSpeed: options.steerSpeed !== undefined ? options.steerSpeed : typeCfg.steerSpeed,
      normalGrip: options.normalGrip !== undefined ? options.normalGrip : typeCfg.normalGrip,
      driftGrip: options.driftGrip !== undefined ? options.driftGrip : typeCfg.driftGrip,
      offroadResist: options.offroadResist !== undefined ? options.offroadResist : typeCfg.offroadResist,
      mass: options.mass !== undefined ? options.mass : typeCfg.mass,
      radius: 2.0
    });

    this.wheelRotation = 0;
    this.frontSteerAngle = 0;
    this.mesh = this.createCarMesh();
  }

  createCarMesh() {
    const carGroup = new THREE.Group();

    // Visual chassis group (body, cabin, wing, wheels) that can tilt/pitch independently of shadow
    this.chassis = new THREE.Group();
    carGroup.add(this.chassis);

    // Chassis / Main Body
    const isFormula = this.typeId === 'apex-formula';
    const isBuggy = this.typeId === 'mud-raider';
    const isMuscle = this.typeId === 'thunder-muscle';
    const isTuner = this.typeId === 'drift-king';

    const bodyLength = isFormula ? 4.4 : (isMuscle ? 4.2 : 4.0);
    const bodyWidth = isFormula ? 1.6 : (isTuner ? 2.4 : 2.2);
    const bodyHeight = isFormula ? 0.6 : (isBuggy ? 1.0 : 0.9);
    const bodyY = isBuggy ? 0.9 : 0.7;

    const bodyGeo = new THREE.BoxGeometry(bodyLength, bodyHeight, bodyWidth);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: isBuggy ? 0.6 : 0.3,
      metalness: isFormula ? 0.6 : 0.4
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = 'car_main_body';
    body.position.y = bodyY;
    body.castShadow = true;
    this.chassis.add(body);

    // Cabin / Cockpit
    if (isFormula) {
      // Open-cockpit driver helmet & intake scoop
      const cockpitGeo = new THREE.BoxGeometry(1.2, 0.45, 0.8);
      const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.2 });
      const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
      cockpit.name = 'formula_cockpit';
      cockpit.position.set(-0.2, bodyY + 0.45, 0);
      this.chassis.add(cockpit);

      const helmetGeo = new THREE.SphereGeometry(0.28, 8, 8);
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.2 });
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.set(0, bodyY + 0.6, 0);
      this.chassis.add(helmet);
    } else if (isBuggy) {
      // Open rollcage framework
      const cageMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.7, roughness: 0.3 });
      const cageGeo = new THREE.BoxGeometry(2.0, 0.9, 1.8);
      const cage = new THREE.Mesh(cageGeo, cageMat);
      cage.name = 'buggy_rollcage';
      cage.position.set(-0.2, bodyY + 0.8, 0);
      this.chassis.add(cage);

      // Roof spotlights rack
      const spotMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
      for (let s = -0.6; s <= 0.6; s += 0.4) {
        const spotGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.name = 'buggy_spotlight';
        spot.position.set(0.6, bodyY + 1.35, s);
        this.chassis.add(spot);
      }
    } else {
      // Standard / Muscle / Tuner cabin
      const cabinGeo = new THREE.BoxGeometry(2.0, 0.7, bodyWidth * 0.75);
      const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x111115,
        roughness: 0.1,
        metalness: 0.8
      });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(-0.3, bodyY + 0.7, 0);
      cabin.castShadow = true;
      this.chassis.add(cabin);
    }

    // Type-specific aerodynamic and decor props
    if (isMuscle) {
      // Blower hood scoop & aggressive drag spoiler
      const scoopGeo = new THREE.BoxGeometry(0.8, 0.35, 0.6);
      const scoopMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
      const scoop = new THREE.Mesh(scoopGeo, scoopMat);
      scoop.name = 'muscle_blower_scoop';
      scoop.position.set(1.2, bodyY + 0.55, 0);
      this.chassis.add(scoop);

      const wingGeo = new THREE.BoxGeometry(0.5, 0.12, 2.5);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.3 });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.name = 'muscle_drag_wing';
      wing.position.set(-1.9, bodyY + 0.8, 0);
      this.chassis.add(wing);
    } else if (isFormula) {
      // Formula aerodynamic nose cone, front canards and rear high wing
      const noseGeo = new THREE.ConeGeometry(0.6, 1.4, 4);
      const noseMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.3 });
      const nose = new THREE.Mesh(noseGeo, noseMat);
      nose.name = 'formula_nose';
      nose.rotation.z = -Math.PI / 2;
      nose.position.set(2.6, bodyY, 0);
      this.chassis.add(nose);

      // Front canard wing
      const canardGeo = new THREE.BoxGeometry(0.4, 0.08, 2.4);
      const canardMat = new THREE.MeshStandardMaterial({ color: 0x111115 });
      const canard = new THREE.Mesh(canardGeo, canardMat);
      canard.name = 'formula_canards';
      canard.position.set(2.3, bodyY - 0.1, 0);
      this.chassis.add(canard);

      // Rear high-downforce aero wing
      const fWingGeo = new THREE.BoxGeometry(0.6, 0.1, 2.2);
      const fWingMat = new THREE.MeshStandardMaterial({ color: 0x111115 });
      const fWing = new THREE.Mesh(fWingGeo, fWingMat);
      fWing.name = 'formula_aero_wing';
      fWing.position.set(-2.0, bodyY + 0.95, 0);
      this.chassis.add(fWing);

      const strutGeo = new THREE.BoxGeometry(0.1, 0.7, 0.1);
      const strutL = new THREE.Mesh(strutGeo, fWingMat);
      strutL.position.set(-2.0, bodyY + 0.6, 0.6);
      this.chassis.add(strutL);
      const strutR = new THREE.Mesh(strutGeo, fWingMat);
      strutR.position.set(-2.0, bodyY + 0.6, -0.6);
      this.chassis.add(strutR);
    } else if (isTuner) {
      // Tuner widebody fender flares & GT drift wing
      const wingGeo = new THREE.BoxGeometry(0.45, 0.1, 2.6);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.5 });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.name = 'tuner_drift_wing';
      wing.position.set(-1.85, bodyY + 0.85, 0);
      this.chassis.add(wing);

      // Neon underglow accent runners
      const neonMat = new THREE.MeshBasicMaterial({ color: 0xf15bb5 });
      const neonGeo = new THREE.BoxGeometry(3.0, 0.05, 0.1);
      const neonL = new THREE.Mesh(neonGeo, neonMat);
      neonL.position.set(0, 0.12, 1.1);
      this.chassis.add(neonL);
      const neonR = new THREE.Mesh(neonGeo, neonMat);
      neonR.position.set(0, 0.12, -1.1);
      this.chassis.add(neonR);
    } else if (!isBuggy) {
      // Red Fire / Standard rear wing
      const wingGeo = new THREE.BoxGeometry(0.5, 0.1, 2.2);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x222225 });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.name = 'sport_wing';
      wing.position.set(-1.8, bodyY + 0.75, 0);
      wing.castShadow = true;
      this.chassis.add(wing);

      const strutGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
      const strutL = new THREE.Mesh(strutGeo, wingMat);
      strutL.position.set(-1.8, bodyY + 0.45, 0.7);
      this.chassis.add(strutL);
      const strutR = new THREE.Mesh(strutGeo, wingMat);
      strutR.position.set(-1.8, bodyY + 0.45, -0.7);
      this.chassis.add(strutR);
    }

    // Headlights
    const lightGeo = new THREE.BoxGeometry(0.15, 0.2, 0.4);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const lightL = new THREE.Mesh(lightGeo, lightMat);
    lightL.position.set(bodyLength * 0.5, bodyY, bodyWidth * 0.35);
    this.chassis.add(lightL);
    const lightR = new THREE.Mesh(lightGeo, lightMat);
    lightR.position.set(bodyLength * 0.5, bodyY, -bodyWidth * 0.35);
    this.chassis.add(lightR);

    // Taillights
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const tailL = new THREE.Mesh(lightGeo, tailMat);
    tailL.position.set(-bodyLength * 0.5, bodyY, bodyWidth * 0.35);
    this.chassis.add(tailL);
    const tailR = new THREE.Mesh(lightGeo, tailMat);
    tailR.position.set(-bodyLength * 0.5, bodyY, -bodyWidth * 0.35);
    this.chassis.add(tailR);

    // Wheels
    const wheelRadius = isBuggy ? 0.58 : (isFormula ? 0.44 : 0.48);
    const wheelWidth = isBuggy ? 0.55 : (isFormula ? 0.48 : 0.4);
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: isBuggy ? 0.95 : 0.8
    });

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

    const wheelOffsetZ = isFormula ? 1.25 : (bodyWidth * 0.5 + wheelWidth * 0.4);
    const wheelOffsetX = bodyLength * 0.32;
    const wheelY = wheelRadius;

    this.wheels.fl.position.set(wheelOffsetX, wheelY, wheelOffsetZ);
    this.wheels.fr.position.set(wheelOffsetX, wheelY, -wheelOffsetZ);
    this.wheels.rl.position.set(-wheelOffsetX, wheelY, wheelOffsetZ);
    this.wheels.rr.position.set(-wheelOffsetX, wheelY, -wheelOffsetZ);

    this.chassis.add(this.wheels.fl);
    this.chassis.add(this.wheels.fr);
    this.chassis.add(this.wheels.rl);
    this.chassis.add(this.wheels.rr);

    // Drop shadow plane (stays at ground level)
    const shadowGeo = new THREE.PlaneGeometry(bodyLength + 0.8, bodyWidth + 0.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.03;
    carGroup.add(this.shadowMesh);

    return carGroup;
  }

  update(dt, input = {}, surface = {}) {
    this.physics.update(dt, input, surface);

    // Update 3D mesh position and rotation
    this.mesh.position.x = this.physics.x;
    this.mesh.position.y = this.physics.y;
    this.mesh.position.z = this.physics.z;
    this.mesh.rotation.y = -this.physics.angle;

    // Chassis pitch tilt when jumping/airborne
    if (this.chassis) {
      this.chassis.rotation.z = this.physics.pitch;
    }

    // Keep drop shadow planted at ground level
    if (this.shadowMesh) {
      this.shadowMesh.position.y = 0.03 - this.physics.y;
      const heightRatio = Math.min(1.0, this.physics.y / 6.0);
      this.shadowMesh.material.opacity = 0.45 * (1.0 - heightRatio * 0.55);
      const s = Math.max(0.65, 1.0 - heightRatio * 0.25);
      this.shadowMesh.scale.set(s, s, 1.0);
    }

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
