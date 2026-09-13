import * as THREE from 'three';

export class CarModel {
  constructor(colorScheme = {}) {
    this.primaryColor = colorScheme.primary || 0x00ffff;      // Neon cyan
    this.accentColor = colorScheme.accent || 0xff007f;        // Neon magenta
    this.bodyColor = colorScheme.body || 0x121424;            // Dark carbon synth
    this.glowColor = colorScheme.glow || 0x00ffff;            // Underglow

    this.mesh = new THREE.Group();
    this.wheels = [];
    this.frontWheels = [];
    this.thrusterFlames = [];

    this.buildCar();
    this.buildShield();
    this.buildThrusters();
  }

  buildCar() {
    // Main Chassis Material - Satin cyber metallic finish with distinct base color
    const chassisMat = new THREE.MeshStandardMaterial({
      color: this.bodyColor,
      roughness: 0.38,
      metalness: 0.60,
    });

    const neonPrimaryMat = new THREE.MeshBasicMaterial({
      color: this.primaryColor
    });

    const neonAccentMat = new THREE.MeshBasicMaterial({
      color: this.accentColor
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0c223c,
      roughness: 0.12,
      metalness: 0.75,
      transparent: true,
      opacity: 0.92
    });

    // Lower Wedge Body
    const lowerBodyGeo = new THREE.BoxGeometry(2.0, 0.45, 4.4);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, chassisMat);
    lowerBody.position.y = 0.45;
    this.mesh.add(lowerBody);

    // Aerodynamic Nose / Hood (beveled wedge)
    const noseGeo = new THREE.CylinderGeometry(0.7, 1.0, 1.4, 4);
    const nose = new THREE.Mesh(noseGeo, chassisMat);
    nose.rotation.y = Math.PI / 4;
    nose.rotation.x = Math.PI / 2;
    nose.scale.set(1.4, 0.35, 1.0);
    nose.position.set(0, 0.42, -1.9);
    this.mesh.add(nose);

    // High-Contrast Center Racing Stripes
    const centerStripeGeo = new THREE.BoxGeometry(0.38, 0.04, 3.8);
    const centerStripe = new THREE.Mesh(centerStripeGeo, neonPrimaryMat);
    centerStripe.position.set(0, 0.69, -0.1);
    this.mesh.add(centerStripe);

    // Front Hood Dual Accent Accents
    const hoodStripeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 1.3), neonAccentMat);
    hoodStripeL.position.set(-0.42, 0.58, -1.6);
    this.mesh.add(hoodStripeL);

    const hoodStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 1.3), neonAccentMat);
    hoodStripeR.position.set(0.42, 0.58, -1.6);
    this.mesh.add(hoodStripeR);

    // Front Neon Splitter Lip
    const splitterGeo = new THREE.BoxGeometry(2.1, 0.08, 0.8);
    const splitter = new THREE.Mesh(splitterGeo, neonPrimaryMat);
    splitter.position.set(0, 0.22, -2.1);
    this.mesh.add(splitter);

    // Cyberpunk Cockpit Canopy
    const cockpitGeo = new THREE.BoxGeometry(1.4, 0.55, 2.0);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 0.85, -0.1);
    cockpit.rotation.x = -0.1;
    this.mesh.add(cockpit);

    // Cockpit Roof Neon Trim lines
    const roofTrimGeo = new THREE.BoxGeometry(1.44, 0.05, 0.1);
    const roofTrimF = new THREE.Mesh(roofTrimGeo, neonPrimaryMat);
    roofTrimF.position.set(0, 1.13, -0.9);
    this.mesh.add(roofTrimF);

    const roofTrimR = new THREE.Mesh(roofTrimGeo, neonAccentMat);
    roofTrimR.position.set(0, 1.11, 0.75);
    this.mesh.add(roofTrimR);

    // Side Neons / Cyber Blades
    const sideBladeGeo = new THREE.BoxGeometry(0.12, 0.15, 2.8);
    const leftBlade = new THREE.Mesh(sideBladeGeo, neonPrimaryMat);
    leftBlade.position.set(-1.05, 0.45, 0.1);
    this.mesh.add(leftBlade);

    const rightBlade = new THREE.Mesh(sideBladeGeo, neonPrimaryMat);
    rightBlade.position.set(1.05, 0.45, 0.1);
    this.mesh.add(rightBlade);

    // Rear Massive Wing / Spoiler
    const wingGeo = new THREE.BoxGeometry(2.2, 0.08, 0.6);
    const wing = new THREE.Mesh(wingGeo, chassisMat);
    wing.position.set(0, 1.15, 1.85);
    wing.rotation.x = 0.08;
    this.mesh.add(wing);

    // Wing Neon Edge
    const wingEdgeGeo = new THREE.BoxGeometry(2.24, 0.06, 0.08);
    const wingEdge = new THREE.Mesh(wingEdgeGeo, neonAccentMat);
    wingEdge.position.set(0, 1.16, 2.15);
    this.mesh.add(wingEdge);

    // Wing Struts
    const strutGeo = new THREE.BoxGeometry(0.08, 0.55, 0.35);
    const leftStrut = new THREE.Mesh(strutGeo, chassisMat);
    leftStrut.position.set(-0.7, 0.85, 1.8);
    leftStrut.rotation.x = -0.25;
    this.mesh.add(leftStrut);

    const rightStrut = new THREE.Mesh(strutGeo, chassisMat);
    rightStrut.position.set(0.7, 0.85, 1.8);
    rightStrut.rotation.x = -0.25;
    this.mesh.add(rightStrut);

    // Headlights (Dual angular emissive bars)
    const headlightGeo = new THREE.BoxGeometry(0.45, 0.1, 0.1);
    const leftLight = new THREE.Mesh(headlightGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    leftLight.position.set(-0.65, 0.45, -2.25);
    this.mesh.add(leftLight);

    const rightLight = new THREE.Mesh(headlightGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    rightLight.position.set(0.65, 0.45, -2.25);
    this.mesh.add(rightLight);

    // Taillight Neon Lightbar across rear
    const tailBarGeo = new THREE.BoxGeometry(1.8, 0.12, 0.08);
    this.tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const tailBar = new THREE.Mesh(tailBarGeo, this.tailLightMat);
    tailBar.position.set(0, 0.52, 2.22);
    this.mesh.add(tailBar);

    // Wheels (4 wide low-profile cyber wheels)
    const wheelPositions = [
      { x: -1.05, y: 0.38, z: -1.3, isFront: true },
      { x: 1.05, y: 0.38, z: -1.3, isFront: true },
      { x: -1.08, y: 0.42, z: 1.3, isFront: false },
      { x: 1.08, y: 0.42, z: 1.3, isFront: false },
    ];

    wheelPositions.forEach((wp) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wp.x, wp.y, wp.z);

      const radius = wp.isFront ? 0.38 : 0.42;
      const width = 0.35;
      const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
      tireGeo.rotateZ(Math.PI / 2);

      const tireMat = new THREE.MeshStandardMaterial({
        color: 0x111116,
        roughness: 0.8,
        metalness: 0.1
      });
      const tireMesh = new THREE.Mesh(tireGeo, tireMat);

      // Glowing Neon Rim Ring
      const rimGeo = new THREE.RingGeometry(radius * 0.4, radius * 0.65, 12);
      const rimMat = new THREE.MeshBasicMaterial({
        color: this.primaryColor,
        side: THREE.DoubleSide
      });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.rotation.y = Math.PI / 2;
      rimMesh.position.x = (wp.x > 0 ? 1 : -1) * (width / 2 + 0.01);

      wheelGroup.add(tireMesh);
      wheelGroup.add(rimMesh);
      this.mesh.add(wheelGroup);

      this.wheels.push({ group: wheelGroup, tire: tireMesh, radius });
      if (wp.isFront) {
        this.frontWheels.push(wheelGroup);
      }
    });

    // Neon Underglow Plane
    const underglowGeo = new THREE.PlaneGeometry(2.4, 4.4);
    const underglowMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const underglow = new THREE.Mesh(underglowGeo, underglowMat);
    underglow.rotation.x = Math.PI / 2;
    underglow.position.y = 0.08;
    this.mesh.add(underglow);
    this.underglowMat = underglowMat;
  }

  buildThrusters() {
    // Twin rear exhaust jet thrusters
    const exhaustPositions = [
      new THREE.Vector3(-0.45, 0.4, 2.25),
      new THREE.Vector3(0.45, 0.4, 2.25)
    ];

    exhaustPositions.forEach((pos) => {
      // Chrome Nozzle
      const nozzleGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.3, 10);
      nozzleGeo.rotateX(Math.PI / 2);
      const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x22222a, metalness: 0.9 });
      const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
      nozzle.position.copy(pos);
      this.mesh.add(nozzle);

      // Glowing Plasma Flame Cone
      const flameGeo = new THREE.ConeGeometry(0.16, 1.2, 8);
      flameGeo.rotateX(-Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({
        color: this.accentColor,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.copy(pos);
      flame.position.z += 0.6;
      this.mesh.add(flame);

      this.thrusterFlames.push(flame);
    });
  }

  buildShield() {
    // Energy Shield - Closely contoured aerodynamic cyber hull
    this.shieldGroup = new THREE.Group();
    this.shieldGroup.position.set(0, 0.62, -0.1);

    // Contoured base geometry scaled to closely fit car silhouette
    const shieldGeo = new THREE.IcosahedronGeometry(1.0, 2);

    // Outer neon wireframe grid layer
    this.shieldWireMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    const outerMesh = new THREE.Mesh(shieldGeo, this.shieldWireMat);

    // Inner glowing energy membrane layer
    this.shieldInnerMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const innerMesh = new THREE.Mesh(shieldGeo, this.shieldInnerMat);
    innerMesh.scale.set(0.97, 0.97, 0.97);

    this.shieldGroup.add(outerMesh);
    this.shieldGroup.add(innerMesh);
    this.shieldGroup.scale.set(1.24, 0.68, 2.45);
    this.shieldGroup.visible = false;

    this.mesh.add(this.shieldGroup);
    this.shieldMesh = this.shieldGroup; // Backwards compatibility
  }

  update(delta, speed, steerAngle, isBraking, isBoosting, hasShield, isSpun) {
    // 1. Wheel rotation proportional to forward speed
    const wheelRotSpeed = (speed / 3.6) / 0.4 * delta;
    this.wheels.forEach((w) => {
      w.tire.rotation.x += wheelRotSpeed;
    });

    // 2. Steer front wheels smoothly
    this.frontWheels.forEach((fw) => {
      fw.rotation.y = steerAngle;
    });

    // 3. Brake light intensity
    if (isBraking) {
      this.tailLightMat.color.setHex(0xffffff);
    } else {
      this.tailLightMat.color.setHex(0xff0044);
    }

    // 4. Thruster flame scale & pulse
    const flameBaseScale = Math.max(0.1, Math.min(1.0, Math.abs(speed) / 100));
    const boostMult = isBoosting ? 2.5 : 1.0;
    const pulse = 1.0 + Math.sin(Date.now() * 0.02) * 0.15;

    this.thrusterFlames.forEach((flame) => {
      flame.scale.set(
        flameBaseScale * boostMult * pulse,
        flameBaseScale * boostMult * pulse,
        (flameBaseScale * 1.5 + (isBoosting ? 2.0 : 0.0)) * pulse
      );
      flame.material.color.setHex(isBoosting ? 0xffea00 : this.accentColor);
      flame.visible = Math.abs(speed) > 5 || isBoosting;
    });

    // 5. Shield visual effect (aerodynamic breathing aura snugly wrapping the car)
    if (hasShield) {
      this.shieldGroup.visible = true;
      const shieldPulse = Math.sin(Date.now() * 0.008);
      const baseSX = 1.24;
      const baseSY = 0.68;
      const baseSZ = 2.45;
      this.shieldGroup.scale.set(
        baseSX * (1.0 + shieldPulse * 0.02),
        baseSY * (1.0 + shieldPulse * 0.02),
        baseSZ * (1.0 + shieldPulse * 0.015)
      );
      this.shieldWireMat.opacity = 0.60 + shieldPulse * 0.20;
      this.shieldInnerMat.opacity = 0.18 + shieldPulse * 0.07;
    } else {
      this.shieldGroup.visible = false;
    }

    // 6. Underglow pulse
    if (this.underglowMat) {
      this.underglowMat.opacity = 0.45 + (Math.abs(speed) / 200) * 0.4;
    }
  }
}
