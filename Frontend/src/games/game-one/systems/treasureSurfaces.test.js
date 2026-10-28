import { describe, expect, it } from 'vitest';

import { getTreasureHazardLayout } from './treasureSurfaces';

const entry = {
  visual: { x: 320, y: 480 },
  geometry: {
    bodyRect: { width: 192 },
    visualRect: { top: 450 },
  },
};

describe('GAME_ONE treasure hazard layout', () => {
  it('matches the spike collision zone to the displayed spike height', () => {
    expect(getTreasureHazardLayout(entry, { hazardType: 'spikes' })).toEqual({
      frame: 'spikes',
      width: 192,
      height: 44,
      centerX: 320,
      centerY: 428,
      zoneWidth: 192,
      zoneHeight: 44,
      zoneCenterY: 428,
    });
  });

  it('matches the fire collision zone to the taller displayed fire height', () => {
    expect(getTreasureHazardLayout(entry, { hazardType: 'fire' })).toEqual({
      frame: 'fireball',
      width: 192,
      height: 58,
      centerX: 320,
      centerY: 455,
      zoneWidth: 216,
      zoneHeight: 72,
      zoneCenterY: 452,
    });
  });
});
