import * as THREE from 'three';
import { SynthwaveScene } from './engine/scene.js';
import { EngineRenderer } from './engine/renderer.js';
import { CameraController } from './engine/camera.js';
import { TrackGenerator } from './track/track-generator.js';
import { CarModel } from './vehicles/car-model.js';
import { VehiclePhysics } from './physics/vehicle-physics.js';
import { AIDriver } from './ai/ai-driver.js';
import { WeaponManager, WEAPON_INFO } from './combat/weapons.js';
import { PickupManager } from './combat/pickup-manager.js';
import { AudioSynth } from './audio/audio-synth.js';

export class Game {
  constructor() {
    this.state = 'MENU'; // 'MENU' | 'COUNTDOWN' | 'RACING' | 'FINISHED'
    this.raceTime = 0.0;
    this.totalLaps = 3;
    this.countdownTimer = 3.99;

    // DOM Elements
    this.canvas = document.getElementById('racer-canvas');
    this.posVal = document.getElementById('pos-val');
    this.lapVal = document.getElementById('lap-val');
    this.timeVal = document.getElementById('time-val');
    this.speedVal = document.getElementById('speed-val');
    this.boostMeterBar = document.getElementById('boost-meter-bar');
    this.weaponIcon = document.getElementById('weapon-icon');
    this.centerMsg = document.getElementById('center-message');
    this.overlay = document.getElementById('overlay-screen');
    this.settingsModal = document.getElementById('settings-modal');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.isSettingsOpen = false;
    this.isPaused = false;

    // Subsystems
    this.audioSynth = new AudioSynth();
    this.renderer = new EngineRenderer(this.canvas);
    this.scene = new SynthwaveScene();
    
    // Perspective Camera & Controller
    this.threeCamera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.cameraController = new CameraController(this.threeCamera);
    this.renderer.setupPostprocessing(this.scene.scene, this.threeCamera);

    this.track = new TrackGenerator(this.scene.scene);
    this.weaponManager = new WeaponManager(this.scene.scene, this.audioSynth);
    this.pickupManager = new PickupManager(this.scene.scene, this.track, this.audioSynth);

    // Vehicles Setup
    this.vehicles = [];
    this.setupVehicles();

    // Input state
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      handbrake: false,
      fire: false
    };

    // Pre-render track outline for radar minimap
    if (this.radarCanvas) {
      this.prepareRadar();
    }

    // Resize handler with camera update
    window.addEventListener('resize', () => {
      this.renderer.onResize(this.threeCamera);
    });

    // Clock
    this.clock = new THREE.Clock();
  }

  setupVehicles() {
    // Starting grid offsets behind start line
    const gridConfigs = [
      { name: 'Player (You)', isPlayer: true, primary: 0x00ffff, accent: 0xff00ff, body: 0x22365a, glow: 0x00ffff, lane: 2.5, t: 0.996, maxSpeed: 140, accel: 45 },
      { name: 'Neon Phantom', isPlayer: false, primary: 0xff007f, accent: 0x00ffff, body: 0x4a1842, glow: 0xff007f, lane: -2.5, t: 0.992, skill: 0.9, aggression: 0.8, maxSpeed: 136, accel: 43 },
      { name: 'Viper 2088', isPlayer: false, primary: 0xffea00, accent: 0xff0055, body: 0x443a12, glow: 0xffea00, lane: 2.5, t: 0.988, skill: 0.82, aggression: 0.65, maxSpeed: 132, accel: 40 },
      { name: 'Cyber Blade', isPlayer: false, primary: 0x00ff66, accent: 0x00aaff, body: 0x144428, glow: 0x00ff66, lane: -2.5, t: 0.984, skill: 0.78, aggression: 0.75, maxSpeed: 130, accel: 38 },
    ];

    gridConfigs.forEach((cfg) => {
      const model = new CarModel({
        primary: cfg.primary,
        accent: cfg.accent,
        body: cfg.body,
        glow: cfg.glow
      });
      this.scene.scene.add(model.mesh);

      const physics = new VehiclePhysics(this.track, {
        maxSpeed: cfg.maxSpeed,
        accel: cfg.accel,
        turnSpeed: 2.2
      });

      // Place on starting grid
      const trackInfo = this.track.getTrackTransformAt(cfg.t);
      const tangent = trackInfo.tangent.clone().normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      const startPos = trackInfo.position.clone().addScaledVector(binormal, cfg.lane);
      startPos.y += 0.2;

      physics.resetAt(startPos, tangent);
      physics.applyToMesh(model.mesh);

      let vehicleObj;
      if (cfg.isPlayer) {
        vehicleObj = {
          name: cfg.name,
          isPlayer: true,
          physics,
          model,
          weaponSlot: null,
          colorHex: cfg.primary
        };
        this.player = vehicleObj;

        physics.onRespawn = () => {
          this.audioSynth.playRespawn();
          if (this.centerMsg && this.state === 'RACING') {
            this.centerMsg.innerText = 'RESPAWN';
            this.centerMsg.style.color = '#00ffff';
            setTimeout(() => {
              if (this.centerMsg && this.centerMsg.innerText === 'RESPAWN') {
                this.centerMsg.innerText = '';
              }
            }, 800);
          }
        };
      } else {
        const aiDriver = new AIDriver(cfg.name, physics, model, {
          skill: cfg.skill,
          aggression: cfg.aggression,
          laneOffset: cfg.lane
        });
        vehicleObj = {
          name: cfg.name,
          isPlayer: false,
          physics,
          model,
          aiDriver,
          weaponSlot: null,
          colorHex: cfg.primary
        };
      }

      this.vehicles.push(vehicleObj);
    });
  }

  startRace() {
    if (this.state === 'COUNTDOWN' || this.state === 'RACING') return;
    this.audioSynth.init();
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    this.state = 'COUNTDOWN';
    this.countdownTimer = 3.99;
  }

  openSettings() {
    this.isSettingsOpen = true;
    if (this.settingsModal) {
      this.settingsModal.classList.remove('hidden');
    }
    if (this.state === 'RACING') {
      this.isPaused = true;
    }
    this.syncSettingsUI();
  }

  closeSettings() {
    this.isSettingsOpen = false;
    if (this.settingsModal) {
      this.settingsModal.classList.add('hidden');
    }
    this.isPaused = false;
  }

  toggleSettings() {
    if (this.isSettingsOpen) {
      this.closeSettings();
    } else {
      this.openSettings();
    }
  }

  syncSettingsUI() {
    const sliderMusic = document.getElementById('slider-music-vol');
    const sliderSfx = document.getElementById('slider-sfx-vol');
    const txtMusic = document.getElementById('music-vol-val');
    const txtSfx = document.getElementById('sfx-vol-val');
    const btnMute = document.getElementById('btn-toggle-mute-modal');

    const mVol = Math.round(this.audioSynth.getMusicVolume() * 100);
    const sVol = Math.round(this.audioSynth.getSfxVolume() * 100);

    if (sliderMusic) sliderMusic.value = mVol;
    if (sliderSfx) sliderSfx.value = sVol;
    if (txtMusic) txtMusic.innerText = `${mVol}%`;
    if (txtSfx) txtSfx.innerText = `${sVol}%`;
    if (btnMute) btnMute.innerText = this.audioSynth.isMuted ? 'TON: STUMM [M]' : 'TON: AN [M]';
  }

  handleKeyDown(e) {
    const key = e.key.toLowerCase();

    if (key === 'escape' || key === 'p') {
      this.toggleSettings();
      return;
    }

    if (key === 'w' || key === 'arrowup') this.keys.up = true;
    if (key === 's' || key === 'arrowdown') this.keys.down = true;
    if (key === 'a' || key === 'arrowleft') this.keys.left = true;
    if (key === 'd' || key === 'arrowright') this.keys.right = true;
    if (key === ' ' || key === 'shift') this.keys.handbrake = true;

    if (key === 'f' || key === 'enter') {
      if (this.state === 'RACING' && this.player.weaponSlot) {
        this.weaponManager.fireWeapon(this.player, this.player.weaponSlot, this.vehicles);
        this.player.weaponSlot = null;
        this.updateWeaponHUD();
      }
    }

    if (key === 'c') {
      this.cameraController.toggleMode();
    }

    if (key === 'm') {
      this.audioSynth.toggleMute();
      this.syncSettingsUI();
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

  update(delta) {
    if (this.isPaused) return;

    const time = this.clock.getElapsedTime();

    // 1. Countdown Logic
    if (this.state === 'COUNTDOWN') {
      this.countdownTimer -= delta;
      if (this.countdownTimer > 3.0) {
        if (this.centerMsg) this.centerMsg.innerText = '3';
      } else if (this.countdownTimer > 2.0) {
        if (this.centerMsg) this.centerMsg.innerText = '2';
      } else if (this.countdownTimer > 1.0) {
        if (this.centerMsg) this.centerMsg.innerText = '1';
      } else if (this.countdownTimer > 0.0) {
        if (this.centerMsg) {
          this.centerMsg.innerText = 'GO!';
          this.centerMsg.style.color = '#00ff66';
        }
      } else {
        if (this.centerMsg) this.centerMsg.innerText = '';
        this.state = 'RACING';
      }
    }

    // 2. Race Time
    if (this.state === 'RACING') {
      this.raceTime += delta;
      this.player.physics.currentLapTime += delta;
      this.updateTimeHUD(this.player.physics.currentLapTime);
    }

    // 3. Player Controls
    if (this.state === 'RACING') {
      let throttle = 0;
      if (this.keys.up) throttle += 1.0;
      if (this.keys.down) throttle -= 1.0;

      let steer = 0;
      if (this.keys.left) steer -= 1.0;
      if (this.keys.right) steer += 1.0;

      this.player.physics.setInputs(throttle, steer, this.keys.handbrake);
    } else {
      this.player.physics.setInputs(0, 0, true);
    }

    // 4. Update Vehicles (Player & AI)
    this.vehicles.forEach((v) => {
      if (!v.isPlayer && this.state === 'RACING') {
        v.aiDriver.update(delta, this.track, this.vehicles, this.weaponManager);
      }

      const prevLap = v.physics.currentLap;
      v.physics.update(delta);

      // Check lap advance for player
      if (v.isPlayer && v.physics.currentLap > prevLap) {
        if (v.physics.currentLap > this.totalLaps) {
          this.state = 'FINISHED';
          if (this.centerMsg) {
            this.centerMsg.innerText = 'FINISH!';
            this.centerMsg.style.color = '#00ffff';
          }
        } else if (v.physics.currentLap === this.totalLaps) {
          if (this.centerMsg) {
            this.centerMsg.innerText = 'FINAL LAP!';
            this.centerMsg.style.color = '#ff007f';
            setTimeout(() => {
              if (this.centerMsg && this.centerMsg.innerText === 'FINAL LAP!') {
                this.centerMsg.innerText = '';
              }
            }, 2500);
          }
        }
        this.audioSynth.playLapChime();
      }

      // Check item pickups
      const pickupWeapon = this.pickupManager.checkCollisions(v, this.calculateLeaderboardPosition(v));
      if (pickupWeapon) {
        v.weaponSlot = pickupWeapon;
        if (v.isPlayer) this.updateWeaponHUD();
      }

      // Update 3D Model transforms and visual effects
      v.physics.applyToMesh(v.model.mesh);
      v.model.update(
        delta,
        v.physics.speed,
        v.physics.steerAngle,
        v.physics.isBraking,
        v.physics.isBoosting,
        v.physics.hasShield,
        v.physics.spinTimer > 0
      );

      // Blinking animation on respawn recovery
      if (v.physics.respawnBlinkTimer > 0) {
        v.model.mesh.visible = Math.floor(v.physics.respawnBlinkTimer * 12) % 2 === 0;
      } else {
        v.model.mesh.visible = true;
      }
    });

    // 5. Combat & Weapons Update
    this.weaponManager.update(delta, this.vehicles);
    this.pickupManager.update(delta);
    this.track.update(delta, time);
    this.scene.update(delta, time);

    // 6. Camera Follow Player
    this.cameraController.update(
      this.player.model.mesh,
      this.player.physics,
      delta
    );

    // 7. Audio Engine Modulation
    this.audioSynth.updateEngine(this.player.physics.speed, this.player.physics.isBoosting);

    // 8. HUD & Radar
    this.updateHUD();
    this.drawRadar();
  }

  calculateLeaderboardPosition(vehicle) {
    const sorted = [...this.vehicles].sort((a, b) => {
      const progA = a.physics.currentLap + a.physics.trackT;
      const progB = b.physics.currentLap + b.physics.trackT;
      return progB - progA;
    });

    return sorted.findIndex((v) => v === vehicle) + 1;
  }

  updateHUD() {
    if (!this.speedVal) return;

    // Speedometer
    const speed = Math.round(Math.abs(this.player.physics.speed));
    this.speedVal.innerText = speed.toString().padStart(3, '0');

    // Nitro meter bar
    if (this.boostMeterBar) {
      const nitroPercent = this.player.physics.boostTimer > 0
        ? Math.min(100, (this.player.physics.boostTimer / 1.8) * 100)
        : (this.player.physics.speed / this.player.physics.maxSpeed) * 100;
      this.boostMeterBar.style.width = `${nitroPercent}%`;
    }

    // Position
    if (this.posVal) {
      const pos = this.calculateLeaderboardPosition(this.player);
      this.posVal.innerHTML = `${pos}<small>/4</small>`;
    }

    // Lap
    if (this.lapVal) {
      const lap = Math.min(this.player.physics.currentLap, this.totalLaps);
      this.lapVal.innerHTML = `${lap}<small>/${this.totalLaps}</small>`;
    }
  }

  updateTimeHUD(seconds) {
    if (!this.timeVal) return;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hundredths = Math.floor((seconds % 1) * 100);
    this.timeVal.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  }

  updateWeaponHUD() {
    if (!this.weaponIcon) return;
    const slot = this.player.weaponSlot;
    if (!slot) {
      this.weaponIcon.innerHTML = 'KEINE';
      this.weaponIcon.className = 'weapon-empty';
      this.weaponIcon.style.color = '#555';
    } else {
      const info = WEAPON_INFO[slot];
      this.weaponIcon.innerHTML = `<span style="font-size:1.4rem;">${info.icon}</span> ${info.name}`;
      this.weaponIcon.className = 'weapon-active';
      this.weaponIcon.style.color = info.color;
    }
  }

  prepareRadar() {
    this.radarPoints = [];
    for (let i = 0; i < 100; i++) {
      const t = i / 100;
      const pt = this.track.curve.getPointAt(t);
      this.radarPoints.push({ x: pt.x, z: pt.z });
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    this.radarPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });

    const padding = 15;
    const w = this.radarCanvas.width - padding * 2;
    const h = this.radarCanvas.height - padding * 2;
    const rangeX = (maxX - minX) || 1;
    const rangeZ = (maxZ - minZ) || 1;

    this.radarTransform = (worldX, worldZ) => {
      const normX = (worldX - minX) / rangeX;
      const normZ = (worldZ - minZ) / rangeZ;
      return {
        x: padding + normX * w,
        y: padding + normZ * h
      };
    };
  }

  drawRadar() {
    if (!this.radarCtx || !this.radarCanvas || !this.radarTransform) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Track path wireframe
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();

    this.radarPoints.forEach((p, idx) => {
      const screen = this.radarTransform(p.x, p.z);
      if (idx === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Vehicle dots
    this.vehicles.forEach((v) => {
      const screen = this.radarTransform(v.physics.position.x, v.physics.position.z);
      ctx.beginPath();
      if (v.isPlayer) {
        ctx.fillStyle = '#ffffff';
        ctx.arc(screen.x, screen.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ff007f';
        ctx.arc(screen.x, screen.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  render() {
    this.renderer.render(this.scene.scene, this.threeCamera);
  }
}
