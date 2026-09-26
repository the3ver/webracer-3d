/**
 * Track presets and waypoint data for Apex Circuit Grand Prix.
 */
export const PINE_VALLEY_WAYPOINTS = [
  // Start/Finish straight (heading +X)
  { x: -40, z: -40 },
  { x: 0, z: -40 },
  { x: 40, z: -40 },
  { x: 80, z: -40 },
  { x: 120, z: -40 },

  // Turn 1 & 2: Fast sweeping Castrol Esses
  { x: 155, z: -30 },
  { x: 180, z: -5 },
  { x: 185, z: 30 },

  // Sector 2: The Hairpin & Pine Forest descent
  { x: 165, z: 65 },
  { x: 130, z: 85 },
  { x: 95, z: 80 },
  { x: 75, z: 50 },

  // Sector 3: Technical Infield GP S-Curves
  { x: 45, z: 15 },
  { x: 15, z: -5 },
  { x: -15, z: 10 },
  { x: -35, z: 30 },
  { x: -55, z: 55 },

  // Back straight with Jump Ramp (ramp at x: -38, z: 73.5)
  { x: -75, z: 72 },
  { x: -100, z: 70 },

  // Western sweep around the lake returning to start/finish
  { x: -115, z: 45 },
  { x: -118, z: 15 },
  { x: -108, z: -18 },
  { x: -85, z: -38 },
  { x: -65, z: -40 }
];

export const ALPINE_SUMMIT_WAYPOINTS = [
  // High-altitude Main Straight (heading +X)
  { x: -40, z: 0 },
  { x: 0, z: 0 },
  { x: 45, z: 0 },

  // Eastern Ascent & Serpentine Switchbacks
  { x: 80, z: 15 },
  { x: 110, z: 40 },
  { x: 125, z: 75 },

  // Hairpin 1 "Devil's Elbow"
  { x: 110, z: 105 },
  { x: 75, z: 105 },
  { x: 50, z: 80 },
  { x: 70, z: 55 },
  { x: 105, z: 70 },

  // High Summit Plateau with Ice Hazards (ice at 100,125 and 60,135)
  { x: 110, z: 115 },
  { x: 85, z: 135 },
  { x: 55, z: 135 },

  // The Gotthard Alpine Tunnel Sector (through the mountain ridge)
  { x: 30, z: 130 },  // Tunnel Entrance Portal
  { x: -20, z: 110 }, // Mountain Interior Gallery
  { x: -70, z: 90 },  // Tunnel Exit Portal

  // Western descent and cliffside switchbacks
  { x: -105, z: 75 },
  { x: -130, z: 55 },
  { x: -140, z: 25 },
  { x: -125, z: 0 },
  { x: -95, z: -10 },
  { x: -65, z: -5 }
];

export const CANYON_CHASM_WAYPOINTS = [
  // Canyon Floor Straight (heading +X)
  { x: -60, z: -40 },
  { x: -20, z: -40 },
  { x: 20, z: -40 },
  { x: 60, z: -40 },
  { x: 100, z: -40 },

  // Sandstone Ridge Sweeper
  { x: 135, z: -25 },
  { x: 165, z: 10 },
  { x: 165, z: 50 },
  { x: 140, z: 80 },

  // Approach to the Deep Chasm Ravine (Jump over the Gorge)
  { x: 110, z: 92 },
  { x: 75, z: 92 },
  { x: 42, z: 92 }, // Takeoff ramp heading west across ravine
  { x: 0, z: 92 },  // Landing across the chasm gap

  // Western Mesa Switchback & Butte Loop
  { x: -35, z: 92 },
  { x: -75, z: 95 },
  { x: -115, z: 85 },
  { x: -145, z: 60 },
  { x: -160, z: 20 },
  { x: -145, z: -15 },
  { x: -115, z: -35 },
  { x: -85, z: -40 }
];

export const NEON_VELODROME_WAYPOINTS = [
  // High-Speed Supersonic Straight (heading +X)
  { x: -40, z: -50 },
  { x: 0, z: -50 },
  { x: 45, z: -50 },
  { x: 85, z: -45 },

  // East Super-Banked Oval Curve
  { x: 120, z: -25 },
  { x: 145, z: 5 },
  { x: 140, z: 45 },
  { x: 115, z: 75 },
  { x: 80, z: 85 },

  // Neon Infield Diving Chicane & Slalom
  { x: 45, z: 65 },
  { x: 15, z: 40 },
  { x: -10, z: 10 },
  { x: -35, z: -5 },
  { x: -65, z: 15 },
  { x: -55, z: 55 },

  // West Super-Banked Oval Curve
  { x: -85, z: 80 },
  { x: -120, z: 60 },
  { x: -135, z: 25 },
  { x: -125, z: -15 },
  { x: -95, z: -40 },
  { x: -70, z: -50 }
];

export const DESERT_DUNES_WAYPOINTS = [
  // Sahara Main Straight (heading +X)
  { x: -50, z: -20 },
  { x: -10, z: -20 },
  { x: 35, z: -20 },
  { x: 80, z: -20 },
  { x: 115, z: -10 },

  // Dune Ridge Slalom & Sandy Sweepers
  { x: 145, z: 15 },
  { x: 160, z: 50 },
  { x: 140, z: 85 },
  { x: 100, z: 95 },
  { x: 70, z: 70 },
  { x: 45, z: 50 },
  { x: 20, z: 55 },

  // Oasis Lake Hairpin (quicksand traps at 20,90 and -45,95)
  { x: 5, z: 75 },
  { x: 5, z: 100 },
  { x: -15, z: 120 },
  { x: -45, z: 120 },
  { x: -75, z: 95 },

  // Wadi Switchbacks & Ancient Ruins Straight
  { x: -70, z: 55 },
  { x: -90, z: 25 },
  { x: -120, z: 35 },
  { x: -145, z: 15 },
  { x: -130, z: -15 },
  { x: -90, z: -20 }
];

export const TRACK_PRESETS = {
  'pine-valley': {
    id: 'pine-valley',
    name: 'Pine Valley Circuit',
    theme: 'pine-valley',
    trackWidth: 16,
    totalLaps: 3,
    playerStart: { x: -40, z: -40, angle: 0 },
    gridSpots: [
      { x: -40, z: -44, angle: 0, color: 0xe63946, name: 'Player (Red Fire)' },
      { x: -40, z: -36, angle: 0, color: 0x4361ee, name: 'Rival Blue (Apex)' },
      { x: -55, z: -44, angle: 0, color: 0xfb8500, name: 'Rival Orange (Viper)' },
      { x: -55, z: -36, angle: 0, color: 0x2ec4b6, name: 'Rival Teal (Specter)' },
      { x: -70, z: -44, angle: 0, color: 0xffd166, name: 'Rival Gold (Comet)' },
      { x: -70, z: -36, angle: 0, color: 0x06d6a0, name: 'Rival Mint (Phantom)' }
    ],
    waypoints: PINE_VALLEY_WAYPOINTS,
    ramps: [
      {
        id: 'back_straight_ramp',
        x: -38,
        z: 73.5, // right lane (leaving z=63..70 as flat bypass lane)
        width: 6.5,
        length: 8.0,
        height: 2.2,
        liftVelocity: 14.5,
        angle: Math.PI // facing -X
      }
    ],
    tunnels: []
  },
  'alpine-summit': {
    id: 'alpine-summit',
    name: 'Alpine Summit Pass',
    theme: 'alpine-summit',
    trackWidth: 16,
    totalLaps: 3,
    playerStart: { x: -40, z: 0, angle: 0 },
    gridSpots: [
      { x: -40, z: -4, angle: 0, color: 0xe63946, name: 'Player (Red Fire)' },
      { x: -40, z: 4, angle: 0, color: 0x4361ee, name: 'Rival Blue (Apex)' },
      { x: -55, z: -4, angle: 0, color: 0xfb8500, name: 'Rival Orange (Viper)' },
      { x: -55, z: 4, angle: 0, color: 0x2ec4b6, name: 'Rival Teal (Specter)' },
      { x: -70, z: -4, angle: 0, color: 0xffd166, name: 'Rival Gold (Comet)' },
      { x: -70, z: 4, angle: 0, color: 0x06d6a0, name: 'Rival Mint (Phantom)' }
    ],
    waypoints: ALPINE_SUMMIT_WAYPOINTS,
    ramps: [],
    iceHazards: [
      { id: 'alpine_north_ice_1', x: 100, z: 125, radius: 14, friction: 0.22, grip: 0.3 },
      { id: 'alpine_north_ice_2', x: 60, z: 135, radius: 12, friction: 0.25, grip: 0.35 }
    ],
    tunnels: [
      {
        id: 'gotthard_gallery',
        name: 'Gotthard Rock Gallery',
        entrance: { x: 30, z: 130 },
        midpoint: { x: -20, z: 110 },
        exit: { x: -70, z: 90 },
        width: 19,
        height: 6.5
      }
    ]
  },
  'canyon-chasm': {
    id: 'canyon-chasm',
    name: 'Red Rock Canyon',
    theme: 'canyon-chasm',
    trackWidth: 16,
    totalLaps: 3,
    playerStart: { x: -40, z: -40, angle: 0 },
    gridSpots: [
      { x: -40, z: -44, angle: 0, color: 0xe63946, name: 'Player (Red Fire)' },
      { x: -40, z: -36, angle: 0, color: 0x4361ee, name: 'Rival Blue (Apex)' },
      { x: -55, z: -44, angle: 0, color: 0xfb8500, name: 'Rival Orange (Viper)' },
      { x: -55, z: -36, angle: 0, color: 0x2ec4b6, name: 'Rival Teal (Specter)' },
      { x: -70, z: -44, angle: 0, color: 0xffd166, name: 'Rival Gold (Comet)' },
      { x: -70, z: -36, angle: 0, color: 0x06d6a0, name: 'Rival Mint (Phantom)' }
    ],
    waypoints: CANYON_CHASM_WAYPOINTS,
    ramps: [
      {
        id: 'canyon_chasm_jump',
        name: 'Ravine Gap Jump',
        x: 42,
        z: 92,
        width: 16.0,
        length: 10.0,
        height: 3.2,
        liftVelocity: 17.5,
        angle: Math.PI // heading west across ravine
      }
    ],
    chasmRavine: {
      minX: 3,
      maxX: 40,
      minZ: 75,
      maxZ: 110,
      depth: 22,
      respawnX: 75,
      respawnZ: 92,
      respawnAngle: Math.PI
    },
    tunnels: []
  },
  'neon-velodrome': {
    id: 'neon-velodrome',
    name: 'Neon Velodrome Speedway',
    theme: 'neon-velodrome',
    trackWidth: 16,
    totalLaps: 3,
    playerStart: { x: -40, z: -50, angle: 0 },
    gridSpots: [
      { x: -40, z: -54, angle: 0, color: 0xe63946, name: 'Player (Red Fire)' },
      { x: -40, z: -46, angle: 0, color: 0x4361ee, name: 'Rival Blue (Apex)' },
      { x: -55, z: -54, angle: 0, color: 0xfb8500, name: 'Rival Orange (Viper)' },
      { x: -55, z: -46, angle: 0, color: 0x2ec4b6, name: 'Rival Teal (Specter)' },
      { x: -70, z: -54, angle: 0, color: 0xffd166, name: 'Rival Gold (Comet)' },
      { x: -70, z: -46, angle: 0, color: 0x06d6a0, name: 'Rival Mint (Phantom)' }
    ],
    waypoints: NEON_VELODROME_WAYPOINTS,
    ramps: [],
    bankedCurves: [
      {
        id: 'east_banked_sweeper',
        name: 'East Super-Banked Oval Curve',
        center: { x: 120, z: 20 },
        radius: 45,
        bankAngle: 0.52,
        elevation: 4.5
      },
      {
        id: 'west_banked_sweeper',
        name: 'West Super-Banked Oval Curve',
        center: { x: -110, z: 15 },
        radius: 45,
        bankAngle: 0.52,
        elevation: 4.5
      }
    ],
    tunnels: []
  },
  'desert-dunes': {
    id: 'desert-dunes',
    name: 'Sahara Mirage Raceway',
    theme: 'desert-dunes',
    trackWidth: 16,
    totalLaps: 3,
    playerStart: { x: -40, z: -20, angle: 0 },
    gridSpots: [
      { x: -40, z: -24, angle: 0, color: 0xe63946, name: 'Player (Red Fire)' },
      { x: -40, z: -16, angle: 0, color: 0x4361ee, name: 'Rival Blue (Apex)' },
      { x: -55, z: -24, angle: 0, color: 0xfb8500, name: 'Rival Orange (Viper)' },
      { x: -55, z: -16, angle: 0, color: 0x2ec4b6, name: 'Rival Teal (Specter)' },
      { x: -70, z: -24, angle: 0, color: 0xffd166, name: 'Rival Gold (Comet)' },
      { x: -70, z: -16, angle: 0, color: 0x06d6a0, name: 'Rival Mint (Phantom)' }
    ],
    waypoints: DESERT_DUNES_WAYPOINTS,
    ramps: [],
    quicksandHazards: [
      { id: 'oasis_quicksand_trap', x: 20, z: 90, radius: 12, dragFactor: 0.35 },
      { id: 'dune_drift_trap', x: -45, z: 95, radius: 11, dragFactor: 0.40 }
    ],
    tunnels: []
  }
};

export function getTrackPreset(id) {
  return TRACK_PRESETS[id] || TRACK_PRESETS['pine-valley'];
}

export function getGridSpots(trackId, botCount = 3) {
  const preset = getTrackPreset(trackId);
  const total = Math.max(1, Math.min(preset.gridSpots.length, botCount + 1));
  return preset.gridSpots.slice(0, total);
}

// Backward-compatible default exports for existing imports
export const TRACK_WAYPOINTS = PINE_VALLEY_WAYPOINTS;
export const TRACK_CONFIG = TRACK_PRESETS['pine-valley'];
