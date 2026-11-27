// Turkey Run — tiny WebAudio sound effects, synthesised, no audio files.
// One job: every chirp, thud and jingle the game plays, built from
// oscillators so the game ships no sound assets and loads nothing.

let ctx = null;
let muted = false;

/** Create (or reuse) the audio context. Call from a user gesture first. */
export function ensureAudio() {
  if (ctx === null) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = AC ? new AC() : null;
    } catch {
      ctx = null;
    }
  }
  if (ctx !== null && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, duration, type, volume, slideTo) {
  if (muted) return;
  const ac = ensureAudio();
  if (ac === null) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function noiseBurst(duration, volume, lowpass) {
  if (muted) return;
  const ac = ensureAudio();
  if (ac === null) return;
  const now = ac.currentTime;
  const len = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start(now);
}

export const sfx = {
  /** A bright two-note chirp when the turkey grabs corn. */
  pickup() {
    tone(880, 0.09, 'sine', 0.16);
    setTimeout(() => tone(1318, 0.12, 'sine', 0.14), 55);
  },
  /** A richer arpeggio for golden corn. */
  golden() {
    [660, 880, 1108, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.16), i * 60));
  },
  /** A soft whoosh for the dash. */
  dash() {
    noiseBurst(0.16, 0.12, 2400);
  },
  /** A rising alarm when the farmer spots the turkey. */
  spotted() {
    tone(520, 0.14, 'square', 0.09, 780);
    setTimeout(() => tone(780, 0.14, 'square', 0.09, 1040), 120);
  },
  /** A dull thud plus a squawk when the turkey is hit. */
  hurt() {
    tone(220, 0.22, 'sawtooth', 0.18, 90);
    noiseBurst(0.12, 0.1, 900);
  },
  /** A metallic zing when the farmer throws a knife. */
  throwKnife() {
    tone(1400, 0.12, 'sawtooth', 0.05, 500);
  },
  /** A click for menu buttons. */
  click() {
    tone(700, 0.05, 'sine', 0.12);
  },
  /** The gate opening: a warm rising chime. */
  gateOpen() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.15), i * 80));
  },
  /** A happy little fanfare for escaping. */
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.16), i * 110));
  },
  /** A low descending line for being caught. */
  caught() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sawtooth', 0.1), i * 130));
  },
};
