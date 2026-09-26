import * as THREE from 'three';
import { ArcadePhysics } from '../physics/arcade-physics.js';
import { getCarTypeConfig } from './car-types.js';

/**
 * Generates a dynamic procedural canvas texture for racing liveries:
 * - Dual GT racing stripes
 * - Hexagonal carbon fiber weave on hood/roof
 * - Racing number badge (#1, #7, #88, #99)
 * - Sponsor lettering and aerodynamic accents
 */
export function createProceduralLiveryTexture(baseColorHex = 0xe63946, typeId = 'red-fire', accentColorHex = 0xffffff) {
  const width = 256;
  const height = 128;

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Base vehicle body paint
    const hexStr = '#' + (typeof baseColorHex === 'number' ? baseColorHex.toString(16).padStart(6, '0') : 'e63946');
    ctx.fillStyle = hexStr;
    ctx.fillRect(0, 0, width, height);

    // 2. Twin GT Racing Stripes
    const accentStr = '#' + (typeof accentColorHex === 'number' ? accentColorHex.toString(16).padStart(6, '0') : 'ffffff');
    ctx.fillStyle = accentStr;
    const stripeW = 14;
    const center = height * 0.5;
    ctx.fillRect(0, center - stripeW - 3, width, stripeW);
    ctx.fillRect(0, center + 3, width, stripeW);

    // 3. Carbon Fiber Pattern
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = 0; x < width; x += 6) {
      for (let y = 0; y < height; y += 6) {
        if ((x + y) % 12 === 0) {
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }

    // 4. Racing Number Badge
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width * 0.42, height * 0.22, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111115';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#111115';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const num = typeId === 'apex-formula' ? '1' : (typeId === 'thunder-muscle' ? '88' : (typeId === 'drift-king' ? '99' : (typeId === 'mud-raider' ? '4x4' : '7')));
    ctx.fillText(num, width * 0.42, height * 0.22);

    // 5. Sponsor Lettering
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('APEX RACING', width * 0.72, height * 0.88);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  } else {
    // High-performance DataTexture fallback in Node test runners
    const size = width * height * 4;
    const data = new Uint8Array(size);
    const r = (baseColorHex >> 16) & 255;
    const g = (baseColorHex >> 8) & 255;
    const b = baseColorHex & 255;

    for (let i = 0; i < size; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }
}

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
    this.wheelConfig = this.getWheelConfig(this.typeId);
    this.suspension = { fl: 0, fr: 0, rl: 0, rr: 0 };
    this.suspensionTimer = 0;
    this.mesh = this.createCarMesh();
  }

  getWheelConfig(typeId) {
    switch (typeId) {
      case 'apex-formula':
        return {
          frontRadius: 0.38,
          frontWidth: 0.32,
          rearRadius: 0.48,
          rearWidth: 0.60,
          rimColor: 0x18181b,
          caliperColor: 0xe63946,
          rimType: 'formula_centerlock',
          camber: 0
        };
      case 'thunder-muscle':
        return {
          frontRadius: 0.42,
          frontWidth: 0.36,
          rearRadius: 0.54,
          rearWidth: 0.52,
          rimColor: 0xd4d4d8,
          caliperColor: 0xd90429,
          rimType: 'classic_mag',
          camber: 0
        };
      case 'mud-raider':
        return {
          frontRadius: 0.62,
          frontWidth: 0.56,
          rearRadius: 0.62,
          rearWidth: 0.56,
          rimColor: 0x27272a,
          caliperColor: 0xfca311,
          rimType: 'beadlock_offroad',
          camber: 0
        };
      case 'drift-king':
        return {
          frontRadius: 0.44,
          frontWidth: 0.42,
          rearRadius: 0.44,
          rearWidth: 0.44,
          rimColor: 0xffd166,
          caliperColor: 0x00f5d4,
          rimType: 'deep_dish_mesh',
          camber: -0.07
        };
      case 'red-fire':
      default:
        return {
          frontRadius: 0.44,
          frontWidth: 0.40,
          rearRadius: 0.47,
          rearWidth: 0.45,
          rimColor: 0x3f3f46,
          caliperColor: 0xe63946,
          rimType: 'sport_forged',
          camber: 0
        };
    }
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

    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      map: createProceduralLiveryTexture(this.color, this.typeId, this.accentColor),
      roughness: isBuggy ? 0.6 : 0.3,
      metalness: isFormula ? 0.6 : 0.4
    });
    const bodyGeo = new THREE.BoxGeometry(bodyLength, bodyHeight, bodyWidth);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = 'car_main_body';
    body.position.y = bodyY;
    body.castShadow = true;
    this.chassis.add(body);

    // Aerodynamic Curved Wheel Arch Fenders
    const fenderMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: isBuggy ? 0.6 : 0.3,
      metalness: isFormula ? 0.6 : 0.4
    });
    const wCfgInit = this.wheelConfig;
    const frontArchRadius = wCfgInit.frontRadius + 0.08;
    const rearArchRadius = wCfgInit.rearRadius + 0.08;
    const archWidth = 0.28;

    const fenderConfigs = [
      { name: 'car_fender_arch_fl', x: 1.3, y: bodyY - 0.02, z: bodyWidth * 0.5 + 0.02, r: frontArchRadius },
      { name: 'car_fender_arch_fr', x: 1.3, y: bodyY - 0.02, z: -bodyWidth * 0.5 - 0.02, r: frontArchRadius },
      { name: 'car_fender_arch_rl', x: -1.3, y: bodyY - 0.02, z: bodyWidth * 0.5 + 0.02, r: rearArchRadius },
      { name: 'car_fender_arch_rr', x: -1.3, y: bodyY - 0.02, z: -bodyWidth * 0.5 - 0.02, r: rearArchRadius }
    ];

    if (!isFormula) {
      fenderConfigs.forEach((fc) => {
        // Cylinder arch wrapping over the wheel
        const archGeo = new THREE.CylinderGeometry(fc.r, fc.r + 0.06, archWidth, 8, 1, false, 0, Math.PI);
        const archMesh = new THREE.Mesh(archGeo, fenderMat);
        archMesh.name = fc.name;
        archMesh.rotation.x = Math.PI / 2;
        archMesh.position.set(fc.x, fc.y, fc.z);
        this.chassis.add(archMesh);
      });
    }

    // Aerodynamic Front Splitter (ground-effect chin blade)
    const splitterGroup = new THREE.Group();
    splitterGroup.name = 'car_front_splitter';
    const splitterBladeGeo = new THREE.BoxGeometry(0.5, 0.05, bodyWidth + 0.1);
    const splitterMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.3, metalness: 0.6 });
    const splitterBlade = new THREE.Mesh(splitterBladeGeo, splitterMat);
    splitterGroup.add(splitterBlade);
    // Vertical aero canard endplates
    const endplateGeo = new THREE.BoxGeometry(0.35, 0.16, 0.04);
    const endplateL = new THREE.Mesh(endplateGeo, splitterMat);
    endplateL.position.set(0, 0.06, (bodyWidth + 0.1) * 0.5);
    splitterGroup.add(endplateL);
    const endplateR = new THREE.Mesh(endplateGeo, splitterMat);
    endplateR.position.set(0, 0.06, -(bodyWidth + 0.1) * 0.5);
    splitterGroup.add(endplateR);
    splitterGroup.position.set(bodyLength * 0.5 + 0.12, bodyY - bodyHeight * 0.38, 0);
    this.chassis.add(splitterGroup);

    // Aerodynamic Rear Diffuser with venturi fins
    const diffuserGroup = new THREE.Group();
    diffuserGroup.name = 'car_rear_diffuser';
    const diffuserBladeGeo = new THREE.BoxGeometry(0.55, 0.06, bodyWidth * 0.88);
    const diffuserMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.3, metalness: 0.5 });
    const diffuserBlade = new THREE.Mesh(diffuserBladeGeo, diffuserMat);
    diffuserGroup.add(diffuserBlade);
    for (let f = -0.6; f <= 0.6; f += 0.4) {
      const finGeo = new THREE.BoxGeometry(0.48, 0.16, 0.04);
      const fin = new THREE.Mesh(finGeo, diffuserMat);
      fin.position.set(0, -0.05, f);
      diffuserGroup.add(fin);
    }
    diffuserGroup.position.set(-bodyLength * 0.5 - 0.1, bodyY - bodyHeight * 0.35, 0);
    diffuserGroup.rotation.z = 0.15;
    this.chassis.add(diffuserGroup);

    // Sloping Hood
    if (!isFormula) {
      const hoodGeo = new THREE.BoxGeometry(bodyLength * 0.35, 0.12, bodyWidth * 0.85);
      const hoodMat = new THREE.MeshStandardMaterial({
        color: this.color,
        roughness: isBuggy ? 0.6 : 0.3,
        metalness: 0.5
      });
      const hood = new THREE.Mesh(hoodGeo, hoodMat);
      hood.name = 'car_sloping_hood';
      hood.rotation.z = 0.08;
      hood.position.set(bodyLength * 0.28, bodyY + bodyHeight * 0.42, 0);
      this.chassis.add(hood);
    }

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

    // Taillight full-width LED lightbar
    const tailBarGeo = new THREE.BoxGeometry(0.12, 0.12, bodyWidth * 0.8);
    const tailBarMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const tailBar = new THREE.Mesh(tailBarGeo, tailBarMat);
    tailBar.name = 'taillight_lightbar';
    tailBar.position.set(-bodyLength * 0.51, bodyY + 0.08, 0);
    this.chassis.add(tailBar);

    // Staggered Wheels with Rims, Rotors and Calipers
    const wCfg = this.wheelConfig;

    this.wheels = {
      fl: new THREE.Group(),
      fr: new THREE.Group(),
      rl: new THREE.Group(),
      rr: new THREE.Group()
    };

    const makeDetailedWheel = (radius, width, isLeft) => {
      const wheelAssembly = new THREE.Group();

      // Rotating rim + tire assembly
      const rotatingGroup = new THREE.Group();

      // 1. Rubber tire
      const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
      const tireMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: isBuggy ? 0.95 : 0.85,
        metalness: 0.05
      });
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.name = 'wheel_tire';
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      rotatingGroup.add(tire);

      // 2. Alloy rim
      const rimGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 1.02, 12);
      const rimMat = new THREE.MeshStandardMaterial({
        color: wCfg.rimColor,
        metalness: 0.85,
        roughness: 0.22
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.name = 'wheel_rim';
      rim.rotation.x = Math.PI / 2;
      rotatingGroup.add(rim);

      // 3. Rim spokes
      const spokeGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, 0.04, 5);
      const spokeMat = new THREE.MeshStandardMaterial({
        color: wCfg.rimColor,
        metalness: 0.92,
        roughness: 0.15
      });
      const spokes = new THREE.Mesh(spokeGeo, spokeMat);
      spokes.name = 'wheel_rim_spokes';
      spokes.rotation.x = Math.PI / 2;
      spokes.position.z = (width * 0.51) * (isLeft ? 1 : -1);
      rotatingGroup.add(spokes);

      // 4. Perforated brake rotor disc
      const rotorGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.03, 10);
      const rotorMat = new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        metalness: 0.95,
        roughness: 0.25
      });
      const rotor = new THREE.Mesh(rotorGeo, rotorMat);
      rotor.name = 'wheel_brake_rotor';
      rotor.rotation.x = Math.PI / 2;
      rotatingGroup.add(rotor);

      wheelAssembly.add(rotatingGroup);

      // 5. Stationary brake caliper (attached to wheel pivot, does not spin)
      const caliperGeo = new THREE.BoxGeometry(0.12, radius * 0.32, 0.12);
      const caliperMat = new THREE.MeshStandardMaterial({
        color: wCfg.caliperColor,
        metalness: 0.5,
        roughness: 0.3
      });
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.name = 'wheel_brake_caliper';
      caliper.position.set(0, radius * 0.35, (width * 0.35) * (isLeft ? -1 : 1));
      wheelAssembly.add(caliper);

      // Store reference to rotating part for animation
      wheelAssembly.userData.rotatingGroup = rotatingGroup;

      return wheelAssembly;
    };

    this.wheelMeshes = {
      fl: makeDetailedWheel(wCfg.frontRadius, wCfg.frontWidth, true),
      fr: makeDetailedWheel(wCfg.frontRadius, wCfg.frontWidth, false),
      rl: makeDetailedWheel(wCfg.rearRadius, wCfg.rearWidth, true),
      rr: makeDetailedWheel(wCfg.rearRadius, wCfg.rearWidth, false)
    };

    this.wheels.fl.add(this.wheelMeshes.fl);
    this.wheels.fr.add(this.wheelMeshes.fr);
    this.wheels.rl.add(this.wheelMeshes.rl);
    this.wheels.rr.add(this.wheelMeshes.rr);

    const frontOffsetZ = isFormula ? 1.25 : (bodyWidth * 0.5 + wCfg.frontWidth * 0.4);
    const rearOffsetZ = isFormula ? 1.35 : (bodyWidth * 0.5 + wCfg.rearWidth * 0.4);
    const wheelOffsetX = bodyLength * 0.32;

    this.wheels.fl.position.set(wheelOffsetX, wCfg.frontRadius, frontOffsetZ);
    this.wheels.fr.position.set(wheelOffsetX, wCfg.frontRadius, -frontOffsetZ);
    this.wheels.rl.position.set(-wheelOffsetX, wCfg.rearRadius, rearOffsetZ);
    this.wheels.rr.position.set(-wheelOffsetX, wCfg.rearRadius, -rearOffsetZ);

    if (wCfg.camber) {
      this.wheels.fl.rotation.z = wCfg.camber;
      this.wheels.fr.rotation.z = -wCfg.camber;
      this.wheels.rl.rotation.z = wCfg.camber;
      this.wheels.rr.rotation.z = -wCfg.camber;
    }

    this.baseWheelY = {
      fl: wCfg.frontRadius,
      fr: wCfg.frontRadius,
      rl: wCfg.rearRadius,
      rr: wCfg.rearRadius
    };

    // Visible 3D Coilover Suspension Springs for Mud Raider
    if (isBuggy) {
      const springMat = new THREE.MeshStandardMaterial({ color: 0xfb8500, metalness: 0.6, roughness: 0.3 });
      const strutMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
      this.springMeshes = {};

      ['fl', 'fr', 'rl', 'rr'].forEach(key => {
        const springGroup = new THREE.Group();
        springGroup.name = 'suspension_spring';

        const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 8), springMat);
        spring.position.y = 0.35;
        springGroup.add(spring);

        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), strutMat);
        rod.position.y = 0.35;
        springGroup.add(rod);

        this.springMeshes[key] = springGroup;
        this.wheels[key].add(springGroup);
      });
    }

    // Exposed Double-Wishbone Suspension Arms for Apex Formula
    if (isFormula) {
      const armMat = new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.8, roughness: 0.2 });
      ['fl', 'fr', 'rl', 'rr'].forEach(key => {
        const armGroup = new THREE.Group();
        armGroup.name = 'suspension_arm';
        const armTop = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 4), armMat);
        armTop.rotation.z = Math.PI * 0.45;
        armGroup.add(armTop);
        const armBot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 4), armMat);
        armBot.rotation.z = -Math.PI * 0.45;
        armGroup.add(armBot);
        this.wheels[key].add(armGroup);
      });
    }

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

    // Chassis pitch tilt when jumping/airborne and roll on banked curves
    if (this.chassis) {
      this.chassis.rotation.z = this.physics.pitch;
      this.chassis.rotation.x = this.physics.roll || 0;
    }

    // 4-Wheel Independent Suspension Simulation
    this.suspensionTimer += dt;
    const speed = Math.hypot(this.physics.vx, this.physics.vz);
    const speedRatio = Math.min(1.5, Math.abs(speed) / 25.0);

    // 1. Weight Transfer (Pitch from accel/brake, Roll from cornering)
    const isBraking = (input.throttle < 0 && Math.abs(this.physics.speed) > 3) || input.handbrake;
    const isAccelerating = input.throttle > 0 && this.physics.speed >= -2;

    const pitchOffset = isBraking ? 0.08 : (isAccelerating ? -0.05 : 0);
    // Lateral weight transfer: inside wheels lift, outside wheels compress
    const latG = (input.steer || 0) * (speed / 35.0) * 0.06;

    // 2. Surface Response
    const surfName = surface.surface || 'asphalt';
    let bumpMagnitude = 0.006;
    let bumpFreq = 30;

    if (surfName === 'curb') {
      bumpMagnitude = 0.055;
      bumpFreq = 65;
    } else if (surfName === 'grass' || surfName === 'ice' || surfName === 'quicksand') {
      bumpMagnitude = 0.085;
      bumpFreq = 22;
    }

    const t = this.suspensionTimer * bumpFreq;
    const sinkage = surfName === 'quicksand' ? -0.12 : 0;

    // Target displacement per wheel
    const targetFL = pitchOffset - latG + Math.sin(t) * bumpMagnitude * Math.max(0.4, speedRatio) + sinkage;
    const targetFR = pitchOffset + latG + Math.cos(t) * bumpMagnitude * Math.max(0.4, speedRatio) + sinkage;
    const targetRL = -pitchOffset - latG + Math.sin(t + 1.2) * bumpMagnitude * Math.max(0.4, speedRatio) + sinkage;
    const targetRR = -pitchOffset + latG + Math.cos(t + 1.2) * bumpMagnitude * Math.max(0.4, speedRatio) + sinkage;

    // Airborne droop and landing shock
    if (this.physics.isAirborne) {
      this.suspension.fl = -0.10;
      this.suspension.fr = -0.10;
      this.suspension.rl = -0.10;
      this.suspension.rr = -0.10;
    } else if (this.physics.justLanded) {
      this.suspension.fl = 0.22;
      this.suspension.fr = 0.22;
      this.suspension.rl = 0.22;
      this.suspension.rr = 0.22;
    } else {
      const lerpSpeed = Math.min(1.0, 20 * dt);
      this.suspension.fl += (targetFL - this.suspension.fl) * lerpSpeed;
      this.suspension.fr += (targetFR - this.suspension.fr) * lerpSpeed;
      this.suspension.rl += (targetRL - this.suspension.rl) * lerpSpeed;
      this.suspension.rr += (targetRR - this.suspension.rr) * lerpSpeed;
    }

    // Apply suspension displacement to wheel pivots
    if (this.baseWheelY) {
      this.wheels.fl.position.y = this.baseWheelY.fl + this.suspension.fl;
      this.wheels.fr.position.y = this.baseWheelY.fr + this.suspension.fr;
      this.wheels.rl.position.y = this.baseWheelY.rl + this.suspension.rl;
      this.wheels.rr.position.y = this.baseWheelY.rr + this.suspension.rr;
    }

    // Compress physical spring mesh on Mud Raider
    if (this.springMeshes) {
      for (const k of ['fl', 'fr', 'rl', 'rr']) {
        const springCompression = Math.max(0.5, Math.min(1.5, 1.0 - this.suspension[k] * 2.5));
        this.springMeshes[k].scale.y = springCompression;
      }
    }

    // Keep drop shadow planted at ground or road deck level
    if (this.shadowMesh) {
      const roadGround = this.physics.groundY || 0;
      this.shadowMesh.position.y = 0.03 + roadGround - this.physics.y;
      const heightAboveRoad = Math.max(0, this.physics.y - roadGround);
      const heightRatio = Math.min(1.0, heightAboveRoad / 6.0);
      this.shadowMesh.material.opacity = 0.45 * (1.0 - heightRatio * 0.55);
      const s = Math.max(0.65, 1.0 - heightRatio * 0.25);
      this.shadowMesh.scale.set(s, s, 1.0);
    }

    // Wheel animation
    const wheelRotSpeed = (speed / 0.48) * dt;
    this.wheelRotation += (this.physics.speed >= 0 ? 1 : -1) * wheelRotSpeed;

    for (const key of ['fl', 'fr', 'rl', 'rr']) {
      const rotGroup = this.wheelMeshes[key].userData && this.wheelMeshes[key].userData.rotatingGroup;
      if (rotGroup) {
        rotGroup.rotation.y = this.wheelRotation;
      } else {
        this.wheelMeshes[key].rotation.y = this.wheelRotation;
      }
    }

    // Front wheel steering angle
    const targetSteerAngle = (input.steer || 0) * 0.45;
    this.frontSteerAngle += (targetSteerAngle - this.frontSteerAngle) * Math.min(1.0, 15 * dt);
    this.wheels.fl.rotation.y = this.frontSteerAngle;
    this.wheels.fr.rotation.y = this.frontSteerAngle;
  }
}
