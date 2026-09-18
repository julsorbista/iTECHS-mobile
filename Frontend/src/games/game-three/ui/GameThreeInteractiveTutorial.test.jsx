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

import GameCanvasGameThree from './GameCanvasGameThree';
const level = { id: 'local-tutorial-test', levelNumber: 1, settings: { previewMs: 0 }, pairs: [
  { id: 'variable', label: 'Variable', cardArt: 'variable' },
  { id: 'boolean', label: 'Boolean', cardArt: 'boolean' },
] };
const cards = () => [...document.querySelectorAll('.game-three-board .game-three-card')];
const snapshot = () => JSON.stringify({ hud: document.querySelector('.game-three-side-panel').textContent, cards: cards().map(c => [c.getAttribute('aria-label'), c.className]) });
it.each([true,false])('preserves first-play Guidelines condition %s', (first) => {
  render(<GameCanvasGameThree levelData={level} showLevelGuideline suppressIntroTutorial continueToTutorialAfterGuide={first} />);
  for(let i=0;i<12&&document.querySelector('.game-guide-nav-next');i++) click('.game-guide-nav-next');
  expect(!!document.querySelector('.in-game-tutorial')).toBe(first);
});
it('automatically flips the actual board without changing counters, order or progress', () => {
  const outcome=vi.fn(), props={levelData:level,suppressIntroTutorial:true,onLevelComplete:outcome};
  const {rerender}=render(<GameCanvasGameThree {...props}/>);
  const before=snapshot(), originals=cards(), save=vi.spyOn(Storage.prototype,'setItem');
  rerender(<GameCanvasGameThree {...props} gameTutorialRequested={1}/>);
  expect(document.querySelectorAll('.game-three-board')).toHaveLength(1);
  expect(cards()).toEqual(originals);
  next(); tick(1200); expect(document.querySelectorAll('.game-three-card-flipped')).toHaveLength(1);
  tick(2000); expect(document.querySelectorAll('.game-three-card-matched')).toHaveLength(2);
  next(); tick(2200); expect(document.querySelectorAll('.game-three-card-flipped')).toHaveLength(2);
  tick(2000); expect(document.querySelectorAll('.game-three-card-flipped')).toHaveLength(0);
  back(); expect(document.querySelectorAll('.game-three-card-flipped')).toHaveLength(0);
  close(); expect(snapshot()).toBe(before); expect(outcome).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
  expect(document.querySelector('.game-three-shell').inert).toBeFalsy();
});
it('restores a nearly expired preview for its full duration', () => {
  const preview={...level,settings:{previewMs:2000}}, props={levelData:preview,suppressIntroTutorial:true};
  const {rerender}=render(<GameCanvasGameThree {...props}/>);
  tick(1990); rerender(<GameCanvasGameThree {...props} gameTutorialRequested={1}/>);
  next(); tick(10000); close();
  tick(1999); expect(document.querySelector('.game-three-status-preview')).not.toBeNull();
  tick(1); expect(document.querySelector('.game-three-status-preview')).toBeNull();
});
it('restores pending mismatched cards with their full flip-back delay', () => {
  const mismatch={...level,settings:{previewMs:0,flipBackMs:1200}}, props={levelData:mismatch,suppressIntroTutorial:true};
  const {rerender}=render(<GameCanvasGameThree {...props}/>);
  const original=cards(); fireEvent.click(original[0]); fireEvent.click(original.find(c=>c.getAttribute('aria-label')!==original[0].getAttribute('aria-label')));
  tick(1190); rerender(<GameCanvasGameThree {...props} gameTutorialRequested={1}/>);
  next(); tick(10000); for(let i=0;i<5;i++) next();
  tick(1199); expect(document.querySelectorAll('.game-three-card-flipped')).toHaveLength(2);
  tick(1); expect(document.querySelectorAll('.game-three-card-flipped')).toHaveLength(0);
  expect(document.querySelector('.game-three-side-status')).toHaveTextContent('Misses 1');
});
it('does not resolve a real pending match until the tutorial closes', () => {
  const props={levelData:level,suppressIntroTutorial:true}; const {rerender}=render(<GameCanvasGameThree {...props}/>);
  const original=cards(); fireEvent.click(original[0]); fireEvent.click(original.find(c=>c!==original[0]&&c.getAttribute('aria-label')===original[0].getAttribute('aria-label')));
  tick(100); rerender(<GameCanvasGameThree {...props} gameTutorialRequested={1}/>);
  tick(10000); expect(document.querySelector('.game-three-side-metrics')).toHaveTextContent('Stars 0');
  close(); tick(439); expect(document.querySelectorAll('.game-three-card-matched')).toHaveLength(0);
  tick(1); expect(document.querySelectorAll('.game-three-card-matched')).toHaveLength(2);
});
