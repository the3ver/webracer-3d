import * as THREE from 'three';
import { TRACK_WAYPOINTS, TRACK_CONFIG, TRACK_PRESETS, getTrackPreset } from './track/track-data.js';
import { CircuitTrack } from './track/circuit-track.js';
import { CircuitMeshBuilder } from './track/circuit-mesh.js';
import { IsometricCar } from './vehicles/isometric-car.js';
import { RacerAI } from './ai/racer-ai.js';
import { EngineAudio } from './audio/engine-audio.js';
import { DriftParticles } from './effects/drift-particles.js';

export class Game {
  constructor() {
    this.state = 'MENU'; // 'MENU' | 'COUNTDOWN' | 'RACING' | 'FINISHED'
    this.raceTime = 0.0;
    this.currentTrackId = 'pine-valley';
    this.currentTrackConfig = getTrackPreset(this.currentTrackId);
    this.totalLaps = this.currentTrackConfig.totalLaps || 3;
    this.countdownTimer = 3.99;
    this.isPaused = false;
    this.isSettingsOpen = false;

    // DOM Elements
    this.canvas = document.getElementById('racer-canvas');
    this.posVal = document.getElementById('pos-val');
    this.lapVal = document.getElementById('lap-val');
    this.timeVal = document.getElementById('time-val');
    this.speedVal = document.getElementById('speed-val');
    this.centerMsg = document.getElementById('center-message');
    this.overlay = document.getElementById('overlay-screen');
    this.settingsModal = document.getElementById('settings-modal');
    this.finishModal = document.getElementById('finish-modal');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    // Audio
    this.audioSynth = new EngineAudio();

    // Setup Three.js Scene & Renderer
    this.setupScene();

    // Drift & debris particle effects
    this.driftParticles = new DriftParticles(this.scene, 500);

    // Setup Track and Grid
    this.trackMeshGroup = null;
    this.vehicles = [];
    this.aiDrivers = [];
    this.trackers = [];
    this.setupTrackAndVehicles();
    this.setupTrackSelectorUI();

    // Input state
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      handbrake: false
    };

    // Resize handler
    window.addEventListener('resize', () => this.onResize());
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ecae6);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Isometric Orthographic Camera (d=28 for closer, larger view)
    const aspect = window.innerWidth / window.innerHeight;
    const d = 28;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);

    // Camera offset for true isometric perspective
    this.cameraOffset = new THREE.Vector3(-28, 38, 28);
    this.camera.position.set(-40 + this.cameraOffset.x, this.cameraOffset.y, -40 + this.cameraOffset.z);
    this.camera.lookAt(-40, 0, -40);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7e6, 1.25);
    sunLight.position.set(80, 140, 60);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 300;
    const shadowSize = 120;
    sunLight.shadow.camera.left = -shadowSize;
    sunLight.shadow.camera.right = shadowSize;
    sunLight.shadow.camera.top = shadowSize;
    sunLight.shadow.camera.bottom = -shadowSize;
    this.scene.add(sunLight);
  }

  setupTrackAndVehicles() {
    // Remove previous track mesh
    if (this.trackMeshGroup) {
      this.scene.remove(this.trackMeshGroup);
      this.trackMeshGroup = null;
    }

    // Remove previous vehicle meshes
    if (this.vehicles) {
      for (const v of this.vehicles) {
        if (v && v.mesh) this.scene.remove(v.mesh);
      }
    }

    const cfg = this.currentTrackConfig;
    this.totalLaps = cfg.totalLaps || 3;

    this.circuitTrack = new CircuitTrack({
      waypoints: cfg.waypoints,
      trackWidth: cfg.trackWidth,
      totalLaps: this.totalLaps,
      ramps: cfg.ramps
    });

    const meshBuilder = new CircuitMeshBuilder(cfg.waypoints, cfg.trackWidth, cfg.ramps, {
      theme: cfg.theme,
      tunnels: cfg.tunnels
    });
    this.trackMeshGroup = meshBuilder.build();
    this.scene.add(this.trackMeshGroup);

    this.setupGrid();

    // Reset camera to player start position
    const pStart = cfg.playerStart || cfg.waypoints[0];
    if (this.camera && this.cameraOffset) {
      this.camera.position.set(pStart.x + this.cameraOffset.x, this.cameraOffset.y, pStart.z + this.cameraOffset.z);
      this.camera.lookAt(pStart.x, 0, pStart.z);
    }
  }

  loadTrack(trackId) {
    if (!TRACK_PRESETS[trackId]) return;
    this.currentTrackId = trackId;
    this.currentTrackConfig = getTrackPreset(trackId);
    this.setupTrackAndVehicles();
    this.updateTrackSelectorUI();
  }

  setupTrackSelectorUI() {
    const btnPine = document.getElementById('btn-track-pine');
    const btnAlpine = document.getElementById('btn-track-alpine');
    if (btnPine) {
      btnPine.addEventListener('click', () => this.loadTrack('pine-valley'));
    }
    if (btnAlpine) {
      btnAlpine.addEventListener('click', () => this.loadTrack('alpine-summit'));
    }
    this.updateTrackSelectorUI();
  }

  updateTrackSelectorUI() {
    const btnPine = document.getElementById('btn-track-pine');
    const btnAlpine = document.getElementById('btn-track-alpine');
    const titleEl = document.getElementById('circuit-title');
    const subTitleEl = document.getElementById('circuit-subtitle');

    if (btnPine) btnPine.classList.toggle('active', this.currentTrackId === 'pine-valley');
    if (btnAlpine) btnAlpine.classList.toggle('active', this.currentTrackId === 'alpine-summit');

    if (titleEl) {
      titleEl.innerText = this.currentTrackId === 'alpine-summit' ? 'ALPINE SUMMIT' : 'PINE VALLEY';
    }
    if (subTitleEl) {
      subTitleEl.innerText = this.currentTrackId === 'alpine-summit'
        ? '// HIGH MOUNTAIN PASS & ROCK TUNNEL //'
        : '// GRAND PRIX CIRCUIT //';
    }
  }

  setupGrid() {
    this.vehicles = [];
    this.aiDrivers = [];
    this.trackers = [];

    const cfg = this.currentTrackConfig;
    const spots = cfg.gridSpots;
    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      const isAI = i > 0;

      const car = new IsometricCar({
        name: spot.name,
        color: spot.color,
        isAI,
        x: spot.x,
        z: spot.z,
        angle: spot.angle,
        maxSpeed: isAI ? 42 + (i * 1.5) : 50,
        acceleration: isAI ? 19 : 22
      });

      this.scene.add(car.mesh);
      this.vehicles.push(car);

      const tracker = this.circuitTrack.createVehicleTracker(spot.name);
      this.trackers.push(tracker);

      if (isAI) {
        const ai = new RacerAI({
          waypoints: cfg.waypoints,
          lookaheadDistance: 11,
          aggressiveness: 0.86 + (i * 0.04)
        });
        this.aiDrivers.push(ai);
      }
    }

    this.player = this.vehicles[0];
    this.playerTracker = this.trackers[0];
  }

  startRace() {
    this.state = 'COUNTDOWN';
    this.countdownTimer = 3.99;
    this.raceTime = 0.0;

    if (this.overlay) {
      this.overlay.classList.remove('visible');
      this.overlay.classList.add('hidden');
    }
    if (this.finishModal) {
      this.finishModal.classList.add('hidden');
    }

    this.audioSynth.init();
    this.audioSynth.resume();
    this.audioSynth.playBeep(false);

    if (this.centerMsg) {
      this.centerMsg.innerText = '3';
      this.centerMsg.classList.add('show');
    }
  }

  handleKeyDown(e) {
    if (e.repeat) return;
    const key = e.key.toLowerCase();

    if (key === 'w' || key === 'arrowup') this.keys.up = true;
    if (key === 's' || key === 'arrowdown') this.keys.down = true;
    if (key === 'a' || key === 'arrowleft') this.keys.left = true;
    if (key === 'd' || key === 'arrowright') this.keys.right = true;
    if (key === ' ' || key === 'shift') this.keys.handbrake = true;

    if (key === 'escape' || key === 'p') {
      this.toggleSettings();
    }
    if (key === 'm') {
      this.toggleMute();
    }
  }

  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') this.keys.up = false;
    if (key === 's' || key === 'arrowdown') this.keys.down = false;
    if (key === 'a' || key === 'arrowleft') this.keys.left = false;
    if (key === 'd' || key === 'arrowright') this.keys.right = false;
    if (key === ' ' || key === 'shift') this.keys.handbrake = false;
  }

  update(dt) {
    if (this.isPaused) return;

    if (this.state === 'COUNTDOWN') {
      this.updateCountdown(dt);
    } else if (this.state === 'RACING' || this.state === 'FINISHED') {
      if (this.state === 'RACING') {
        this.raceTime += dt;
      }
      this.updateVehicles(dt);
      this.checkCollisions();
      this.updateTrackProgression(dt);
      this.updateHUD();
      this.renderRadar();
    }

    if (this.driftParticles) {
      this.driftParticles.update(dt);
    }

    this.updateCamera(dt);
  }

  updateCountdown(dt) {
    const prevTimer = Math.ceil(this.countdownTimer);
    this.countdownTimer -= dt;
    const currentTimer = Math.ceil(this.countdownTimer);

    if (currentTimer !== prevTimer && currentTimer > 0) {
      this.audioSynth.playBeep(false);
      if (this.centerMsg) this.centerMsg.innerText = currentTimer.toString();
    }

    if (this.countdownTimer <= 0) {
      this.state = 'RACING';
      this.audioSynth.playBeep(true);
      if (this.centerMsg) {
        this.centerMsg.innerText = 'GO!';
        setTimeout(() => {
          if (this.centerMsg) this.centerMsg.classList.remove('show');
        }, 1000);
      }
    }
  }

  updateVehicles(dt) {
    // 1. Update Player
    let playerThrottle = 0;
    if (this.keys.up) playerThrottle += 1;
    if (this.keys.down) playerThrottle -= 1;

    let playerSteer = 0;
    if (this.keys.left) playerSteer -= 1;
    if (this.keys.right) playerSteer += 1;

    const playerSurface = this.circuitTrack.getTrackSurfaceAt(this.player.physics.x, this.player.physics.z);
    this.player.update(dt, {
      throttle: playerThrottle,
      steer: playerSteer,
      handbrake: this.keys.handbrake
    }, playerSurface);

    this.audioSynth.update(this.player.physics.speed, this.player.physics.maxSpeed, this.player.physics.isDrifting);

    // 2. Update AI Rivals
    for (let i = 1; i < this.vehicles.length; i++) {
      const car = this.vehicles[i];
      const ai = this.aiDrivers[i - 1];
      const tracker = this.trackers[i];

      const input = ai.computeInput(car.physics, tracker.nextCheckpointIndex, this.vehicles.map(v => v.physics));
      const surface = this.circuitTrack.getTrackSurfaceAt(car.physics.x, car.physics.z);
      car.update(dt, input, surface);
    }

    // 3. Jump Ramps and Landing Effects
    for (const car of this.vehicles) {
      const p = car.physics;

      // Check jump ramp trigger
      const ramp = this.circuitTrack.checkRamp(p.x, p.z, p.radius);
      if (ramp && !p.isAirborne && Math.abs(p.speed) > 6) {
        const speedRatio = Math.min(1.25, Math.max(0.65, Math.abs(p.speed) / 35.0));
        p.launchJump(ramp.liftVelocity * speedRatio);
        if (car === this.player) {
          this.audioSynth.playBeep(true);
        }
      }

      // Check touchdown landing effects
      if (p.justLanded) {
        if (car === this.player) {
          this.audioSynth.playImpact();
        }
        if (this.driftParticles) {
          this.driftParticles.emit({
            x: p.x,
            y: 0.12,
            z: p.z,
            headingAngle: p.angle,
            slipDirection: 0,
            speed: Math.abs(p.speed) + 12,
            surface: 'asphalt',
            count: 10
          });
        }
      }
    }

    // 4. Emit drift particles (stones, mud, tire rubber) flying sideways & backwards
    for (const car of this.vehicles) {
      const p = car.physics;
      const isDrifting = p.isDrifting ||
        (Math.abs(p.slipAngle) > 0.07 && Math.abs(p.speed) > 7) ||
        (this.keys.handbrake && car === this.player && Math.abs(p.speed) > 4);
      if (isDrifting && this.driftParticles) {
        const fX = Math.cos(p.angle);
        const fZ = Math.sin(p.angle);
        const rX = -fZ;
        const rZ = fX;

        // Determine slip direction: +1 when sliding right, -1 when sliding left
        const vLateral = p.vx * rX + p.vz * rZ;
        const slipDir = vLateral >= 0 ? 1 : -1;

        const surface = this.circuitTrack.getTrackSurfaceAt(p.x, p.z);
        const count = surface.surface === 'grass' ? 3 : 2;

        // Emit from rear tire positions
        const rearOffset = -1.4;
        const halfTireTrack = 1.1;

        // Left rear tire
        this.driftParticles.emit({
          x: p.x + fX * rearOffset + rX * halfTireTrack,
          y: 0.15,
          z: p.z + fZ * rearOffset + rZ * halfTireTrack,
          headingAngle: p.angle,
          slipDirection: slipDir,
          speed: Math.abs(p.speed),
          surface: surface.surface,
          count
        });

        // Right rear tire
        this.driftParticles.emit({
          x: p.x + fX * rearOffset - rX * halfTireTrack,
          y: 0.15,
          z: p.z + fZ * rearOffset - rZ * halfTireTrack,
          headingAngle: p.angle,
          slipDirection: slipDir,
          speed: Math.abs(p.speed),
          surface: surface.surface,
          count
        });
      }
    }
  }

  checkCollisions() {
    // Vehicle to Barrier collisions
    for (const car of this.vehicles) {
      // Allow airborne vehicles flying high above ground to clear barriers
      if (car.physics.isAirborne && car.physics.y > 1.2) {
        continue;
      }
      const barrier = this.circuitTrack.checkBarrierCollision(car.physics.x, car.physics.z, car.physics.radius);
      if (barrier) {
        const collided = car.physics.resolveBarrierCollision(barrier, 0.45);
        if (collided && car === this.player) {
          this.audioSynth.playImpact();
        }
      }
    }

    // Vehicle to Vehicle pairwise collisions
    for (let i = 0; i < this.vehicles.length; i++) {
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const carA = this.vehicles[i];
        const carB = this.vehicles[j];
        const collided = carA.physics.resolveVehicleCollision(carB.physics, 0.5);
        if (collided && (carA === this.player || carB === this.player)) {
          this.audioSynth.playImpact();
        }
      }
    }
  }

  updateTrackProgression(dt) {
    for (let i = 0; i < this.vehicles.length; i++) {
      const car = this.vehicles[i];
      const tracker = this.trackers[i];
      this.circuitTrack.updateTracker(tracker, { x: car.physics.x, z: car.physics.z }, dt);
    }

    // Check if player has finished the race
    if (this.playerTracker.isFinished && this.state === 'RACING') {
      this.state = 'FINISHED';
      this.showFinishScreen();
    }
  }

  updateCamera(dt) {
    if (!this.player) return;

    // Smoothly follow player car
    const targetX = this.player.physics.x + this.cameraOffset.x;
    const targetZ = this.player.physics.z + this.cameraOffset.z;

    const lerpFactor = Math.min(1.0, 6.0 * dt);
    this.camera.position.x += (targetX - this.camera.position.x) * lerpFactor;
    this.camera.position.z += (targetZ - this.camera.position.z) * lerpFactor;
    this.camera.position.y = this.cameraOffset.y;

    this.camera.lookAt(this.camera.position.x - this.cameraOffset.x, 0, this.camera.position.z - this.cameraOffset.z);
  }

  updateHUD() {
    const standings = this.circuitTrack.calculateStandings(this.trackers);
    const playerRank = standings.findIndex(t => t.id === this.playerTracker.id) + 1;

    if (this.posVal) {
      this.posVal.innerHTML = `${playerRank}<small>/${this.vehicles.length}</small>`;
    }
    if (this.lapVal) {
      this.lapVal.innerHTML = `${this.playerTracker.currentLap}<small>/${this.totalLaps}</small>`;
    }
    if (this.timeVal) {
      this.timeVal.innerText = this.formatTime(this.raceTime);
    }
    if (this.speedVal) {
      const kmh = Math.round(Math.abs(this.player.physics.speed) * 3.0);
      this.speedVal.innerText = kmh.toString().padStart(3, '0');
    }
  }

  renderRadar() {
    if (!this.radarCtx || !this.radarCanvas) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, w, h);

    // Dynamic map bounds from current track waypoints
    const waypoints = this.currentTrackConfig.waypoints;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const wp of waypoints) {
      if (wp.x < minX) minX = wp.x;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.z < minZ) minZ = wp.z;
      if (wp.z > maxZ) maxZ = wp.z;
    }
    const pad = 25;
    minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;

    const scaleX = w / (maxX - minX);
    const scaleZ = h / (maxZ - minZ);

    const toMapX = (x) => (x - minX) * scaleX;
    const toMapY = (z) => (z - minZ) * scaleZ;

    // Draw track line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const mx = toMapX(wp.x);
      const my = toMapY(wp.z);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw cars
    for (let i = 0; i < this.vehicles.length; i++) {
      const car = this.vehicles[i];
      const mx = toMapX(car.physics.x);
      const my = toMapY(car.physics.z);

      ctx.beginPath();
      ctx.arc(mx, my, i === 0 ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#e63946' : '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  showFinishScreen() {
    if (this.centerMsg) {
      this.centerMsg.innerText = 'ZIEL!';
      this.centerMsg.classList.add('show');
    }

    setTimeout(() => {
      if (this.finishModal) {
        const standings = this.circuitTrack.calculateStandings(this.trackers);
        const listEl = document.getElementById('podium-list');
        if (listEl) {
          listEl.innerHTML = standings.map((s, idx) => `
            <div class="podium-row ${s.id === this.playerTracker.id ? 'player-row' : ''}">
              <span class="podium-rank">P${idx + 1}</span>
              <span class="podium-name">${s.id}</span>
              <span class="podium-time">${s.bestLapTime ? this.formatTime(s.bestLapTime) : '--:--.--'}</span>
            </div>
          `).join('');
        }
        this.finishModal.classList.remove('hidden');
      }
    }, 1500);
  }

  restartRace() {
    if (this.finishModal) this.finishModal.classList.add('hidden');
    const spots = this.currentTrackConfig.gridSpots;
    for (let i = 0; i < this.vehicles.length; i++) {
      const car = this.vehicles[i];
      const spot = spots[i];
      car.physics.x = spot.x;
      car.physics.z = spot.z;
      car.physics.angle = spot.angle;
      car.physics.speed = 0;
      car.physics.vx = 0;
      car.physics.vz = 0;
      car.mesh.position.set(spot.x, 0, spot.z);
      car.mesh.rotation.y = -spot.angle;

      this.trackers[i] = this.circuitTrack.createVehicleTracker(car.name);
    }
    this.playerTracker = this.trackers[0];
    this.startRace();
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds * 100) % 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  openSettings() {
    this.isSettingsOpen = true;
    if (this.settingsModal) this.settingsModal.classList.remove('hidden');
  }

  closeSettings() {
    this.isSettingsOpen = false;
    if (this.settingsModal) this.settingsModal.classList.add('hidden');
  }

  toggleSettings() {
    if (this.isSettingsOpen) this.closeSettings();
    else this.openSettings();
  }

  toggleMute() {
    this.audioSynth.muted = !this.audioSynth.muted;
    this.syncSettingsUI();
  }

  syncSettingsUI() {
    const muteBtn = document.getElementById('btn-toggle-mute-modal');
    if (muteBtn) {
      muteBtn.innerText = this.audioSynth.muted ? 'TON: AUS [M]' : 'TON: AN [M]';
    }
  }

  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = 28;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
