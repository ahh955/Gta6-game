// Solmar City — keyboard and mouse input. Tracks held keys, single-press
// edges (consumed once per frame) and the mouse position in canvas pixels.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    justPressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mouseClicked: false,
    // The key that was pressed most recently (for the start screen).
    lastKey: null,
  };

  function keyName(event) {
    // Normalise to lower-case letters; keep named keys as-is.
    if (event.key.length === 1) return event.key.toLowerCase();
    return event.key;
  }

  window.addEventListener('keydown', (event) => {
    const key = keyName(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!input.keys.has(key)) input.justPressed.add(key);
    input.keys.add(key);
    input.lastKey = key;
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(keyName(event));
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.mouseDown = true;
      input.mouseClicked = true;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });

  return input;
}

export function isDown(input, key) {
  return input.keys.has(key);
}

// True only on the frame the key went down; consume it so a later check in
// the same frame does not see it twice.
export function wasPressed(input, key) {
  if (input.justPressed.has(key)) {
    input.justPressed.delete(key);
    return true;
  }
  return false;
}

// True if the key went down this frame, without consuming it.
export function pressedThisFrame(input, key) {
  return input.justPressed.has(key);
}

export function endFrameInput(input) {
  input.justPressed.clear();
  input.mouseClicked = false;
}
