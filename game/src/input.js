// Keyboard and mouse input. Held keys give a move/steer vector; one-shot presses (start,
// pause, enter car, punch, mute) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. The mouse aims and fires.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;
export const ACTION_ADVANCE = 32;
export const ACTION_RACE = 64;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const MUTE = new Set(['KeyM']);
const RACE = new Set(['KeyR']);

export function createInput(target) {
  const held = { up: false, down: false, left: false, right: false, sprint: false, brake: false };
  let actions = 0;
  let firing = false;
  const mouse = { x: 640, y: 360, inside: false };

  function onKeyDown(event) {
    if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.sprint = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM | ACTION_ADVANCE;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (ENTER.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (PUNCH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PUNCH;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RACE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RACE;
    } else return;
    event.preventDefault();
  }

  function onKeyUp(event) {
    if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.sprint = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = held.sprint = false;
    firing = false;
  });
  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
    mouse.y = ((event.clientY - rect.top) / rect.height) * 720;
    mouse.inside = true;
  });
  target.addEventListener('pointerdown', (event) => {
    if (event.button === 0) {
      firing = true;
      actions |= ACTION_ADVANCE;
    }
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) firing = false;
  });

  return {
    /** -1/0/1 on each axis from the held keys. */
    move() {
      return { x: (held.right ? 1 : 0) - (held.left ? 1 : 0), y: (held.down ? 1 : 0) - (held.up ? 1 : 0) };
    },
    sprinting() {
      return held.sprint;
    },
    firing() {
      return firing;
    },
    mouse() {
      return mouse;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

/** A scripted input for screenshot poses: the autopilot sets these directly each step. */
export function createScriptedInput() {
  const moveVector = { x: 0, y: 0 };
  const mousePos = { x: 640, y: 360, inside: true };
  let fire = false;
  let sprint = false;
  return {
    setMove(x, y) {
      moveVector.x = x;
      moveVector.y = y;
    },
    setMouse(x, y) {
      mousePos.x = x;
      mousePos.y = y;
    },
    setFiring(value) {
      fire = value;
    },
    setSprint(value) {
      sprint = value;
    },
    move() {
      return moveVector;
    },
    sprinting() {
      return sprint;
    },
    firing() {
      return fire;
    },
    mouse() {
      return mousePos;
    },
    takeActions() {
      return 0;
    },
  };
}
