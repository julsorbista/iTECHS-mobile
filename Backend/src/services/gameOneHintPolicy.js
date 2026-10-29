const clean = (text, limit) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, limit);
const comparable = (text) => clean(text, 2000).toLowerCase().replace(/[^a-z0-9]/g, '');
const revealsAnswer = (hint, target) => {
  const answer = comparable(target);
  return (answer.length >= 2 && comparable(hint).includes(answer))
    || /\b(?:answer|correct word|target word)\s+(?:is|would be|must be)\b/i.test(hint)
    || /\b(?:spell|spelled|spelling|anagram|jumbled)\b/i.test(hint)
    || /\b(?:starts?|begins?|ends?)\s+with\b/i.test(hint)
    || /\b(?:has|contains?)\s+\d+\s+letters?\b/i.test(hint);
};
const validateGameOneHintRequest = (body) => {
  if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 10) return false;
  if (typeof body.variationSeed !== 'string' || !body.variationSeed.trim() || body.variationSeed.length > 128) return false;
  const ids = new Set();
  return body.items.every((item) => {
    if (item?.kind !== 'hints' || typeof item.id !== 'string' || !item.id.trim() || item.id.length > 80
      || ids.has(item.id) || typeof item.target !== 'string' || !item.target.trim() || item.target.length > 80
      || typeof item.context !== 'string' || item.context.length > 2000
      || (item.fallbackHints != null && (!Array.isArray(item.fallbackHints) || item.fallbackHints.length > 10
        || item.fallbackHints.some((hint) => typeof hint !== 'string' || hint.length > 500)))) return false;
    ids.add(item.id);
    return true;
  });
};
const safeHints = (hints, target) => [...new Set((Array.isArray(hints) ? hints : [])
  .filter((hint) => typeof hint === 'string').map((hint) => clean(hint, 140))
  .filter((hint) => hint && !revealsAnswer(hint, target)))];
const fallbackHints = (item) => safeHints([
  ...(item.fallbackHints || []),
  'Recall the purpose of the feature described in the question.',
  'Connect the behavior described in your collected scrolls to the lesson examples.',
  'Choose the term that explains how those examples work together.',
  'Review the task this feature performs while a program runs.',
  'Compare the examples in the lesson and identify their shared purpose.',
], item.target).slice(0, 3);
const validateGeneratedHints = (item, target) => Array.isArray(item?.hints)
  && item.hints.length === 3
  && item.hints.every((hint) => typeof hint === 'string' && hint.trim() && hint.length <= 140 && !revealsAnswer(hint, target))
  && new Set(item.hints.map((hint) => hint.trim().toLowerCase())).size === 3;
module.exports = { validateGameOneHintRequest, fallbackHints, validateGeneratedHints };
