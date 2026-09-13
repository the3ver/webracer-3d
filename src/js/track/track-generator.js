import * as THREE from 'three';

export class TrackGenerator {
  constructor(scene) {
    this.scene = scene;
    this.roadWidth = 18;
    this.wallHeight = 0.6;
    this.segments = 300;

    // Control points for varied 3D Synthwave Circuit (hills, chicanes, tunnel)
    this.rawPoints = [
      new THREE.Vector3(0, 0, 0),         // Start / Finish (middle of 200m main straight)
      new THREE.Vector3(0, 0, -120),      // Fast straight end
      new THREE.Vector3(40, 6, -220),     // Uphill entry
      new THREE.Vector3(120, 16, -280),   // High curve right
      new THREE.Vector3(220, 22, -260),   // Summit crest
      new THREE.Vector3(300, 12, -180),   // Downhill sweep
      new THREE.Vector3(340, 2, -70),     // Fast esses
      new THREE.Vector3(310, 0, 50),      // Hairpin entry
      new THREE.Vector3(240, 0, 120),     // Hairpin apex
      new THREE.Vector3(140, 4, 150),     // Tunnel entry (covered section)
      new THREE.Vector3(40, 8, 200),      // Tunnel mid
      new THREE.Vector3(-60, 4, 210),     // Tunnel exit
      new THREE.Vector3(-180, 0, 170),    // Sweeping left turn
      new THREE.Vector3(-250, 0, 80),     // Back straight
      new THREE.Vector3(-270, 0, -40),    // Chicane left
      new THREE.Vector3(-230, 0, -110),   // Chicane right
      new THREE.Vector3(-140, 0, -40),    // Final turn entry
      new THREE.Vector3(-60, 0, 60),      // Final turn apex
      new THREE.Vector3(0, 0, 70),        // Main straight entry
    ];

    // Closed 3D Catmull-Rom Spline
    this.curve = new THREE.CatmullRomCurve3(this.rawPoints, true, 'centripetal');

    this.checkpoints = [];
    this.boostPads = [];
    this.trackMeshes = [];
    this.tunnelRings = [];

    this.buildTrack();
    this.buildTunnel();
    this.buildBoostPads();
    this.buildCheckpoints();
  }

  buildTrack() {
    const points = this.curve.getSpacedPoints(this.segments);
    const roadGeo = new THREE.BufferGeometry();
    const wallLeftGeo = new THREE.BufferGeometry();
    const wallRightGeo = new THREE.BufferGeometry();

    const roadVerts = [];
    const roadUvs = [];
    const roadIndices = [];

    const wallLVerts = [];
    const wallRVerts = [];
    const wallIndices = [];

    // Precalculate tangents, normals, binormals
    const frames = this.curve.computeFrenetFrames(this.segments, true);

    for (let i = 0; i <= this.segments; i++) {
      const p = points[i % this.segments];
      const binormal = frames.binormals[i % this.segments];
      const normal = frames.normals[i % this.segments];

      // Flatten banking slightly for playable arcade physics
      const halfWidth = this.roadWidth / 2;
      const leftPoint = new THREE.Vector3().copy(p).addScaledVector(binormal, -halfWidth);
      const rightPoint = new THREE.Vector3().copy(p).addScaledVector(binormal, halfWidth);

      // Road plane vertices
      roadVerts.push(leftPoint.x, leftPoint.y, leftPoint.z);
      roadVerts.push(rightPoint.x, rightPoint.y, rightPoint.z);

      const uProgress = (i / this.segments) * 60; // Texture repetition
      roadUvs.push(0, uProgress);
      roadUvs.push(1, uProgress);

      // Guardrail vertices (Left: ground to wallHeight, Right: ground to wallHeight)
      const leftTop = new THREE.Vector3().copy(leftPoint).addScaledVector(normal, this.wallHeight);
      const rightTop = new THREE.Vector3().copy(rightPoint).addScaledVector(normal, this.wallHeight);

      wallLVerts.push(leftPoint.x, leftPoint.y, leftPoint.z);
      wallLVerts.push(leftTop.x, leftTop.y, leftTop.z);

      wallRVerts.push(rightPoint.x, rightPoint.y, rightPoint.z);
      wallRVerts.push(rightTop.x, rightTop.y, rightTop.z);

      if (i < this.segments) {
        const base = i * 2;
        // Road triangles (quads)
        roadIndices.push(base, base + 1, base + 2);
        roadIndices.push(base + 1, base + 3, base + 2);

        // Left Guardrail quad
        wallIndices.push(base, base + 1, base + 2);
        wallIndices.push(base + 1, base + 3, base + 2);
      }
    }

    // Set attributes for road
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    // Road Shader Material: Dark Asphalt with Glowing Neon Centerline and Curbs
    const roadMat = new THREE.ShaderMaterial({
      uniforms: {
        neonCyan: { value: new THREE.Color(0x00f3ff) },
        neonPink: { value: new THREE.Color(0xff007f) },
        neonYellow: { value: new THREE.Color(0xffea00) },
        asphaltDark: { value: new THREE.Color(0x181b34) }, // Distinct dark indigo tarmac
        laneGuide: { value: new THREE.Color(0x303666) },   // Subtle inner lane markers
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 neonCyan;
        uniform vec3 neonPink;
        uniform vec3 neonYellow;
        uniform vec3 asphaltDark;
        uniform vec3 laneGuide;
        varying vec2 vUv;

        void main() {
          // Center dashed neon cyan stripe
          float centerDist = abs(vUv.x - 0.5);
          float isCenterLine = step(centerDist, 0.016) * step(0.45, fract(vUv.y * 1.5));

          // Inner lane dividing guides (at 25% and 75% track width)
          float lane1 = step(abs(vUv.x - 0.25), 0.007) * step(0.6, fract(vUv.y * 3.0));
          float lane2 = step(abs(vUv.x - 0.75), 0.007) * step(0.6, fract(vUv.y * 3.0));

          // Neon Checkered Curbs (Cyan/Yellow on Left, Magenta/Yellow on Right)
          float leftEdge = step(vUv.x, 0.045);
          float rightEdge = step(0.955, vUv.x);
          float curbStripe = step(0.5, fract(vUv.y * 5.0));

          // Grid pattern on asphalt for speed sensation and depth
          float grid = max(
            step(0.95, fract(vUv.x * 12.0)) * 0.18,
            step(0.95, fract(vUv.y * 3.0)) * 0.18
          );

          vec3 col = asphaltDark + vec3(grid * 0.5, grid * 0.6, grid * 1.0);
          col = mix(col, laneGuide, (lane1 + lane2) * 0.9);
          col = mix(col, neonCyan, isCenterLine * 1.7);

          // Alternating Checkered Curbs
          vec3 leftCurbCol = mix(neonCyan, neonYellow, curbStripe * 0.5);
          vec3 rightCurbCol = mix(neonPink, neonYellow, curbStripe * 0.5);
          col = mix(col, leftCurbCol, leftEdge * 1.8);
          col = mix(col, rightCurbCol, rightEdge * 1.8);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.scene.add(roadMesh);
    this.trackMeshes.push(roadMesh);

    // Guardrails Materials (Glowing Neon Wireframe Ribbons)
    const leftWallGeo = new THREE.BufferGeometry();
    leftWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallLVerts, 3));
    leftWallGeo.setIndex(wallIndices);
    leftWallGeo.computeVertexNormals();
    const leftWallMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: false,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    this.scene.add(leftWall);

    const rightWallGeo = new THREE.BufferGeometry();
    rightWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallRVerts, 3));
    rightWallGeo.setIndex(wallIndices);
    rightWallGeo.computeVertexNormals();
    const rightWallMat = new THREE.MeshBasicMaterial({
      color: 0xff007f,
      wireframe: false,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const rightWall = new THREE.Mesh(rightWallGeo, rightWallMat);
    this.scene.add(rightWall);
  }

  buildTunnel() {
    // Covered tunnel section around t = 0.55 to 0.70 (pts 9 to 12)
    const tunnelGroup = new THREE.Group();
    const numRings = 24;
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x9d00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });

    for (let i = 0; i < numRings; i++) {
      const t = 0.54 + (i / numRings) * 0.16;
      const pt = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);

      const ringGeo = new THREE.TorusGeometry(this.roadWidth * 0.65, 0.4, 6, 16, Math.PI);
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pt);
      ringMesh.position.y += 0.5;

      // Orient ring perpendicular to road
      ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      ringMesh.rotateX(Math.PI / 2);

      tunnelGroup.add(ringMesh);
      this.tunnelRings.push(ringMesh);
    }

    this.scene.add(tunnelGroup);
  }

  buildBoostPads() {
    // Place glowing Boost Pads along fast straights
    const boostIndices = [0.08, 0.35, 0.78];
    const padMat = new THREE.ShaderMaterial({
      uniforms: {
        neonYellow: { value: new THREE.Color(0xffe600) },
        neonPink: { value: new THREE.Color(0xff007f) },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 neonYellow;
        uniform vec3 neonPink;
        uniform float time;
        varying vec2 vUv;
        void main() {
          // Chevrons animating forward
          float arrow = fract(vUv.y * 3.0 - time * 3.0);
          float chevron = step(abs(vUv.x - 0.5) * 1.5, arrow) * (1.0 - arrow);
          vec3 col = mix(neonPink, neonYellow, chevron);
          gl_FragColor = vec4(col * (1.2 + chevron * 1.5), 0.9);
        }
      `,
      transparent: true
    });

    for (const t of boostIndices) {
      const pt = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      const padGeo = new THREE.PlaneGeometry(8, 12);
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.copy(pt);
      padMesh.position.y += 0.08; // Slightly above road surface
      padMesh.rotation.x = -Math.PI / 2;

      // Align with track tangent
      const angle = Math.atan2(-tangent.x, -tangent.z);
      padMesh.rotation.z = angle;

      this.scene.add(padMesh);
      this.boostPads.push({
        position: pt,
        mesh: padMesh,
        radius: 6.0
      });
    }

    this.boostMaterial = padMat;
  }

  buildCheckpoints() {
    // 16 checkpoints along the circuit for position and lap tracking
    const numCheckpoints = 16;
    for (let i = 0; i < numCheckpoints; i++) {
      const t = i / numCheckpoints;
      const pt = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      this.checkpoints.push({
        index: i,
        t,
        position: pt,
        tangent,
        radius: this.roadWidth * 0.75
      });
    }
  }

  getTrackTransformAt(t) {
    const pt = this.curve.getPointAt(t);
    const tangent = this.curve.getTangentAt(t);
    return { position: pt, tangent };
  }

  // Find closest point on track for raycast collision & ground height
  getClosestTrackPoint(pos) {
    let closestDist = Infinity;
    let closestPt = null;
    let closestT = 0;

    // Fast discrete search with 60 samples
    for (let i = 0; i < 60; i++) {
      const t = i / 60;
      const pt = this.curve.getPointAt(t);
      const d = pt.distanceTo(pos);
      if (d < closestDist) {
        closestDist = d;
        closestPt = pt;
        closestT = t;
      }
    }

    // Refine with local neighborhood
    let bestT = closestT;
    for (let step = -5; step <= 5; step++) {
      const t = (closestT + step * 0.003 + 1.0) % 1.0;
      const pt = this.curve.getPointAt(t);
      const d = pt.distanceTo(pos);
      if (d < closestDist) {
        closestDist = d;
        closestPt = pt;
        bestT = t;
      }
    }

    return {
      point: closestPt,
      distance: closestDist,
      t: bestT,
      tangent: this.curve.getTangentAt(bestT)
    };
  }

  update(delta, time) {
    if (this.boostMaterial) {
      this.boostMaterial.uniforms.time.value = time;
    }
  }
}
