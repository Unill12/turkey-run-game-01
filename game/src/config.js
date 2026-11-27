// Turkey Run — shared tuning and level definitions.
// One job: every number the game balances on lives here, so tuning never
// hides inside the movement, AI or drawing code.

export const FIELD = { width: 960, height: 640 };
export const HUD_HEIGHT = 56;

export const TURKEY = {
  radius: 17,
  speed: 238,
  dashSpeed: 540,
  dashTime: 0.16,
  dashCooldown: 1.05,
  lives: 3,
  invulnerableTime: 1.6,
};

export const FARMER = {
  radius: 20,
  baseSpeed: 148,
  speedPerLevel: 15,
  chaseMultiplier: 1.28,
  sightRange: 350,
  throwCooldown: 2.9,
  throwWindup: 0.55,
  knifeSpeed: 400,
  searchTime: 3.2,
};

export const KNIFE = { radius: 7, speed: 400, life: 2.4 };
export const CORN_POINTS = 10;
export const GOLDEN_CORN_POINTS = 50;
export const LEVEL_BONUS = 100;
export const ESCAPE_BONUS = 250;

// Autumn farm palette: warm golds and browns on green, so the turkey,
// the farmer and the corn all read at a glance when the frame is shrunk.
export const COLORS = {
  grassA: '#7da95c',
  grassB: '#6f9a50',
  dirt: '#b98a56',
  barnFloorA: '#a97e4f',
  barnFloorB: '#9c7346',
  tileA: '#d8cfc0',
  tileB: '#c9bda8',
  fence: '#8a5a2e',
  fenceDark: '#6e4522',
  hay: '#e3b93c',
  hayDark: '#c99a26',
  pumpkin: '#e8762a',
  pumpkinDark: '#c85e1a',
  oven: '#5d5d66',
  ovenGlow: '#ff7a1a',
  turkeyBody: '#8b5a2b',
  turkeyDark: '#6e4520',
  turkeyFeather: '#a06a33',
  featherRed: '#c0392b',
  featherGold: '#e67e22',
  wattle: '#d63031',
  beak: '#f39c12',
  farmerShirt: '#c0392b',
  farmerOveralls: '#2e5fa3',
  farmerSkin: '#f0c08a',
  farmerHat: '#e8c96a',
  corn: '#f7d038',
  cornHusk: '#4e9a3d',
  gate: '#7d4f1d',
  hudBg: 'rgba(40, 26, 12, 0.82)',
  hudText: '#ffe9b0',
  title: '#fff3d6',
};

export const LEVELS = [
  {
    name: 'LEVEL 1 — THE FARMYARD',
    sub: 'Grab the corn, dodge the farmer, reach the forest gate!',
    ground: 'grass',
    cornNeeded: 6,
    farmerSpeedBonus: 0,
    knives: false,
    oven: false,
    haystacks: 3,
    fences: 3,
    pumpkins: 4,
  },
  {
    name: 'LEVEL 2 — THE BARN',
    sub: 'He knows you are here now. He throws knives. Hide behind the hay!',
    ground: 'barn',
    cornNeeded: 8,
    farmerSpeedBonus: 1,
    knives: true,
    oven: false,
    haystacks: 4,
    fences: 4,
    pumpkins: 5,
  },
  {
    name: 'LEVEL 3 — THE KITCHEN',
    sub: 'The oven is lit and the carving knife is out. Escape or be dinner!',
    ground: 'kitchen',
    cornNeeded: 10,
    farmerSpeedBonus: 2,
    knives: true,
    oven: true,
    haystacks: 3,
    fences: 4,
    pumpkins: 5,
  },
];
