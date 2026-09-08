export const GAME_ONE_GUIDE_CONTENT = Object.freeze({
  kicker: 'Game 1',
  title: '2D Action Game Guide',
  lead: 'Review the gameplay rules, objectives, scoring, and rewards before the level starts.',
  summary: [
    'Avoid enemies, traps, and platform obstacles.',
    'Reach the Question Statue or Villain.',
    'Answer correctly to clear the room and progress through the level.',
  ],
  sections: [
    {
      title: 'Lives',
      items: [
        'Players start with 3 lives.',
        'Taking damage removes 1 Heart.',
        'Losing all Hearts ends the level attempt.',
      ],
    },
    {
      title: 'Question Rules',
      items: [
        'Only 1 answer attempt is allowed per question.',
        'Wrong answers restart the current room.',
        'A new question is generated on each retry.',
      ],
    },
    {
      title: 'Room Failure',
      items: [
        'Players may fail up to 3 questions per room.',
        'Excessive mistakes reduce stars and rewards.',
        'Exceeding the limit ends the game.',
      ],
    },
    {
      title: 'Score & Rewards',
      items: [
        'Base Completion +100 Points',
        'Coin Collected +20 Points each',
        'Perfect (No Wrong Answers) +120 Bonus',
        'Question Statue Cleared +35 Points each',
        'Successful Enemy Hit +16 Points each',
        'High Shooting Accuracy Up to +60 Bonus',
        'Mission Complete +100 Bonus',
      ],
    },
    {
      title: 'Star Rating System',
      items: [
        '90% - 100% with 0 - 3 mistakes: 3 Stars',
        '75% - 89% with 4 mistakes: 2 Stars',
        '50% - 74% with 5 mistakes: 1 Star',
        'Below 50% with 6+ mistakes: No Star / Retry',
      ],
    },
    {
      title: 'Condition',
      items: [
        'Earn at least 2 Stars to unlock the next level.',
        'Higher accuracy improves final ranking and rewards.',
      ],
    },
  ],
});

const getGameOneObjectList = (levelData, key) => {
  const values = [];
  const appendFrom = (source) => {
    const value = source?.[key];
    if (Array.isArray(value)) values.push(...value);
    else if (value && typeof value === 'object') values.push(value);
  };

  appendFrom(levelData?.worldObjects);
  (Array.isArray(levelData?.rooms) ? levelData.rooms : []).forEach((room) => {
    appendFrom(room);
    appendFrom(room?.worldObjects);
  });

  return values;
};

export const buildGameOneGuideContent = (levelData = {}) => {
  const levelNumber = Math.max(1, Number(levelData?.levelNumber) || 1);
  const settings = levelData?.settings || {};
  const spawn = levelData?.worldObjects?.spawn || {};
  const coins = getGameOneObjectList(levelData, 'coins');
  const questions = Array.isArray(levelData?.questions) ? levelData.questions : [];
  const enemies = [
    ...getGameOneObjectList(levelData, 'ghosts'),
    ...getGameOneObjectList(levelData, 'projectileEnemies'),
  ];
  const villains = [
    ...getGameOneObjectList(levelData, 'villains'),
    ...getGameOneObjectList(levelData, 'villain'),
  ];
  const totalQuestionOpportunities = questions.length || villains.length;
  const playerHealth = Math.max(1, Number(settings.playerHealth ?? spawn.health) || 3);
  const timerEnabled = settings.timerEnabled === true;
  const timerSeconds = Math.max(1, Number(settings.timerSeconds) || 120);
  const allowProjectile = settings.allowProjectile !== false && spawn.allowProjectile !== false;
  const hasCombatScore = allowProjectile && enemies.length > 0;
  const coinGoal = Math.max(0, Number(settings.coinGoal) || 0);
  const requireBossDefeat = settings.requireBossDefeat === true;
  const maximumBaseScore = 100
    + (coins.length * 20)
    + 120
    + (totalQuestionOpportunities * 35)
    + (hasCombatScore ? 180 + 60 : 0)
    + 100;

  const objectives = [
    `${coins.length} coin${coins.length === 1 ? '' : 's'} available${coinGoal > 0 ? `; collect at least ${coinGoal}` : ''}.`,
    `${totalQuestionOpportunities} question challenge${totalQuestionOpportunities === 1 ? '' : 's'} in this level.`,
    requireBossDefeat
      ? 'Defeat the sentinel boss before the ending portal unlocks.'
      : 'Complete the required objectives, then enter the ending portal.',
  ];

  const scoreItems = [
    'Level completion: +100 base points.',
    `Coins: ${coins.length} available × 20 points (up to +${coins.length * 20}).`,
    `Question challenges: ${totalQuestionOpportunities} × 35 points (up to +${totalQuestionOpportunities * 35}).`,
    'No wrong answers: +120 precision bonus.',
    ...(hasCombatScore ? [
      'Successful enemy hits: +16 each, capped at +180.',
      'Shooting accuracy: up to +60.',
    ] : []),
    'Completing the escape mission: +100.',
    `Maximum base score for Level ${levelNumber}: ${maximumBaseScore} points.`,
    'The submitted score is adjusted by retry multiplier and earned stars.',
  ];

  return {
    kicker: `Game 1 · Level ${levelNumber}`,
    title: `${levelData?.title || `Level ${levelNumber}`} Guide`,
    lead: 'These rules and scoring opportunities are calculated from this level’s current configuration.',
    summary: objectives,
    sections: [
      {
        title: 'Lives & Timer',
        items: [
          `You start this level with ${playerHealth} ${playerHealth === 1 ? 'life' : 'lives'}.`,
          'Taking damage removes health; reaching 0 ends the attempt.',
          timerEnabled
            ? `Finish within ${timerSeconds} seconds or the attempt ends.`
            : 'This level has no countdown timer.',
        ],
      },
      {
        title: 'This Level',
        items: objectives,
      },
      {
        title: 'Question Rules',
        items: [
          'Each question allows one answer per encounter.',
          'A wrong answer adds a mistake and restarts the current room.',
          'A correct answer clears that challenge and its connected locks.',
        ],
      },
      {
        title: `Level ${levelNumber} Score`,
        items: scoreItems,
      },
      {
        title: 'Star Calculation',
        items: [
          'Stars come from your remaining coin balance when the level ends.',
          '3 or more coins remaining: 3 Stars.',
          '2 coins remaining: 2 Stars; 1 coin: 1 Star; 0 coins: No Star.',
          'Coins spent on hints reduce the remaining balance used for stars.',
        ],
      },
      {
        title: 'Progression Condition',
        items: [
          'Finish the level with at least 2 Stars to mark it completed.',
          'Completing this level unlocks the next teacher-provided level.',
        ],
      },
    ],
  };
};

export const GAME_TWO_GUIDE_CONTENT = Object.freeze({
  kicker: 'Game 2',
  title: 'Java Code Lab Guide',
  lead: 'Repair the Java program by placing the correct code snippets into its missing slots, then compile each completed task.',
  summary: [
    'Read the task and inspect the incomplete Java code.',
    'Drag the correct snippet into each highlighted code slot.',
    'Compile every task to complete the level.',
  ],
  sections: [
    {
      title: 'Mechanics',
      items: [
        'The Code Structure panel shows the Java statement that needs repair.',
        'The Code Choices panel contains the possible lines or answers for the current task.',
        'Drag a snippet into the empty code slot; multi-line tasks require every slot to be filled.',
      ],
    },
    {
      title: 'Compile Answers',
      items: [
        'Compile Answer becomes available after every required slot contains a snippet.',
        'The game compares the selected snippet or line order with the accepted answer in the task data.',
        'The result message explains whether the code was accepted and shows the configured correction when it is wrong.',
      ],
    },
    {
      title: 'Hints & Coins',
      items: [
        'Hint reveals the next hint written for the active task.',
        'Each revealed hint uses the configured hint coin cost.',
        'A correct task adds its configured coin reward, or 1 coin when no reward is specified.',
      ],
    },
    {
      title: 'Progress, Score & Stars',
      items: [
        'Solved counts every compiled task; Correct counts only accepted answers.',
        'An incorrect compiled answer adds 1 mistake.',
        'Stars are calculated from the number of correct tasks compared with the total number of tasks.',
        '90% - 100% correct earns 3 Stars; 75% - 89% earns 2 Stars.',
        '50% - 74% correct earns 1 Star; below 50% earns No Star.',
      ],
    },
    {
      title: 'Condition',
      items: [
        'Complete every task in the task list to finish the Java Code Lab.',
        'Each task can be opened from the list on the right.',
        'The completed result sends correct tasks, mistakes, points, coins, hints used, and earned stars to the platform.',
      ],
    },
  ],
});

export const GAME_THREE_GUIDE_CONTENT = Object.freeze({
  kicker: 'Game 3',
  title: 'Memory Card Game Guide',
  lead: 'Review how the memory board works, how points are earned, and how stars are awarded before the level starts.',
  summary: [
    'Flip cards and find matching pairs.',
    'Answer a quiz question for each matched pair.',
    'Earn stars based on correct answers and performance.',
  ],
  sections: [
    {
      title: 'Mechanics',
      items: [
        'Players flip 2 cards per turn.',
        'Matching cards trigger a question.',
        'Non-matching cards flip back automatically.',
      ],
    },
    {
      title: 'Question Rules',
      items: [
        'Each question allows only 1 attempt.',
        'Correct answer earns points and rewards.',
        'Wrong answer gives 0 points for that pair.',
        'Player continues until all pairs are completed.',
      ],
    },
    {
      title: 'Attempts',
      items: [
        'Players start with flip attempts based on total number of cards.',
        'Every 2-card selection uses 1 flip attempt.',
        'Mismatches reduce available attempts.',
        'Running out of attempts ends the game.',
      ],
    },
    {
      title: 'Hints & Coins',
      items: [
        'Coins are earned from correct answers.',
        'Coins can be used to purchase hints.',
        'Hint usage reduces available coins.',
        'Hints assist in answering quiz questions.',
      ],
    },
    {
      title: 'Score System',
      items: [
        'Correct Answer (per pair) +1 Point',
        'Correct Answer Reward +1 Coin',
        'Wrong Answer +0 Points',
        'Hint Usage -1 Coin',
      ],
    },
    {
      title: 'Star Rating System',
      items: [
        '90% - 100%: 3 Stars',
        '75% - 89%: 2 Stars',
        '50% - 74%: 1 Star',
        'Below 50%: No Star / Retry',
      ],
    },
    {
      title: 'Condition',
      items: [
        'Earn at least 2 Stars to unlock the next level.',
        'Higher accuracy improves final ranking and rewards.',
      ],
    },
  ],
});

export const GAME_FOUR_GUIDE_CONTENT = Object.freeze({
  kicker: 'Game 4',
  title: 'Falling Objects Game Guide',
  lead: 'Review the catch-and-build rules, scoring, lives, and star requirements before the level starts.',
  summary: [
    'Catch the correct Java code pieces while avoiding bombs.',
    'Collect all required parts for the current Java Variables round.',
    'Arrange collected code into the correct Java syntax order.',
  ],
  sections: [
    {
      title: 'Mechanics',
      items: [
        'Catch every required Java code piece, then arrange the collected pieces into a valid statement.',
        'Missing a required code piece ends a normal level attempt.',
        'Bombs remove 1 life rather than ending the attempt immediately.',
      ],
    },
    {
      title: 'Controls',
      items: [
        'Press and hold the left on-screen circle to move left.',
        'Press and hold the right on-screen circle to move right.',
        'Move the basket under a falling object to catch it automatically.',
        'Use Reset to clear your arrangement.',
        'Use Check Answer to validate the Java declaration.',
      ],
    },
    {
      title: 'Lives',
      items: [
        'Lives start from the value configured for the level.',
        'Catching a bomb removes 1 life; reaching 0 ends the attempt.',
        'Collecting 3 fruits restores 1 missing life up to the maximum.',
      ],
    },
    {
      title: 'Hints & Coins',
      items: [
        'Coins collected can be used for hints.',
        'Hints are specific to the current Java Variables topic.',
      ],
    },
    {
      title: 'Score System',
      items: [
        'A correct statement awards the configured statement reward, normally 120 points.',
        'Each caught fruit adds 5 bonus points.',
        'Coins are collected separately and are spent on hints.',
      ],
    },
    {
      title: 'Star Rating System',
      items: [
        '90% - 100% with 0 - 3 mistakes: 3 Stars',
        '75% - 89% with 4 mistakes: 2 Stars',
        '50% - 74% with 5 mistakes: 1 Star',
        'Below 50% with 6+ mistakes: No Star',
      ],
    },
    {
      title: 'Condition',
      items: [
        'Earn at least 2 Stars to unlock the next level.',
        'Higher accuracy improves final ranking and rewards.',
      ],
    },
  ],
});

export const GAME_FIVE_GUIDE_CONTENT = Object.freeze({
  kicker: 'Game 5',
  title: 'Code Robot Game Guide',
  lead: 'Review the guessing rules, scoring, lives, bonuses, and star requirements before the level starts.',
  summary: [
    'Guess programming-related words from the AI clue before the timer runs out.',
    'Complete 5 words to finish the level.',
    'Earn stars based on performance.',
  ],
  sections: [
    {
      title: 'Mechanics',
      items: [
        'Click the keys to guess letters.',
        'Correct letters help complete the hidden word.',
        'Wrong letters reduce lives and make the word harder to solve.',
      ],
    },
    {
      title: 'Lives',
      items: [
        'Players start with 5 lives.',
        'Each wrong letter reduces 1 life.',
        'Reaching 0 ends the game.',
      ],
    },
    {
      title: 'Controls',
      items: [
        'Use keyboard letters A-Z or click on-screen buttons.',
        'Already used letters are disabled automatically.',
      ],
    },
    {
      title: 'Score System',
      items: [
        'Correct Answer +100 Points',
        'Correct Typed Word +100 Points',
        'Completed Action +1 Coin',
        'Answer within 30 seconds +50 Bonus Points',
      ],
    },
    {
      title: 'Star Rating System',
      items: [
        '90% - 100% with 0 - 3 mistakes: 3 Stars',
        '75% - 89% with 4 mistakes: 2 Stars',
        '50% - 74% with 5 mistakes: 1 Star',
        'Below 50% with 6+ mistakes: No Star / Retry',
      ],
    },
    {
      title: 'Condition',
      items: [
        'Earn at least 2 Stars to unlock the next level.',
        'Higher accuracy improves final ranking and rewards.',
      ],
    },
  ],
});

export const GAME_SIX_GUIDE_CONTENT = Object.freeze({
  kicker: 'Game 6',
  title: 'Syntax Typing Game Guide',
  lead: 'Review the typing rules, scoring, lives, bonuses, and star requirements before the level starts.',
  summary: [
    'Type falling programming terms before they hit the ground.',
    'Clear 5 terms within the time limit.',
    'Earn stars based on performance.',
  ],
  sections: [
    {
      title: 'Mechanics',
      items: [
        'Words fall from the top of the screen.',
        'Type the exact word and press Enter.',
        'Correct words are cleared and scored.',
        'Speed increases as the game progresses.',
      ],
    },
    {
      title: 'Lives',
      items: [
        'Players start with 5 Lives.',
        'Missing a word reduces 1 life.',
        'Reaching 0 ends the game.',
      ],
    },
    {
      title: 'Controls',
      items: [
        'Click the input box or start typing after the level begins.',
        'Press Enter to submit answers.',
      ],
    },
    {
      title: 'Score System',
      items: [
        'Correct Answer = +100 Points',
        'Correct Typed Word = +100 Points',
        'Completed Action = +1 Coin',
        'Answer within 30 seconds = +50 Bonus Points',
      ],
    },
    {
      title: 'Star Rating System',
      items: [
        '90% - 100% with 0 - 3 mistakes: 3 Stars',
        '75% - 89% with 4 mistakes: 2 Stars',
        '50% - 74% with 5 mistakes: 1 Star',
        'Below 50% with 6+ mistakes: No Star',
      ],
    },
    {
      title: 'Condition',
      items: [
        'Earn at least 2 Stars to unlock the next level.',
        'Higher accuracy improves final ranking and rewards.',
      ],
    },
  ],
});
