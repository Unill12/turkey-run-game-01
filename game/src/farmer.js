// Turkey Run — the farmer: patrol, chase, search, and the knife.
// One job: the hunter's brain. He patrols the farm, chases the turkey
// the moment he sees it, searches where he last saw it when it hides,
// and throws his carving knife while the chase is on.

import { FARMER, KNIFE } from './config.js';
import { canSee, moveCircle } from './world.js';
import { sfx } from './audio.js';

/** A fresh farmer at the level's spawn. `throwsKnives` is false on level 1. */
export function createFarmer(x, y, speedBonus, throwsKnives) {
  return {
    x,
    y,
    radius: FARMER.radius,
    speed: FARMER.baseSpeed + FARMER.speedPerLevel * speedBonus,
    throwsKnives: throwsKnives !== false,
    state: 'patrol',
    facing: -1,
    lastSeen: { x, y },
    searchTime: 0,
    throwCooldown: 2,
    windup: 0,
    waypoint: { x: x - 120, y: y - 60 },
    waypointTimer: 0,
    stepPhase: 0,
    // Stuck watch: a farmer wedged between two obstacles stops moving,
    // which would freeze the hunt; see updateFarmer's detour.
    stuckTimer: 0,
    lastX: x,
    lastY: y,
    detour: null,
    detourTime: 0,
  };
}

function steerToward(farmer, tx, ty, speed, dt, obstacles) {
  const dx = tx - farmer.x;
  const dy = ty - farmer.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  farmer.facing = dx !== 0 ? Math.sign(dx) : farmer.facing;
  farmer.stepPhase += dt * 11;
  moveCircle(farmer, (dx / len) * speed * dt, (dy / len) * speed * dt, farmer.radius, obstacles);
}

/** Advance the farmer one frame; may push a knife into `knives`. */
export function updateFarmer(farmer, turkey, obstacles, knives, dt, rng) {
  // Stuck watch: barely moved in a second while hunting means wedged
  // between obstacles. Detour away from the nearest one for a moment so
  // the chase resumes instead of freezing with the turkey in reach.
  farmer.stuckTimer += dt;
  if (farmer.stuckTimer >= 1) {
    const moved = Math.hypot(farmer.x - farmer.lastX, farmer.y - farmer.lastY);
    farmer.lastX = farmer.x;
    farmer.lastY = farmer.y;
    farmer.stuckTimer = 0;
    if (moved < 3 && farmer.state === 'chase') {
      let best = null;
      let bestD = Infinity;
      for (const o of obstacles) {
        const cx = o.kind === 'hay' || o.kind === 'pumpkin' ? o.x : o.x + o.w / 2;
        const cy = o.kind === 'hay' || o.kind === 'pumpkin' ? o.y : o.y + o.h / 2;
        const r = o.kind === 'hay' || o.kind === 'pumpkin' ? o.r : Math.max(o.w, o.h) / 2;
        const d = Math.hypot(farmer.x - cx, farmer.y - cy) - r;
        if (d < bestD) {
          bestD = d;
          best = { x: cx, y: cy };
        }
      }
      if (best !== null && bestD < 90) {
        const dx = farmer.x - best.x;
        const dy = farmer.y - best.y;
        const d = Math.hypot(dx, dy) || 1;
        farmer.detour = {
          x: Math.max(60, Math.min(900, farmer.x + (dx / d) * 150)),
          y: Math.max(100, Math.min(580, farmer.y + (dy / d) * 150)),
        };
        farmer.detourTime = 1.6;
      }
    }
  }
  if (farmer.detourTime > 0) {
    farmer.detourTime -= dt;
    steerToward(farmer, farmer.detour.x, farmer.detour.y, farmer.speed, dt, obstacles);
    return;
  }

  const sees = canSee(farmer.x, farmer.y, turkey.x, turkey.y, obstacles);
  const wasChasing = farmer.state === 'chase';

  if (sees) {
    if (!wasChasing) {
      farmer.state = 'chase';
      sfx.spotted();
    }
    farmer.lastSeen = { x: turkey.x, y: turkey.y };
    farmer.searchTime = 0;
  } else if (farmer.state === 'chase') {
    farmer.state = 'search';
    farmer.searchTime = FARMER.searchTime;
  }

  if (farmer.state === 'chase') {
    steerToward(farmer, turkey.x, turkey.y, farmer.speed * FARMER.chaseMultiplier, dt, obstacles);
    // Throw a knife while the chase is on, after a visible wind-up.
    if (farmer.throwsKnives && farmer.windup > 0) {
      farmer.windup -= dt;
      if (farmer.windup <= 0) {
        throwKnife(farmer, turkey, knives);
        farmer.throwCooldown = FARMER.throwCooldown;
      }
    } else {
      farmer.throwCooldown -= dt;
      if (farmer.throwCooldown <= 0) farmer.windup = FARMER.throwWindup;
    }
  } else if (farmer.state === 'search') {
    farmer.searchTime -= dt;
    steerToward(farmer, farmer.lastSeen.x, farmer.lastSeen.y, farmer.speed * 0.9, dt, obstacles);
    if (farmer.searchTime <= 0) {
      farmer.state = 'patrol';
      farmer.waypointTimer = 0;
    }
  } else {
    // Patrol: amble between random waypoints, slow and unsuspecting.
    farmer.waypointTimer -= dt;
    const d = Math.hypot(farmer.waypoint.x - farmer.x, farmer.waypoint.y - farmer.y);
    if (d < 24 || farmer.waypointTimer <= 0) {
      farmer.waypoint = {
        x: 90 + rng() * 780,
        y: 120 + rng() * 460,
      };
      farmer.waypointTimer = 4 + rng() * 3;
    }
    steerToward(farmer, farmer.waypoint.x, farmer.waypoint.y, farmer.speed * 0.55, dt, obstacles);
  }
}

function throwKnife(farmer, turkey, knives) {
  const dx = turkey.x - farmer.x;
  const dy = turkey.y - farmer.y;
  const len = Math.hypot(dx, dy) || 1;
  knives.push({
    x: farmer.x + (dx / len) * 26,
    y: farmer.y + (dy / len) * 26,
    vx: (dx / len) * KNIFE.speed,
    vy: (dy / len) * KNIFE.speed,
    life: KNIFE.life,
    angle: Math.atan2(dy, dx),
  });
  sfx.throwKnife();
}

/** Draw the farmer: straw hat, beard, red shirt, blue overalls, pitchfork. */
export function drawFarmer(ctx, farmer, time) {
  const { x, y } = farmer;
  const walking = Math.sin(farmer.stepPhase) * 2;
  const angry = farmer.state === 'chase';
  ctx.save();
  ctx.translate(x, y);

  // Legs.
  ctx.strokeStyle = '#2e5fa3';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.lineTo(-6 + walking, 20);
  ctx.moveTo(6, 8);
  ctx.lineTo(6 - walking, 20);
  ctx.stroke();

  // Overalls and shirt.
  ctx.fillStyle = '#2e5fa3';
  ctx.fillRect(-11, -4, 22, 16);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-12, -12, 24, 11);
  ctx.fillStyle = '#f0c08a';
  ctx.fillRect(-12, -12, 4, 11);
  ctx.fillRect(8, -12, 4, 11);

  // Pitchfork in the right hand.
  ctx.save();
  ctx.translate(14, -2);
  ctx.rotate(0.25);
  ctx.strokeStyle = '#8a5a2e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.lineTo(0, -18);
  ctx.stroke();
  ctx.strokeStyle = '#cfd6dd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.lineTo(-4, -26);
  ctx.moveTo(0, -18);
  ctx.lineTo(0, -27);
  ctx.moveTo(4, -18);
  ctx.lineTo(4, -26);
  ctx.stroke();
  ctx.restore();

  // Head, beard and straw hat.
  ctx.fillStyle = '#f0c08a';
  ctx.beginPath();
  ctx.arc(0, -18, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e0d0';
  ctx.beginPath();
  ctx.arc(0, -13, 7, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#e8c96a';
  ctx.beginPath();
  ctx.ellipse(0, -24, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-8, -31, 16, 8);
  // Eyes: narrow and angry while chasing.
  ctx.fillStyle = '#1a1a1a';
  const eyeH = angry ? 1 : 2;
  ctx.fillRect(-5, -20, 3, eyeH + 1);
  ctx.fillRect(2, -20, 3, eyeH + 1);

  // A red "!" pops over his head the moment he spots the turkey.
  if (angry) {
    const bounce = Math.sin(time * 10) * 2;
    ctx.fillStyle = '#ff2e2e';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -40 + bounce);
  }
  ctx.restore();
}
