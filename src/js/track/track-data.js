/**
 * Track waypoint data for the Apex Circuit Grand Prix.
 * Closed circuit layout featuring a long main straight, sweeping high-speed bends,
 * chicane, and tight hairpin.
 */
export const TRACK_WAYPOINTS = [
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

export const TRACK_CONFIG = {
  name: 'Apex Circuit',
  trackWidth: 16,
  totalLaps: 3,
  playerStart: { x: -40, z: -40, angle: 0 },
  gridSpots: [
    { x: -40, z: -44, angle: 0, color: 0xe63946, name: 'Player (Red Fire)' },
    { x: -40, z: -36, angle: 0, color: 0x4361ee, name: 'Rival Blue (Apex)' },
    { x: -55, z: -44, angle: 0, color: 0xfb8500, name: 'Rival Orange (Viper)' },
    { x: -55, z: -36, angle: 0, color: 0x2ec4b6, name: 'Rival Teal (Specter)' }
  ]
};
