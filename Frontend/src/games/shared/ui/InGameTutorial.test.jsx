import React, { useRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GameTwoInteractiveTutorial, { drawGameTwoDemo } from '../../game-two/ui/GameTwoInteractiveTutorial';
import InGameTutorial from './InGameTutorial';
const challenge={pieces:['int','count','=','1',';'],decoys:['textVar']};
function Harness(){
 const rootRef=useRef(null), [display,setDisplay]=useState(null), [open,setOpen]=useState(true);
 return <><div ref={rootRef}><canvas/><div className="game-two-fruit-code">{display?.sliced}</div><div className="game-two-fruit-lives">3 lives</div><div className="game-two-fruit-output">0 / 2</div></div>
 {open&&<GameTwoInteractiveTutorial rootRef={rootRef} challenge={challenge} onDemo={setDisplay} onStart={()=>setOpen(false)}/>}</>;
}
beforeEach(()=>{
 vi.useFakeTimers(); vi.stubGlobal('ResizeObserver',class{observe(){} disconnect(){}});
 vi.spyOn(Element.prototype,'getBoundingClientRect').mockReturnValue({left:10,top:10,right:810,bottom:610,width:800,height:600});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
const next=()=>fireEvent.click(document.querySelector('.in-game-tutorial nav button:last-child'));
it('uses the Game 2 frame override and a hand on the same canvas, automatically swiping without student input',()=>{
 const save=vi.spyOn(Storage.prototype,'setItem'); render(<Harness/>);
 expect(document.querySelectorAll('canvas')).toHaveLength(1);
 expect(document.querySelector('.in-game-tutorial__frame').src).toContain('tutorial4.png');
 expect(document.querySelector('.in-game-tutorial__hand img').src).toContain('tutorial-hand.png');
 next(); act(()=>vi.advanceTimersByTime(2200));
 expect(document.querySelector('.game-two-fruit-code')).toHaveTextContent('int');
 for(let i=0;i<5;i++)next();
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(document.querySelector('.game-two-fruit-code')).toBeEmptyDOMElement();
 expect(document.querySelector('canvas').parentElement.inert).toBeFalsy();
 act(()=>vi.advanceTimersByTime(10000)); expect(document.querySelector('.game-two-fruit-code')).toBeEmptyDOMElement();
 expect(save).not.toHaveBeenCalled();
});
it('Back restarts only the local demonstration and Escape restores the game',()=>{
 render(<Harness/>); next(); act(()=>vi.advanceTimersByTime(2200));
 fireEvent.click(document.querySelector('.in-game-tutorial nav button:first-child'));
 expect(document.querySelector('.game-two-fruit-code')).toBeEmptyDOMElement();
 expect(document.querySelector('canvas').parentElement.inert).toBe(true);
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(document.querySelector('canvas').parentElement.inert).toBeFalsy();
});
it('the canvas demonstration does not mutate its input model',()=>{
 const model=Object.freeze({item:null,sliced:'int',swipe:null});
 drawGameTwoDemo({},model,800,600);
 expect(model).toEqual({item:null,sliced:'int',swipe:null});
});

it.each([228, 252, 380])('keeps a wide panel even beside a %s-pixel sidebar', (sidebarWidth) => {
 const root = document.createElement('div'), sidebar = document.createElement('aside');
 sidebar.className = 'test-sidebar'; root.append(sidebar); document.body.append(root);
 sidebar.getBoundingClientRect = () => ({ left: 550, top: 20, width: sidebarWidth, height: 500, right: 550 + sidebarWidth, bottom: 520 });
 const view = render(<InGameTutorial rootRef={{current: root}} anchor=".test-sidebar" game={6} steps={[{title:'Ready',text:'Short instruction'}]} onStart={()=>{}}/>);
 const panel = screen.getByRole('dialog');
 expect(panel.style.width).toBe('520px');
 expect(panel.querySelector('.in-game-tutorial__frame').src).toContain('tutorial4.png');
 expect(parseFloat(panel.style.height)).toBeGreaterThanOrEqual(300);
 view.unmount(); root.remove();
});

it('shrinks only to fit the available screen area, not to match a sidebar', () => {
 const root = document.createElement('div'); document.body.append(root);
 root.getBoundingClientRect = () => ({ left: 10, top: 10, width: 350, height: 500, right: 360, bottom: 510 });
 const view = render(<InGameTutorial rootRef={{current: root}} game={6} steps={[{title:'Ready',text:'Short instruction'}]} onStart={()=>{}}/>);
 const panel = screen.getByRole('dialog');
 expect(panel.style.width).toBe('334px');
 expect(parseFloat(panel.style.left) + parseFloat(panel.style.width)).toBeLessThanOrEqual(352);
 view.unmount(); root.remove();
});

it('grows for longer information instead of squeezing it into a fixed-height box', () => {
 const root = document.createElement('div'); document.body.append(root);
 const view = render(<InGameTutorial rootRef={{current: root}} game={6} steps={[{title:'Details',text:'Long instructions'}]} onStart={()=>{}}/>);
 const panel = screen.getByRole('dialog');
 Object.defineProperty(panel.querySelector('.in-game-tutorial__copy'), 'scrollHeight', {configurable:true, value:240});
 fireEvent(window,new Event('resize'));
 expect(parseFloat(panel.style.height)).toBeGreaterThanOrEqual(416);
 expect(parseFloat(panel.style.height)).toBeLessThanOrEqual(584);
 view.unmount(); root.remove();
});
