// Tutorial-only state. No gameplay callbacks, storage, rewards or run tracking.
export const buildTutorialDeck = (deck = []) => {
  const pairIds = [...new Set(deck.map((card) => card.pairId))]
    .filter((id) => deck.filter((card) => card.pairId === id).length >= 2).slice(0, 2);
  return pairIds.flatMap((id) => deck.filter((card) => card.pairId === id).slice(0, 2))
    // Separate the matching cards, without changing the real shuffled deck.
    .sort((a, b) => deck.indexOf(a) - deck.indexOf(b)).map((card) => ({ ...card }));
};

export const createPractice = () => ({ selected: [], phase: 'select', attempts: 0, points: 0, feedback: '' });

export const getPracticeTarget = (deck, state, mode) => {
  if (!['match', 'mismatch'].includes(mode) || state.phase !== 'select') return null;
  if (!state.selected.length) return deck[0] || null;
  const first = deck.find((card) => card.cardId === state.selected[0]);
  return deck.find((card) => card.cardId !== first?.cardId
    && (mode === 'match' ? card.pairId === first?.pairId : card.pairId !== first?.pairId)) || null;
};

export const selectPracticeCard = (deck, state, mode, cardId) => {
  const target = getPracticeTarget(deck, state, mode);
  if (!target || state.selected.includes(cardId) || !deck.some((card) => card.cardId === cardId)) return state;
  if (target.cardId !== cardId) return { ...state, feedback: 'Follow the glowing card. This is guided practice, so there is no penalty.' };
  const selected = [...state.selected, cardId];
  return { ...state, selected, feedback: '', phase: selected.length === 2 ? 'checking' : 'select', attempts: selected.length === 2 ? 1 : 0 };
};

export const resolvePractice = (state, mode) => state.phase !== 'checking' ? state : {
  ...state, phase: 'complete', points: mode === 'match' ? 100 : 0,
  selected: mode === 'match' ? state.selected : [],
};
