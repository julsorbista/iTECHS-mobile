import { describe, expect, it } from 'vitest';

import { buildWorldGridLayout } from './roomFlow';
import { getPortalRoomId, isReturnToBlockedRoom } from './roomBacktrack';

describe('roomBacktrack', () => {
  it('resolves a portal room id from world position', () => {
    const worldLayout = buildWorldGridLayout({
      viewport: { width: 1280, height: 720 },
      grid: {
        cells: [
          { id: 'room-1', col: 0, row: 0 },
          { id: 'room-2', col: 1, row: 0 },
        ],
      },
    });

    expect(getPortalRoomId(worldLayout, { x: 1400, y: 556 })).toBe('room-2');
  });

  it('matches only the blocked previous room id', () => {
    expect(isReturnToBlockedRoom('room-1', 'room-1')).toBe(true);
    expect(isReturnToBlockedRoom('room-1', 'room-2')).toBe(false);
  });
});
