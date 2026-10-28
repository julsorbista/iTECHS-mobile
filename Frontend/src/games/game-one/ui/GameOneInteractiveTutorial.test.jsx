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
  it('does not show the old interact key in the movement cheat sheet', () => {
    const canvas = document.createElement('canvas');
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
