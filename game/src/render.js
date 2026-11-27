// Turkey Run — everything the player sees, drawn on one canvas.
// One job: paint the farm, the turkey, the farmer, the corn and the
// knives, plus the HUD, the title screen and both end screens. No DOM
// overlays: what a screenshot shows is exactly what the player sees.

import { FIELD, HUD_HEIGHT, COLORS, TURKEY } from './config.js';
import { drawTurkey } from './turkey.js';
import { drawFarmer } from './farmer.js';
import { drawParticles } from './particles.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

/** Round-rect path helper (works in every desktop browser). */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A button that highlights when the mouse hovers it. */
export function drawButton(ctx, x, y, w, h, label, hovered, accent) {
  ctx.save();
  ctx.fillStyle = hovered ? '#ffb347' : accent ?? '#e8762a';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#2b1a08';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

/** True when the point is inside the button's rectangle. */
export function inButton(mx, my, x, y, w, h) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

function drawGround(ctx, ground, time) {
  if (ground === 'barn') {
    ctx.fillStyle = COLORS.barnFloorA;
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
    ctx.fillStyle = COLORS.barnFloorB;
    for (let y = HUD_HEIGHT + 34; y < FIELD.height; y += 68) ctx.fillRect(0, y, FIELD.width, 6);
    for (let x = 0; x < FIELD.width; x += 120) {
      ctx.fillRect(x, HUD_HEIGHT, 4, FIELD.height - HUD_HEIGHT);
    }
  } else if (ground === 'kitchen') {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 12; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.tileA : COLORS.tileB;
        ctx.fillRect(x * 80, HUD_HEIGHT + y * 60, 80, 60);
      }
    }
  } else {
    ctx.fillStyle = COLORS.grassA;
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
    ctx.fillStyle = COLORS.grassB;
    for (let i = 0; i < 26; i++) {
      const px = ((i * 197) % 900) + 30;
      const py = HUD_HEIGHT + 30 + ((i * 131) % 520);
      ctx.beginPath();
      ctx.ellipse(px, py, 34, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // A dirt path from the coop to the forest gate.
    ctx.strokeStyle = COLORS.dirt;
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(120, FIELD.height - 110);
    ctx.quadraticCurveTo(FIELD.width / 2, FIELD.height - 60, FIELD.width - 70, 150);
    ctx.stroke();
  }
  void time;
}

function drawObstacles(ctx, obstacles, time) {
  for (const o of obstacles) {
    if (o.kind === 'fence') {
      ctx.fillStyle = COLORS.fenceDark;
      ctx.fillRect(o.x - 2, o.y - 2, o.w + 4, o.h + 4);
      ctx.fillStyle = COLORS.fence;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      if (o.w > o.h) {
        ctx.fillRect(o.x, o.y + 3, o.w, 3);
        ctx.fillRect(o.x, o.y + o.h - 6, o.w, 3);
      } else {
        ctx.fillRect(o.x + 3, o.y, 3, o.h);
        ctx.fillRect(o.x + o.w - 6, o.y, 3, o.h);
      }
    } else if (o.kind === 'hay') {
      ctx.fillStyle = COLORS.hayDark;
      ctx.beginPath();
      ctx.arc(o.x, o.y + 4, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.hay;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.hayDark;
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(o.x, o.y + 6, o.r - 8, Math.PI * (0.15 + i * 0.18), Math.PI * (0.3 + i * 0.18));
        ctx.stroke();
      }
    } else if (o.kind === 'pumpkin') {
      ctx.fillStyle = COLORS.pumpkinDark;
      ctx.beginPath();
      ctx.arc(o.x, o.y + 3, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.pumpkin;
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, o.r, o.r * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.pumpkinDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, o.r * 0.45, o.r * 0.88, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#4e9a3d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.r * 0.85);
      ctx.quadraticCurveTo(o.x + 4, o.y - o.r - 6, o.x + 9, o.y - o.r - 4);
      ctx.stroke();
    } else if (o.kind === 'oven') {
      const glow = 0.5 + Math.sin(time * 5) * 0.25;
      ctx.fillStyle = COLORS.oven;
      roundRect(ctx, o.x, o.y, o.w, o.h, 10);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 122, 26, ${glow})`;
      roundRect(ctx, o.x + 18, o.y + 16, o.w - 36, o.h - 32, 6);
      ctx.fill();
      ctx.fillStyle = '#2b2b33';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HOT OVEN!', o.x + o.w / 2, o.y - 8);
    }
  }
}

function drawGate(ctx, gate, time) {
  const glow = gate.open ? 0.55 + Math.sin(time * 6) * 0.3 : 0;
  ctx.save();
  if (gate.open) {
    ctx.shadowColor = '#7CFC00';
    ctx.shadowBlur = 26 * glow + 8;
  }
  ctx.fillStyle = COLORS.gate;
  ctx.fillRect(gate.x - 6, gate.y - 10, 12, gate.h + 10);
  ctx.fillRect(gate.x + gate.w - 6, gate.y - 10, 12, gate.h + 10);
  ctx.fillRect(gate.x - 10, gate.y - 14, gate.w + 20, 14);
  ctx.restore();
  ctx.fillStyle = gate.open ? '#b6ff7a' : '#3f6b2f';
  ctx.beginPath();
  ctx.arc(gate.x + gate.w / 2, gate.y + gate.h / 2, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d3a12';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(gate.open ? 'GO!' : 'LOCKED', gate.x + gate.w / 2, gate.y + gate.h / 2 + 5);
  ctx.fillStyle = '#1d3a12';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('FOREST', gate.x + gate.w / 2, gate.y - 22);
  // Pine trees past the gate, so escape has somewhere to go.
  ctx.fillStyle = '#2f6b2f';
  for (const [tx, ty, s] of [[gate.x + 92, gate.y + 10, 1], [gate.x + 96, gate.y + 52, 0.8], [gate.x - 34, gate.y + 30, 0.9]]) {
    ctx.beginPath();
    ctx.moveTo(tx, ty - 34 * s);
    ctx.lineTo(tx - 16 * s, ty + 8 * s);
    ctx.lineTo(tx + 16 * s, ty + 8 * s);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCorn(ctx, corn, time) {
  for (const c of corn) {
    if (c.taken) continue;
    const bob = Math.sin(time * 3 + c.x) * 2;
    ctx.save();
    ctx.translate(c.x, c.y + bob);
    if (c.golden) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 14;
    }
    ctx.rotate(-0.5);
    ctx.fillStyle = c.golden ? '#ffd700' : COLORS.corn;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 120, 0, 0.5)';
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(i * 4 - 1, -8, 2, 16);
    }
    ctx.fillStyle = COLORS.cornHusk;
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(-11, 18);
    ctx.lineTo(-2, 12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(11, 18);
    ctx.lineTo(2, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawKnives(ctx, knives) {
  for (const k of knives) {
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(k.angle);
    ctx.fillStyle = '#dfe6ec';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(-12, -3, 7, 6);
    ctx.restore();
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
  ctx.fillStyle = COLORS.hudText;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText(`SCORE ${state.score}`, 16, 20);
  ctx.font = '18px sans-serif';
  ctx.fillText(`🌽 ${state.cornCollected}/${state.cornNeeded}`, 16, 42);
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.levelDef.name, FIELD.width / 2, 20);
  ctx.font = '16px sans-serif';
  const mins = Math.floor(state.time / 60);
  const secs = Math.floor(state.time % 60).toString().padStart(2, '0');
  ctx.fillText(`TIME ${mins}:${secs}`, FIELD.width / 2, 42);
  // Lives as hearts, right side.
  ctx.textAlign = 'right';
  ctx.font = '22px sans-serif';
  let hearts = '';
  for (let i = 0; i < TURKEY.lives; i++) hearts += i < state.lives ? '❤' : '♡';
  ctx.fillText(hearts, FIELD.width - 16, 20);
  // Dash cooldown bar.
  const frac = 1 - Math.max(0, state.turkey.dashCooldown) / 1.05;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, FIELD.width - 176, 36, 160, 8, 4);
  ctx.fill();
  ctx.fillStyle = frac >= 1 ? '#7CFC00' : '#ffb347';
  roundRect(ctx, FIELD.width - 176, 36, 160 * frac, 8, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '12px sans-serif';
  ctx.fillText(frac >= 1 ? 'DASH READY (SPACE / CLICK)' : 'DASH…', FIELD.width - 16, 50);
  ctx.textAlign = 'left';
}

/** The level banner that flashes when a stage begins. */
function drawBanner(ctx, state) {
  if (!state.banner || state.banner.t <= 0) return;
  const alpha = Math.min(1, state.banner.t * 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(40, 26, 12, 0.75)';
  roundRect(ctx, FIELD.width / 2 - 320, 150, 640, 110, 16);
  ctx.fill();
  ctx.fillStyle = COLORS.title;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.banner.text, FIELD.width / 2, 190);
  ctx.font = '17px sans-serif';
  ctx.fillText(state.banner.sub, FIELD.width / 2, 226);
  ctx.restore();
}

/** The "HIDDEN" tag while the turkey is out of the farmer's sight. */
function drawHiddenTag(ctx, state) {
  if (state.farmer.state !== 'chase' && state.screen === SCREEN_PLAY) {
    ctx.save();
    ctx.fillStyle = 'rgba(30, 60, 20, 0.85)';
    roundRect(ctx, state.turkey.x - 34, state.turkey.y - 52, 68, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#b6ff7a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', state.turkey.x, state.turkey.y - 41);
    ctx.restore();
  }
}

function drawTitle(ctx, state, time) {
  // Autumn sky and rolling farm behind the title.
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, '#ffcf7d');
  sky.addColorStop(0.55, '#f7a44a');
  sky.addColorStop(1, '#c96f2e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#7da95c';
  ctx.beginPath();
  ctx.ellipse(FIELD.width / 2, FIELD.height + 60, 700, 190, 0, Math.PI, 0);
  ctx.fill();
  // A barn silhouette and fence on the hill.
  ctx.fillStyle = '#8a3b2e';
  ctx.fillRect(90, 380, 130, 110);
  ctx.beginPath();
  ctx.moveTo(80, 380);
  ctx.lineTo(155, 330);
  ctx.lineTo(230, 380);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.fence;
  for (let x = 640; x < 920; x += 46) ctx.fillRect(x, 470, 8, 34);
  ctx.fillRect(640, 478, 280, 6);
  ctx.fillRect(640, 492, 280, 6);

  // The hero turkey, big and centre-left, clear of the START button.
  ctx.save();
  ctx.translate(232, 412);
  ctx.scale(2.6, 2.6);
  const hero = {
    x: 0, y: 0, facing: 1, moving: false, stepPhase: 0,
    dashTime: 0, dashCooldown: 0, invulnerable: 0,
  };
  drawTurkey(ctx, hero, time);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.title;
  ctx.font = 'bold 74px sans-serif';
  ctx.shadowColor = 'rgba(60, 20, 0, 0.55)';
  ctx.shadowBlur = 12;
  ctx.fillText('TURKEY RUN', FIELD.width / 2, 132);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText('Escape the farmer — or be Thanksgiving dinner!', FIELD.width / 2, 176);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#fff3d6';
  ctx.fillText('WASD / Arrows — run      SPACE or Click — dash', FIELD.width / 2, 250);
  ctx.fillText('Grab the corn to unlock the forest gate. Hide behind haystacks.', FIELD.width / 2, 278);
  ctx.fillText('Dodge the carving knives. Mind the oven. Three lives. Three stages.', FIELD.width / 2, 306);

  const hovered = inButton(state.mouse.x, state.mouse.y, FIELD.width / 2 - 130, 350, 260, 58);
  drawButton(ctx, FIELD.width / 2 - 130, 350, 260, 58, '▶  START RUN', hovered);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'rgba(255, 243, 214, 0.85)';
  ctx.fillText('M — mute sound', FIELD.width / 2, 448);
  if (state.best > 0) ctx.fillText(`Best score: ${state.best}`, FIELD.width / 2, 474);
}

function drawEnd(ctx, state, time) {
  const escaped = state.screen === SCREEN_ESCAPED;
  const bg = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  if (escaped) {
    bg.addColorStop(0, '#2f7a3d');
    bg.addColorStop(1, '#123f1e');
  } else {
    bg.addColorStop(0, '#8a2f23');
    bg.addColorStop(1, '#3d130c');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  ctx.save();
  ctx.translate(FIELD.width / 2, 250);
  ctx.scale(2.2, 2.2);
  const hero = {
    x: 0, y: 0, facing: 1, moving: false, stepPhase: 0,
    dashTime: 0, dashCooldown: 0, invulnerable: 0,
  };
  drawTurkey(ctx, hero, time);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.title;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', FIELD.width / 2, 150);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText(
    escaped ? 'The turkey made it to the forest. Thanksgiving is cancelled!' : 'The farmer got his dinner after all…',
    FIELD.width / 2,
    196,
  );
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#fff3d6';
  ctx.fillText(`Score: ${state.score}    Corn: ${state.totalCorn}    Time: ${Math.floor(state.time)}s`, FIELD.width / 2, 340);
  ctx.fillText(`Best score: ${Math.max(state.best, state.score)}`, FIELD.width / 2, 372);

  const hovered = inButton(state.mouse.x, state.mouse.y, FIELD.width / 2 - 130, 420, 260, 58);
  drawButton(ctx, FIELD.width / 2 - 130, 420, 260, 58, '↻  RUN AGAIN', hovered, escaped ? '#7CFC00' : '#e8762a');
  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'rgba(255, 243, 214, 0.85)';
  ctx.fillText('or press R', FIELD.width / 2, 512);
}

/** Paint one frame for the current state. */
export function render(ctx, state, time) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  if (state.screen === SCREEN_TITLE) {
    drawTitle(ctx, state, time);
    return;
  }
  if (state.screen === SCREEN_CAUGHT || state.screen === SCREEN_ESCAPED) {
    drawEnd(ctx, state, time);
    return;
  }
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawGround(ctx, state.levelDef.ground, time);
  drawGate(ctx, state.level.gate, time);
  drawObstacles(ctx, state.level.obstacles, time);
  drawCorn(ctx, state.level.corn, time);
  drawKnives(ctx, state.knives);
  drawFarmer(ctx, state.farmer, time);
  drawTurkey(ctx, state.turkey, time);
  drawParticles(ctx, state.particles);
  drawHiddenTag(ctx, state);
  ctx.restore();
  drawHud(ctx, state);
  drawBanner(ctx, state);
  // Wind-up telegraph: a red line from the farmer while he aims a knife.
  if (state.farmer.windup > 0 && state.farmer.state === 'chase') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 46, 46, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(state.farmer.x, state.farmer.y);
    ctx.lineTo(state.turkey.x, state.turkey.y);
    ctx.stroke();
    ctx.restore();
  }
}
