const numberOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const levelIdentity = (gameNumber, levelData, fallbackTitle) => {
  const levelNumber = Math.max(1, Math.round(numberOr(levelData?.levelNumber, 1)));
  return {
    levelNumber,
    kicker: `Game ${gameNumber} · Level ${levelNumber}`,
    title: `${levelData?.title || fallbackTitle} Guide`,
  };
};

const progressionSection = (minimumStars = 1, policyAffectsStars = true) => ({
  title: 'How to Pass This Level',
  items: [
    `Finish the level with at least ${minimumStars} ${minimumStars === 1 ? 'Star' : 'Stars'} to pass.`,
    'A passed result unlocks the next available level.',
    policyAffectsStars
      ? 'Avoid extra mistakes because they can reduce your final Stars; hints are paid for with coins.'
      : 'Complete every required task to earn the Stars reported by this game.',
  ],
});

const policyItems = ({ freeMistakes = 3 } = {}) => [
  `You begin with 3 platform Stars; the first ${freeMistakes} mistake${freeMistakes === 1 ? '' : 's'} do not reduce them.`,
  'Each additional mistake removes 1 Star; hints cost 1 coin and do not remove Stars.',
  'Retries and the number of Stars earned can lower the final recorded score.',
];

const removeDuplicateItems = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const twoPageGuide = (identity, lead, items) => {
  const dedupedItems = removeDuplicateItems(items);
  const splitIndex = Math.max(1, Math.ceil(dedupedItems.length / 2));
  return {
    ...identity,
    lead,
    summary: dedupedItems.slice(0, splitIndex),
    sections: [
      {
        title: identity.title,
        items: dedupedItems.slice(splitIndex),
      },
    ],
  };
};

export const buildGameTwoGuideContent = (levelData = {}, policy = {}) => {
  const identity = levelIdentity(2, levelData, 'Java Code Lab');
  const tasks = Array.isArray(levelData?.tasks) ? levelData.tasks : [];
  const slots = Array.isArray(levelData?.slots) ? levelData.slots : [];
  const taskCount = tasks.length || slots.length;
  const codeLab = tasks.length > 0;
  const configuredPoints = tasks.reduce((sum, task) => sum + Math.max(0, numberOr(task?.points, 0)), 0);
  const configuredCoins = tasks.reduce((sum, task) => sum + Math.max(0, numberOr(task?.coinReward, 1)), 0);
  const settings = levelData?.settings || {};
  const requiredCorrectCount = Math.max(1, Math.ceil(taskCount * 0.8));
  const hintCoinCost = 1;

  return twoPageGuide(
    identity,
    'Read the goal, task count, scoring, Stars, and level-only requirements before you begin.',
    [
      levelData?.objective || (codeLab
        ? 'Repair each Java task by placing the correct snippet.'
        : 'Place every component correctly and resolve its question.'),
      `${taskCount} required ${codeLab ? 'coding task' : 'placement'}${taskCount === 1 ? '' : 's'}.`,
      codeLab ? 'Compile every task after filling all required slots.' : 'Lock every required block into its matching slot.',
      `${taskCount} required ${codeLab ? 'tasks' : 'placements'} in Level ${identity.levelNumber}.`,
      settings.seconds
        ? `Suggested completion time: ${settings.seconds} seconds. The timer does not automatically end this Code Lab.`
        : 'There is no countdown timer in this level.',
      settings.maxMistakes
        ? `Mistake target: stay at or below ${settings.maxMistakes}. This is not an automatic fail limit.`
        : 'Mistakes are recorded and can affect Stars and final score.',
      Number.isFinite(Number(settings.targetPoints))
        ? `Reference target: ${settings.targetPoints} points, with ${numberOr(settings.bonusPerSecond, 0)} reference bonus points per second. These values are not added by the current Code Lab.`
        : 'This level has no separate target-points setting.',
      ...(codeLab ? [
        'You have 3 Compile checks for each task. Change a wrong answer before trying again.',
        `This level has up to ${taskCount * 3} Compile checks across ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}. Checks cannot be moved between tasks.`,
        `To pass, answer at least ${requiredCorrectCount} of ${taskCount} tasks correctly and earn at least 2 task Stars.`,
      ] : []),
      codeLab
        ? `Each correct task submits 1 base point (maximum submitted base score: ${taskCount}).`
        : 'Correct question answers add the points configured by the hardware activity.',
      `The task data contains ${configuredPoints} reference points; the recorded base score uses the number of correct tasks instead.`,
      `Correct tasks can award up to ${configuredCoins} configured coins; the run starts with at least ${taskCount} coins and each revealed hint costs ${hintCoinCost}.`,
      `At least ${Math.ceil(taskCount * 0.9)} of ${taskCount} correct with no more than 3 mistakes earns 3 task Stars.`,
      `At least ${Math.ceil(taskCount * 0.8)} of ${taskCount} correct with no more than 4 mistakes earns 2 task Stars.`,
      `At least ${Math.ceil(taskCount * 0.5)} of ${taskCount} correct with no more than 5 mistakes earns 1 task Star.`,
    ],
  );
};

export const buildGameThreeGuideContent = (levelData = {}, policy = {}) => {
  const identity = levelIdentity(3, levelData, 'Memory Card Game');
  const pairs = Array.isArray(levelData?.pairs) ? levelData.pairs : [];
  const pairCount = pairs.length;
  const settings = levelData?.settings || {};
  return twoPageGuide(
    identity,
    'Read the card count, turn limit, score, Stars, and level-only requirements before you begin.',
    [
      levelData?.objective || 'Match every card pair before the flip attempts run out.',
      `${pairCount} pairs (${pairCount * 2} cards) must be resolved.`,
      'Each matched pair immediately adds 1 point.',
      `This level begins with ${pairCount * 2} flip attempts for ${pairCount * 2} cards.`,
      `Each matched pair: +1 point (maximum ${pairCount} points).`,
      'Resolving every pair earns 3 game Stars.',
      `The first ${numberOr(policy?.freeMistakes, 3)} mismatches are free; each additional mismatch removes 1 Star.`,
    ],
  );
};

export const buildGameFourGuideContent = (levelData = {}, policy = {}) => {
  const identity = levelIdentity(4, levelData, 'Falling Objects Game');
  const settings = levelData?.settings || {};
  const roundCount = Math.max(1, Array.isArray(levelData?.rounds) ? levelData.rounds.length : 3);
  const lives = Math.max(1, numberOr(settings.lives, 3));
  const statementReward = Math.max(40, numberOr(settings.statementReward, 120));

  return twoPageGuide(
    identity,
    'Read the rounds, level speed, score, Stars, and level-only requirements before you begin.',
    [
      levelData?.objective || 'Catch the required Java tokens and arrange each declaration correctly.',
      `${roundCount} declaration round${roundCount === 1 ? '' : 's'} must be completed.`,
      `You have ${lives} lives while objects fall at the configured Level ${identity.levelNumber} speed.`,
      `The on-screen statement reward is ${statementReward} points per round.`,
      'Each caught gear adds 5 bonus points.',
      `Recorded gameplay score: ${roundCount} cleared rounds × ${statementReward}, plus verified gear bonuses.`,
      `With no gear bonus, completing all rounds earns ${roundCount * statementReward} base points.`,
      ...policyItems(policy),
    ],
  );
};

export const buildGameFiveGuideContent = (levelData = {}) => {
  const identity = levelIdentity(5, levelData, 'Code Robot');
  const settings = levelData?.settings || {};
  const targetWords = Math.max(1, numberOr(settings.targetWords, 5));
  const seconds = Math.max(1, numberOr(settings.seconds, 180));
  const lives = Math.max(1, numberOr(settings.lives, 5));
  const rewardPerWord = 10 + (identity.levelNumber * 2);
  const maximumRuntimeScore = targetWords * (100 + rewardPerWord + Math.floor(seconds / 3));
  const maximumSubmittedScore = maximumRuntimeScore + (targetWords * 100);

  return twoPageGuide(
    identity,
    'Read the word target, timer, score, Stars, and level-only requirements before you begin.',
    [
      levelData?.objective || `Guess ${targetWords} programming words from their clues.`,
      `Solve ${targetWords} words within ${seconds} seconds.`,
      `Protect ${lives} lives by avoiding incorrect letters.`,
      `The same lives are shared across all ${targetWords} required words in this level.`,
      'Each solved word: +100 points.',
      `Level reward per solved word: +${rewardPerWord} points and +${rewardPerWord} coins.`,
      'Time bonus per solved word: whole seconds remaining ÷ 3.',
      `Maximum theoretical runtime score: ${maximumRuntimeScore} points.`,
      `Submission adds another 100 points per completed word; theoretical maximum submitted base score: ${maximumSubmittedScore}.`,
      'Each mistake subtracts 12 points from the submitted base score.',
    ],
  );
};

export const buildGameSixGuideContent = (levelData = {}) => {
  const identity = levelIdentity(6, levelData, 'Syntax Rain Typing');
  const settings = levelData?.settings || {};
  const targetWords = Math.max(1, numberOr(settings.targetWords, [5, 10, 15, 20, 25][identity.levelNumber - 1] || 5));
  const seconds = Math.max(1, numberOr(settings.seconds, [120, 300, 360, 420, 480][identity.levelNumber - 1] || 120));
  const lives = Math.max(1, numberOr(settings.lives, 5));
  const rewardEvery = Math.max(1, numberOr(settings.rewardEvery, 3));
  const coinReward = 15 + (identity.levelNumber * 5);
  const possibleAnswers = Array.isArray(levelData?.possibleAnswers)
    ? levelData.possibleAnswers.filter((answer) => typeof answer === 'string' && answer.trim())
    : [];

  return twoPageGuide(
    identity,
    'Read the typing target, timer, rewards, Stars, and level-only requirements before you begin.',
    [
      levelData?.objective || (identity.levelNumber === 1
        ? `Type ${targetWords} correctly spelled Java terms before they reach the ground.`
        : `Complete ${targetWords} falling Java challenges before they reach the ground.`),
      `Clear ${targetWords} Java types within ${seconds} seconds.`,
      `You have ${lives} health and earn a reward every ${rewardEvery} consecutive clears.`,
      identity.levelNumber === 1
        ? 'Read the correctly spelled falling Java term and type that exact word before it reaches the bottom.'
        : identity.levelNumber === 5
          ? 'Study the falling terms and identify the two that share a hidden Java relationship. The category is never displayed.'
          : 'Read the falling challenge and type the required complete Java answer before it reaches the bottom.',
      identity.levelNumber === 1
        ? 'Level 1 uses a steady, slightly faster falling speed with normally spelled Java terms.'
        : identity.levelNumber === 5
          ? 'Either pair member may be typed first. Early rounds have one distractor; later rounds add more distractors and two independent pairs.'
          : 'Only type the required Java answer shown by the current challenge rules.',
      `Every ${rewardEvery} consecutive clears awards coins and restores 1 missing health.`,
      identity.levelNumber === 1
        ? 'Each correct Java term earns base points and increases the combo multiplier.'
        : 'Each correctly completed Java challenge earns game points.',
      `Every ${rewardEvery}-term reward streak awards ${coinReward} coins separately; coins are not added to the game score.`,
      `The backend verifies the score as correct terms × 100 (${targetWords * 100} maximum before the retry multiplier).`,
      'Completing every required term reports 3 Stars.',
      'An incomplete or failed run reports no completion Stars.',
      `This attempt randomly selects ${targetWords} terms from the Level ${identity.levelNumber} pool.`,
      ...(possibleAnswers.length > 0 ? [`Accepted terms: ${possibleAnswers.join(', ')}.`] : []),
      identity.levelNumber === 1
        ? 'Type the normally spelled term exactly as displayed. Answers are case-sensitive: match uppercase and lowercase letters.'
        : 'Type the complete required term. Answers are case-sensitive: match uppercase and lowercase letters.',
    ],
  );
};
