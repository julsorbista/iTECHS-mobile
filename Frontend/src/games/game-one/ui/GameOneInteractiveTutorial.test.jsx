import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import GameOneInteractiveTutorial from './GameOneInteractiveTutorial';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GameOneInteractiveTutorial', () => {
  it('centers information pages and maps highlights across the wide camera canvas', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000; canvas.height = 720;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 360 });
    const wrapper = document.createElement('div');
    wrapper.appendChild(canvas);
    const props = { canvasRef: { current: wrapper }, onFinish: () => {}, onAcknowledge: () => {}, onPageChange: () => {} };
    const state = { hud: [], obstacles: [], target: { x: .1, y: .1, width: .1, height: .1 } };
    const view = render(<GameOneInteractiveTutorial {...props} state={{ ...state, page: 3, step: { id: 'coin', title: 'COINS', target: 'coin' } }} />);
    const firstPanel = screen.getByLabelText('Game 1 tutorial page 3 of 6');
    expect(firstPanel.style.left).toBe('295px');
    expect(firstPanel.style.top).toBe('28px');
    expect(screen.getByLabelText('Inspect coin').style.left).toBe('93px');
    view.rerender(<GameOneInteractiveTutorial {...props} state={{ ...state, page: 5, step: { id: 'hazard', title: 'MONSTERS', target: 'hazard' } }} />);
    expect(screen.getByLabelText('Game 1 tutorial page 5 of 6').style.left).toBe(firstPanel.style.left);
    view.rerender(<GameOneInteractiveTutorial {...props} state={{ ...state,
      target: { x: .45, y: .3, width: .03, height: .08 },
      page: 3, step: { id: 'coin', title: 'COINS', target: 'coin' } }} />);
    // A coin in the center must remain visible, with room for its pointing hand.
    expect(screen.getByLabelText('Game 1 tutorial page 3 of 6').style.left).toBe('14px');
  });
  it('does not show the old interact key in the movement cheat sheet', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 800, height: 500, right: 800, bottom: 500 }),
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(canvas);
    const canvasRef = { current: wrapper };

    const state = {
      step: { id: 'jump', control: 'jump', page: 1, title: 'MOVEMENTS', keys: ['W'] },
      page: 1,
      movementControls: [
        { id: 'left', keys: ['A'] },
        { id: 'right', keys: ['D'] },
        { id: 'jump', keys: ['W'] },
        { id: 'dash', keys: ['SHIFT'] },
        { id: 'attack', keys: ['J'] },
      ],
      hud: [],
      target: { x: 0.1, y: 0.2, width: 0.1, height: 0.1 },
      player: { x: 0.1, y: 0.2, width: 0.1, height: 0.1 },
      movement: { x: 0.1, y: 0.2, width: 0.1, height: 0.1 },
      completed: false,
      demoPressed: false,
      grounded: true,
      practiceArea: { x: 0.15, y: 0.4, width: 0.3, height: 0.2 },
      obstacles: [],
    };

    render(
      <GameOneInteractiveTutorial
        state={state}
        canvasRef={canvasRef}
        isReplay={false}
        onPageChange={() => {}}
        onAcknowledge={() => {}}
        onFinish={() => {}}
      />
    );

    expect(screen.queryByText('Interact')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Demonstrating jump')).toBeInTheDocument();
    expect(screen.getAllByText('Jump').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Move Left/)).toBeInTheDocument();
  });

  it('maps tutorial targets inside the centered 16:9 game area instead of the black letterbox', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 1000, height: 400, right: 1000, bottom: 400 }),
    });
    const wrapper = document.createElement('div');
    wrapper.appendChild(canvas);

    render(
      <GameOneInteractiveTutorial
        state={{
          step: { id: 'scroll', page: 4, title: 'SCROLL CLUES', target: 'scroll' },
          page: 4,
          hud: [],
          target: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
          player: null,
          movementControls: [],
          obstacles: [],
          completed: false,
          objectVisible: true,
        }}
        canvasRef={{ current: wrapper }}
        isReplay
        onPageChange={() => {}}
        onAcknowledge={() => {}}
        onFinish={() => {}}
      />
    );

    const target = screen.getByRole('button', { name: 'Inspect scroll' });
    expect(Number.parseFloat(target.style.left)).toBeCloseTo(212.13, 1);
    expect(Number.parseFloat(target.style.width)).toBeCloseTo(55.2, 1);
  });
});
