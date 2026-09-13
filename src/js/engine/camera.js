import * as THREE from 'three';

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'chase'; // 'chase' | 'close' | 'hood' | 'birds_eye'

    // Offsets per mode
    this.offsets = {
      chase: { distance: 7.5, height: 2.8, lookHeight: 1.1 },
      close: { distance: 5.0, height: 1.8, lookHeight: 0.9 },
      hood: { distance: 0.2, height: 1.1, lookHeight: 1.0 },
      birds_eye: { distance: 18.0, height: 16.0, lookHeight: 0.0 }
    };

    this.currentPos = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();

    this.baseFov = 65;
    this.maxFov = 85;
    this.currentFov = 65;
  }

  toggleMode() {
    const modes = ['chase', 'close', 'hood', 'birds_eye'];
    const nextIdx = (modes.indexOf(this.mode) + 1) % modes.length;
    this.mode = modes[nextIdx];
    return this.mode;
  }

  update(vehicleMesh, vehiclePhysics, delta) {
    if (!vehicleMesh || !vehiclePhysics) return;

    const offsetCfg = this.offsets[this.mode];

    // Forward and upward vectors based on car rotation
    const carPos = vehicleMesh.position;
    const carRotationY = vehicleMesh.rotation.y;

    // Direction vector behind the vehicle
    const backward = new THREE.Vector3(
      Math.sin(carRotationY),
      0,
      Math.cos(carRotationY)
    ).normalize();

    // Calculate ideal camera position
    const desiredCamPos = new THREE.Vector3()
      .copy(carPos)
      .addScaledVector(backward, offsetCfg.distance);
    desiredCamPos.y = carPos.y + offsetCfg.height;

    // Look at point ahead of vehicle
    const desiredLookAt = new THREE.Vector3(
      carPos.x - Math.sin(carRotationY) * 6,
      carPos.y + offsetCfg.lookHeight,
      carPos.z - Math.cos(carRotationY) * 6
    );

    // Smooth camera damping
    const smoothFactor = Math.min(1.0, delta * 8.0);
    this.currentPos.lerp(desiredCamPos, smoothFactor);
    this.currentLookAt.lerp(desiredLookAt, smoothFactor * 1.2);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);

    // Dynamic FOV based on speed and boost
    const speedRatio = Math.min(1.0, Math.abs(vehiclePhysics.speed) / vehiclePhysics.maxSpeed);
    const boostBoost = vehiclePhysics.isBoosting ? 12 : 0;
    const targetFov = this.baseFov + (this.maxFov - this.baseFov) * speedRatio + boostBoost;
    this.currentFov += (targetFov - this.currentFov) * Math.min(1.0, delta * 5.0);

    if (Math.abs(this.camera.fov - this.currentFov) > 0.1) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
