import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import StudentGamePlayPage from '../../../pages/StudentGamePlayPage';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/screen-orientation', () => ({ ScreenOrientation: { lock: vi.fn().mockResolvedValue() } }));
vi.mock('../../../utils/studentMenuAudio', () => ({ stopStudentMenuLoop: vi.fn(), playStudentClickSound: vi.fn() }));
vi.mock('../../../components/student/StudentGameOverlay', () => ({ default: () => <div>Game overlay</div> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each([
  ['GAME_FOUR', 'portrait-primary'],
  ['GAME_ONE', 'landscape-primary'],
  ['GAME_TWO', 'landscape-primary'],
])('locks the native play page for %s without changing other games', async (game, orientation) => {
  render(<MemoryRouter initialEntries={[`/student/games/${game}/levels/1/play`]}>
    <Routes><Route path="/student/games/:gameType/levels/:levelNumber/play" element={<StudentGamePlayPage />} /></Routes>
  </MemoryRouter>);
  await waitFor(() => expect(ScreenOrientation.lock).toHaveBeenCalledWith({ orientation }));
});

it.each([
  ['Game 4', 'portrait-primary'],
  ['Game 1', 'landscape-primary'],
  ['Game 2', 'landscape-primary'],
])('keeps %s guide content and its correct native orientation', (game, orientation) => {
  const { getByText } = render(<GameGuideOverlay kicker={game} title="Existing guide" summary={['Original instructions']} />);
  expect(getByText('Original instructions')).toBeTruthy();
  expect(ScreenOrientation.lock).toHaveBeenLastCalledWith({ orientation });
});
