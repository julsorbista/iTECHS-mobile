export const normalizeCodeAnswer = (value) => (
  String(value || '').replace(/\s+/g, ' ').trim()
);

export const normalizeComparableAnswer = (value) => normalizeCodeAnswer(value).toLowerCase();

const resolveAcceptedPartIds = (slot) => {
  if (!slot || typeof slot !== 'object') {
    return [];
  }

  const candidates = [
    slot.correctPartId,
    slot.partId,
    slot.answerPartId,
    slot.acceptedPartId,
    ...(Array.isArray(slot.correctPartIds) ? slot.correctPartIds : []),
    ...(Array.isArray(slot.acceptedPartIds) ? slot.acceptedPartIds : []),
  ];

  return candidates
    .map((value) => String(value || '').trim())
    .filter(Boolean);
};

export const createInitialPlacementMap = (slots = []) => (
  (Array.isArray(slots) ? slots : []).reduce((map, slot) => {
    const slotId = String(slot?.id || '').trim();
    if (slotId) {
      map[slotId] = '';
    }
    return map;
  }, {})
);

export const applyCorrectDrop = (placements = {}, slotId, partId) => ({
  ...(placements && typeof placements === 'object' ? placements : {}),
  [slotId]: String(partId || '').trim(),
});

export const getPlacedCount = (placements = {}) => (
  Object.values(placements && typeof placements === 'object' ? placements : {})
    .filter((value) => String(value || '').trim()).length
);

export const isCorrectDrop = (slot, partId) => {
  const normalizedPartId = String(partId || '').trim();
  if (!normalizedPartId) {
    return false;
  }

  return resolveAcceptedPartIds(slot).includes(normalizedPartId);
};

export const isLevelCompleted = (placements = {}, slots = []) => {
  const slotList = Array.isArray(slots) ? slots : [];
  if (slotList.length === 0) {
    return false;
  }

  return slotList.every((slot) => {
    const slotId = String(slot?.id || '').trim();
    return slotId && String(placements?.[slotId] || '').trim();
  });
};

export const isCodingAnswerCorrect = (task, answer) => {
  if (!task) {
    return false;
  }

  if (task.type === 'reorder') {
    const correctOrder = Array.isArray(task.correctOrder) ? task.correctOrder : [];
    const submittedOrder = Array.isArray(answer) ? answer : [];
    return correctOrder.length > 0
      && correctOrder.length === submittedOrder.length
      && correctOrder.every((item, index) => item === submittedOrder[index]);
  }

  if (task.type === 'choice') {
    return String(answer || '') === String(task.correctOptionId || '');
  }

  if (Array.isArray(task.acceptedAnswers)) {
    const submitted = normalizeComparableAnswer(answer);
    return task.acceptedAnswers.some((candidate) => normalizeComparableAnswer(candidate) === submitted);
  }

  return normalizeCodeAnswer(answer) === normalizeCodeAnswer(task.answer);
};
