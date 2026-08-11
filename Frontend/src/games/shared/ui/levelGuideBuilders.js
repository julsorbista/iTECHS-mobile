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
  title: 'Passing & Progression',
  items: [
    `Finish the level with at least ${minimumStars} ${minimumStars === 1 ? 'Star' : 'Stars'} to pass.`,
    'A passed result unlocks the next available level.',
    policyAffectsStars
      ? 'Mistakes and used hints can reduce the platform star reward.'
      : 'This game reports its completion Stars directly from completed level tasks.',
  ],
});

const policyItems = ({ freeMistakes = 3, hintStarCost = 1 } = {}) => [
  `You begin with 3 platform Stars; the first ${freeMistakes} mistake${freeMistakes === 1 ? '' : 's'} do not reduce them.`,
  `Each additional mistake removes 1 Star; each used hint removes ${hintStarCost} Star${hintStarCost === 1 ? '' : 's'}.`,
  'The final platform score is multiplied by the retry multiplier and by earned Stars ÷ 3.',
];

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
  const hintCoinCost = Math.max(0, numberOr(policy?.hintCoinCost, 1));

  return {
    ...identity,
    lead: 'This guide reflects the coding tasks, timing, scoring, and passing rules configured for this level.',
    summary: [
      levelData?.objective || (codeLab
        ? 'Repair each Java task by placing the correct snippet.'
        : 'Place every component correctly and resolve its question.'),
      `${taskCount} required ${codeLab ? 'coding task' : 'placement'}${taskCount === 1 ? '' : 's'}.`,
      codeLab ? 'Compile every task after filling all required slots.' : 'Lock every required block into its matching slot.',
    ],
    sections: [
      {
        title: 'Level Setup',
        items: [
          `${taskCount} required ${codeLab ? 'tasks' : 'placements'} in Level ${identity.levelNumber}.`,
          settings.seconds
            ? `Level configuration time: ${settings.seconds} seconds (the current Code Lab does not enforce a countdown).`
            : 'No level countdown is enforced by this game mode.',
          settings.maxMistakes
            ? `Level configuration mistake target: ${settings.maxMistakes} (this is metadata, not an automatic fail limit).`
            : 'Mistakes are recorded for stars and final scoring.',
          Number.isFinite(Number(settings.targetPoints))
            ? `Configured target: ${settings.targetPoints} points; configured time bonus: ${numberOr(settings.bonusPerSecond, 0)} points per second (neither is applied by the current Code Lab scoring path).`
            : 'No separate target-points setting is configured for this level.',
        ],
      },
      {
        title: codeLab ? 'Code Lab Mechanics' : 'Placement Mechanics',
        items: codeLab ? [
          'Read the incomplete Java code and the task prompt.',
          'Drag one snippet into each blank; ordered tasks require every slot in the correct order.',
          'Each task has 3 compile checks; repeating an identical wrong answer is blocked.',
          'After 3 failed checks, the task closes without revealing the correct answer.',
        ] : [
          'Drag each component into its matching slot.',
          'A correct placement can open a related question.',
          'Finish every placement and resolve every required question.',
        ],
      },
      ...(codeLab ? [{
        title: 'Attempt Rules',
        items: [
          'Every coding task starts with 3 compile checks.',
          'A wrong compilation uses 1 check and adds 1 mistake.',
          'Submitting the exact same wrong code again is blocked and does not use another check.',
          'The task remains editable after the first and second failed checks; the correct answer is never revealed.',
          'After the third failed check, that task is marked unsuccessful and the player continues to the next task.',
          `The level passes only when at least ${requiredCorrectCount} of ${taskCount} tasks are correct and the task rating is at least 2 Stars.`,
          'Retrying the whole level starts every task with 3 checks again and loads a different code variation at the same level difficulty.',
          'A full-level retry is recorded and can reduce the final score retry multiplier.',
        ],
      }] : []),
      {
        title: `Level ${identity.levelNumber} Score`,
        items: [
          codeLab
            ? `Each correct task submits 1 base point (maximum submitted base score: ${taskCount}).`
            : 'Correct question answers add the points configured by the hardware activity.',
          'Incorrect compiled answers add 1 mistake.',
          `The task content contains ${configuredPoints} configured raw points, but these are not used by the current submission scoring path.`,
          `Correct tasks can award up to ${configuredCoins} configured coins; the run starts with at least ${taskCount} coins and each revealed hint costs ${hintCoinCost}.`,
          'The backend multiplies a passing base score by the retry multiplier and by the remaining platform Stars divided by 3.',
        ],
      },
      {
        title: 'Task Rating',
        items: [
          `At least ${Math.ceil(taskCount * 0.9)} of ${taskCount} correct with no more than 3 mistakes earns 3 task Stars.`,
          `At least ${Math.ceil(taskCount * 0.8)} of ${taskCount} correct with no more than 4 mistakes earns 2 task Stars.`,
          `At least ${Math.ceil(taskCount * 0.5)} of ${taskCount} correct with no more than 5 mistakes earns 1 task Star.`,
          'Any other task-rating combination earns no task Stars.',
          `Game 2 requires at least ${requiredCorrectCount} correct tasks and 2 task Stars to pass.`,
        ],
      },
      {
        title: 'Platform Stars',
        items: policyItems(policy),
      },
      progressionSection(2),
    ],
  };
};

export const buildGameThreeGuideContent = (levelData = {}, policy = {}) => {
  const identity = levelIdentity(3, levelData, 'Memory Card Game');
  const pairs = Array.isArray(levelData?.pairs) ? levelData.pairs : [];
  const pairCount = pairs.length;
  const settings = levelData?.settings || {};
  const hintCost = Math.max(0, numberOr(policy?.hintStarCost, 1));

  return {
    ...identity,
    lead: 'This guide reflects this level’s card count, question scoring, attempts, hints, and completion rule.',
    summary: [
      levelData?.objective || 'Match every card pair and resolve the question attached to each pair.',
      `${pairCount} pairs (${pairCount * 2} cards) must be resolved.`,
      'Each correct pair question adds 1 point and 1 coin.',
    ],
    sections: [
      {
        title: 'Board & Controls',
        items: [
          `Match ${pairCount} pairs across ${pairCount * 2} cards.`,
          `The board uses ${numberOr(settings.columns, 4)} columns.`,
          `A mismatch flips back after ${numberOr(settings.flipBackMs, 900)} ms.`,
          'Select two cards per move; a matching pair opens its question.',
        ],
      },
      {
        title: 'Attempts & Questions',
        items: [
          `The level begins with ${pairCount * 2} flip attempts.`,
          'Every two-card selection uses 1 flip attempt.',
          'Each matched-pair question permits one submitted answer.',
          'Running out of flip attempts before resolving all pairs fails the attempt.',
        ],
      },
      {
        title: `Level ${identity.levelNumber} Score`,
        items: [
          `Each correct question: +1 point and +1 coin (maximum ${pairCount} points).`,
          'A wrong question adds no point or coin and counts as a wrong answer.',
          `Hints cost ${hintCost} coin${hintCost === 1 ? '' : 's'} each and do not directly subtract points.`,
          'The displayed point total is converted to the submitted base score after retry adjustment.',
        ],
      },
      {
        title: 'Game Result Rating',
        items: [
          'Resolve every pair to finish the board.',
          'With the current implementation, resolving all pairs with 0–3 wrong answers produces 3 game Stars.',
          'More than 3 wrong answers does not meet the current Game 3 star condition.',
        ],
      },
      {
        title: 'Platform Stars',
        items: policyItems(policy),
      },
      progressionSection(1),
    ],
  };
};

export const buildGameFourGuideContent = (levelData = {}, policy = {}) => {
  const identity = levelIdentity(4, levelData, 'Falling Objects Game');
  const settings = levelData?.settings || {};
  const roundCount = Math.max(1, Array.isArray(levelData?.rounds) ? levelData.rounds.length : 3);
  const lives = Math.max(1, numberOr(settings.lives, 3));
  const statementReward = Math.max(40, numberOr(settings.statementReward, 120));

  return {
    ...identity,
    lead: 'This guide reflects this level’s rounds, speed, lives, token rules, and submitted scoring formula.',
    summary: [
      levelData?.objective || 'Catch the required Java tokens and arrange each declaration correctly.',
      `${roundCount} declaration round${roundCount === 1 ? '' : 's'} must be completed.`,
      `You have ${lives} lives while objects fall at the configured Level ${identity.levelNumber} speed.`,
    ],
    sections: [
      {
        title: 'Catch Phase',
        items: [
          'Move with A/D or the Left/Right Arrow keys.',
          'Catch every required code token; missing a required token fails a normal attempt.',
          `Bombs remove 1 of ${lives} lives; 3 fruits restore 1 missing life.`,
          `Objects use a ${numberOr(settings.spawnIntervalMs, 900)} ms base spawn interval and ${numberOr(settings.fallSpeed, 240)} base fall speed.`,
        ],
      },
      {
        title: 'Arrange Phase',
        items: [
          'Place the collected tokens in valid Java declaration order.',
          'Use Reset to clear the arrangement and Check Answer to validate it.',
          `Complete all ${roundCount} rounds to finish Level ${identity.levelNumber}.`,
        ],
      },
      {
        title: `Level ${identity.levelNumber} Score`,
        items: [
          `The on-screen statement reward is ${statementReward} points per round.`,
          'Each caught fruit adds 5 bonus points.',
          `Submitted base score: 120 + (${roundCount} cleared rounds × 160) + fruit bonus − (mistakes × 18).`,
          `With no mistakes or fruit bonus, the submitted base score is ${120 + (roundCount * 160)} points.`,
          'Coins are hint currency and do not directly add to the submitted score.',
        ],
      },
      {
        title: 'Stars',
        items: policyItems(policy),
      },
      progressionSection(1),
    ],
  };
};

export const buildGameFiveGuideContent = (levelData = {}) => {
  const identity = levelIdentity(5, levelData, 'Code Snowman');
  const settings = levelData?.settings || {};
  const targetWords = Math.max(1, numberOr(settings.targetWords, 5));
  const seconds = Math.max(1, numberOr(settings.seconds, 180));
  const lives = Math.max(1, numberOr(settings.lives, 5));
  const rewardPerWord = 10 + (identity.levelNumber * 2);
  const maximumRuntimeScore = targetWords * (100 + rewardPerWord + Math.floor(seconds / 3));
  const maximumSubmittedScore = maximumRuntimeScore + (targetWords * 100);

  return {
    ...identity,
    lead: 'This guide reflects this level’s word target, timer, lives, rewards, and submitted score calculation.',
    summary: [
      levelData?.objective || `Guess ${targetWords} programming words from their clues.`,
      `Solve ${targetWords} words within ${seconds} seconds.`,
      `Protect ${lives} lives by avoiding incorrect letters.`,
    ],
    sections: [
      {
        title: 'Mechanics & Controls',
        items: [
          'Read the clue and use the blanks to determine the word length.',
          'Choose letters using the on-screen keyboard or physical A–Z keys.',
          'Wrong letters remove 1 life; losing all lives or running out of time fails the attempt.',
          'Hints provide deeper clue information and may reveal letter information.',
        ],
      },
      {
        title: `Level ${identity.levelNumber} Score`,
        items: [
          'Each solved word: +100 points.',
          `Level reward per solved word: +${rewardPerWord} points and +${rewardPerWord} coins.`,
          'Time bonus per solved word: whole seconds remaining ÷ 3.',
          `Maximum theoretical runtime score: ${maximumRuntimeScore} points.`,
          `Submission adds another 100 points per completed word; theoretical maximum submitted base score: ${maximumSubmittedScore}.`,
          'Each mistake subtracts 12 points from the submitted base score.',
        ],
      },
      {
        title: 'Completion & Stars',
        items: [
          `Solve all ${targetWords} words to complete the level.`,
          'Completing every required word reports 3 Stars.',
          'An incomplete or failed run reports no completion Stars.',
          'The backend applies the retry multiplier to the submitted base score.',
        ],
      },
      progressionSection(1, false),
    ],
  };
};

export const buildGameSixGuideContent = (levelData = {}) => {
  const identity = levelIdentity(6, levelData, 'Syntax Rain Typing');
  const settings = levelData?.settings || {};
  const targetWords = Math.max(1, numberOr(settings.targetWords, [5, 10, 15, 20, 25][identity.levelNumber - 1] || 5));
  const seconds = Math.max(1, numberOr(settings.seconds, [120, 300, 360, 420, 480][identity.levelNumber - 1] || 120));
  const lives = Math.max(1, numberOr(settings.lives, 5));
  const rewardEvery = Math.max(1, numberOr(settings.rewardEvery, 3));
  const coinReward = 15 + (identity.levelNumber * 5);

  return {
    ...identity,
    lead: 'This guide reflects this level’s typing target, timer, speed pressure, health, streak rewards, and score formula.',
    summary: [
      levelData?.objective || `Type ${targetWords} falling programming terms before they reach the ground.`,
      `Clear ${targetWords} terms within ${seconds} seconds.`,
      `You have ${lives} health and earn a reward every ${rewardEvery} consecutive clears.`,
    ],
    sections: [
      {
        title: 'Mechanics & Controls',
        items: [
          'Type a visible falling term exactly and press Enter.',
          'A wrong submission or missed term removes 1 health and resets the streak.',
          `Every ${rewardEvery} consecutive clears awards coins and restores 1 missing health.`,
          'Fall speed, spawn pressure, and simultaneous terms increase as level progress rises.',
        ],
      },
      {
        title: `Level ${identity.levelNumber} Score`,
        items: [
          'Each cleared term starts with +100 points.',
          'Pressure bonus: current pressure level × 8.',
          'Height bonus: up to +90 for clearing a term near the top.',
          `Every ${rewardEvery}-term reward streak adds ${coinReward} coins and the same amount to score.`,
          `Submission adds another 100 points per completed term (${targetWords * 100} total when complete).`,
          'Each mistake subtracts 12 points from the submitted base score.',
        ],
      },
      {
        title: 'Completion & Stars',
        items: [
          `Clear all ${targetWords} required terms before time or health runs out.`,
          'Completing every required term reports 3 Stars.',
          'An incomplete or failed run reports no completion Stars.',
          'The backend applies the retry multiplier to the submitted base score.',
        ],
      },
      progressionSection(1, false),
    ],
  };
};
