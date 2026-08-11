import { describe, expect, it } from 'vitest';
import { buildGameOneGuideContent } from './gameGuideContent';

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
    expect(guide.summary).toContain('3 coins available; collect at least 2.');
    expect(guide.sections.find((section) => section.title === 'Lives & Timer').items)
      .toContain('Finish within 150 seconds or the attempt ends.');
    expect(guide.sections.find((section) => section.title === 'Level 4 Score').items)
      .toContain('Maximum base score for Level 4: 690 points.');
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
    const scoreItems = guide.sections.find((section) => section.title === 'Level 2 Score').items;

    expect(scoreItems.some((item) => item.includes('Successful enemy hits'))).toBe(false);
    expect(scoreItems).toContain('Maximum base score for Level 2: 395 points.');
  });
});
