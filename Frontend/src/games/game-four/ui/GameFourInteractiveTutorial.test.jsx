import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const click = (selector) => fireEvent.click(document.querySelector(selector));
const next = () => click('.in-game-tutorial nav button:last-child');
const back = () => click('.in-game-tutorial nav button:first-child');
const close = () => click('.in-game-tutorial__close');
const tick = (ms) => act(() => vi.advanceTimersByTime(ms));
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

import GameCanvasGameFour from './GameCanvasGameFour';
import level from '../data/levels/level-01.json';
vi.mock('framer-motion', async (original) => ({...await original(), AnimatePresence: ({children})=>children}));
it.each([true,false])('preserves first-play Guidelines condition %s', (first) => {
  render(<GameCanvasGameFour levelData={level} showLevelGuideline suppressIntroTutorial continueToTutorialAfterGuide={first}/>);
  expect(document.querySelector('.game-four-story-card')).toBeNull();
  expect(document.querySelector('.g4-guide-screen')).not.toBeNull();
  for(let i=0;i<12&&document.querySelector('.game-guide-nav-next');i++) click('.game-guide-nav-next');
  expect(!!document.querySelector('.in-game-tutorial')).toBe(first);
});
it('moves the actual robot and arranges tokens without consuming real state', () => {
  const complete=vi.fn(), balance=vi.fn(), props={levelData:level,suppressIntroTutorial:true,onLevelComplete:complete,onCoinBalanceChange:balance};
  const {rerender}=render(<GameCanvasGameFour {...props}/>);
  const robot=document.querySelector('.game-four-catcher'), style=robot.getAttribute('style');
  const hud=document.querySelector('.game-four-hud').textContent;
  balance.mockClear(); const save=vi.spyOn(Storage.prototype,'setItem');
  rerender(<GameCanvasGameFour {...props} gameTutorialRequested={1}/>);
  tick(1500); expect(document.querySelector('.game-four-catcher')).toBe(robot);
  expect(robot.getAttribute('style')).not.toBe(style);
  expect(document.querySelector('.g4-practice-board')).toBeNull();
  next(); tick(1500); expect(document.querySelector('[data-demo-falling]')).not.toBeNull();
  next(); tick(1000); expect(document.querySelector('[data-demo-falling] img')).toHaveAttribute('alt','bomb');
  next(); next(); tick(10000);
  expect(document.querySelectorAll('.game-four-token-bank button')).toHaveLength(0);
  expect(document.querySelector('.game-four-assembly-output').textContent.trim().length).toBeGreaterThan(0);
  close(); expect(document.querySelector('.game-four-catcher').getAttribute('style')).toBe(style);
  expect(document.querySelector('.game-four-hud').textContent).toBe(hud);
  expect(complete).not.toHaveBeenCalled(); expect(balance).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
});

const pointer = (node, type, clientX, pointerId = 1) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'pointerType', { value: 'touch' });
  fireEvent(node, event);
};

it('maps touch movement to the scaled playfield and releases at the edges', () => {
  render(<GameCanvasGameFour levelData={level} suppressIntroTutorial />);
  const field = document.querySelector('.game-four-touch-surface');
  const robot = document.querySelector('.game-four-catcher');
  vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({ width: 390 });
  const start = parseFloat(robot.style.left);
  pointer(field, 'pointerdown', 150);
  pointer(field, 'pointermove', 175);
  expect(parseFloat(robot.style.left)).toBe(start + 50);
  pointer(field, 'pointermove', 250, 2);
  expect(parseFloat(robot.style.left)).toBe(start + 50);
  pointer(field, 'pointermove', -1000);
  expect(parseFloat(robot.style.left)).toBe(0);
  pointer(field, 'pointermove', -990);
  expect(parseFloat(robot.style.left)).toBe(20);
  pointer(field, 'pointerup', -990);
  pointer(field, 'pointermove', 200);
  expect(parseFloat(robot.style.left)).toBe(20);
  pointer(field, 'pointerdown', 100);
  pointer(field, 'pointermove', 10000);
  const right = parseFloat(robot.style.left);
  pointer(field, 'pointermove', 20000);
  expect(parseFloat(robot.style.left)).toBe(right);
  pointer(field, 'pointercancel', 20000);
  pointer(field, 'pointermove', 0);
  expect(parseFloat(robot.style.left)).toBe(right);
  expect(field.style.touchAction).toBe('none');
});

it('stops dragging when paused, loses capture, or loses window focus', () => {
  const props = { levelData: level, suppressIntroTutorial: true };
  const { rerender } = render(<GameCanvasGameFour {...props} />);
  const field = document.querySelector('.game-four-touch-surface');
  const robot = document.querySelector('.game-four-catcher');
  vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({ width: 390 });
  const start = robot.style.left;
  pointer(field, 'pointerdown', 100);
  pointer(field, 'lostpointercapture', 100);
  pointer(field, 'pointermove', 150);
  expect(robot.style.left).toBe(start);
  pointer(field, 'pointerdown', 100);
  fireEvent.blur(window);
  pointer(field, 'pointermove', 150);
  expect(robot.style.left).toBe(start);
  pointer(field, 'pointerdown', 100);
  rerender(<GameCanvasGameFour {...props} isSubmitting />);
  pointer(field, 'pointermove', 150);
  expect(robot.style.left).toBe(start);
  rerender(<GameCanvasGameFour {...props} />);
  pointer(field, 'pointermove', 150);
  expect(robot.style.left).toBe(start);
});

it('retains the original catch panels, keyboard movement and arrow buttons', () => {
  render(<GameCanvasGameFour levelData={level} suppressIntroTutorial />);
  for (const name of ['header', 'hud', 'objective-card', 'sidebar-movement-card', 'sidebar-gear-card', 'sidebar-guide-card', 'side-actions', 'mobile-controls']) {
    expect(document.querySelector('.game-four-' + name)).not.toBeNull();
  }
  const robot = document.querySelector('.game-four-catcher');
  const start = parseFloat(robot.style.left);
  fireEvent.keyDown(window, { key: 'ArrowLeft' }); tick(100);
  fireEvent.keyUp(window, { key: 'ArrowLeft' });
  const left = parseFloat(robot.style.left);
  expect(left).toBeLessThan(start);
  const rightButton = document.querySelector('[aria-label="Move right"]');
  pointer(rightButton, 'pointerdown', 0); tick(100);
  pointer(rightButton, 'pointerup', 0);
  expect(parseFloat(robot.style.left)).toBeGreaterThan(left);
});
