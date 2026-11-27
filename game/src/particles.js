// Turkey Run — particles: short-lived visual feedback.
// One job: bursts of feathers, corn sparks and dust that make every
// pickup, dash and hit feel answered at once.

/** Spawn a burst of `count` particles at (x, y). */
export function spawnBurst(particles, x, y, options) {
  const { count = 12, colors = ['#ffd76a'], speed = 160, size = 4, life = 0.6, gravity = 0 } = options ?? {};
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.65);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 40,
      size: size * (0.6 + Math.random() * 0.8),
      color: colors[Math.floor(Math.random() * colors.length)],
      life: life * (0.6 + Math.random() * 0.7),
      age: 0,
      gravity,
      spin: (Math.random() - 0.5) * 8,
      rot: Math.random() * Math.PI * 2,
    });
  }
}

/** Golden sparks for a corn pickup. */
export function cornBurst(particles, x, y, golden) {
  spawnBurst(particles, x, y, {
    count: golden ? 22 : 12,
    colors: golden ? ['#ffd700', '#fff3a0', '#ff9d00'] : ['#f7d038', '#fff0a0', '#e8a91c'],
    speed: golden ? 220 : 150,
    size: 4,
    life: 0.55,
    gravity: 220,
  });
}

/** A puff of brown feathers when the turkey is hit. */
export function featherBurst(particles, x, y) {
  spawnBurst(particles, x, y, {
    count: 18,
    colors: ['#8b5a2b', '#a06a33', '#fff3d6', '#c0392b'],
    speed: 200,
    size: 6,
    life: 0.8,
    gravity: 300,
  });
}

/** Dust kicked up by a dash. */
export function dustPuff(particles, x, y) {
  spawnBurst(particles, x, y, {
    count: 8,
    colors: ['#d8c9a8', '#c9b98a', '#b8a888'],
    speed: 70,
    size: 5,
    life: 0.45,
    gravity: -30,
  });
}

/** Advance every particle; drop the dead ones. */
export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 1.6 * dt;
    p.rot += p.spin * dt;
  }
}

/** Draw every particle as a small fading square. */
export function drawParticles(ctx, particles) {
  for (const p of particles) {
    const alpha = 1 - p.age / p.life;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }
}
