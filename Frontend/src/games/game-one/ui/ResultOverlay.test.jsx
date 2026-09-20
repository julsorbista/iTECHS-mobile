import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ResultOverlay from './ResultOverlay';

afterEach(cleanup);

it.each(['GAME_FIVE', 'GAME_SIX'])('shows the illustrated result and working actions for %s', (gameType) => {
  const onRetry = vi.fn(), onBack = vi.fn(), onNextLevel = vi.fn();
  render(<ResultOverlay gameType={gameType} result={{ result: 'COMPLETED', starsEarned: 3, finalScore: 200 }}
    gameplay={{ completedTasks: 5, totalTasks: 5, mistakes: 1, elapsedMs: 34000 }} canAdvanceLevel
    onRetry={onRetry} onBack={onBack} onNextLevel={onNextLevel} />);
  expect(document.querySelector('.game-illustrated-results')).not.toBeNull();
  expect(screen.getByText(gameType === 'GAME_FIVE' ? 'Words' : 'Terms')).toBeInTheDocument();
  expect(screen.getByText('5/5')).toBeInTheDocument();
  expect(screen.getByText('0:34')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next Level' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back To Levels' }));
  expect(onNextLevel).toHaveBeenCalledOnce();
  expect(onRetry).toHaveBeenCalledOnce();
  expect(onBack).toHaveBeenCalledOnce();
});
