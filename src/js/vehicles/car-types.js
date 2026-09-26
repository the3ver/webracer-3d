/**
 * Vehicle Classes & Type Configurations for Apex Circuit 3D.
 * Defines distinct handling physics, acceleration, top speeds, drift behavior,
 * and 3D visual styles for each car type.
 */

export const CAR_TYPES = {
  'red-fire': {
    id: 'red-fire',
    name: 'Red Fire',
    category: 'Sport / Ausgewogen',
    description: 'Klassischer Sportcoupé-Allrounder mit harmonischer Balance aus Tempo, Kurvenpräzision und Driftkontrolle.',
    color: 0xe63946,
    accentColor: 0xffffff,
    maxSpeed: 50,
    acceleration: 22,
    brakeDecel: 65,
    steerSpeed: 2.8,
    normalGrip: 8.0,
    driftGrip: 2.2,
    mass: 1.0,
    offroadResist: 0.50, // 50% top speed on grass
    stats: { speed: 75, accel: 70, handling: 72, drift: 70 }
  },
  'thunder-muscle': {
    id: 'thunder-muscle',
    name: 'Thunder Muscle',
    category: 'V8 Muscle Car',
    description: 'Rohe Kraft auf der Geraden! Gewaltiger Antritt und höchste Höchstgeschwindigkeit, aber schwerer und drifter in engen Kehren.',
    color: 0xf77f00,
    accentColor: 0x111111,
    maxSpeed: 54,
    acceleration: 25,
    brakeDecel: 60,
    steerSpeed: 2.3,
    normalGrip: 7.2,
    driftGrip: 1.8,
    mass: 1.35,
    offroadResist: 0.45,
    stats: { speed: 92, accel: 88, handling: 58, drift: 80 }
  },
  'apex-formula': {
    id: 'apex-formula',
    name: 'Apex Speedster',
    category: 'Hypercar / Aero',
    description: 'Messerscharfe Lenkung und brutaler Anpressdruck. Klebt förmlich auf dem Asphalt, reagiert jedoch empfindlich abseits der Piste.',
    color: 0x4361ee,
    accentColor: 0x4cc9f0,
    maxSpeed: 52,
    acceleration: 24,
    brakeDecel: 72,
    steerSpeed: 3.4,
    normalGrip: 9.6,
    driftGrip: 2.8,
    mass: 0.85,
    offroadResist: 0.35,
    stats: { speed: 85, accel: 82, handling: 95, drift: 55 }
  },
  'mud-raider': {
    id: 'mud-raider',
    name: 'Mud Raider 4x4',
    category: 'Offroad / Rallye-Buggy',
    description: 'König des Geländes! Verliert auf Gras und Wüstendünen kaum an Traktion und federt Bodenwellen souverän ab.',
    color: 0x2a9d8f,
    accentColor: 0xe76f51,
    maxSpeed: 47,
    acceleration: 21,
    brakeDecel: 62,
    steerSpeed: 2.7,
    normalGrip: 7.8,
    driftGrip: 2.0,
    mass: 1.25,
    offroadResist: 0.85, // retains 85% of speed off-track!
    stats: { speed: 65, accel: 68, handling: 68, drift: 65 }
  },
  'drift-king': {
    id: 'drift-king',
    name: 'Drift King Silvia',
    category: 'Street Tuner / Drift',
    description: 'Spezialist für Querfahrten. Geht spielend leicht in den Powerslide über und hält weite Drifts stabil aufrecht.',
    color: 0x9b5de5,
    accentColor: 0xf15bb5,
    maxSpeed: 49,
    acceleration: 23,
    brakeDecel: 64,
    steerSpeed: 3.1,
    normalGrip: 7.0,
    driftGrip: 1.5,
    mass: 0.95,
    offroadResist: 0.48,
    stats: { speed: 72, accel: 75, handling: 80, drift: 95 }
  }
};

export function getCarTypeConfig(typeId = 'red-fire') {
  return CAR_TYPES[typeId] || CAR_TYPES['red-fire'];
}
