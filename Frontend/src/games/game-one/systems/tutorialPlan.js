const unique = (keys) => [...new Set(keys)];

// The resolved scene configuration includes both teacher settings and spawn overrides.
export const buildTutorialPlan = (config = {}) => {
  const jump = config.jumpKeybind || 'SPACE';
  const dash = config.dashKeybind || 'SHIFT';
  const attack = config.projectileKeybind || 'J';
  const groundDash = config.dashMode === 'GROUND_ONLY';
  const movements = [
    { id: 'left', title: 'Your first move', prompt: 'Move left to the glowing marker.', keys: ['A', '←'], control: 'left', tip: 'Hold to move. Release to stop before the edge.', success: 'Nice! Left movement learned.', target: 'player' },
    { id: 'right', title: 'Go the other way', prompt: 'Move right to the next marker.', keys: ['D', '→'], control: 'right', tip: 'Your facing direction also guides your dash and Arc Bolt, when enabled.', success: 'Nice! You have both directions.', target: 'player' },
    { id: 'jump', title: 'Find your footing', prompt: 'Jump above the glowing platform.', keys: unique([jump, 'W', '↑', 'SPACE']), control: 'jump', tip: 'Land safely to complete this move. Falls here cost nothing.', success: 'Perfect landing!', target: 'platform' },
    ...(config.allowMidairDash ? [{ id: 'dash', title: groundDash ? 'Try a dash' : 'Jump, then dash', prompt: groundDash ? `Press ${dash} to dash along the platform.` : `Jump first, then press ${dash} while in the air.`, keys: [dash], jumpKeys: groundDash ? [] : [jump], control: 'dash', tip: 'Dash follows the way you face. Practice falls return you safely.', success: 'Dash completed!', target: 'player' }] : []),
    ...(config.allowProjectile ? [{ id: 'attack', title: 'Try your Arc Bolt', prompt: `Press ${attack} and watch your bolt travel across the room.`, keys: [attack], control: 'attack', tip: 'This practice shot cannot hurt enemies or add to your recorded shots.', success: 'Arc Bolt fired!', target: 'player' }] : []),
  ];
  // Six visible pages; movement practice still observes the same safe physics.
  return [
    ...movements.map((step) => ({ ...step, page: 1, title: 'MOVEMENTS' })),
    { id: 'booster', page: 2, title: 'POWER-UPS', prompt: 'Collect boosters to gain power-ups!', tip: 'Look for helpful boosts as you explore.', target: 'booster', success: 'Boosters spotted!' },
    { id: 'coin', page: 3, title: 'COINS', prompt: 'Collect coins to buy hints.', tip: 'Save them for a riddle when you need help.', target: 'coin', success: 'Save your coins for hints!' },
    { id: 'scroll', page: 4, title: 'SCROLL CLUES', prompt: 'Collect 1 Scroll in each room to gain clues for the Treasure!', tip: 'Read each clue before moving to the next room.', target: 'scroll', success: 'Every clue brings you closer!' },
    { id: 'hazard', page: 5, title: 'MONSTERS', prompt: 'Defeat the monsters to clear the room.', tip: 'Watch your hearts and avoid enemy attacks.', target: 'monster', success: 'Stay alert and protect your hearts!' },
    { id: 'ready', page: 6, title: 'THE TREASURE', prompt: 'Final stage: get the Treasure and answer the riddle!', tip: 'Use the scroll clues you found along the way.', target: 'treasure' },
  ];
};

// Completion comes from observed practice physics, never from DOM keydown alone.
export const observeTutorialAction = (id, progress, sample) => {
  const next = { ...progress };
  if (id === 'left' || id === 'right') {
    const distance = (sample.x - progress.startX) * (id === 'left' ? -1 : 1);
    next.ratio = Math.max(0, Math.min(1, distance / progress.distance));
    next.complete = next.ratio >= 1;
  } else if (id === 'jump') {
    next.jumped = progress.jumped || sample.jumpAccepted;
    next.ratio = next.jumped ? 0.5 : 0;
    next.complete = Boolean(next.jumped && sample.grounded && sample.onSafePlatform && !sample.jumpAccepted);
    if (next.complete) next.ratio = 1;
  } else if (id === 'dash') {
    next.complete = Boolean(sample.dashAccepted);
    next.ratio = next.complete ? 1 : 0;
  } else if (id === 'attack') {
    next.complete = Boolean(sample.shotCreated);
    next.ratio = next.complete ? 1 : 0;
  }
  return next;
};

export const tutorialIntent = (step, intent, complete) => ({
  left: !complete && step === 'left' && intent.left,
  right: !complete && step === 'right' && intent.right,
  jumpPressed: !complete && ['jump', 'dash'].includes(step) && intent.jumpPressed,
  dashPressed: !complete && step === 'dash' && intent.dashPressed,
  attackPressed: !complete && step === 'attack' && intent.attackPressed,
  allowDoubleJump: false,
});

// Local demo intent only: never reads or dispatches student keyboard events.
export const automaticTutorialIntent = (step, { elapsed, now, grounded, jumpedAt, complete }) => {
  const ready = elapsed >= 800 && !complete;
  const airDash = step.id === 'dash' && step.jumpKeys?.length > 0;
  return tutorialIntent(step.id, {
    left: ready, right: ready,
    jumpPressed: ready && grounded && jumpedAt == null && (step.id === 'jump' || airDash),
    dashPressed: ready && (!airDash || (jumpedAt != null && !grounded && now - jumpedAt >= 120)),
    attackPressed: ready,
  }, complete);
};
