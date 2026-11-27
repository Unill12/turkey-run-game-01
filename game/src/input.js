// Turkey Run — keyboard and mouse input.
// One job: turn raw DOM events into one clean input snapshot the game
// reads each frame: which keys are held, where the mouse is, and which
// clicks happened since the last frame.

/** The keys the game listens to, so the page never scrolls while playing. */
const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Enter', 'KeyR', 'KeyM',
]);

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    /** Codes pressed since the last take: edge events, so a quick tap is never lost between frames. */
    pressed: new Set(),
    mouse: { x: 0, y: 0, inside: false },
    /** Clicks since the last consume: {x, y} in canvas coordinates. */
    clicks: [],
    /** True while the pointer is held down. */
    mouseDown: false,
  };

  const toCanvas = (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  window.addEventListener('keydown', (event) => {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    if (!event.repeat) {
      input.keys.add(event.code);
      input.pressed.add(event.code);
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const p = toCanvas(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    input.mouse.inside = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toCanvas(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouseDown = true;
    input.clicks.push(p);
  });
  window.addEventListener('pointerup', () => {
    input.mouseDown = false;
  });
  return input;
}

/** The held movement direction, normalised, from WASD or the arrow keys. */
export function moveDirection(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

/** True when the player just asked to dash (Space held counts once per press). */
export function dashPressed(input) {
  return input.keys.has('Space');
}

/** Take and clear the key presses queued since the last frame. */
export function takePressed(input) {
  const pressed = input.pressed;
  input.pressed = new Set();
  return pressed;
}

/** Take and clear the clicks queued since the last frame. */
export function takeClicks(input) {
  const clicks = input.clicks;
  input.clicks = [];
  return clicks;
}
