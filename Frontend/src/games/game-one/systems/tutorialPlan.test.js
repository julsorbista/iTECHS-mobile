import { describe, expect, it } from 'vitest';
import { buildTutorialPlan, observeTutorialAction, tutorialIntent, automaticTutorialIntent } from './tutorialPlan';

describe('Game 1 guided actions', () => {
  it('automatically demonstrates directions after giving the hand time to arrive', () => {
    const sample = { elapsed: 799, now: 799, grounded: true, jumpedAt: null, complete: false };
    expect(automaticTutorialIntent({ id: 'left' }, sample).left).toBe(false);
    expect(automaticTutorialIntent({ id: 'left' }, { ...sample, elapsed: 800 }).left).toBe(true);
    expect(automaticTutorialIntent({ id: 'right' }, { ...sample, elapsed: 800 }).right).toBe(true);
    expect(Object.values(automaticTutorialIntent({ id: 'left' }, { ...sample, elapsed: 800, complete: true })).some(Boolean)).toBe(false);
  });
  it('automatically jumps once and only air-dashes after takeoff', () => {
    const sample = { elapsed: 1000, now: 1000, grounded: true, jumpedAt: null, complete: false };
    expect(automaticTutorialIntent({ id: 'jump' }, sample).jumpPressed).toBe(true);
    expect(automaticTutorialIntent({ id: 'jump' }, { ...sample, jumpedAt: 900 }).jumpPressed).toBe(false);
    const dash = { id: 'dash', jumpKeys: ['SPACE'] };
    expect(automaticTutorialIntent(dash, sample)).toMatchObject({ jumpPressed: true, dashPressed: false });
    expect(automaticTutorialIntent(dash, { ...sample, grounded: false, jumpedAt: 950 }).dashPressed).toBe(false);
    expect(automaticTutorialIntent(dash, { ...sample, grounded: false, jumpedAt: 800 }).dashPressed).toBe(true);
    expect(automaticTutorialIntent({ id: 'dash', jumpKeys: [] }, sample)).toMatchObject({ jumpPressed: false, dashPressed: true });
    expect(automaticTutorialIntent({ id: 'attack' }, sample).attackPressed).toBe(true);
    expect(Object.values(automaticTutorialIntent({ id: 'booster' }, sample)).some(Boolean)).toBe(false);
  });
  it('presents six pages in the requested order, grouping all movement actions on page 1', () => {
    const plan = buildTutorialPlan({ allowProjectile: true, allowMidairDash: true });
    expect([...new Set(plan.map((step) => step.page))]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(plan.filter((step) => step.page === 1).map((step) => step.id)).toEqual(['left', 'right', 'jump', 'dash', 'attack']);
    expect(plan.filter((step) => step.page > 1).map((step) => step.target)).toEqual(['booster', 'coin', 'scroll', 'monster', 'treasure']);
    expect(plan.find((step) => step.page === 3).prompt).toBe('Collect coins to buy hints.');
  });
  it('uses configured keys and only teaches enabled abilities', () => {
    const plan = buildTutorialPlan({ allowProjectile: true, projectileKeybind: 'K', allowMidairDash: false, jumpKeybind: 'Z' });
    expect(plan.find((step) => step.id === 'attack').keys).toEqual(['K']);
    expect(plan.find((step) => step.id === 'jump').keys).toContain('Z');
    expect(plan.some((step) => step.id === 'dash')).toBe(false);
    expect(buildTutorialPlan({}).some((step) => step.id === 'attack')).toBe(false);
  });
  it('requires directional displacement, not a keypress against a wall', () => {
    const start = { startX: 100, distance: 30 };
    expect(observeTutorialAction('left', start, { x: 100 }).complete).toBe(false);
    expect(observeTutorialAction('left', start, { x: 120 }).ratio).toBe(0);
    expect(observeTutorialAction('left', start, { x: 70 }).complete).toBe(true);
  });
  it('does not tell students to jump when the configured dash is ground-only', () => {
    const dash = buildTutorialPlan({ allowMidairDash: true, dashMode: 'GROUND_ONLY', dashKeybind: 'Q' }).find((step) => step.id === 'dash');
    expect(dash.jumpKeys).toEqual([]);
    expect(dash.prompt).toBe('Press Q to dash along the platform.');
  });
  it('requires an accepted jump followed by a safe landing', () => {
    const start = { jumped: false };
    expect(observeTutorialAction('jump', start, { grounded: true, onSafePlatform: true }).complete).toBe(false);
    const airborne = observeTutorialAction('jump', start, { jumpAccepted: true });
    expect(airborne.complete).toBe(false);
    expect(observeTutorialAction('jump', airborne, { grounded: true, onSafePlatform: false }).complete).toBe(false);
    expect(observeTutorialAction('jump', airborne, { grounded: true, onSafePlatform: true }).complete).toBe(true);
  });
  it('requires actual dash and projectile creation', () => {
    expect(observeTutorialAction('dash', {}, { dashPressed: true }).complete).toBe(false);
    expect(observeTutorialAction('dash', {}, { dashAccepted: true }).complete).toBe(true);
    expect(observeTutorialAction('attack', {}, { attackPressed: true }).complete).toBe(false);
    expect(observeTutorialAction('attack', {}, { shotCreated: true }).complete).toBe(true);
  });
  it('allows only current practice controls and stops them during success feedback', () => {
    const all = { left: true, right: true, jumpPressed: true, dashPressed: true, attackPressed: true };
    expect(tutorialIntent('left', all, false)).toMatchObject({ left: true, right: false, attackPressed: false, jumpPressed: false });
    expect(Object.values(tutorialIntent('dash', all, true)).every((value) => !value)).toBe(true);
    expect(tutorialIntent('health', all, false).left).toBe(false);
  });
});
