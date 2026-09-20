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

import GameCanvasGameSix from './GameCanvasGameSix';
import { buildGameSixPractice } from './GameSixInteractiveTutorial';
import level from '../data/levels/level-01.json';
import { levelAPI } from '../../../utils/api';
import { addUserCoins } from '../../shared/gameSessionPersistence';
vi.mock('../../../utils/api',()=>({levelAPI:{resolveGameSixTerm:vi.fn()},handleAPIError:vi.fn()}));
vi.mock('../../shared/gameSessionPersistence',()=>({addUserCoins:vi.fn()}));
const terms=[{id:'real-1',display:'String',lane:50,challengeType:'normal'}];
const sessionInfo={sessionId:'local-test',gameSix:{activeTerms:terms}};
it.each([true,false])('preserves first-play and countdown condition %s',(first)=>{
  render(<GameCanvasGameSix levelData={level} sessionInfo={sessionInfo} showLevelGuideline continueToTutorialAfterGuide={first}/>);
  for(let i=0;i<12&&document.querySelector('.game-guide-nav-next');i++)click('.game-guide-nav-next');
  expect(!!document.querySelector('.in-game-tutorial')).toBe(first);
  if(first)for(let i=0;i<6;i++)next();
  expect(document.querySelector('.announcement-guide-backdrop')).not.toBeNull();
});
it('automatically types and clears a display term, then restores real input and drops without requests',()=>{
  const props={levelData:level,sessionInfo}, {rerender}=render(<GameCanvasGameSix {...props}/>);
  const input=document.querySelector('.game-six-answer-input');
  fireEvent.change(input,{target:{value:'Str'}});
  const snapshot=()=>[...document.querySelectorAll('.game-six-sidebar,.game-six-header,.game-six-falling-word')].map(e=>e.textContent+e.getAttribute('style')).join('|');
  const before=snapshot(), save=vi.spyOn(Storage.prototype,'setItem');
  rerender(<GameCanvasGameSix {...props} gameTutorialRequested={1}/>);
  expect(document.querySelectorAll('.game-six-playfield')).toHaveLength(1);
  next(); tick(1900); expect(input).toHaveValue('String');
  tick(1500); expect(document.querySelectorAll('.game-six-falling-word')).toHaveLength(0);
  next(); tick(2800); expect(input).toHaveValue('STRING');
  expect(document.querySelector('.game-six-health-status')).toHaveTextContent('5Health');
  close(); expect(input).toHaveValue('Str'); expect(snapshot()).toBe(before);
  expect(levelAPI.resolveGameSixTerm).not.toHaveBeenCalled(); expect(addUserCoins).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
});
it.each(['String','STRING','int'])('sends capitalization unchanged to the backend: %s',async(answer)=>{
  levelAPI.resolveGameSixTerm.mockResolvedValue({data:{correct:false,activeTerms:terms}});
  render(<GameCanvasGameSix levelData={level} sessionInfo={sessionInfo}/>);
  fireEvent.change(document.querySelector('.game-six-answer-input'),{target:{value:' '+answer+' '}});
  await act(async()=>fireEvent.submit(document.querySelector('.game-six-answer-form')));
  expect(JSON.stringify(levelAPI.resolveGameSixTerm.mock.calls)).toContain('"answer":"'+answer+'"');
});
it('keeps the existing higher-level rules and related-pair examples',()=>{
  expect(buildGameSixPractice(2).displays).toEqual(['pr_nt']);
  expect(buildGameSixPractice(3).rule).toContain('Data Types');
  expect(buildGameSixPractice(4).distractor).toBe('textVar');
  expect(buildGameSixPractice(5,[{display:'if',pairId:'p'},{display:'else',pairId:'p'}]).answers).toEqual(['if','else']);
});
