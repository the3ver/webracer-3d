import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class EngineRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Post-processing: Bloom for Synthwave Glow
    this.composer = null;
    this.bloomPass = null;
    this.setupPostprocessing = this.setupPostprocessing.bind(this);

    // Event Listener for resize
    window.addEventListener('resize', () => this.onResize());
  }

  setupPostprocessing(scene, camera) {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Unreal Bloom: strength, radius, threshold
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      1.1,  // Bloom Strength
      0.4,  // Bloom Radius
      0.25  // Bloom Threshold (low threshold = strong neon glow)
    );
    this.composer.addPass(this.bloomPass);
  }

  onResize(camera) {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.composer) {
      this.composer.setSize(this.width, this.height);
    }

    if (camera) {
      camera.aspect = this.width / this.height;
      camera.updateProjectionMatrix();
    }
  }

  render(scene, camera) {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }
}
