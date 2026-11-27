// Turkey Run — a small seeded random generator.
// One job: deterministic randomness, so a screenshot seed always rebuilds
// the same farm and the same run.

/** Mulberry32: a tiny seeded PRNG with a uniform [0, 1) output. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max] from the generator. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** A float in [min, max) from the generator. */
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

/** One element of `items`, picked by the generator. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
