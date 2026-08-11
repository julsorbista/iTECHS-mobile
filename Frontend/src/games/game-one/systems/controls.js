import Phaser from 'phaser';

const resolveKeyCode = (value, fallback) => {
  const normalized = typeof value === 'string'
    ? value.trim().toUpperCase().replace(/\s+/g, '_')
    : '';
  return Phaser.Input.Keyboard.KeyCodes[normalized] || fallback;
};

export const createControls = (scene, keybinds = {}, mobileControls = null) => {
  const cursors = scene.input.keyboard.createCursorKeys();
  const wasd = scene.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    right: Phaser.Input.Keyboard.KeyCodes.D,
    pause: Phaser.Input.Keyboard.KeyCodes.ESC,
    jump: resolveKeyCode(keybinds.jumpKeybind, Phaser.Input.Keyboard.KeyCodes.SPACE),
    attack: resolveKeyCode(keybinds.projectileKeybind, Phaser.Input.Keyboard.KeyCodes.J),
    interact: Phaser.Input.Keyboard.KeyCodes.E,
    dash: resolveKeyCode(keybinds.dashKeybind, Phaser.Input.Keyboard.KeyCodes.SHIFT),
  });

  return {
    cursors,
    wasd,
    mobileControls,
  };
};

export const readMovementIntent = (controls) => {
  const mobileControls = controls.mobileControls || {};
  const left = controls.cursors.left.isDown || controls.wasd.left.isDown || Boolean(mobileControls.left);
  const right = controls.cursors.right.isDown || controls.wasd.right.isDown || Boolean(mobileControls.right);
  const upPressed = Phaser.Input.Keyboard.JustDown(controls.cursors.up)
    || Phaser.Input.Keyboard.JustDown(controls.wasd.up)
    || Phaser.Input.Keyboard.JustDown(controls.wasd.jump);
  const spacePressed = Phaser.Input.Keyboard.JustDown(controls.cursors.space);
  const dashPressed = Phaser.Input.Keyboard.JustDown(controls.wasd.dash);
  const attackPressed = Phaser.Input.Keyboard.JustDown(controls.wasd.attack);
  const mobileJumpPressed = Boolean(mobileControls.jumpQueued);
  if (mobileJumpPressed) {
    mobileControls.jumpQueued = false;
  }
  const jumpPressed = upPressed || spacePressed || mobileJumpPressed;

  return {
    left,
    right,
    jumpPressed,
    dashPressed,
    attackPressed,
  };
};

export const wasPausePressed = (controls) => Phaser.Input.Keyboard.JustDown(controls.wasd.pause);
export const wasInteractPressed = (controls) => Phaser.Input.Keyboard.JustDown(controls.wasd.interact);
