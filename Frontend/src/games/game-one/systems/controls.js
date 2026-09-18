import Phaser from 'phaser';

const resolveKeyCode = (value, fallback) => {
  const normalized = typeof value === 'string'
    ? value.trim().toUpperCase().replace(/\s+/g, '_')
    : '';
  return Phaser.Input.Keyboard.KeyCodes[normalized] || fallback;
};

export const createControls = (scene, keybinds = {}) => {
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
    mobile: scene.game.__ITECHS_GAME_ONE_MOBILE_CONTROLS__ || null,
  };
};

export const readMovementIntent = (controls) => {
  const mobile = controls.mobile?.current || {};
  const left = controls.cursors.left.isDown || controls.wasd.left.isDown || Boolean(mobile.left);
  const right = controls.cursors.right.isDown || controls.wasd.right.isDown || Boolean(mobile.right);
  const upPressed = Phaser.Input.Keyboard.JustDown(controls.cursors.up)
    || Phaser.Input.Keyboard.JustDown(controls.wasd.up)
    || Phaser.Input.Keyboard.JustDown(controls.wasd.jump);
  const spacePressed = Phaser.Input.Keyboard.JustDown(controls.cursors.space);
  const dashPressed = Phaser.Input.Keyboard.JustDown(controls.wasd.dash);
  const attackPressed = Phaser.Input.Keyboard.JustDown(controls.wasd.attack);
  const jumpPressed = upPressed || spacePressed || Boolean(mobile.jumpQueued);
  const mobileDashPressed = Boolean(mobile.dashQueued);
  const mobileAttackPressed = Boolean(mobile.attackQueued);

  if (controls.mobile?.current) {
    controls.mobile.current.jumpQueued = false;
    controls.mobile.current.dashQueued = false;
    controls.mobile.current.attackQueued = false;
  }

  return {
    left,
    right,
    jumpPressed,
    dashPressed: dashPressed || mobileDashPressed,
    attackPressed: attackPressed || mobileAttackPressed,
  };
};

export const wasPausePressed = (controls) => Phaser.Input.Keyboard.JustDown(controls.wasd.pause);
export const wasInteractPressed = (controls) => Phaser.Input.Keyboard.JustDown(controls.wasd.interact);

export const resetControls = (controls) => {
  if (!controls) return;
  const keys = [
    ...Object.values(controls.cursors || {}),
    ...Object.values(controls.wasd || {}),
  ];
  new Set(keys).forEach((key) => key?.reset?.());
  if (controls.mobile?.current) {
    controls.mobile.current.left = false;
    controls.mobile.current.right = false;
    controls.mobile.current.jumpQueued = false;
    controls.mobile.current.dashQueued = false;
    controls.mobile.current.attackQueued = false;
  }
};
