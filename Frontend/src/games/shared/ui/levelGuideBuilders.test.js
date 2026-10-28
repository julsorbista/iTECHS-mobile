import { describe, expect, it } from 'vitest';
import {
  buildGameTwoGuideContent,
  buildGameThreeGuideContent,
  buildGameFourGuideContent,
  buildGameFiveGuideContent,
  buildGameSixGuideContent,
} from './levelGuideBuilders';

const allGuideItems = (guide) => [
  ...guide.summary,
  ...guide.sections.flatMap((section) => section.items),
];

const expectTwoGuidePages = (guide) => {
  expect(guide.sections).toHaveLength(1);
  expect(guide.summary.length).toBeGreaterThan(0);
  expect(guide.sections[0].items.length).toBeGreaterThan(0);
};

describe('per-level game guide builders', () => {
  it('derives Game 2 task count, raw score, and policy from the selected level', () => {
    const guide = buildGameTwoGuideContent({
      levelNumber: 3,
      title: 'Loop Runner',
      settings: { seconds: 270, maxMistakes: 3 },
      tasks: [
        { id: 'a', points: 120 },
        { id: 'b', points: 180 },
      ],
    }, { freeMistakes: 2, hintCoinCost: 2, hintStarCost: 1 });

    expect(guide.kicker).toBe('Game 2 · Level 3');
    const content = allGuideItems(guide);
    expect(content).toContain('2 required coding tasks.');
    expect(content)
      .toContain('Each correct task submits 1 base point (maximum submitted base score: 2).');
    expect(content)
      .toContain('The task data contains 300 reference points; the recorded base score uses the number of correct tasks instead.');
    expectTwoGuidePages(guide);
  });

  it.each([
    [1, 210, 4, 700, 2, 660],
    [2, 240, 4, 850, 2, 720],
    [3, 270, 3, 1000, 2, 740],
    [4, 300, 3, 1150, 3, 770],
    [5, 330, 3, 1300, 3, 900],
  ])('shows only Level %i configuration values', (levelNumber, seconds, maxMistakes, targetPoints, bonusPerSecond, rawPoints) => {
    const guide = buildGameTwoGuideContent({
      levelNumber,
      settings: { seconds, maxMistakes, targetPoints, bonusPerSecond },
      tasks: Array.from({ length: 5 }, (_, index) => ({
        id: `task-${index + 1}`,
        points: index === 0 ? rawPoints - 400 : 100,
        coinReward: index === 4 ? 2 : 1,
      })),
    });
    const content = allGuideItems(guide).join(' ');

    expect(content).toContain(`${seconds} seconds`);
    expect(content).toContain(`Mistake target: stay at or below ${maxMistakes}`);
    expect(content).toContain(`Reference target: ${targetPoints} points`);
    expect(content).toContain(`${bonusPerSecond} reference bonus points per second`);
    expect(content).toContain(`${rawPoints} reference points`);
    expect(content).toContain('up to 6 configured coins');
    expectTwoGuidePages(guide);
  });

  it('shows Game 2 attempt rules for every code-lab level', () => {
    [1, 2, 3, 4, 5].forEach((levelNumber) => {
      const taskCount = levelNumber;
      const guide = buildGameTwoGuideContent({
        levelNumber,
        tasks: Array.from({ length: taskCount }, (_, index) => ({ id: `task-${index + 1}` })),
      });
      const content = allGuideItems(guide).join(' ');

      expect(content).toContain('You have 3 Compile checks for each task. Change a wrong answer before trying again.');
      expect(content).toContain(`up to ${taskCount * 3} Compile checks`);
    });
  });

  it('derives Game 3 pairs, cards, attempts, and maximum points', () => {
    const guide = buildGameThreeGuideContent({
      levelNumber: 4,
      pairs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      settings: { columns: 3, flipBackMs: 750 },
    });

    const content = allGuideItems(guide);
    expect(content).toContain('3 pairs (6 cards) must be resolved.');
    expect(content)
      .toContain('This level begins with 6 flip attempts for 6 cards.');
    expect(content).toContain('Each matched pair: +1 point (maximum 3 points).');
    expectTwoGuidePages(guide);
  });

  it('derives Game 4 rounds and the submitted score formula', () => {
    const guide = buildGameFourGuideContent({
      levelNumber: 2,
      settings: { lives: 4, statementReward: 150 },
      rounds: [{ id: 'a' }, { id: 'b' }],
    });

    const content = allGuideItems(guide);
    expect(content).toContain('2 declaration rounds must be completed.');
    expect(content)
      .toContain('With no gear bonus, completing all rounds earns 300 base points.');
    expectTwoGuidePages(guide);
  });

  it('uses each Game 5 level target, timer, lives, and reward', () => {
    const guide = buildGameFiveGuideContent({
      levelNumber: 3,
      settings: { targetWords: 7, seconds: 150, lives: 5 },
    });

    const content = allGuideItems(guide);
    expect(content).toContain('Solve 7 words within 150 seconds.');
    expect(content)
      .toContain('Level reward per solved word: +16 points and +16 coins.');
    expectTwoGuidePages(guide);
  });

  it('uses each Game 6 level target, timer, streak, and coin reward', () => {
    const guide = buildGameSixGuideContent({
      levelNumber: 5,
      settings: { targetWords: 25, seconds: 480, lives: 5, rewardEvery: 4 },
    });

    const content = allGuideItems(guide);
    expect(content).toContain('Clear 25 Java types within 480 seconds.');
    expect(content)
      .toContain('Every 4-term reward streak awards 40 coins separately; coins are not added to the game score.');
    expectTwoGuidePages(guide);
  });

  it('keeps each game completion rule in the condensed two-page guides', () => {
    const guides = [
      buildGameTwoGuideContent({ tasks: [{ id: 'a' }] }),
      buildGameThreeGuideContent({ pairs: [{ id: 'a' }] }),
      buildGameFourGuideContent({ rounds: [{ id: 'a' }] }),
      buildGameFiveGuideContent({ settings: { targetWords: 1 } }),
      buildGameSixGuideContent({ settings: { targetWords: 1 } }),
    ];

    const requirements = [
      'To pass, answer at least 1 of 1 tasks correctly and earn at least 2 task Stars.',
      'Resolving every pair earns 3 game Stars.',
      '1 declaration round must be completed.',
      'Solve 1 words within 180 seconds.',
      'Completing every required term reports 3 Stars.',
    ];
    guides.forEach((guide, index) => {
      expect(allGuideItems(guide)).toContain(requirements[index]);
      expectTwoGuidePages(guide);
    });
  });
});
