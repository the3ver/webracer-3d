import * as THREE from 'three';

export class SynthwaveScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050212);
    this.scene.fog = new THREE.FogExp2(0x0a0420, 0.0018);

    this.gridHelper = null;
    this.sunMesh = null;
    this.mountains = [];

    this.buildLighting();
    this.buildEnvironment();
  }

  buildLighting() {
    // Ambient Light (deep magenta/purple base)
    const ambientLight = new THREE.AmbientLight(0x381254, 1.5);
    this.scene.add(ambientLight);

    // Directional Sunset Light
    const sunLight = new THREE.DirectionalLight(0xff007f, 2.5);
    sunLight.position.set(0, 80, -400);
    this.scene.add(sunLight);

    // Hemispheric Light (Cyan top, Purple bottom)
    const hemiLight = new THREE.HemisphereLight(0x00f3ff, 0x8a00ff, 1.2);
    this.scene.add(hemiLight);
  }

  buildEnvironment() {
    // 1. Synthwave Sun (Large glowing retro sun with horizontal lines)
    const sunGeo = new THREE.CircleGeometry(160, 64);
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0xffe600) }, // Yellow top
        color2: { value: new THREE.Color(0xff007f) }, // Pink bottom
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        void main() {
          // Horizontal stripes in the lower half (OutRun classic sun)
          float stripe = 1.0;
          if (vUv.y < 0.5) {
            float yNorm = vUv.y / 0.5;
            float freq = 16.0;
            float bar = sin(yNorm * 3.14159 * freq);
            if (bar < (1.0 - yNorm * 0.9)) {
              discard;
            }
          }
          vec3 col = mix(color2, color1, vUv.y);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(0, 100, -600);
    this.scene.add(this.sunMesh);

    // 2. Starfield
    const starsCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 2000;
      starPos[i + 1] = Math.random() * 800 + 50;
      starPos[i + 2] = (Math.random() - 0.5) * 2000;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 2.2,
      transparent: true,
      opacity: 0.8
    });
    const starField = new THREE.Points(starGeo, starMat);
    this.scene.add(starField);

    // 3. Infinite Neon Ground Grid
    const gridGeo = new THREE.PlaneGeometry(1600, 1600, 80, 80);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x9d00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.y = -0.5;
    this.scene.add(gridMesh);

    // 4. Distant Wireframe Mountains
    this.buildMountains();
  }

  buildMountains() {
    const mountainMat = new THREE.MeshBasicMaterial({
      color: 0xff007f,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });

    const createMountainRidge = (zPos, xOffset) => {
      const geo = new THREE.PlaneGeometry(800, 140, 24, 10);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y > -50) {
          pos.setZ(i, Math.sin(i * 0.7) * 40 + (Math.random() - 0.5) * 20);
        }
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mountainMat);
      mesh.position.set(xOffset, 50, zPos);
      this.scene.add(mesh);
    };

    createMountainRidge(-550, -350);
    createMountainRidge(-550, 350);
  }

  update(playerPos) {
    // Keep sun and distant elements centered with player
    if (this.sunMesh && playerPos) {
      this.sunMesh.position.x = playerPos.x;
      this.sunMesh.position.z = playerPos.z - 600;
    }
  }
}
