export const GAME_ONE_GUIDE_CONTENT = Object.freeze({
  kicker: 'Game 1',
  title: '2D Action Game Guide',
  lead: 'Review the gameplay rules, objectives, scoring, and rewards before the level starts.',
  summary: [
    'Avoid enemies, traps, and platform obstacles.',
    'Collect the required coins and defeat required enemies.',
    'Reach the ending portal to clear the level.',
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
      title: 'Mission Rules',
      items: [
        'Collect the relic shards shown in the objective.',
        'Defeat the sentinel when the level requires it.',
        'Complete the objectives to unlock the ending portal.',
      ],
    },
    {
      title: 'Level Failure',
      items: [
        'Enemy contact, projectiles, and falls remove health.',
        'The player returns to the area start after taking damage.',
        'Reaching 0 health ends the level attempt.',
      ],
    },
    {
      title: 'Score & Rewards',
      items: [
        'Base Completion +100 Points',
        'Coin Collected +20 Points each',
        'Safe Completion +120 Bonus',
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

export const DASHBOARD_GUIDE_CONTENT_BY_GAME = Object.freeze({
  GAME_ONE: {
    kicker: 'Game 1',
    title: '2D Action Game Guide',
    lead: 'Review the general movement, hazards, lives, coins, and rewards before choosing when to start the selected level.',
    summary: [
      'Move through each area, avoid hazards, and complete the mission objectives.',
      'Collect coins, keys, scrolls, or other required pickups when the level asks for them.',
      'Reach the ending portal after the required objectives are complete.',
    ],
    sections: [
      {
        title: 'General Game Guidelines',
        items: [
          'Move, jump, dash, and attack to travel safely through platform areas.',
          'Enemy contact, projectiles, traps, and falls can remove health.',
          'Losing all health ends the level attempt.',
          'Coins and collectible clues help meet objectives, unlock progress, or support hints when available.',
          'Complete the objective and enter the portal to finish the level.',
          'Earn at least 2 Stars to unlock the next level.',
        ],
      },
    ],
  },
  GAME_TWO: {
    kicker: 'Game 2',
    title: 'Code Ninja Guide',
    lead: 'Review the general slicing flow, hazards, lives, combos, and completion rules before starting the selected level.',
    summary: [
      'Slice the correct Java syntax cards in order.',
      'Avoid decoy cards and bombs.',
      'Complete the required Java outputs to clear the level.',
    ],
    sections: [
      {
        title: 'General Game Guidelines',
        items: [
          'Use mouse, touch, or pointer drag to slice moving syntax cards.',
          'Gold syntax cards are correct targets; red decoy cards and bombs are hazards.',
          'Wrong slices and bombs remove Lives and reset Combo.',
          'Correct slices build Combo and increase score rewards.',
          'Clear the required outputs to complete the level.',
          'Earn at least 2 Stars to unlock the next level.',
        ],
      },
    ],
  },
  GAME_THREE: {
    kicker: 'Game 3',
    title: 'Memory Card Game Guide',
    lead: 'Review the general memory-board rules before starting the selected level.',
    summary: [
      'Flip cards and find matching pairs.',
      'Matching cards stay revealed and add to progress.',
      'Resolve every pair before attempts run out.',
    ],
    sections: [
      {
        title: 'General Game Guidelines',
        items: [
          'Select two face-down cards per turn.',
          'Matching cards stay revealed; non-matching cards flip back automatically.',
          'Every turn uses a flip attempt.',
          'Running out of attempts before all matches are found ends the attempt.',
          'Complete the board to earn Stars.',
          'Earn at least 2 Stars to unlock the next level.',
        ],
      },
    ],
  },
  GAME_FOUR: {
    kicker: 'Game 4',
    title: 'Falling Objects Game Guide',
    lead: 'Review the general catch-and-build flow, hazards, lives, coins, and hints before starting the selected level.',
    summary: [
      'Catch required Java code pieces.',
      'Avoid bombs while protecting Lives.',
      'Arrange the collected pieces into valid Java syntax.',
    ],
    sections: [
      {
        title: 'General Game Guidelines',
        items: [
          'Move the basket with A/D keys or the Left/Right Arrow keys.',
          'Catch required code tokens, then arrange them into a valid statement.',
          'Bombs remove Lives; gears can restore missing Lives when enough are collected.',
          'Coins are shared with the player balance, and hints spend coins.',
          'Use Reset to clear an arrangement and Check Answer to validate it.',
          'Earn at least 2 Stars to unlock the next level.',
        ],
      },
    ],
  },
  GAME_FIVE: {
    kicker: 'Game 5',
    title: 'Code Robot Game Guide',
    lead: 'Review the general word-guessing flow, lives, hints, timer, and rewards before starting the selected level.',
    summary: [
      'Guess programming words from clues.',
      'Use letters carefully before Lives or time run out.',
      'Solve the required words to complete the level.',
    ],
    sections: [
      {
        title: 'General Game Guidelines',
        items: [
          'Use keyboard letters A-Z or click the on-screen letter buttons.',
          'Correct letters reveal parts of the hidden word.',
          'Wrong letters remove Lives.',
          'Each hint reveals one hidden letter position. The current word and clue stay unchanged.',
          'Solving words awards points and rewards.',
          'Earn at least 2 Stars to unlock the next level.',
        ],
      },
    ],
  },
  GAME_SIX: {
    kicker: 'Game 6',
    title: 'Syntax Typing Game Guide',
    lead: 'Review the general typing flow, health, streak rewards, timer, and hazards before starting the selected level.',
    summary: [
      'Type falling programming terms before they reach the bottom.',
      'Wrong entries and missed required terms cost health.',
      'Clear the required terms before time or health runs out.',
    ],
    sections: [
      {
        title: 'General Game Guidelines',
        items: [
          'Click the input box or start typing after the level begins.',
          'Type the exact required answer and press Enter.',
          'Wrong entries and missed required terms remove health and reset streak progress.',
          'Consecutive correct clears can award coins and restore missing health.',
          'Fall speed and spawn pressure increase during play.',
          'Earn at least 2 Stars to unlock the next level.',
        ],
      },
    ],
  },
});

export const getDashboardGuideContent = (gameType) => (
  DASHBOARD_GUIDE_CONTENT_BY_GAME[gameType] || DASHBOARD_GUIDE_CONTENT_BY_GAME.GAME_ONE
);

const removeDuplicateGuideItems = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const splitGuideItemsIntoTwoPages = (items) => {
  const dedupedItems = removeDuplicateGuideItems(items);
  const splitIndex = Math.max(1, Math.ceil(dedupedItems.length / 2));
  return {
    summary: dedupedItems.slice(0, splitIndex),
    sections: [
      {
        title: 'Level Details',
        items: dedupedItems.slice(splitIndex),
      },
    ],
  };
};

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
  const coins = getGameOneObjectList(levelData, 'coins')
    .filter((pickup) => !pickup.collectibleType || pickup.collectibleType === 'coin');
  const enemies = [
    ...getGameOneObjectList(levelData, 'ghosts'),
    ...getGameOneObjectList(levelData, 'projectileEnemies'),
  ];
  const playerHealth = Math.max(1, Number(settings.playerHealth ?? spawn.health) || 3);
  const timerEnabled = settings.timerEnabled === true;
  const timerSeconds = Math.max(1, Number(settings.timerSeconds) || 120);
  const allowProjectile = settings.allowProjectile !== false && spawn.allowProjectile !== false;
  const hasCombatScore = allowProjectile && enemies.length > 0;
  const configuredCoinGoal = Number(settings.coinGoal);
  const coinGoal = Number.isFinite(configuredCoinGoal)
    ? Math.min(coins.length, Math.max(0, Math.round(configuredCoinGoal)))
    : coins.length <= 0
      ? 0
      : coins.length <= 3
        ? coins.length
        : Math.min(coins.length, Math.max(1, Math.ceil(coins.length * 0.6)));
  const maximumBaseScore = 100
    + (coins.length * 20)
    + 120
    + (hasCombatScore ? 180 + 60 : 0)
    + 100;

  const objectives = [
    `${coins.length} coin${coins.length === 1 ? '' : 's'} available${coinGoal > 0 ? `; collect at least ${coinGoal}` : ''}.`,
    'Avoid hazards and defeat any enemies required by the mission.',
  ];

  const scoreItems = [
    'Level completion: +100 base points.',
    `Coins: ${coins.length} available × 20 points (up to +${coins.length * 20}).`,
    'Safe completion: +120 precision bonus.',
    ...(hasCombatScore ? [
      'Successful enemy hits: +16 each, capped at +180.',
      'Shooting accuracy: up to +60.',
    ] : []),
    'Completing the escape mission: +100.',
    `Maximum base score for Level ${levelNumber}: ${maximumBaseScore} points.`,
    'The submitted score is adjusted by retry multiplier and earned stars.',
  ];
  const guidePages = splitGuideItemsIntoTwoPages([
    ...objectives,
    `This level starts with ${playerHealth} ${playerHealth === 1 ? 'life' : 'lives'}.`,
    timerEnabled
      ? `Finish within ${timerSeconds} seconds or the attempt ends.`
      : 'This level has no countdown timer.',
    ...scoreItems,
    'Finish the level with at least 2 Stars to mark it completed.',
  ]);

  return {
    kicker: `Game 1 · Level ${levelNumber}`,
    title: `${levelData?.title || `Level ${levelNumber}`} Guide`,
    lead: 'Read the objective, scoring, Stars, and level-only requirements before you begin.',
    summary: guidePages.summary,
    sections: guidePages.sections,
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
        '90% - 100% correct with no more than 3 mistakes earns 3 Stars.',
        '80% - 89% correct with no more than 4 mistakes earns 2 Stars.',
        '50% - 79% correct with no more than 5 mistakes earns 1 Star; otherwise, No Star.',
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
  lead: 'Review how the memory board, flip attempts, and matching score work before the level starts.',
  summary: [
    'Flip cards and find matching pairs.',
    'Matching cards stay revealed and add one point.',
    'Resolve every pair before your flip attempts run out.',
  ],
  sections: [
    {
      title: 'Mechanics',
      items: [
        'Players flip 2 cards per turn.',
        'Matching cards stay revealed and add to your progress.',
        'Non-matching cards flip back automatically.',
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
      title: 'Score System',
      items: [
        'Matched Pair +1 Point',
        'Mismatched Pair +0 Points',
        'Complete all pairs to calculate the final result.',
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
        'Use fewer moves and mismatches for a cleaner run.',
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
        'Move the basket using A/D keys or arrow keys.',
        'Use Reset to clear your arrangement.',
        'Use Check Answer to validate the Java declaration.',
      ],
    },
    {
      title: 'Lives',
      items: [
        'Lives start from the value configured for the level.',
        'Catching a bomb removes 1 life; reaching 0 ends the attempt.',
        'Collecting 3 gears restores 1 missing life up to the maximum.',
      ],
    },
    {
      title: 'Hints & Coins',
      items: [
        'Coins collected are added to the shared balance.',
        'Each revealed hint spends 1 coin from the shared balance.',
      ],
    },
    {
      title: 'Score System',
      items: [
        'A correct statement awards the configured statement reward, normally 120 points.',
        'Each caught gear adds 5 bonus points.',
        'Hints do not directly subtract points.',
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
