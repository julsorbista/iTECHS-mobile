import { describe, expect, it } from 'vitest';

import { buildWorldGridLayout } from './roomFlow';
import { resolvePortalQuestionId } from './portalLocks';

describe('resolvePortalQuestionId', () => {
  it('keeps an explicit portal question id', () => {
    expect(resolvePortalQuestionId(
      { x: 1100, y: 560, questionId: 'portal-question', targetRoomId: 'room-2' },
      [{ x: 400, y: 400, questionId: 'room-question' }],
      buildWorldGridLayout({
        viewport: { width: 1280, height: 720 },
        grid: { cells: [{ id: 'room-1', col: 0, row: 0 }, { id: 'room-2', col: 1, row: 0 }] },
      }),
    )).toBe('portal-question');
  });

  it('inherits the question from the villain in the same room for room-target portals', () => {
    const worldLayout = buildWorldGridLayout({
      viewport: { width: 1280, height: 720 },
      grid: { cells: [{ id: 'room-1', col: 0, row: 0 }, { id: 'room-2', col: 1, row: 0 }] },
    });

    expect(resolvePortalQuestionId(
      { x: 1150, y: 556, targetRoomId: 'room-2' },
      [
        { x: 520, y: 402, questionId: 'ram-question' },
        { x: 1600, y: 402, questionId: 'other-room-question' },
      ],
      worldLayout,
    )).toBe('ram-question');
  });

  it('inherits the question from the villain in the same room for linked non-ending portals', () => {
    const worldLayout = buildWorldGridLayout({
      viewport: { width: 1280, height: 720 },
      grid: { cells: [{ id: 'room-1', col: 0, row: 0 }, { id: 'room-2', col: 1, row: 0 }] },
    });

    expect(resolvePortalQuestionId(
      { x: 1150, y: 556, endsLevel: false, linkName: 'bridge-a' },
      [
        { x: 520, y: 402, questionId: 'ram-question' },
        { x: 1600, y: 402, questionId: 'other-room-question' },
      ],
      worldLayout,
    )).toBe('ram-question');
  });

  it('does not lock non-room portals implicitly', () => {
    const worldLayout = buildWorldGridLayout({
      viewport: { width: 1280, height: 720 },
      grid: { cells: [{ id: 'room-1', col: 0, row: 0 }] },
    });

    expect(resolvePortalQuestionId(
      { x: 1150, y: 556, endsLevel: true },
      [{ x: 520, y: 402, questionId: 'ram-question' }],
      worldLayout,
    )).toBe('');
  });
});
