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

  // Turn 1 & 2: Sweeping right turn into the east sector
  { x: 160, z: -20 },
  { x: 180, z: 20 },
  { x: 170, z: 60 },
  { x: 140, z: 90 },

  // Sector 2: The Hairpin
  { x: 110, z: 100 },
  { x: 80, z: 80 },
  { x: 70, z: 40 },

  // Sector 3: Technical Chicane & Infield S-Curves
  { x: 40, z: 30 },
  { x: 10, z: 50 },
  { x: -20, z: 70 },
  { x: -60, z: 70 },

  // Turn 4 & 5: West sweep leading back to start/finish
  { x: -100, z: 50 },
  { x: -120, z: 20 },
  { x: -110, z: -20 },
  { x: -80, z: -40 }
];

export const ALPINE_SUMMIT_WAYPOINTS = [
  // High-altitude Main Straight (heading +X)
  { x: -40, z: 0 },
  { x: 0, z: 0 },
  { x: 50, z: 0 },

  // Climbing curves into eastern mountain ridges
  { x: 95, z: 20 },
  { x: 125, z: 60 },
  { x: 120, z: 110 },
  { x: 80, z: 140 },

  // The Gotthard Alpine Tunnel Sector (through the mountain ridge)
  { x: 30, z: 130 },  // Tunnel Entrance Portal
  { x: -20, z: 110 }, // Mountain Interior Gallery
  { x: -70, z: 90 },  // Tunnel Exit Portal

  // Western descent and hairpin sweep
  { x: -115, z: 65 },
  { x: -130, z: 25 },
  { x: -105, z: -10 },
  { x: -75, z: 0 }
];

export const CANYON_CHASM_WAYPOINTS = [
  // Canyon Floor Straight (heading +X)
  { x: -40, z: -40 },
  { x: 0, z: -40 },
  { x: 45, z: -40 },

  // Sandstone Ridge Sweeper
  { x: 90, z: -25 },
  { x: 120, z: 15 },
  { x: 110, z: 65 },

  // Approach to the Deep Chasm Ravine (Jump over the Gorge)
  { x: 80, z: 90 },
  { x: 40, z: 95 },
  { x: 0, z: 95 },

  // Western Mesa Switchback
  { x: -45, z: 80 },
  { x: -85, z: 50 },
  { x: -105, z: 10 },
  { x: -85, z: -25 }
];

export const NEON_VELODROME_WAYPOINTS = [
  // High-Speed Straight (heading +X)
  { x: -40, z: -50 },
  { x: 0, z: -50 },
  { x: 45, z: -50 },

  // East Super-Banked Oval Curve
  { x: 95, z: -35 },
  { x: 130, z: 0 },
  { x: 125, z: 45 },
  { x: 85, z: 75 },

  // Infield Chicane
  { x: 40, z: 60 },
  { x: 0, z: 40 },
  { x: -40, z: 65 },

  // West Super-Banked Oval Curve
  { x: -85, z: 75 },
  { x: -125, z: 35 },
  { x: -120, z: -15 },
  { x: -85, z: -45 }
];

export const DESERT_DUNES_WAYPOINTS = [
  // Sahara Main Straight (heading +X)
  { x: -40, z: -20 },
  { x: 10, z: -20 },
  { x: 60, z: -15 },

  // Dune Ridge Slalom
  { x: 105, z: 10 },
  { x: 130, z: 50 },
  { x: 100, z: 85 },
  { x: 55, z: 75 },

  // Oasis Lake Hairpin (surrounded by quicksand hazard zones)
  { x: 20, z: 90 },
  { x: -25, z: 105 },
  { x: -65, z: 85 },

  // Dune Valley Straight
  { x: -90, z: 45 },
  { x: -105, z: 5 },
  { x: -80, z: -20 }
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
        x: 40,
        z: 95,
        width: 14.0,
        length: 9.0,
        height: 2.6,
        liftVelocity: 16.0,
        angle: Math.PI // heading west across ravine
      }
    ],
    chasmRavine: {
      x: 20,
      z: 95,
      width: 40,
      depth: 30
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
        bankAngle: 0.18
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
