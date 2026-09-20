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

import GameCanvasGameFive from './GameCanvasGameFive';
import { levelAPI } from '../../../utils/api';
import { addUserCoins, spendUserCoins } from '../../shared/gameSessionPersistence';
import level from '../data/levels/level-01.json';
import appStyles from '../../../index.css?raw';
import postcss from 'postcss';
vi.mock('../../../utils/api',()=>({levelAPI:{generateGameQuestions:vi.fn(),generateGameHint:vi.fn()}}));
vi.mock('../../shared/gameSessionPersistence',()=>({addUserCoins:vi.fn(),spendUserCoins:vi.fn()}));
const entry={word:'ARRAY',clue:'A collection of values stored by index.'};
const mount=async(props={})=>{
  levelAPI.generateGameQuestions.mockResolvedValue({data:{questions:Array(5).fill(entry)}});
  const view=render(<GameCanvasGameFive levelData={level} {...props}/>); await act(async()=>{}); return view;
};
it('does not hide the game when it is the first child of the mobile arcade panel', async () => {
  const view = await mount();
  const shell = document.createElement('div');
  shell.className = 'student-shell-overlay';
  shell.innerHTML = '<section class="student-game-four-panel student-game-five-panel"><div class="student-game-frame-wrap"></div></section>';
  document.body.append(shell);
  const frame = shell.querySelector('.student-game-frame-wrap');
  frame.append(view.container);
  const hiddenBy = [];
  postcss.parse(appStyles).walkRules((rule) => {
    if (!rule.selector.includes('student-game-four-panel')) return;
    if (!rule.nodes.some((node) => node.prop === 'display' && node.value === 'none')) return;
    const controls = [frame, frame.querySelector('.game-five-keyboard'), frame.querySelector('[data-g5-target="clue"]').parentElement];
    if (controls.some((element) => element.matches(rule.selector))) hiddenBy.push(rule.selector);
  });
  expect(frame.querySelector('.game-five-keyboard')).not.toBeNull();
  expect(hiddenBy).toEqual([]);
  shell.remove();
});
it.each([true,false])('preserves first-play Guidelines condition %s',async(first)=>{
  await mount({showLevelGuideline:true,continueToTutorialAfterGuide:first});
  for(let i=0;i<12&&document.querySelector('.game-guide-nav-next');i++)click('.game-guide-nav-next');
  expect(!!document.querySelector('.in-game-tutorial')).toBe(first);
});
it('uses the existing keyboard, robot and timer for automatic safe demonstrations',async()=>{
  await mount(); const button=document.querySelector('.game-five-tutorial-button');
  expect(button.previousElementSibling).toHaveTextContent('Round:');
  const robot=document.querySelector('.game-five-robot-room img'), timer=document.querySelector('.game-five-timer-status'), before=timer.textContent;
  const save=vi.spyOn(Storage.prototype,'setItem'); fireEvent.click(button);
  expect(document.querySelector('.game-five-robot-room img')).toBe(robot);
  expect(document.querySelector('.game-five-timer-status')).toBe(timer);
  expect(document.querySelectorAll('.game-five-keyboard')).toHaveLength(1);
  next(); tick(1200); expect(document.querySelectorAll('.game-five-word-tile-filled')).toHaveLength(2);
  next(); tick(2200); expect(document.querySelector('.game-five-lives-status')).toHaveTextContent('5/5');
  next(); tick(2000); expect(document.querySelectorAll('.game-five-word-tile-hint')).toHaveLength(1);
  next(); tick(15000); expect(timer.textContent).toBe(before);
  next(); tick(6000); expect(document.querySelectorAll('.game-five-word-tile-filled')).toHaveLength(5);
  next(); expect(document.querySelectorAll('.game-five-word-tile-filled')).toHaveLength(0);
  expect(addUserCoins).not.toHaveBeenCalled(); expect(spendUserCoins).not.toHaveBeenCalled(); expect(levelAPI.generateGameHint).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
});
it('restores real partial guesses and resumes the existing clock',async()=>{
  await mount(); fireEvent.keyDown(window,{key:'a'});
  const answer=document.querySelector('.game-five-answer-panel').textContent;
  click('.game-five-tutorial-button'); next(); tick(10000); back(); close();
  expect(document.querySelector('.game-five-answer-panel').textContent).toBe(answer);
  expect(document.querySelector('[data-tutorial-highlight]')).toBeNull();
  tick(1000); expect(document.querySelector('.game-five-timer-status')).toHaveTextContent('02:59');
});
