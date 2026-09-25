import * as THREE from 'three';

/**
 * Builds the 3D meshes for the Pine Valley Circuit:
 * - Asphalt track ribbon with white dashed centerline and painted grid slots
 * - Gravel runoff traps (Kiesbetten) behind high-speed curves
 * - Red & White alternating curbs along corners
 * - Sponsor advertising banners along track barriers
 * - Start/Finish checkered line & overhead gantry with starting lights
 * - Multi-tier spectator grandstand & pit garage building along the main straight
 * - Scenic valley landscape: pine/fir forests, deciduous trees, rock boulders, hill silhouettes
 */
export class CircuitMeshBuilder {
  constructor(waypoints, trackWidth = 16, ramps = [], options = {}) {
    this.waypoints = waypoints;
    this.trackWidth = trackWidth;
    this.ramps = ramps || [];
    this.options = options || {};
    this.theme = this.options.theme || 'pine-valley';
    this.tunnels = this.options.tunnels || [];
    this.group = new THREE.Group();
  }

  build() {
    this.buildGroundAndHills();
    this.buildTrackRibbon();
    this.buildCenterline();
    this.buildGravelTraps();
    this.buildCurbsAndBarriers();
    this.buildStartFinishLine();
    this.buildGrandstandAndPits();
    this.buildJumpRamps();
    this.buildTunnels();
    if (this.theme === 'alpine-summit') {
      this.buildAlpineSummitProps();
    } else {
      this.buildPineValleyProps();
    }
    return this.group;
  }

  buildGroundAndHills() {
    // Main valley floor
    const groundGeo = new THREE.PlaneGeometry(650, 650);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x386641, // lush pine-valley meadow green
      roughness: 0.95,
      metalness: 0.02
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.15;
    groundMesh.receiveShadow = true;
    this.group.add(groundMesh);

    // Decorative perimeter hills/mountain silhouettes around the valley
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x24422b,
      roughness: 0.98,
      metalness: 0.0
    });

    const hillDefs = [
      { x: -180, z: -150, r: 80, h: 32 },
      { x: 0, z: -200, r: 90, h: 38 },
      { x: 180, z: -160, r: 85, h: 35 },
      { x: 300, z: 20, r: 85, h: 42 },
      { x: 200, z: 180, r: 90, h: 36 },
      { x: 30, z: 220, r: 80, h: 30 },
      { x: -160, z: 180, r: 85, h: 34 },
      { x: -220, z: 0, r: 90, h: 40 }
    ];

    hillDefs.forEach(h => {
      const hillGeo = new THREE.ConeGeometry(h.r, h.h, 7);
      const hill = new THREE.Mesh(hillGeo, hillMat);
      hill.name = 'background_hill';
      hill.position.set(h.x, h.h * 0.45 - 2, h.z);
      hill.castShadow = false;
      this.group.add(hill);
    });
  }

  buildTrackRibbon() {
    const points = this.waypoints.map(w => new THREE.Vector3(w.x, 0, w.z));
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.25);
    const divisions = 200;
    const sampledPoints = curve.getPoints(divisions);

    const asphaltGeo = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const indices = [];

    const halfW = this.trackWidth * 0.5;

    for (let i = 0; i <= divisions; i++) {
      const pt = sampledPoints[i % divisions];
      const nextPt = sampledPoints[(i + 1) % divisions];

      const dir = new THREE.Vector3().subVectors(nextPt, pt).normalize();
      const norm = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const leftX = pt.x + norm.x * halfW;
      const leftZ = pt.z + norm.z * halfW;
      const rightX = pt.x - norm.x * halfW;
      const rightZ = pt.z - norm.z * halfW;

      positions.push(leftX, 0.01, leftZ);
      positions.push(rightX, 0.01, rightZ);

      const v = i / divisions * 40;
      uvs.push(0, v);
      uvs.push(1, v);

      if (i < divisions) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    asphaltGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    asphaltGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    asphaltGeo.setIndex(indices);
    asphaltGeo.computeVertexNormals();

    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1f2022, // realistic dark asphalt
      roughness: 0.88,
      metalness: 0.08
    });

    const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat);
    asphaltMesh.receiveShadow = true;
    this.group.add(asphaltMesh);
  }

  buildCenterline() {
    // Dashed white racing centerline
    const points = this.waypoints.map(w => new THREE.Vector3(w.x, 0, w.z));
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.25);
    const divisions = 180;
    const sampledPoints = curve.getPoints(divisions);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    const dashGeo = new THREE.PlaneGeometry(0.35, 1.8);

    for (let i = 0; i < divisions; i += 2) {
      const pt = sampledPoints[i];
      const nextPt = sampledPoints[(i + 1) % divisions];
      const dir = new THREE.Vector3().subVectors(nextPt, pt).normalize();

      const dash = new THREE.Mesh(dashGeo, lineMat);
      dash.rotation.order = 'YXZ';
      dash.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(pt.x, 0.03, pt.z);
      dash.name = 'centerline_marking';
      this.group.add(dash);
    }
  }

  buildGravelTraps() {
    // Gravel runoff zones placed at high speed corners
    const points = this.waypoints.map(w => new THREE.Vector3(w.x, 0, w.z));
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.25);
    const divisions = 160;
    const sampledPoints = curve.getPoints(divisions);

    const gravelMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373, // sandy gravel ochre
      roughness: 0.95,
      metalness: 0.05
    });

    const halfW = this.trackWidth * 0.5;
    const gravelW = 7.0;

    // Gravel beds in curve zones (outside of turns)
    const curveSections = [
      { start: 25, end: 55 },   // Turn 1 & 2 sweep
      { start: 70, end: 95 },   // The Hairpin
      { start: 120, end: 145 }  // S-Chicane
    ];

    curveSections.forEach(sec => {
      const gravelGroup = new THREE.Group();
      gravelGroup.name = 'gravel_trap';

      for (let i = sec.start; i <= sec.end; i++) {
        const pt = sampledPoints[i % divisions];
        const nextPt = sampledPoints[(i + 1) % divisions];
        const dir = new THREE.Vector3().subVectors(nextPt, pt).normalize();
        const norm = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

        const patchGeo = new THREE.PlaneGeometry(gravelW, 3.2);
        const patch = new THREE.Mesh(patchGeo, gravelMat);
        patch.rotation.x = -Math.PI / 2;
        patch.rotation.z = Math.atan2(dir.z, dir.x);
        patch.position.set(pt.x + norm.x * (halfW + gravelW * 0.5 + 1.2), 0.02, pt.z + norm.z * (halfW + gravelW * 0.5 + 1.2));
        patch.receiveShadow = true;
        gravelGroup.add(patch);
      }
      this.group.add(gravelGroup);
    });
  }

  buildCurbsAndBarriers() {
    const points = this.waypoints.map(w => new THREE.Vector3(w.x, 0, w.z));
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.25);
    const divisions = 160;
    const sampledPoints = curve.getPoints(divisions);

    const halfW = this.trackWidth * 0.5;
    const curbW = 1.6;
    const barrierDist = halfW + 3.8;

    const curbRedMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.65,
      side: THREE.DoubleSide
    });
    const curbWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8f9fa,
      roughness: 0.65,
      side: THREE.DoubleSide
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    const tireRedMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.9 });

    const bannerRedMat = new THREE.MeshStandardMaterial({ color: 0xe63946 });
    const bannerBlueMat = new THREE.MeshStandardMaterial({ color: 0x0077b6 });
    const bannerYellowMat = new THREE.MeshStandardMaterial({ color: 0xffb703 });

    const tireGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.4, 8);
    const bannerGeo = new THREE.BoxGeometry(4.2, 1.2, 0.4);

    // Compute smooth tangents and normals at each sampled vertex along the track
    const normals = [];
    for (let i = 0; i < divisions; i++) {
      const prev = sampledPoints[(i - 1 + divisions) % divisions];
      const next = sampledPoints[(i + 1) % divisions];
      const tan = new THREE.Vector3().subVectors(next, prev).normalize();
      normals.push(new THREE.Vector3(-tan.z, 0, tan.x).normalize());
    }

    // Geometry buffers for alternating red and white curbs
    const redPositions = [];
    const whitePositions = [];

    const addQuad = (buffer, p0, p1, p2, p3) => {
      // Triangle 1: p0, p1, p2
      buffer.push(p0.x, p0.y, p0.z);
      buffer.push(p1.x, p1.y, p1.z);
      buffer.push(p2.x, p2.y, p2.z);
      // Triangle 2: p0, p2, p3
      buffer.push(p0.x, p0.y, p0.z);
      buffer.push(p2.x, p2.y, p2.z);
      buffer.push(p3.x, p3.y, p3.z);
    };

    const yInner = 0.035; // slightly above asphalt at 0.01
    const yOuter = 0.055; // slightly raised outer curb edge

    for (let i = 0; i < divisions; i++) {
      const nextI = (i + 1) % divisions;
      const pt0 = sampledPoints[i];
      const pt1 = sampledPoints[nextI];
      const n0 = normals[i];
      const n1 = normals[nextI];

      const isRed = (i % 2 === 0);
      const targetBuffer = isRed ? redPositions : whitePositions;

      // 1. Left Curb (outside +norm):
      const leftInner0 = new THREE.Vector3(pt0.x + n0.x * halfW, yInner, pt0.z + n0.z * halfW);
      const leftOuter0 = new THREE.Vector3(pt0.x + n0.x * (halfW + curbW), yOuter, pt0.z + n0.z * (halfW + curbW));
      const leftOuter1 = new THREE.Vector3(pt1.x + n1.x * (halfW + curbW), yOuter, pt1.z + n1.z * (halfW + curbW));
      const leftInner1 = new THREE.Vector3(pt1.x + n1.x * halfW, yInner, pt1.z + n1.z * halfW);

      addQuad(targetBuffer, leftInner0, leftOuter0, leftOuter1, leftInner1);

      // Outer bevel drop face for Left Curb
      const leftDrop0 = new THREE.Vector3(pt0.x + n0.x * (halfW + curbW), -0.05, pt0.z + n0.z * (halfW + curbW));
      const leftDrop1 = new THREE.Vector3(pt1.x + n1.x * (halfW + curbW), -0.05, pt1.z + n1.z * (halfW + curbW));
      addQuad(targetBuffer, leftOuter0, leftDrop0, leftDrop1, leftOuter1);

      // 2. Right Curb (outside -norm):
      const rightInner0 = new THREE.Vector3(pt0.x - n0.x * halfW, yInner, pt0.z - n0.z * halfW);
      const rightOuter0 = new THREE.Vector3(pt0.x - n0.x * (halfW + curbW), yOuter, pt0.z - n0.z * (halfW + curbW));
      const rightOuter1 = new THREE.Vector3(pt1.x - n1.x * (halfW + curbW), yOuter, pt1.z - n1.z * (halfW + curbW));
      const rightInner1 = new THREE.Vector3(pt1.x - n1.x * halfW, yInner, pt1.z - n1.z * halfW);

      addQuad(targetBuffer, rightInner0, rightInner1, rightOuter1, rightOuter0);

      // Outer bevel drop face for Right Curb
      const rightDrop0 = new THREE.Vector3(pt0.x - n0.x * (halfW + curbW), -0.05, pt0.z - n0.z * (halfW + curbW));
      const rightDrop1 = new THREE.Vector3(pt1.x - n1.x * (halfW + curbW), -0.05, pt1.z - n1.z * (halfW + curbW));
      addQuad(targetBuffer, rightOuter0, rightOuter1, rightDrop1, rightDrop0);

      // 3. Barriers & Sponsor Hoardings
      if (i % 2 === 0) {
        const dir = new THREE.Vector3().subVectors(pt1, pt0).normalize();
        const norm = n0;

        // Place colorful sponsor advertising banner every 6 intervals
        if (i % 6 === 0) {
          const bannerMat = (i % 18 === 0) ? bannerRedMat : ((i % 12 === 0) ? bannerBlueMat : bannerYellowMat);
          const banner = new THREE.Mesh(bannerGeo, bannerMat);
          banner.name = 'sponsor_banner';
          banner.position.set(pt0.x + norm.x * (barrierDist + 0.5), 0.9, pt0.z + norm.z * (barrierDist + 0.5));
          banner.rotation.y = Math.atan2(dir.x, dir.z);
          banner.castShadow = true;
          this.group.add(banner);
        } else {
          // Double tire stack
          const mat = (i % 4 === 0) ? tireRedMat : tireMat;
          const barrierLeft = new THREE.Mesh(tireGeo, mat);
          barrierLeft.position.set(pt0.x + norm.x * barrierDist, 0.7, pt0.z + norm.z * barrierDist);
          barrierLeft.castShadow = true;
          this.group.add(barrierLeft);
        }

        const barrierRight = new THREE.Mesh(tireGeo, tireMat);
        barrierRight.position.set(pt0.x - norm.x * barrierDist, 0.7, pt0.z - norm.z * barrierDist);
        barrierRight.castShadow = true;
        this.group.add(barrierRight);
      }
    }

    // Build unified red and white curb meshes
    const redGeo = new THREE.BufferGeometry();
    redGeo.setAttribute('position', new THREE.Float32BufferAttribute(redPositions, 3));
    redGeo.computeVertexNormals();
    const curbsRed = new THREE.Mesh(redGeo, curbRedMat);
    curbsRed.name = 'curbs_red';
    curbsRed.receiveShadow = true;
    this.group.add(curbsRed);

    const whiteGeo = new THREE.BufferGeometry();
    whiteGeo.setAttribute('position', new THREE.Float32BufferAttribute(whitePositions, 3));
    whiteGeo.computeVertexNormals();
    const curbsWhite = new THREE.Mesh(whiteGeo, curbWhiteMat);
    curbsWhite.name = 'curbs_white';
    curbsWhite.receiveShadow = true;
    this.group.add(curbsWhite);
  }

  buildStartFinishLine() {
    const wp0 = this.waypoints[0];
    const wp1 = this.waypoints[1];
    const dir = new THREE.Vector3(wp1.x - wp0.x, 0, wp1.z - wp0.z).normalize();
    const norm = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    // Checkered line across track laid flat on ground
    const lineGroup = new THREE.Group();
    lineGroup.position.set(wp0.x, 0.05, wp0.z);
    lineGroup.rotation.y = -Math.atan2(dir.z, dir.x);

    const lineGeo = new THREE.PlaneGeometry(3.0, this.trackWidth);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.rotation.x = -Math.PI / 2;
    lineGroup.add(lineMesh);
    this.group.add(lineGroup);

    // Starting grid boxes on asphalt
    const gridBoxMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
    const gridBoxGeo = new THREE.PlaneGeometry(4.5, 2.5);
    const gridOffsets = [
      { fwd: -4, lat: 4 },
      { fwd: -4, lat: -4 },
      { fwd: -18, lat: 4 },
      { fwd: -18, lat: -4 }
    ];

    gridOffsets.forEach((pos, idx) => {
      const box = new THREE.Mesh(gridBoxGeo, gridBoxMat);
      box.rotation.x = -Math.PI / 2;
      box.rotation.z = Math.atan2(dir.z, dir.x);
      box.position.set(wp0.x + dir.x * pos.fwd + norm.x * pos.lat, 0.03, wp0.z + dir.z * pos.fwd + norm.z * pos.lat);
      this.group.add(box);
    });

    // Overhead Gantry Bridge
    const gantryGroup = new THREE.Group();
    gantryGroup.name = 'start_finish_gantry';
    const postMat = new THREE.MeshStandardMaterial({ color: 0x343a40, metalness: 0.7, roughness: 0.3 });
    const postGeo = new THREE.BoxGeometry(1.0, 8, 1.0);
    const postDist = this.trackWidth * 0.5 + 2.5;

    // Left Post
    const postLeft = new THREE.Mesh(postGeo, postMat);
    postLeft.name = 'gantry_post_left';
    postLeft.position.set(wp0.x + norm.x * postDist, 4, wp0.z + norm.z * postDist);
    postLeft.castShadow = true;
    gantryGroup.add(postLeft);

    // Right Post
    const postRight = new THREE.Mesh(postGeo, postMat);
    postRight.name = 'gantry_post_right';
    postRight.position.set(wp0.x - norm.x * postDist, 4, wp0.z - norm.z * postDist);
    postRight.castShadow = true;
    gantryGroup.add(postRight);

    // Crossbeam connecting both posts
    const beamGeo = new THREE.BoxGeometry(1.4, 1.4, this.trackWidth + 6.0);
    const beam = new THREE.Mesh(beamGeo, postMat);
    beam.name = 'gantry_beam';
    beam.position.set(wp0.x, 8, wp0.z);
    beam.lookAt(postLeft.position.x, 8, postLeft.position.z);
    beam.castShadow = true;
    gantryGroup.add(beam);

    // Starting lights hung under the crossbeam
    const lightHousingMat = new THREE.MeshStandardMaterial({ color: 0x111115 });
    const lightBulbMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    for (let i = -2; i <= 2; i++) {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.4), lightHousingMat);
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 8), lightBulbMat);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.z = 0.22;
      housing.add(lamp);

      const offsetAlongNorm = i * 2.2;
      housing.position.set(wp0.x + norm.x * offsetAlongNorm, 7.1, wp0.z + norm.z * offsetAlongNorm);
      housing.rotation.y = Math.atan2(dir.x, dir.z);
      gantryGroup.add(housing);
    }

    this.group.add(gantryGroup);
  }

  buildGrandstandAndPits() {
    const wp0 = this.waypoints[0];
    const wp1 = this.waypoints[1];
    const dir = new THREE.Vector3(wp1.x - wp0.x, 0, wp1.z - wp0.z).normalize();
    const norm = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    // 1. Spectator Grandstand alongside the main straight
    const grandstand = new THREE.Group();
    grandstand.name = 'grandstand';

    const standMat = new THREE.MeshStandardMaterial({ color: 0xd8dee9, roughness: 0.6 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x4c566a, roughness: 0.5 });
    const seatMats = [
      new THREE.MeshStandardMaterial({ color: 0xbf616a }), // red seats
      new THREE.MeshStandardMaterial({ color: 0x5e81ac }), // blue seats
      new THREE.MeshStandardMaterial({ color: 0xebcb8b })  // yellow seats
    ];

    // Stepped tiers
    for (let tier = 0; tier < 4; tier++) {
      const stepGeo = new THREE.BoxGeometry(32, 1.2, 2.5);
      const step = new THREE.Mesh(stepGeo, standMat);
      step.position.set(0, 0.6 + tier * 1.2, tier * 2.4);
      step.castShadow = true;
      grandstand.add(step);

      // Spectator blocks on the tier
      for (let s = -6; s <= 6; s++) {
        const specGeo = new THREE.BoxGeometry(1.6, 0.9, 1.2);
        const specMat = seatMats[Math.abs(s + tier) % 3];
        const spec = new THREE.Mesh(specGeo, specMat);
        spec.position.set(s * 2.2, 1.5 + tier * 1.2, tier * 2.4);
        grandstand.add(spec);
      }
    }

    // Grandstand canopy roof
    const roofGeo = new THREE.BoxGeometry(36, 0.6, 12);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 8.5, 4);
    roof.rotation.x = -0.12;
    roof.castShadow = true;
    grandstand.add(roof);

    // Position grandstand outside track on main straight
    const standDist = this.trackWidth * 0.5 + 16;
    grandstand.position.set(wp0.x + norm.x * standDist + dir.x * 20, 0, wp0.z + norm.z * standDist + dir.z * 20);
    grandstand.rotation.y = Math.atan2(-dir.z, dir.x);
    this.group.add(grandstand);

    // 2. Pit Lane Building opposite the main straight
    const pitBuilding = new THREE.Group();
    pitBuilding.name = 'pit_building';
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe5e9f0, roughness: 0.7 });
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.4 });

    const mainBuildingGeo = new THREE.BoxGeometry(38, 5.0, 10);
    const mainBuilding = new THREE.Mesh(mainBuildingGeo, wallMat);
    mainBuilding.position.y = 2.5;
    mainBuilding.castShadow = true;
    pitBuilding.add(mainBuilding);

    // Pit garage shutters
    for (let g = -2; g <= 2; g++) {
      const shutterGeo = new THREE.BoxGeometry(5.5, 3.2, 0.3);
      const shutter = new THREE.Mesh(shutterGeo, shutterMat);
      shutter.position.set(g * 7.2, 1.6, -5.1);
      pitBuilding.add(shutter);
    }

    // Position pit building on opposite side
    const pitDist = this.trackWidth * 0.5 + 15;
    pitBuilding.position.set(wp0.x - norm.x * pitDist + dir.x * 20, 0, wp0.z - norm.z * pitDist + dir.z * 20);
    pitBuilding.rotation.y = Math.atan2(-dir.z, dir.x) + Math.PI;
    this.group.add(pitBuilding);
  }

  buildJumpRamps() {
    if (!this.ramps || this.ramps.length === 0) return;

    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x1f2421,
      roughness: 0.85,
      metalness: 0.15
    });

    const chevronMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const hazardLipMatYellow = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const hazardLipMatBlack = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const guardrailMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.4,
      metalness: 0.5
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x4a4e69,
      roughness: 0.6,
      metalness: 0.4
    });
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0xff7b00,
      roughness: 0.4,
      metalness: 0.1
    });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });

    for (const ramp of this.ramps) {
      const rampGroup = new THREE.Group();
      rampGroup.name = `jump_ramp_${ramp.id}`;
      rampGroup.position.set(ramp.x, 0, ramp.z);
      if (typeof ramp.angle === 'number') {
        rampGroup.rotation.y = ramp.angle;
      }

      const L = ramp.length;
      const W = ramp.width;
      const H = ramp.height;
      const inclineAngle = Math.atan2(H, L);
      const slopeLength = Math.hypot(L, H);

      // 1. Wedge Ramp Prism
      const shape = new THREE.Shape();
      shape.moveTo(-L / 2, 0.02);
      shape.lineTo(L / 2, H);
      shape.lineTo(L / 2, 0.02);
      shape.closePath();

      const extrudeSettings = {
        depth: W,
        bevelEnabled: false
      };
      const wedgeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      wedgeGeo.translate(0, 0, -W / 2);

      const wedgeMesh = new THREE.Mesh(wedgeGeo, rampMat);
      wedgeMesh.castShadow = true;
      wedgeMesh.receiveShadow = true;
      rampGroup.add(wedgeMesh);

      // 2. High-visibility Chevron boost arrows along the incline
      const numChevrons = 3;
      for (let c = 1; c <= numChevrons; c++) {
        const t = c / (numChevrons + 1);
        const cx = -L / 2 + t * L;
        const cy = t * H + 0.03;

        const armLength = W * 0.28;
        const armGeo = new THREE.BoxGeometry(0.3, 0.04, armLength);

        const leftArm = new THREE.Mesh(armGeo, chevronMat);
        leftArm.position.set(cx - 0.2, cy, armLength * 0.4);
        leftArm.rotation.z = inclineAngle;
        leftArm.rotation.y = 0.45;
        rampGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, chevronMat);
        rightArm.position.set(cx - 0.2, cy, -armLength * 0.4);
        rightArm.rotation.z = inclineAngle;
        rightArm.rotation.y = -0.45;
        rampGroup.add(rightArm);
      }

      // 3. Hazard Takeoff Lip (alternating black/yellow stripes along top edge)
      const numLipSegments = 8;
      const segmentWidth = W / numLipSegments;
      for (let s = 0; s < numLipSegments; s++) {
        const segGeo = new THREE.BoxGeometry(0.25, 0.25, segmentWidth);
        const segMat = s % 2 === 0 ? hazardLipMatYellow : hazardLipMatBlack;
        const segMesh = new THREE.Mesh(segGeo, segMat);
        segMesh.position.set(L / 2 - 0.1, H - 0.05, -W / 2 + (s + 0.5) * segmentWidth);
        rampGroup.add(segMesh);
      }

      // 4. Safety Guardrails along Left and Right edges of the ramp
      const railGeo = new THREE.BoxGeometry(slopeLength, 0.35, 0.12);
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 6);

      [-W / 2, W / 2].forEach(sideZ => {
        const rail = new THREE.Mesh(railGeo, guardrailMat);
        rail.position.set(0, H * 0.5 + 0.35, sideZ);
        rail.rotation.z = inclineAngle;
        rampGroup.add(rail);

        const numPosts = 4;
        for (let p = 0; p < numPosts; p++) {
          const pt = p / (numPosts - 1);
          const px = -L / 2 + pt * L;
          const py = pt * H;
          const post = new THREE.Mesh(postGeo, postMat);
          post.scale.set(1, Math.max(0.4, py + 0.6), 1);
          post.position.set(px, (py + 0.6) * 0.5, sideZ);
          rampGroup.add(post);
        }
      });

      // 5. Entrance Warning Pylons on both sides of entrance
      [-W / 2 - 0.5, W / 2 + 0.5].forEach(pz => {
        const pylonGroup = new THREE.Group();
        pylonGroup.position.set(-L / 2 - 0.6, 0, pz);

        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 8), pylonMat);
        cone.position.y = 0.55;
        pylonGroup.add(cone);

        const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), lightMat);
        light.position.y = 1.15;
        pylonGroup.add(light);

        rampGroup.add(pylonGroup);
      });

      this.group.add(rampGroup);
    }
  }

  buildPineValleyProps() {
    // 1. Tall Pine / Fir trees (multi-cone stacks)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1e3f20, roughness: 0.8 }); // deep pine green
    const birchMat = new THREE.MeshStandardMaterial({ color: 0x80b918, roughness: 0.75 }); // bright deciduous foliage
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.95 }); // granite stone

    const createPineTree = (x, z, scale = 1.0) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 2.2 * scale, 5), trunkMat);
      trunk.position.y = 1.1 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      // 3 tiered cones for a realistic pine look
      for (let c = 0; c < 3; c++) {
        const radius = (2.2 - c * 0.45) * scale;
        const height = (3.2 - c * 0.3) * scale;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), pineMat);
        cone.position.y = (2.2 + c * 1.8) * scale;
        cone.castShadow = true;
        tree.add(cone);
      }

      tree.position.set(x, 0, z);
      return tree;
    };

    const createBirchTree = (x, z, scale = 1.0) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 3.0 * scale, 5), trunkMat);
      trunk.position.y = 1.5 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4 * scale, 0), birchMat);
      crown.position.y = 4.2 * scale;
      crown.castShadow = true;
      tree.add(crown);

      tree.position.set(x, 0, z);
      return tree;
    };

    const createRockCluster = (x, z, scale = 1.0) => {
      const rockGroup = new THREE.Group();
      const rockGeo1 = new THREE.DodecahedronGeometry(2.0 * scale, 0);
      const r1 = new THREE.Mesh(rockGeo1, rockMat);
      r1.position.set(0, 1.2 * scale, 0);
      r1.rotation.set(0.3, 0.5, 0.2);
      r1.castShadow = true;
      rockGroup.add(r1);

      const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3 * scale, 0), rockMat);
      r2.position.set(1.4 * scale, 0.8 * scale, 0.6 * scale);
      r2.rotation.set(-0.2, 0.8, 0.4);
      r2.castShadow = true;
      rockGroup.add(r2);

      rockGroup.position.set(x, 0, z);
      return rockGroup;
    };

    // Pine Valley tree groves & forest clusters
    const pinePositions = [
      { x: -10, z: -10, s: 1.1 },
      { x: 20, z: 0, s: 0.9 },
      { x: 35, z: -80, s: 1.3 },
      { x: -50, z: 10, s: 1.2 },
      { x: -80, z: 15, s: 0.85 },
      { x: -110, z: -70, s: 1.4 },
      { x: -140, z: 10, s: 1.1 },
      { x: 130, z: 20, s: 1.2 },
      { x: 110, z: 130, s: 1.3 },
      { x: 70, z: 130, s: 1.0 },
      { x: 30, z: 90, s: 0.9 },
      { x: -40, z: 100, s: 1.25 },
      { x: -80, z: 90, s: 1.0 },
      { x: 180, z: -70, s: 1.5 },
      { x: 210, z: 40, s: 1.3 },
      { x: 190, z: 110, s: 1.4 },
      { x: -140, z: 90, s: 1.2 }
    ];

    pinePositions.forEach(p => this.group.add(createPineTree(p.x, p.z, p.s)));

    // Deciduous golden/green birch trees
    const birchPositions = [
      { x: 5, z: 20, s: 1.0 },
      { x: -30, z: -75, s: 0.9 },
      { x: 90, z: -10, s: 1.1 },
      { x: 50, z: 50, s: 1.0 },
      { x: -10, z: 80, s: 1.2 }
    ];
    birchPositions.forEach(b => this.group.add(createBirchTree(b.x, b.z, b.s)));

    // Granite rocks and boulders
    const rockPositions = [
      { x: 15, z: 10, s: 1.1 },
      { x: 120, z: -10, s: 1.4 },
      { x: 160, z: 90, s: 1.6 },
      { x: -70, z: 30, s: 1.2 },
      { x: -130, z: -10, s: 1.5 }
    ];
    rockPositions.forEach(r => this.group.add(createRockCluster(r.x, r.z, r.s)));

    // Distance braking boards before the Hairpin (150m, 100m, 50m)
    const boardMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const boardPostMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    [150, 100, 50].forEach((dist, idx) => {
      const boardGroup = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.1), boardMat);
      board.position.y = 1.4;
      boardGroup.add(board);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), boardPostMat);
      post.position.y = 0.7;
      boardGroup.add(post);

      // Positioned alongside the approach to Turn 2 / Hairpin (x: 170..150, z: 40..80)
      boardGroup.position.set(180 - idx * 10, 0, 30 + idx * 15);
      boardGroup.rotation.y = Math.PI / 4;
      this.group.add(boardGroup);
    });
  }

  buildTunnels() {
    if (!this.tunnels || this.tunnels.length === 0) return;

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x4a4e54, // weathered alpine tunnel concrete
      roughness: 0.9,
      metalness: 0.1
    });
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d30, // dark rugged mountain granite
      roughness: 0.95,
      metalness: 0.05
    });
    const portalFrameMat = new THREE.MeshStandardMaterial({
      color: 0x242426,
      roughness: 0.8,
      metalness: 0.2
    });
    const hazardMatYellow = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const hazardMatBlack = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffe066 }); // warm interior tunnel lamps

    for (const tunnel of this.tunnels) {
      const tunnelGroup = new THREE.Group();
      tunnelGroup.name = 'tunnel_structure';

      // Path of the tunnel from entrance through midpoint to exit
      const points = [
        new THREE.Vector3(tunnel.entrance.x, 0, tunnel.entrance.z),
        new THREE.Vector3(tunnel.midpoint.x, 0, tunnel.midpoint.z),
        new THREE.Vector3(tunnel.exit.x, 0, tunnel.exit.z)
      ];
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
      const divisions = 24;
      const sampled = curve.getPoints(divisions);
      const halfW = (tunnel.width || 19) * 0.5;
      const H = tunnel.height || 6.5;

      // 1. Entrance Portal
      const entrancePt = sampled[0];
      const entranceNext = sampled[1];
      const entranceDir = new THREE.Vector3().subVectors(entranceNext, entrancePt).normalize();

      const entrancePortal = new THREE.Group();
      entrancePortal.name = 'tunnel_portal_entrance';
      entrancePortal.position.set(entrancePt.x, 0, entrancePt.z);
      entrancePortal.rotation.order = 'YXZ';
      entrancePortal.rotation.y = Math.atan2(entranceDir.x, entranceDir.z) + Math.PI;

      // Portal massive arch posts and lintel
      const postL = new THREE.Mesh(new THREE.BoxGeometry(2.2, H + 1.5, 2.8), portalFrameMat);
      postL.position.set(-halfW - 0.5, (H + 1.5) * 0.5, 0);
      entrancePortal.add(postL);

      const postR = new THREE.Mesh(new THREE.BoxGeometry(2.2, H + 1.5, 2.8), portalFrameMat);
      postR.position.set(halfW + 0.5, (H + 1.5) * 0.5, 0);
      entrancePortal.add(postR);

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 4.2, 2.4, 3.2), portalFrameMat);
      lintel.position.set(0, H + 1.2, 0);
      entrancePortal.add(lintel);

      // Warning clearance stripe along portal
      for (let s = 0; s < 10; s++) {
        const seg = new THREE.Mesh(
          new THREE.BoxGeometry((halfW * 2 + 2.0) / 10, 0.4, 0.2),
          s % 2 === 0 ? hazardMatYellow : hazardMatBlack
        );
        seg.position.set(-halfW + (s + 0.5) * ((halfW * 2) / 10), H - 0.2, 1.6);
        entrancePortal.add(seg);
      }
      tunnelGroup.add(entrancePortal);

      // 2. Exit Portal
      const exitPt = sampled[divisions];
      const exitPrev = sampled[divisions - 1];
      const exitDir = new THREE.Vector3().subVectors(exitPt, exitPrev).normalize();

      const exitPortal = new THREE.Group();
      exitPortal.name = 'tunnel_portal_exit';
      exitPortal.position.set(exitPt.x, 0, exitPt.z);
      exitPortal.rotation.order = 'YXZ';
      exitPortal.rotation.y = Math.atan2(exitDir.x, exitDir.z) + Math.PI;

      const exitPostL = new THREE.Mesh(new THREE.BoxGeometry(2.2, H + 1.5, 2.8), portalFrameMat);
      exitPostL.position.set(-halfW - 0.5, (H + 1.5) * 0.5, 0);
      exitPortal.add(exitPostL);

      const exitPostR = new THREE.Mesh(new THREE.BoxGeometry(2.2, H + 1.5, 2.8), portalFrameMat);
      exitPostR.position.set(halfW + 0.5, (H + 1.5) * 0.5, 0);
      exitPortal.add(exitPostR);

      const exitLintel = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 4.2, 2.4, 3.2), portalFrameMat);
      exitLintel.position.set(0, H + 1.2, 0);
      exitPortal.add(exitLintel);
      tunnelGroup.add(exitPortal);

      // 3. Curved Gallery Arches, Pillars, Mountain Wall and Overhead Roof
      for (let i = 0; i < divisions; i++) {
        const pt = sampled[i];
        const next = sampled[Math.min(divisions, i + 1)];
        const segDir = new THREE.Vector3().subVectors(next, pt).normalize();
        const segNorm = new THREE.Vector3(-segDir.z, 0, segDir.x).normalize();
        const segLen = pt.distanceTo(next);

        // Mountain solid back wall (on mountain side)
        const wall = new THREE.Mesh(new THREE.BoxGeometry(2.4, H + 1.0, segLen + 0.5), rockMat);
        wall.position.set(pt.x + segNorm.x * (halfW + 1.0), (H + 1.0) * 0.5, pt.z + segNorm.z * (halfW + 1.0));
        wall.rotation.order = 'YXZ';
        wall.rotation.y = Math.atan2(segDir.x, segDir.z) + Math.PI;
        wall.castShadow = true;
        tunnelGroup.add(wall);

        // Valley side arched pillars (every second segment for open gallery vista)
        if (i % 2 === 0) {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, H, 1.4), concreteMat);
          pillar.position.set(pt.x - segNorm.x * halfW, H * 0.5, pt.z - segNorm.z * halfW);
          pillar.castShadow = true;
          tunnelGroup.add(pillar);
        }

        // Overhead concrete roof beam/rib across the tunnel
        if (i % 2 === 0) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 3.0, 0.9, 1.8), concreteMat);
          rib.position.set(pt.x, H + 0.45, pt.z);
          rib.rotation.order = 'YXZ';
          rib.rotation.y = Math.atan2(segDir.x, segDir.z) + Math.PI;
          rib.castShadow = true;
          tunnelGroup.add(rib);

          // Glowing overhead amber tunnel light fixture
          const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 1.2), lightMat);
          lamp.position.set(pt.x, H - 0.1, pt.z);
          lamp.rotation.order = 'YXZ';
          lamp.rotation.y = Math.atan2(segDir.x, segDir.z) + Math.PI;
          tunnelGroup.add(lamp);
        }
      }

      this.group.add(tunnelGroup);
    }
  }

  buildAlpineSummitProps() {
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xfafaff, roughness: 0.8 });
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x474a51, roughness: 0.95 });
    const larchMat = new THREE.MeshStandardMaterial({ color: 0x2b4c30, roughness: 0.85 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 });

    // Jagged snow-capped alpine peaks around the circuit
    const peaks = [
      { x: -160, z: -120, r: 85, h: 48, snowH: 18 },
      { x: 0, z: -180, r: 90, h: 54, snowH: 22 },
      { x: 180, z: -110, r: 95, h: 52, snowH: 20 },
      { x: 230, z: 80, r: 90, h: 50, snowH: 19 },
      { x: 140, z: 190, r: 85, h: 46, snowH: 16 },
      { x: -50, z: 200, r: 90, h: 50, snowH: 18 },
      { x: -180, z: 140, r: 85, h: 45, snowH: 17 },
      { x: -210, z: 0, r: 95, h: 55, snowH: 22 }
    ];

    peaks.forEach(p => {
      const peakGroup = new THREE.Group();
      peakGroup.name = 'alpine_peak';

      // Lower mountain cliff base
      const baseGeo = new THREE.ConeGeometry(p.r, p.h, 7);
      const baseMesh = new THREE.Mesh(baseGeo, cliffMat);
      baseMesh.position.y = p.h * 0.45;
      peakGroup.add(baseMesh);

      // White snow-cap on the mountain top
      const capGeo = new THREE.ConeGeometry(p.r * (p.snowH / p.h), p.snowH, 7);
      const capMesh = new THREE.Mesh(capGeo, snowMat);
      capMesh.position.y = p.h * 0.45 + (p.h - p.snowH) * 0.5;
      peakGroup.add(capMesh);

      peakGroup.position.set(p.x, -2, p.z);
      this.group.add(peakGroup);
    });

    // High alpine larch and pine trees
    const treePositions = [
      { x: -20, z: -30, s: 1.0 },
      { x: 20, z: -35, s: 1.2 },
      { x: 70, z: -30, s: 1.1 },
      { x: -80, z: 40, s: 1.3 },
      { x: -30, z: 50, s: 1.0 },
      { x: 40, z: 50, s: 1.2 },
      { x: 15, z: 75, s: 0.9 },
      { x: 70, z: 90, s: 1.1 },
      { x: 140, z: 10, s: 1.3 },
      { x: -140, z: -40, s: 1.2 }
    ];

    treePositions.forEach(tp => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * tp.s, 0.45 * tp.s, 2.0 * tp.s, 5), trunkMat);
      trunk.position.y = 1.0 * tp.s;
      tree.add(trunk);

      for (let c = 0; c < 3; c++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry((2.0 - c * 0.4) * tp.s, (2.8 - c * 0.3) * tp.s, 6),
          larchMat
        );
        cone.position.y = (1.8 + c * 1.5) * tp.s;
        cone.castShadow = true;
        tree.add(cone);
      }

      tree.position.set(tp.x, 0, tp.z);
      this.group.add(tree);
    });
  }
}
