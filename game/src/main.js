// Turkey Run — the game itself: state, the loop, and the rules.
// One job: hold the whole run together — title, play, caught, escaped —
// and run one frame of it: input, the turkey, the farmer, the knives,
// the corn, the gate, and what each of those does to the score.

import { FIELD, TURKEY, LEVELS, CORN_POINTS, GOLDEN_CORN_POINTS, LEVEL_BONUS, ESCAPE_BONUS, KNIFE } from './config.js';
import { makeRng } from './random.js';
import { createInput, moveDirection, takeClicks, takePressed } from './input.js';
import { buildLevel, hitsObstacle, atGate, moveCircle } from './world.js';
import { createTurkey, updateTurkey } from './turkey.js';
import { createFarmer, updateFarmer } from './farmer.js';
import { cornBurst, featherBurst, updateParticles } from './particles.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_CAUGHT, SCREEN_ESCAPED, inButton } from './render.js';
import { buildShot, autopilotDir, simulate } from './shots.js';
import { sfx, ensureAudio, toggleMute } from './audio.js';

const START_BUTTON = { x: FIELD.width / 2 - 130, y: 350, w: 260, h: 58 };
const AGAIN_BUTTON = { x: FIELD.width / 2 - 130, y: 420, w: 260, h: 58 };

/** A fresh run state. `seed` fixes the farm; without one it is random. */
export function createState(seed) {
  const rng = makeRng(seed ?? ((Math.random() * 0xffffffff) >>> 0));
  return {
    screen: SCREEN_TITLE,
    rng,
    seed,
    levelNumber: 1,
    levelDef: LEVELS[0],
    level: null,
    score: 0,
    totalCorn: 0,
    cornCollected: 0,
    cornNeeded: LEVELS[0].cornNeeded,
    lives: TURKEY.lives,
    time: 0,
    best: 0,
    turkey: null,
    farmer: null,
    knives: [],
    particles: [],
    banner: null,
    shake: 0,
    mouse: { x: 0, y: 0 },
    shot: null,
  };
}

/** Begin (or restart) a run at the given level, turkey and farmer placed. */
export function startRun(state, levelNumber) {
  state.levelNumber = levelNumber;
  state.level = buildLevel(levelNumber, state.rng);
  state.levelDef = state.level.def;
  state.cornNeeded = state.level.cornNeeded;
  state.cornCollected = 0;
  state.turkey = createTurkey(state.level.turkeySpawn.x, state.level.turkeySpawn.y);
  state.farmer = createFarmer(
    state.level.farmerSpawn.x,
    state.level.farmerSpawn.y,
    state.levelDef.farmerSpeedBonus,
    state.levelDef.knives,
  );
  state.knives = [];
  state.particles = [];
  state.shake = 0;
  state.banner = { text: state.levelDef.name, sub: state.levelDef.sub, t: 2.4 };
  state.screen = SCREEN_PLAY;
}

/** Begin a whole new run from level 1, keeping the best score. */
export function startGame(state) {
  state.score = 0;
  state.totalCorn = 0;
  state.time = 0;
  state.lives = TURKEY.lives;
  startRun(state, 1);
}

/** The turkey loses a life: feathers, shake, a thud — and maybe the end. */
export function hurtTurkey(state, fromX, fromY) {
  const t = state.turkey;
  if (t.invulnerable > 0 || state.screen !== SCREEN_PLAY) return;
  state.lives -= 1;
  t.invulnerable = TURKEY.invulnerableTime;
  state.shake = 14;
  featherBurst(state.particles, t.x, t.y);
  sfx.hurt();
  // Knock the turkey away from whatever hit it, in small checked steps so
  // the knockback stops at an obstacle instead of landing inside one.
  const dx = t.x - fromX;
  const dy = t.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 0; i < 5; i++) {
    moveCircle(t, (dx / len) * 9.2, (dy / len) * 9.2, t.radius, state.level.obstacles);
  }
  if (state.lives <= 0) {
    state.screen = SCREEN_CAUGHT;
    state.best = Math.max(state.best, state.score);
    sfx.caught();
  }
}

/**
 * One frame of play. `silent` skips sound (screenshot simulations).
 * Returns nothing; the state is updated in place.
 */
export function update(state, dir, wantDash, clickDash, dt, silent) {
  if (state.screen !== SCREEN_PLAY) return;
  state.time += dt;
  if (state.banner !== null) {
    state.banner.t -= dt;
    if (state.banner.t <= 0) state.banner = null;
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);

  updateTurkey(state.turkey, dir, wantDash, clickDash, dt, state.level.obstacles, state.particles);
  updateFarmer(state.farmer, state.turkey, state.level.obstacles, state.knives, dt, state.rng);
  updateParticles(state.particles, dt);

  // Knives fly straight until they hit the turkey, a wall or an obstacle.
  for (let i = state.knives.length - 1; i >= 0; i--) {
    const k = state.knives[i];
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    k.life -= dt;
    let dead = k.life <= 0 || k.x < 10 || k.x > FIELD.width - 10 || k.y < 64 || k.y > FIELD.height - 10;
    if (!dead && hitsObstacle(k.x, k.y, KNIFE.radius, state.level.obstacles)) dead = true;
    if (!dead && Math.hypot(k.x - state.turkey.x, k.y - state.turkey.y) < KNIFE.radius + state.turkey.radius - 2) {
      hurtTurkey(state, k.x - k.vx * 0.05, k.y - k.vy * 0.05);
      dead = true;
    }
    if (dead) state.knives.splice(i, 1);
    if (state.screen !== SCREEN_PLAY) return;
  }

  // The farmer catching the turkey ends the run — unless it just did.
  if (Math.hypot(state.farmer.x - state.turkey.x, state.farmer.y - state.turkey.y)
    < state.farmer.radius + state.turkey.radius - 6) {
    hurtTurkey(state, state.farmer.x, state.farmer.y);
    if (state.screen !== SCREEN_PLAY) return;
    // A caught turkey is thrown clear of the farmer so one touch is one life.
    const dx = state.turkey.x - state.farmer.x;
    const dy = state.turkey.y - state.farmer.y;
    const len = Math.hypot(dx, dy) || 1;
    state.turkey.x += (dx / len) * 70;
    state.turkey.y += (dy / len) * 70;
  }

  // The oven burns on touch, with the same one-life rule.
  for (const o of state.level.obstacles) {
    if (o.kind !== 'oven') continue;
    const cx = Math.max(o.x, Math.min(state.turkey.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(state.turkey.y, o.y + o.h));
    if (Math.hypot(state.turkey.x - cx, state.turkey.y - cy) < state.turkey.radius - 2) {
      hurtTurkey(state, o.x + o.w / 2, o.y + o.h / 2);
      if (state.screen !== SCREEN_PLAY) return;
    }
  }

  // Corn: grab it, score it, and open the gate when the level's share is in.
  for (const c of state.level.corn) {
    if (c.taken) continue;
    if (Math.hypot(c.x - state.turkey.x, c.y - state.turkey.y) < 30) {
      c.taken = true;
      state.cornCollected += 1;
      state.totalCorn += 1;
      const pts = c.golden ? GOLDEN_CORN_POINTS : CORN_POINTS;
      state.score += pts;
      cornBurst(state.particles, c.x, c.y, c.golden);
      if (!silent) {
        if (c.golden) sfx.golden();
        else sfx.pickup();
      }
      if (state.cornCollected >= state.cornNeeded && !state.level.gate.open) {
        state.level.gate.open = true;
        if (!silent) sfx.gateOpen();
        state.banner = { text: 'THE GATE IS OPEN!', sub: 'Run for the forest — now!', t: 1.8 };
      }
    }
  }

  // The open gate: next stage, or freedom.
  if (atGate(state.turkey.x, state.turkey.y, state.turkey.radius, state.level.gate)) {
    state.score += LEVEL_BONUS;
    if (state.level.level >= LEVELS.length) {
      state.score += ESCAPE_BONUS + Math.max(0, 300 - Math.floor(state.time)) ;
      state.screen = SCREEN_ESCAPED;
      state.best = Math.max(state.best, state.score);
      if (!silent) sfx.win();
    } else {
      startRun(state, state.level.level + 1);
    }
  }
}

/** Handle one click, by screen: buttons, or a dash toward the point. */
function handleClick(state, click) {
  ensureAudio();
  if (state.screen === SCREEN_TITLE) {
    if (inButton(click.x, click.y, START_BUTTON.x, START_BUTTON.y, START_BUTTON.w, START_BUTTON.h)) {
      sfx.click();
      startGame(state);
    }
    return null;
  }
  if (state.screen === SCREEN_CAUGHT || state.screen === SCREEN_ESCAPED) {
    if (inButton(click.x, click.y, AGAIN_BUTTON.x, AGAIN_BUTTON.y, AGAIN_BUTTON.w, AGAIN_BUTTON.h)) {
      sfx.click();
      startGame(state);
    }
    return null;
  }
  return click;
}

/** Boot the game in the page's canvas. */
export function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const seed = params.has('seed') ? Number(params.get('seed')) || 1 : undefined;
  const shot = params.get('shot');
  const state = createState(seed);
  const input = createInput(canvas);
  state.shot = shot;
  if (params.has('debug')) state.trace = [];
  // Exposed for automated playtests (and curious players): the live run state.
  window.__turkeyState = state;
  window.__turkeyTest = { createState, startRun, update, autopilotDir, simulate };

  if (shot !== null) {
    buildShot(shot, state, startRun, (s, dir, dash, click, dt) => update(s, dir, dash, click, dt, true));
    render(ctx, state, 0);
    document.title = `Turkey Run — ${shot}`;
    return state;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    state.mouse = { ...input.mouse };
    const pressed = takePressed(input);

    // Mute toggle.
    if (pressed.has('KeyM')) {
      const muted = toggleMute();
      document.getElementById('mute-note').textContent = muted ? 'Sound: off (M)' : 'Sound: on (M)';
    }
    // Restart from an end screen.
    if ((state.screen === SCREEN_CAUGHT || state.screen === SCREEN_ESCAPED) && pressed.has('KeyR')) {
      startGame(state);
    }
    // Start from the title with Enter.
    if (state.screen === SCREEN_TITLE && pressed.has('Enter')) {
      ensureAudio();
      startGame(state);
    }

    const clicks = takeClicks(input);
    let clickDash = null;
    for (const click of clicks) {
      const dash = handleClick(state, click);
      if (dash !== null) clickDash = dash;
    }

    if (state.screen === SCREEN_PLAY) {
      const dir = moveDirection(input);
      const wantDash = pressed.has('Space');
      update(state, dir, wantDash, clickDash, dt, false);
    }
    render(ctx, state, time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return state;
}

boot();
