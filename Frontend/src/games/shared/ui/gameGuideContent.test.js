import { describe, expect, it } from 'vitest';
import { buildGameOneGuideContent } from './gameGuideContent';

const allGuideItems = (guide) => [
  ...guide.summary,
  ...guide.sections.flatMap((section) => section.items),
];

const expectTwoGuidePages = (guide) => {
  expect(guide.sections).toHaveLength(1);
  expect(guide.summary.length).toBeGreaterThan(0);
  expect(guide.sections[0].items.length).toBeGreaterThan(0);
};

describe('Game 1 level-specific guide content', () => {
  it('shows scoring opportunities calculated from the selected level', () => {
    const guide = buildGameOneGuideContent({
      levelNumber: 4,
      title: 'Apex Sentinel',
      settings: {
        playerHealth: 4,
        timerEnabled: true,
        timerSeconds: 150,
        allowProjectile: true,
        coinGoal: 2,
        requireBossDefeat: true,
      },
      questions: [{ id: 'q1' }, { id: 'q2' }],
      worldObjects: {
        spawn: { allowProjectile: true },
        coins: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
        ghosts: [{ id: 'g1' }],
      },
    });

    expect(guide.kicker).toBe('Game 1 · Level 4');
    expect(guide.title).toBe('Apex Sentinel Guide');
    const content = allGuideItems(guide);
    expect(content).toContain('3 coins available; collect at least 2.');
    expect(content)
      .toContain('Finish within 150 seconds or the attempt ends.');
    expect(content).toContain('This level starts with 4 lives.');
    expect(content)
      .toContain('Maximum base score for Level 4: 620 points.');
    expectTwoGuidePages(guide);
  });

  it('removes combat bonuses when shooting is disabled', () => {
    const guide = buildGameOneGuideContent({
      levelNumber: 2,
      settings: { allowProjectile: false },
      questions: [{ id: 'q1' }],
      worldObjects: {
        coins: [{ id: 'c1' }, { id: 'c2' }],
        ghosts: [{ id: 'g1' }],
      },
    });
    const scoreItems = allGuideItems(guide);

    expect(scoreItems.some((item) => item.includes('Successful enemy hits'))).toBe(false);
    expect(scoreItems).toContain('Maximum base score for Level 2: 360 points.');
    expectTwoGuidePages(guide);
  });

  it('shows the same default coin requirement enforced by the ending portal', () => {
    const guide = buildGameOneGuideContent({
      levelNumber: 3,
      worldObjects: {
        coins: Array.from({ length: 10 }, (_, index) => ({ id: `coin-${index + 1}` })),
      },
    });

    expect(allGuideItems(guide)).toContain('10 coins available; collect at least 6.');
    expectTwoGuidePages(guide);
  });

  it('counts only actual coins, not keys or scrolls', () => {
    const guide = buildGameOneGuideContent({
      levelNumber: 2,
      worldObjects: {
        coins: [
          { id: 'coin-1', collectibleType: 'coin' },
          { id: 'key-1', collectibleType: 'key' },
          { id: 'scroll-1', collectibleType: 'scroll' },
        ],
      },
    });

    expect(allGuideItems(guide).some((item) => item.includes('1 coin available'))).toBe(true);
    expectTwoGuidePages(guide);
  });
});
