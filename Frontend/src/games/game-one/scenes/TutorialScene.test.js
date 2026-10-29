import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../entities/Player', () => ({ default: class {} }));
vi.mock('../entities/EnemyProjectile', () => ({ default: class {} }));
vi.mock('../systems/surfaceGeometry', () => ({ shouldProcessSurfaceCollision: vi.fn() }));
import TutorialScene from './TutorialScene';
import { buildTutorialPlan } from '../systems/tutorialPlan';

const createScene = () => {
  const scene = new TutorialScene();
  Object.assign(scene, {
    steps: buildTutorialPlan({}), index: 0, projectiles: [], complete: false,
    sys: { isActive: () => true }, time: { now: 1000, delayedCall: vi.fn(() => ({ remove: vi.fn() })) },
    demoStartedAt: 0, demoJumpedAt: null, demoPressedUntil: 0,
    progress: { startX: 100, distance: 30, ratio: 0 }, lastPublish: 0,
    room: { bottom: 1000 }, safe: { body: { top: 100, left: 0, right: 200 } },
    source: Object.freeze({ health: 3, score: 25, coins: 2, attempts: 1 }),
    player: { x: 100, isDashing: false, isOnGround: () => true,
      body: { top: 80, bottom: 100, left: 40, right: 70, velocity: { y: 0 } } },
    publish: vi.fn(), returnToSafety: vi.fn(),
  });
  scene.player.update = vi.fn((intent) => { if (intent.left) scene.player.x = 70; });
  return scene;
};

describe('Game 1 automatic tutorial scene', () => {
  it('points at a visible scroll pickup rather than the hearts', () => {
    const scene = new TutorialScene();
    const scroll = { pickupType: 'scroll' };
    const hearts = {};
    scene.source = { scene: { get: () => ({ healthText: hearts }) }, sceneObjects: [scroll] };
    const bounds = { x: .4, y: .2, width: .03, height: .1 };
    scene.rectFor = vi.fn((object) => object === scroll ? bounds : null);
    expect(scene.getTarget('scroll')).toEqual(bounds);
    expect(scene.rectFor).not.toHaveBeenCalledWith(hearts, true);
    scene.source.sceneObjects = [];
    expect(scene.getTarget('scroll')).toBeNull();
  });
  it('isolates the scroll count from the combined HUD counter when no scroll is visible', () => {
    const scene = new TutorialScene();
    const coinText = { text: 'coins 0    \u{1F4DC} 0/3', context: { measureText: (text) => ({ width: text.length * 10 }) } };
    scene.source = { scene: { get: () => ({ coinText }) } };
    scene.rectFor = () => ({ x: .01, y: .08, width: .2, height: .04 });
    const target = scene.getTarget('scroll-counter');
    expect(target.y).toBe(.08);
    expect(target.x).toBeGreaterThan(.01);
    expect(target.width).toBeLessThan(.2);
  });
  it('moves the demo player and synchronizes the press without keyboard input', () => {
    const scene = createScene();
    const before = { ...scene.source };
    scene.update(1000);
    expect(scene.player.update).toHaveBeenCalledWith(expect.objectContaining({ left: true, right: false }));
    expect(scene.demoControl).toBe('left');
    expect(scene.demoPressedUntil).toBe(1220);
    expect(scene.complete).toBe(true);
    expect(scene.time.delayedCall).toHaveBeenCalledOnce();
    expect(scene.source).toEqual(before);
  });
  it('waits for Next at the end of movement demos', () => {
    const scene = createScene();
    scene.index = scene.steps.findIndex((step) => step.id === 'jump');
    scene.finishStep();
    expect(scene.time.delayedCall).not.toHaveBeenCalled();
    scene.acknowledge();
    expect(scene.steps[scene.index].page).toBe(2);
  });
  it('Next/Back cancels pending demos and clears only practice objects', () => {
    const scene = createScene();
    const remove = vi.fn(), destroy = vi.fn();
    scene.advanceTimer = { remove };
    scene.projectiles = [{ destroy }];
    scene.goToPage(2);
    expect(remove).toHaveBeenCalledWith(false);
    expect(destroy).toHaveBeenCalledOnce();
    expect(scene.steps[scene.index].page).toBe(2);
    scene.goToPage(1);
    expect(scene.steps[scene.index].id).toBe('left');
    expect(scene.demoStartedAt).toBe(1000);
    expect(scene.complete).toBe(false);
    const index = scene.index;
    scene.goToPage(7);
    expect(scene.index).toBe(index);
  });
});
