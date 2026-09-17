import * as THREE from 'three';

/**
 * Builds the 3D meshes for the isometric racing track:
 * - Asphalt track ribbon with centerline markings
 * - Red & White alternating curbs along corners
 * - Tire barriers along track boundaries
 * - Start/Finish checkered line & overhead gantry
 * - Low-poly trees, grandstand, and terrain
 */
export class CircuitMeshBuilder {
  constructor(waypoints, trackWidth = 16) {
    this.waypoints = waypoints;
    this.trackWidth = trackWidth;
    this.group = new THREE.Group();
  }

  build() {
    this.buildGround();
    this.buildTrackRibbon();
    this.buildCurbsAndBarriers();
    this.buildStartFinishLine();
    this.buildProps();
    return this.group;
  }

  buildGround() {
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.9,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.1;
    groundMesh.receiveShadow = true;
    this.group.add(groundMesh);
  }

  buildTrackRibbon() {
    const points = this.waypoints.map(w => new THREE.Vector3(w.x, 0, w.z));
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.25);
    const divisions = 180;
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

      // Left vertex
      const leftX = pt.x + norm.x * halfW;
      const leftZ = pt.z + norm.z * halfW;
      // Right vertex
      const rightX = pt.x - norm.x * halfW;
      const rightZ = pt.z - norm.z * halfW;

      positions.push(leftX, 0.01, leftZ);
      positions.push(rightX, 0.01, rightZ);

      const v = i / divisions * 30;
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
      color: 0x222225,
      roughness: 0.85,
      metalness: 0.1
    });

    const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat);
    asphaltMesh.receiveShadow = true;
    this.group.add(asphaltMesh);
  }

  buildCurbsAndBarriers() {
    const points = this.waypoints.map(w => new THREE.Vector3(w.x, 0, w.z));
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.25);
    const divisions = 160;
    const sampledPoints = curve.getPoints(divisions);

    const halfW = this.trackWidth * 0.5;
    const curbW = 1.6;
    const barrierDist = halfW + 3.8;

    // Materials
    const curbRedMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.7 });
    const curbWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.7 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    const tireRedMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.9 });

    const tireGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.4, 8);

    for (let i = 0; i < divisions; i++) {
      const pt = sampledPoints[i];
      const nextPt = sampledPoints[(i + 1) % divisions];
      const dir = new THREE.Vector3().subVectors(nextPt, pt).normalize();
      const norm = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      // Curbs on both sides
      const curbColorMat = (i % 2 === 0) ? curbRedMat : curbWhiteMat;
      const curbBoxGeo = new THREE.BoxGeometry(curbW, 0.12, 2.2);

      // Left Curb
      const curbLeft = new THREE.Mesh(curbBoxGeo, curbColorMat);
      curbLeft.position.set(pt.x + norm.x * (halfW + curbW * 0.5), 0.04, pt.z + norm.z * (halfW + curbW * 0.5));
      curbLeft.rotation.y = Math.atan2(dir.x, dir.z);
      this.group.add(curbLeft);

      // Right Curb
      const curbRight = new THREE.Mesh(curbBoxGeo, curbColorMat);
      curbRight.position.set(pt.x - norm.x * (halfW + curbW * 0.5), 0.04, pt.z - norm.z * (halfW + curbW * 0.5));
      curbRight.rotation.y = Math.atan2(dir.x, dir.z);
      this.group.add(curbRight);

      // Outer tire barrier every 2 divisions
      if (i % 2 === 0) {
        const mat = (i % 4 === 0) ? tireRedMat : tireMat;

        // Left Barrier
        const barrierLeft = new THREE.Mesh(tireGeo, mat);
        barrierLeft.position.set(pt.x + norm.x * barrierDist, 0.7, pt.z + norm.z * barrierDist);
        barrierLeft.castShadow = true;
        this.group.add(barrierLeft);

        // Right Barrier
        const barrierRight = new THREE.Mesh(tireGeo, mat);
        barrierRight.position.set(pt.x - norm.x * barrierDist, 0.7, pt.z - norm.z * barrierDist);
        barrierRight.castShadow = true;
        this.group.add(barrierRight);
      }
    }
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

    // Overhead Gantry Bridge
    const gantryGroup = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x495057, metalness: 0.6, roughness: 0.4 });
    const postGeo = new THREE.BoxGeometry(1.0, 8, 1.0);
    const postDist = this.trackWidth * 0.5 + 2.5;

    // Left Post
    const postLeft = new THREE.Mesh(postGeo, postMat);
    postLeft.position.set(wp0.x + norm.x * postDist, 4, wp0.z + norm.z * postDist);
    postLeft.castShadow = true;
    gantryGroup.add(postLeft);

    // Right Post
    const postRight = new THREE.Mesh(postGeo, postMat);
    postRight.position.set(wp0.x - norm.x * postDist, 4, wp0.z - norm.z * postDist);
    postRight.castShadow = true;
    gantryGroup.add(postRight);

    // Crossbeam spanning between postLeft and postRight (depth along Z = trackWidth + 6)
    const beamGeo = new THREE.BoxGeometry(1.4, 1.4, this.trackWidth + 6.0);
    const beam = new THREE.Mesh(beamGeo, postMat);
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

  buildProps() {
    // Low-poly trees in infield and outfield
    const treeTrunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 2.5, 5);
    const treeLeavesGeo = new THREE.ConeGeometry(2.4, 5, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.8 });

    const treePositions = [
      { x: 0, z: 0 },
      { x: 30, z: -10 },
      { x: -30, z: 20 },
      { x: -70, z: 0 },
      { x: 120, z: 30 },
      { x: 100, z: 140 },
      { x: 20, z: 110 },
      { x: -140, z: -40 },
      { x: 200, z: -40 }
    ];

    treePositions.forEach(pos => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
      trunk.position.y = 1.25;
      trunk.castShadow = true;
      tree.add(trunk);

      const leaves = new THREE.Mesh(treeLeavesGeo, leavesMat);
      leaves.position.y = 4.2;
      leaves.castShadow = true;
      tree.add(leaves);

      tree.position.set(pos.x, 0, pos.z);
      this.group.add(tree);
    });
  }
}
