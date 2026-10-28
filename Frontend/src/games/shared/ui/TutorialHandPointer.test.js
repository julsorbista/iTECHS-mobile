import { describe, expect, it } from 'vitest';
import { inferTutorialHandAction } from './TutorialHandPointer';

describe('tutorial hand actions', () => {
  it('maps practice instructions to the matching hand motion', () => {
    expect(inferTutorialHandAction({ title: 'Controls', items: ['Move with Left/Right Arrow keys.'] })).toBe('move');
    expect(inferTutorialHandAction({ title: 'Arrange', items: ['Drag pieces into place.'] })).toBe('drag');
    expect(inferTutorialHandAction({ title: 'Cards', items: ['Flip two cards.'] })).toBe('tap');
    expect(inferTutorialHandAction({ title: 'Lives', items: ['Watch your remaining health.'] })).toBe('point');
  });
});
