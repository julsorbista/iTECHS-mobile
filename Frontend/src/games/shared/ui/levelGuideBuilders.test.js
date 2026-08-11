import { describe, expect, it } from 'vitest';
import {
  buildGameTwoGuideContent,
  buildGameThreeGuideContent,
  buildGameFourGuideContent,
  buildGameFiveGuideContent,
  buildGameSixGuideContent,
} from './levelGuideBuilders';

const getSection = (guide, title) => guide.sections.find((section) => section.title === title);

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
    expect(guide.summary).toContain('2 required coding tasks.');
    expect(getSection(guide, 'Level 3 Score').items)
      .toContain('Each correct task submits 1 base point (maximum submitted base score: 2).');
    expect(getSection(guide, 'Level 3 Score').items)
      .toContain('The task content contains 300 configured raw points, but these are not used by the current submission scoring path.');
    expect(getSection(guide, 'Platform Stars').items[0]).toContain('first 2 mistakes');
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
    const setup = getSection(guide, 'Level Setup').items.join(' ');
    const score = getSection(guide, `Level ${levelNumber} Score`).items.join(' ');

    expect(setup).toContain(`${seconds} seconds`);
    expect(setup).toContain(`mistake target: ${maxMistakes}`);
    expect(setup).toContain(`Configured target: ${targetPoints} points`);
    expect(setup).toContain(`configured time bonus: ${bonusPerSecond} points per second`);
    expect(score).toContain(`${rawPoints} configured raw points`);
    expect(score).toContain('up to 6 configured coins');
  });

  it('shows Game 2 attempt rules for every code-lab level', () => {
    [1, 2, 3, 4, 5].forEach((levelNumber) => {
      const taskCount = levelNumber;
      const guide = buildGameTwoGuideContent({
        levelNumber,
        tasks: Array.from({ length: taskCount }, (_, index) => ({ id: `task-${index + 1}` })),
      });
      const attempts = getSection(guide, 'Attempt Rules');

      expect(attempts.items).toContain('Every coding task starts with 3 compile checks.');
      expect(attempts.items).toContain('A wrong compilation uses 1 check and adds 1 mistake.');
      expect(attempts.items.some((item) => item.includes('loads a different code variation'))).toBe(true);
    });
  });

  it('derives Game 3 pairs, cards, attempts, and maximum points', () => {
    const guide = buildGameThreeGuideContent({
      levelNumber: 4,
      pairs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      settings: { columns: 3, flipBackMs: 750 },
    });

    expect(guide.summary).toContain('3 pairs (6 cards) must be resolved.');
    expect(getSection(guide, 'Attempts & Questions').items)
      .toContain('The level begins with 6 flip attempts.');
    expect(getSection(guide, 'Level 4 Score').items[0]).toContain('maximum 3 points');
  });

  it('derives Game 4 rounds and the submitted score formula', () => {
    const guide = buildGameFourGuideContent({
      levelNumber: 2,
      settings: { lives: 4, statementReward: 150 },
      rounds: [{ id: 'a' }, { id: 'b' }],
    });

    expect(guide.summary).toContain('2 declaration rounds must be completed.');
    expect(getSection(guide, 'Level 2 Score').items)
      .toContain('With no mistakes or fruit bonus, the submitted base score is 440 points.');
  });

  it('uses each Game 5 level target, timer, lives, and reward', () => {
    const guide = buildGameFiveGuideContent({
      levelNumber: 3,
      settings: { targetWords: 7, seconds: 150, lives: 5 },
    });

    expect(guide.summary).toContain('Solve 7 words within 150 seconds.');
    expect(getSection(guide, 'Level 3 Score').items)
      .toContain('Level reward per solved word: +16 points and +16 coins.');
  });

  it('uses each Game 6 level target, timer, streak, and coin reward', () => {
    const guide = buildGameSixGuideContent({
      levelNumber: 5,
      settings: { targetWords: 25, seconds: 480, lives: 5, rewardEvery: 4 },
    });

    expect(guide.summary).toContain('Clear 25 terms within 480 seconds.');
    expect(getSection(guide, 'Level 5 Score').items)
      .toContain('Every 4-term reward streak adds 40 coins and the same amount to score.');
  });
});
