// Local tutorial state only. No gameplay callbacks, scores, lives or storage.
export const makePractice = () => ({ pieceIndex: 0, hazardPassed: false, feedback: '' });

export const getPracticeDecoy = (challenge) => {
  const valid = new Set([challenge?.targetCode, ...(challenge?.pieces || [])]);
  // Prefer a short existing decoy so its spelling remains readable on phones.
  return (challenge?.decoys || []).filter((text) => text && !valid.has(text))
    .sort((a, b) => a.length - b.length)[0] || null;
};

// Segment/rectangle intersection also catches fast swipes crossing a whole card.
export const crossesPracticeCard = (a, b, card) => {
  let enter = 0;
  let leave = 1;
  for (const axis of ['x', 'y']) {
    const half = (axis === 'x' ? card.width : card.height) / 2;
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 0.001) {
      if (a[axis] < card[axis] - half || a[axis] > card[axis] + half) return false;
    } else {
      const first = (card[axis] - half - a[axis]) / delta;
      const last = (card[axis] + half - a[axis]) / delta;
      enter = Math.max(enter, Math.min(first, last));
      leave = Math.min(leave, Math.max(first, last));
      if (enter > leave) return false;
    }
  }
  return true;
};

export const applyPracticeSwipe = (practice, challenge, phase, cards, a, b) => {
  if (Math.hypot(b.x - a.x, b.y - a.y) < 12) return practice;
  const hit = cards.filter((card) => crossesPracticeCard(a, b, card));
  if (!hit.length) return practice;
  // A swipe crossing a hazard AND a valid card must not teach unsafe slicing.
  if (hit.some((card) => card.kind !== 'correct')) {
    return { ...practice, feedback: 'That is a hazard. Try the matching green code instead. No life lost.' };
  }
  if (phase === 'hazards') return { ...practice, hazardPassed: true, feedback: 'Clean slice! You avoided the hazards.' };
  if (phase !== 'slice' || practice.pieceIndex >= challenge.pieces.length) return practice;
  if (hit[0].text !== challenge.pieces[practice.pieceIndex]) return practice;
  return { ...practice, pieceIndex: practice.pieceIndex + 1,
    feedback: practice.pieceIndex + 1 === challenge.pieces.length ? 'Statement complete! Practice only—your real Output stays unchanged.' : 'Correct piece! Release, then slice the next one.' };
};

export const buildPracticeCards = (phase, challenge, practice, width, height) => {
  if (!['slice', 'hazards'].includes(phase) || !challenge?.pieces?.length) return [];
  if (phase === 'slice' && practice.pieceIndex >= challenge.pieces.length) return [];
  const base = { phase: 0, spin: 0, height: 84 };
  const text = challenge.pieces[phase === 'hazards' ? 0 : practice.pieceIndex];
  const make = (kind, value, x, y, maxWidth) => ({ ...base, kind, text: value, x, y,
    width: Math.min(maxWidth, Math.max(180, 80 + String(value).length * 13)) });
  if (phase === 'slice') return [make('correct', text, width / 2, height * .44, width - 64)];
  const decoy = getPracticeDecoy(challenge);
  return [
    make('correct', text, width / 2, height * .3, width - 64),
    ...(decoy ? [make('wrong', decoy, width * .29, height * .7, Math.max(140, width * .5 - 24))] : []),
    { ...base, kind: 'bomb', text: '', x: width * .77, y: height * .7, width: 105, height: 116 },
  ];
};
