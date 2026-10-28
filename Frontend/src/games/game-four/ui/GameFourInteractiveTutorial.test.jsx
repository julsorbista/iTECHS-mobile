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
