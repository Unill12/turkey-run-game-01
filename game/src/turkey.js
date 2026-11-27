// Turkey Run — the player: movement, dashing, and the turkey itself.
// One job: how the turkey moves and how it looks — a brown body, a fan
// of tail feathers, a red wattle and two very busy legs.

import { TURKEY } from './config.js';
import { moveCircle } from './world.js';
import { dustPuff } from './particles.js';
import { sfx } from './audio.js';

/** A fresh turkey at the level's spawn. */
export function createTurkey(x, y) {
  return {
    x,
    y,
    radius: TURKEY.radius,
    facing: 1,
    moving: false,
    stepPhase: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashDir: { x: 1, y: 0 },
    invulnerable: 0,
  };
}

/**
 * Move the turkey for one frame. `dir` is the normalised WASD/arrows
 * direction; `wantDash` starts a dash when its cooldown is ready; a
 * mouse click dashes toward the click point instead.
 */
export function updateTurkey(turkey, dir, wantDash, clickDash, dt, obstacles, particles) {
  if (turkey.dashCooldown > 0) turkey.dashCooldown -= dt;
  if (turkey.invulnerable > 0) turkey.invulnerable -= dt;

  turkey.moving = dir.x !== 0 || dir.y !== 0;
  if (turkey.moving) {
    turkey.facing = dir.x !== 0 ? Math.sign(dir.x) : turkey.facing;
    turkey.stepPhase += dt * 14;
    turkey.dashDir = { ...dir };
  }

  if (turkey.dashTime > 0) {
    turkey.dashTime -= dt;
    moveCircle(
      turkey,
      turkey.dashDir.x * TURKEY.dashSpeed * dt,
      turkey.dashDir.y * TURKEY.dashSpeed * dt,
      turkey.radius,
      obstacles,
    );
    return;
  }

  if (wantDash && turkey.dashCooldown <= 0) {
    startDash(turkey, dir, particles);
    return;
  }
  if (clickDash !== null && turkey.dashCooldown <= 0) {
    const dx = clickDash.x - turkey.x;
    const dy = clickDash.y - turkey.y;
    const len = Math.hypot(dx, dy);
    if (len > 24) {
      turkey.dashDir = { x: dx / len, y: dy / len };
      startDash(turkey, turkey.dashDir, particles);
      return;
    }
  }

  moveCircle(turkey, dir.x * TURKEY.speed * dt, dir.y * TURKEY.speed * dt, turkey.radius, obstacles);
}

function startDash(turkey, dir, particles) {
  if (dir.x === 0 && dir.y === 0) dir = { x: turkey.facing, y: 0 };
  turkey.dashDir = { ...dir };
  turkey.dashTime = TURKEY.dashTime;
  turkey.dashCooldown = TURKEY.dashCooldown;
  dustPuff(particles, turkey.x, turkey.y);
  sfx.dash();
}

/** Draw the turkey at its position, mid-waddle, facing `facing`. */
export function drawTurkey(ctx, turkey, time) {
  const { x, y } = turkey;
  const bob = turkey.moving ? Math.sin(turkey.stepPhase) * 2 : Math.sin(time * 2) * 1;
  const blink = turkey.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(x, y + bob * 0.4);
  if (blink) ctx.globalAlpha = 0.35;

  // Tail fan: five feathers fanning behind the body.
  ctx.save();
  ctx.rotate(turkey.facing >= 0 ? 0 : Math.PI);
  ctx.translate(-10, -4);
  const featherColors = ['#a06a33', '#c0392b', '#e67e22', '#8b5a2b', '#a06a33'];
  for (let i = 0; i < 5; i++) {
    const angle = (-0.9 + i * 0.45) * 0.9;
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = featherColors[i];
    ctx.beginPath();
    ctx.ellipse(-14, 0, 15, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 243, 214, 0.85)';
    ctx.beginPath();
    ctx.ellipse(-24, 0, 4, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Legs: two lines scissoring while it runs.
  const legSwing = turkey.moving ? Math.sin(turkey.stepPhase) * 6 : 0;
  ctx.strokeStyle = '#e8a13c';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, 10);
  ctx.lineTo(-5 + legSwing, 19);
  ctx.moveTo(5, 10);
  ctx.lineTo(5 - legSwing, 19);
  ctx.stroke();

  // Body: a plump brown ellipse with a lighter belly.
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a06a33';
  ctx.beginPath();
  ctx.ellipse(2, 4, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing.
  ctx.fillStyle = '#6e4520';
  ctx.beginPath();
  ctx.ellipse(-3, 1, 9, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Head, beak, wattle and eye.
  ctx.fillStyle = '#7a4a22';
  ctx.beginPath();
  ctx.arc(11, -12, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f39c12';
  ctx.beginPath();
  ctx.moveTo(18, -13);
  ctx.lineTo(26, -10);
  ctx.lineTo(18, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d63031';
  ctx.beginPath();
  ctx.ellipse(14, -5, 3, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(13, -14, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(14, -14, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
