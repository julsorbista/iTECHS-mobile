import { describe, expect, it } from 'vitest';

import {
  getPortalExitPosition,
  resolveLevelRestartPosition,
  resolveQuestionRestartPosition,
  resolveRespawnPosition,
  resolveRoomStartPosition,
  resolveTargetRoomEntryPosition,
} from '../systems/roomEntry';
import { shouldUsePortalOnlyRoomTraversal } from '../systems/roomTraversal';

describe('shouldUsePortalOnlyRoomTraversal', () => {
  it('enables portal-only traversal when the level explicitly requests it', () => {
    expect(shouldUsePortalOnlyRoomTraversal({ roomTraversalMode: 'PORTAL_ONLY' }, { portal: [] })).toBe(true);
  });

  it('enables portal-only traversal when a portal targets another room', () => {
    expect(shouldUsePortalOnlyRoomTraversal({}, {
      portal: [
        { x: 100, y: 200, targetRoomId: 'room-2' },
      ],
    })).toBe(true);
  });

  it('enables portal-only traversal for multi-room levels that use explicit portals', () => {
    expect(shouldUsePortalOnlyRoomTraversal({
      grid: {
        cells: [
          { id: 'room-1', col: 0, row: 0 },
          { id: 'room-2', col: 1, row: 0 },
        ],
      },
    }, {
      portal: [
        { x: 1135, y: 556, linkName: '' },
      ],
    })).toBe(true);
  });

  it('does not enable portal-only traversal for non-room portals', () => {
    expect(shouldUsePortalOnlyRoomTraversal({}, {
      portal: [
        { x: 100, y: 200, endsLevel: true },
        { x: 300, y: 200, linkName: 'alpha' },
      ],
    })).toBe(false);
  });
});

describe('room entry helpers', () => {
  it('prefers the saved checkpoint position over the room spawn on restart', () => {
    expect(resolveRespawnPosition(
      { x: 920, y: 312 },
      { x: 140, y: 560 },
    )).toEqual({
      x: 920,
      y: 312,
    });
  });

  it('falls back to the room spawn when no saved checkpoint exists', () => {
    expect(resolveRespawnPosition(
      null,
      { x: 140, y: 560 },
    )).toEqual({
      x: 140,
      y: 560,
    });
  });

  it('prefers the saved room checkpoint over the question trigger position on wrong-answer restart', () => {
    expect(resolveQuestionRestartPosition({
      checkpointPosition: { x: 1080, y: 312 },
      triggerPosition: { x: 360, y: 490 },
      fallbackPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 1080,
      y: 312,
    });
  });

  it('uses the saved room start position instead of a newly computed entry position when returning to a room', () => {
    expect(resolveRoomStartPosition({
      savedRoomStartPosition: { x: 1080, y: 312 },
      entryPosition: { x: 220, y: 560 },
      fallbackPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 1080,
      y: 312,
    });
  });

  it('uses the current room entry position when no room start position has been saved yet', () => {
    expect(resolveRoomStartPosition({
      savedRoomStartPosition: null,
      entryPosition: { x: 220, y: 560 },
      fallbackPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 220,
      y: 560,
    });
  });

  it('uses the trigger position when no room checkpoint was saved', () => {
    expect(resolveQuestionRestartPosition({
      checkpointPosition: null,
      triggerPosition: { x: 360, y: 490 },
      fallbackPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 360,
      y: 490,
    });
  });

  it('uses room 1 saved start position for damage restarts', () => {
    expect(resolveLevelRestartPosition({
      firstRoomStartPosition: { x: 180, y: 560 },
      firstRoomSpawnPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 180,
      y: 560,
    });
  });

  it('falls back to room 1 spawn for damage restarts when no saved room 1 start exists', () => {
    expect(resolveLevelRestartPosition({
      firstRoomStartPosition: null,
      firstRoomSpawnPosition: { x: 140, y: 560 },
    })).toEqual({
      x: 140,
      y: 560,
    });
  });

  it('places the player just outside the destination portal exit', () => {
    expect(getPortalExitPosition(
      { left: 0, right: 2560 },
      { x: 1135, y: 556 },
      { x: 1280, y: 556 },
    )).toEqual({
      x: 1336,
      y: 548,
    });
  });

  it('uses the target room start position for room-target portal travel', () => {
    expect(resolveTargetRoomEntryPosition({
      targetRecord: {
        origin: { x: 1280, y: 0 },
        cell: {
          spawn: { x: 140, y: 560 },
        },
      },
    })).toEqual({
      x: 1420,
      y: 560,
    });
  });

  it('falls back to the room spawn when no return portal exists', () => {
    expect(resolveTargetRoomEntryPosition({
      targetRecord: {
        origin: { x: 1280, y: 0 },
        cell: {
          spawn: { x: 140, y: 560 },
        },
      },
    })).toEqual({
      x: 1420,
      y: 560,
    });
  });
});
