import { describe, expect, it } from 'vitest';
import { gameOneRuntimeAssets } from './runtimeAssets';

describe('Game 1 runtime assets', () => {
  it('loads every player animation frame as an independent image', () => {
    const entries = [
      gameOneRuntimeAssets.manifest.player,
      gameOneRuntimeAssets.manifest.playerRun,
      gameOneRuntimeAssets.manifest.playerJump,
    ];

    entries.forEach((entry) => {
      const prefix = `${entry.key}-frame-`;
      expect(gameOneRuntimeAssets.images.filter(({ key }) => key.startsWith(prefix)))
        .toHaveLength(entry.frameCount);
      expect(gameOneRuntimeAssets.spritesheets.some(({ key }) => key === entry.key))
        .toBe(false);
    });
  });

  it('does not request the missing animated statue sheet', () => {
    expect(gameOneRuntimeAssets.spritesheets.some(({ key }) => key === 'statue-idle-sheet'))
      .toBe(false);
    expect(gameOneRuntimeAssets.images.some(({ key }) => key === 'teacher-statue-elem12'))
      .toBe(true);
  });

  it('loads the fire-themed projectile used by the elemental villain', () => {
    const projectileEntry = gameOneRuntimeAssets.spritesheets.find(
      ({ key }) => key === gameOneRuntimeAssets.manifest.elementalProjectile.key,
    );

    expect(projectileEntry?.url).toContain('villain1-fire-projectile.png');
    expect(gameOneRuntimeAssets.manifest.elementalProjectile.flipWithDirection).toBe(true);
  });
});
