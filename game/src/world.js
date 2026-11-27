// Turkey Run — the farm itself: level layouts, collision and sight.
// One job: build each stage (farmyard, barn, kitchen) from its definition,
// and answer the two questions movement and the farmer AI keep asking:
// is this spot blocked, and can the farmer see the turkey from here?

import { FIELD, LEVELS } from './config.js';
import { randInt, randRange } from './random.js';

const MARGIN = 46;
const GATE = { x: FIELD.width - 96, y: 96, w: 64, h: 84 };

/** A point far enough from every obstacle, spawn and the gate. */
function freeSpot(rng, obstacles, taken, minDist) {
  for (let tries = 0; tries < 80; tries++) {
    const x = randRange(rng, MARGIN + 30, FIELD.width - MARGIN - 30);
    const y = randRange(rng, MARGIN + 90, FIELD.height - MARGIN - 30);
    if (Math.hypot(x - GATE.x - GATE.w / 2, y - GATE.y - GATE.h / 2) < 120) continue;
    let ok = true;
    for (const o of obstacles) {
      const ox = o.kind === 'hay' || o.kind === 'pumpkin' ? o.x : o.x + o.w / 2;
      const oy = o.kind === 'hay' || o.kind === 'pumpkin' ? o.y : o.y + o.h / 2;
      const r = o.kind === 'hay' ? o.r + 26 : o.kind === 'pumpkin' ? o.r + 26 : Math.max(o.w, o.h) / 2 + 26;
      if (Math.hypot(x - ox, y - oy) < r) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const t of taken) {
      if (Math.hypot(x - t.x, y - t.y) < minDist) {
        ok = false;
        break;
      }
    }
    if (ok) return { x, y };
  }
  return { x: FIELD.width / 2, y: FIELD.height / 2 };
}

/** Build one level: obstacles, corn, spawns and the forest gate. */
export function buildLevel(levelIndex, rng) {
  const def = LEVELS[levelIndex - 1];
  const obstacles = [];
  const taken = [
    { x: 120, y: FIELD.height - 110 },
    { x: FIELD.width - 130, y: FIELD.height - 120 },
    { x: GATE.x + GATE.w / 2, y: GATE.y + GATE.h / 2 },
  ];

  // Haystacks: round, tall, and the only thing that blocks the farmer's sight.
  for (let i = 0; i < def.haystacks; i++) {
    const p = freeSpot(rng, obstacles, taken, 110);
    obstacles.push({ kind: 'hay', x: p.x, y: p.y, r: randInt(rng, 30, 40) });
    taken.push(p);
  }
  // Fences: long wooden rails the turkey must run around.
  for (let i = 0; i < def.fences; i++) {
    const p = freeSpot(rng, obstacles, taken, 130);
    const horizontal = rng() < 0.5;
    const w = horizontal ? randInt(rng, 110, 170) : 16;
    const h = horizontal ? 16 : randInt(rng, 90, 140);
    obstacles.push({ kind: 'fence', x: p.x - w / 2, y: p.y - h / 2, w, h });
    taken.push(p);
  }
  // Pumpkins: round, low, solid.
  for (let i = 0; i < def.pumpkins; i++) {
    const p = freeSpot(rng, obstacles, taken, 90);
    obstacles.push({ kind: 'pumpkin', x: p.x, y: p.y, r: randInt(rng, 18, 26) });
    taken.push(p);
  }
  // The oven, level 3 only: a hot box in the kitchen's top-left corner,
  // clear of both spawns (the farmer starts bottom-right, the turkey
  // bottom-left, and a spawn inside the oven would wedge them in it).
  if (def.oven) {
    obstacles.push({ kind: 'oven', x: 70, y: 100, w: 150, h: 84 });
  }

  // Corn, scattered so the turkey must cross the farmer's patrol to get it.
  const corn = [];
  for (let i = 0; i < def.cornNeeded + 3; i++) {
    const p = freeSpot(rng, obstacles, taken, 70);
    corn.push({ x: p.x, y: p.y, golden: i === def.cornNeeded, taken: false });
    taken.push(p);
  }

  return {
    def,
    level: levelIndex,
    obstacles,
    corn,
    cornNeeded: def.cornNeeded,
    gate: { ...GATE, open: false },
    turkeySpawn: { x: 120, y: FIELD.height - 110 },
    farmerSpawn: { x: FIELD.width - 140, y: FIELD.height - 130 },
  };
}

/** True when a circle at (x, y) with radius r overlaps a solid obstacle. */
export function hitsObstacle(x, y, r, obstacles) {
  for (const o of obstacles) {
    if (o.kind === 'hay' || o.kind === 'pumpkin') {
      if (Math.hypot(x - o.x, y - o.y) < r + o.r - 4) return o;
    } else {
      const cx = Math.max(o.x, Math.min(x, o.x + o.w));
      const cy = Math.max(o.y, Math.min(y, o.y + o.h));
      if (Math.hypot(x - cx, y - cy) < r - 2) return o;
    }
  }
  return null;
}

/**
 * Push a body out of an obstacle it already overlaps, along the shortest
 * way out. Without this a knockback can leave the turkey inside a fence's
 * shell, where every ordinary step stays inside it and the turkey is
 * wedged for good.
 */
function ejectFromOverlap(body, radius, obstacles) {
  const o = hitsObstacle(body.x, body.y, radius, obstacles);
  if (o === null) return;
  if (o.kind === 'hay' || o.kind === 'pumpkin') {
    const dx = body.x - o.x;
    const dy = body.y - o.y;
    const d = Math.hypot(dx, dy) || 1;
    const target = radius + o.r - 4;
    body.x = o.x + (dx / d) * target;
    body.y = o.y + (dy / d) * target;
    return;
  }
  const left = body.x - (o.x - radius + 2);
  const right = o.x + o.w + radius - 2 - body.x;
  const top = body.y - (o.y - radius + 2);
  const bottom = o.y + o.h + radius - 2 - body.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) body.x = o.x - radius + 2;
  else if (m === right) body.x = o.x + o.w + radius - 2;
  else if (m === top) body.y = o.y - radius + 2;
  else body.y = o.y + o.h + radius - 2;
}

/**
 * Move a circle by (dx, dy) with sliding: try x, then y, so the turkey and
 * the farmer glide along fences instead of sticking to them.
 */
export function moveCircle(body, dx, dy, radius, obstacles) {
  ejectFromOverlap(body, radius, obstacles);
  const nx = body.x + dx;
  if (nx - radius >= 14 && nx + radius <= FIELD.width - 14 && !hitsObstacle(nx, body.y, radius, obstacles)) {
    body.x = nx;
  }
  const ny = body.y + dy;
  if (ny - radius >= HUD_TOP && ny + radius <= FIELD.height - 14 && !hitsObstacle(body.x, ny, radius, obstacles)) {
    body.y = ny;
  }
}

const HUD_TOP = 56 + 14;

/** Distance from a point to a segment, squared. */
function distToSegmentSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return (px - cx) * (px - cx) + (py - cy) * (py - cy);
}

/**
 * True when the farmer at (fx, fy) can see the turkey at (tx, ty): close
 * enough, and no haystack between them. Fences and pumpkins are too low
 * to hide behind; hay is the turkey's only cover.
 */
export function canSee(fx, fy, tx, ty, obstacles) {
  const dx = tx - fx;
  const dy = ty - fy;
  const dist = Math.hypot(dx, dy);
  if (dist > 360) return false;
  for (const o of obstacles) {
    if (o.kind !== 'hay') continue;
    if (distToSegmentSq(o.x, o.y, fx, fy, tx, ty) < (o.r - 6) * (o.r - 6)) return false;
  }
  return true;
}

/** True when the circle overlaps the open exit gate. */
export function atGate(x, y, r, gate) {
  return (
    gate.open &&
    x + r > gate.x &&
    x - r < gate.x + gate.w &&
    y + r > gate.y &&
    y - r < gate.y + gate.h
  );
}
