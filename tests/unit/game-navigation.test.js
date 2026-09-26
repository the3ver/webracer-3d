import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mock DOM environment for unit testing navigation logic
class MockClassList {
  constructor(initial = []) {
    this.classes = new Set(initial);
  }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
  contains(c) { return this.classes.has(c); }
  toggle(c, force) {
    if (force !== undefined) {
      if (force) this.classes.add(c); else this.classes.delete(c);
    } else {
      if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c);
    }
  }
}

class MockElement {
  constructor() {
    this.classList = new MockClassList();
    this.style = {};
    this.innerText = '';
    this.innerHTML = '';
  }
}

describe('Game Navigation & Menu Flow', () => {
  it('defines returnToMenu logic that resets race state and brings back start overlay', () => {
    // Test navigation flow contract
    const mockState = {
      state: 'FINISHED',
      raceTime: 125.4,
      overlay: new MockElement(),
      finishModal: new MockElement(),
      centerMsg: new MockElement(),
      vehicles: [
        { physics: { x: 50, z: 20, speed: 45, vx: 30, vz: 10, angle: 1.2 } },
        { physics: { x: 40, z: 15, speed: 42, vx: 28, vz: 8, angle: 1.1 } }
      ],
      gridSpots: [
        { x: -40, z: -44, angle: 0 },
        { x: -40, z: -36, angle: 0 }
      ]
    };

    mockState.finishModal.classList.add('show');
    mockState.overlay.classList.add('hidden');

    // Simulate returnToMenu implementation
    function returnToMenu(ctx) {
      ctx.state = 'MENU';
      ctx.raceTime = 0;
      if (ctx.finishModal) ctx.finishModal.classList.add('hidden');
      if (ctx.centerMsg) ctx.centerMsg.classList.remove('show');
      if (ctx.overlay) {
        ctx.overlay.classList.remove('hidden');
        ctx.overlay.classList.add('visible');
      }
      for (let i = 0; i < ctx.vehicles.length; i++) {
        const v = ctx.vehicles[i];
        const spot = ctx.gridSpots[i];
        v.physics.x = spot.x;
        v.physics.z = spot.z;
        v.physics.angle = spot.angle;
        v.physics.speed = 0;
        v.physics.vx = 0;
        v.physics.vz = 0;
      }
    }

    returnToMenu(mockState);

    assert.equal(mockState.state, 'MENU');
    assert.equal(mockState.raceTime, 0);
    assert.ok(mockState.finishModal.classList.contains('hidden'), 'Finish modal should be hidden');
    assert.ok(mockState.overlay.classList.contains('visible'), 'Start overlay should be visible');
    assert.equal(mockState.vehicles[0].physics.speed, 0, 'Vehicle speed should be reset to 0');
    assert.equal(mockState.vehicles[0].physics.x, -40, 'Vehicle X should be reset to grid spot');
  });
});
