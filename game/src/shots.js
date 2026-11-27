// Turkey Run — the screenshot scenes behind ?shot=start|play|end.
// One job: build the exact frame a screenshot shows, by playing the real
// rules forward from a fresh world with a simple autopilot, so the frame
// is what a short game really looks like and the same seed always gives
// the same frame.

import { FIELD } from './config.js';
import { hitsObstacle } from './world.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 60;
const PLAY_SECONDS = 14;
const END_LIMIT_SECONDS = 240;

/**
 * The autopilot: each step, run from the farmer and toward the nearest
 * corn — or the open gate — while keeping clear of knives and the oven.
 */
export function autopilotDir(state) {
  const t = state.turkey;
  const f = state.farmer;
  let ax = 0;
  let ay = 0;

  // Unstick: if the turkey has barely moved in half a second it is wedged
  // against something. The way out is away from whatever pins it, not
  // toward the middle of the field — the middle can sit behind the same
  // pumpkin that wedged it. Only when nothing is near does it run central.
  if (state._pilotUnstick > 0) {
    let best = null;
    let bestD = Infinity;
    for (const o of state.level.obstacles) {
      const cx = o.kind === 'hay' || o.kind === 'pumpkin' ? o.x : o.x + o.w / 2;
      const cy = o.kind === 'hay' || o.kind === 'pumpkin' ? o.y : o.y + o.h / 2;
      const r = o.kind === 'hay' || o.kind === 'pumpkin' ? o.r : Math.max(o.w, o.h) / 2;
      const d = Math.hypot(t.x - cx, t.y - cy) - r;
      if (d < bestD) {
        bestD = d;
        best = { x: cx, y: cy };
      }
    }
    if (best !== null && bestD < 80) {
      const dx = t.x - best.x;
      const dy = t.y - best.y;
      const d = Math.hypot(dx, dy) || 1;
      return { x: dx / d, y: dy / d };
    }
    const dx = FIELD.width / 2 - t.x;
    const dy = FIELD.height / 2 - t.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d };
  }
  // Flee the farmer, harder the closer he is — but only while he is near,
  // so the turkey still gets to the corn instead of running forever.
  const fdx = t.x - f.x;
  const fdy = t.y - f.y;
  const fd = Math.hypot(fdx, fdy) || 1;
  if (fd < 200) {
    const w = (200 - fd) / 200;
    ax += (fdx / fd) * w * (fd < 120 ? 3.2 : 2.0);
    ay += (fdy / fd) * w * (fd < 120 ? 3.2 : 2.0);
  }
  // Dodge knives.
  for (const k of state.knives) {
    const kdx = t.x - k.x;
    const kdy = t.y - k.y;
    const kd = Math.hypot(kdx, kdy) || 1;
    if (kd < 130) {
      const w = (130 - kd) / 130;
      // Sidestep: run perpendicular to the knife's flight.
      const px = -k.vy / 400;
      const py = k.vx / 400;
      const side = px * kdx + py * kdy >= 0 ? 1 : -1;
      ax += px * side * w * 2.4;
      ay += py * side * w * 2.4;
    }
  }
  // Keep out of the oven — a light nudge, not a wall: a strong repulsion
  // cancels the pull of corn near the oven and stalls the pilot there.
  for (const o of state.level.obstacles) {
    if (o.kind !== 'oven') continue;
    const cx = Math.max(o.x, Math.min(t.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(t.y, o.y + o.h));
    const d = Math.hypot(t.x - cx, t.y - cy);
    if (d < 60) {
      ax += ((t.x - cx) / (d || 1)) * 1.0;
      ay += ((t.y - cy) / (d || 1)) * 1.0;
    }
  }
  // Head for the goal: the nearest corn the farmer is not standing on,
  // then the open gate.
  let target = null;
  if (state.cornCollected < state.cornNeeded) {
    let best = Infinity;
    let fallback = null;
    let fallbackD = Infinity;
    for (const c of state.level.corn) {
      if (c.taken) continue;
      const d = Math.hypot(c.x - t.x, c.y - t.y);
      const fd2 = Math.hypot(c.x - f.x, c.y - f.y);
      if (d < fallbackD) {
        fallbackD = d;
        fallback = c;
      }
      if (fd2 < 110) continue;
      if (d < best) {
        best = d;
        target = c;
      }
    }
    if (target === null) target = fallback;
  } else {
    target = { x: state.level.gate.x + state.level.gate.w / 2, y: state.level.gate.y + state.level.gate.h / 2 };
  }
  if (target !== null) {
    const dx = target.x - t.x;
    const dy = target.y - t.y;
    const d = Math.hypot(dx, dy) || 1;
    ax += (dx / d) * 1.5;
    ay += (dy / d) * 1.5;
  }
  // Stay inside the field.
  if (t.x < 90) ax += 1;
  if (t.x > FIELD.width - 90) ax -= 1;
  if (t.y < 130) ay += 1;
  if (t.y > FIELD.height - 90) ay -= 1;

  const len = Math.hypot(ax, ay);
  if (len < 0.05) return { x: 0, y: 0 };
  let dir = { x: ax / len, y: ay / len };
  // Steer around obstacles: if the way ahead is blocked, try turning.
  // Without this the pilot stalls in fence corners while the farmer closes in.
  const aheadBlocked = (d) => {
    const px = t.x + d.x * 44;
    const py = t.y + d.y * 44;
    return hitsObstacle(px, py, 18, state.level.obstacles) !== null;
  };
  if (aheadBlocked(dir)) {
    const rot = (d, angle) => {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return { x: d.x * c - d.y * s, y: d.x * s + d.y * c };
    };
    for (const angle of [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI * 0.75, -Math.PI * 0.75]) {
      const cand = rot(dir, angle);
      if (!aheadBlocked(cand)) {
        dir = cand;
        break;
      }
    }
  }
  return dir;
}

/**
 * Play the real update loop forward with the autopilot steering, until
 * `until` says stop. Sound stays off: screenshots are silent.
 */
export function simulate(state, update, seconds, until) {
  const steps = Math.floor(seconds / SAMPLE);
  state._pilotUnstick = 0;
  state._pilotLast = { x: state.turkey.x, y: state.turkey.y, t: 0 };
  for (let i = 0; i < steps; i++) {
    // Stuck check, twice a second: barely moved means wedged in a corner.
    if (i % 30 === 0) {
      const moved = Math.hypot(state.turkey.x - state._pilotLast.x, state.turkey.y - state._pilotLast.y);
      if (moved < 3 && i > 30) state._pilotUnstick = 1.2;
      state._pilotLast = { x: state.turkey.x, y: state.turkey.y, t: i * SAMPLE };
    }
    if (state._pilotUnstick > 0) state._pilotUnstick -= SAMPLE;
    const dir = autopilotDir(state);
    const dash = Math.hypot(state.farmer.x - state.turkey.x, state.farmer.y - state.turkey.y) < 150
      && state.turkey.dashCooldown <= 0;
    update(state, dir, dash, null, SAMPLE, true);
    // With ?debug=1, keep one snapshot a second: where the turkey is, what
    // it is after, and what is left — enough to see where a pilot stalls.
    if (state.trace !== undefined && i % 60 === 0) {
      state.trace.push({
        t: +(i * SAMPLE).toFixed(1),
        tx: Math.round(state.turkey.x),
        ty: Math.round(state.turkey.y),
        fx: Math.round(state.farmer.x),
        fy: Math.round(state.farmer.y),
        farmer: state.farmer.state,
        cornLeft: state.level.corn.filter((c) => !c.taken).length,
        lives: state.lives,
        level: state.levelNumber,
        dir: { x: +dir.x.toFixed(2), y: +dir.y.toFixed(2) },
        unstick: +(state._pilotUnstick ?? 0).toFixed(2),
      });
    }
    if (until !== undefined && until(state)) break;
  }
}

/**
 * Build the requested shot on a fresh state: title, a mid-run play frame,
 * or a real end screen reached by playing. Returns the screen to show.
 */
export function buildShot(shot, state, startRun, update) {
  if (shot === 'start') {
    state.screen = SCREEN_TITLE;
    return;
  }
  if (shot === 'play') {
    startRun(state, 1);
    state.screen = SCREEN_PLAY;
    simulate(state, update, PLAY_SECONDS);
    state.banner = null;
    state.screen = SCREEN_PLAY;
    return;
  }
  if (shot === 'end') {
    startRun(state, 1);
    state.screen = SCREEN_PLAY;
    simulate(state, update, END_LIMIT_SECONDS, (s) => s.screen === SCREEN_CAUGHT || s.screen === SCREEN_ESCAPED);
    if (state.screen === SCREEN_PLAY) {
      // A cautious pilot survived the cap: show the escape it earned.
      state.screen = SCREEN_ESCAPED;
      state.score += 250;
    }
    return;
  }
  state.screen = SCREEN_TITLE;
}
