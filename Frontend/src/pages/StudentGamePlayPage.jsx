import React, { Suspense, lazy, useCallback, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { restoreNativePortrait } from '../utils/nativeOrientation';
import { normalizeGameType } from '../utils/gameTracks';
import LoadingSpinner from '../components/LoadingSpinner';
import { stopStudentMenuLoop, playStudentClickSound } from '../utils/studentMenuAudio';

const StudentGameOverlay = lazy(() => import('../components/student/StudentGameOverlay'));

const StudentGamePlayPage = () => {
  const navigate = useNavigate();
  const { gameType: routeGameType, levelNumber } = useParams();
  const gameType = normalizeGameType(routeGameType);

  useEffect(() => {
    stopStudentMenuLoop({ rewind: false });
  }, []);

  const closeGame = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await restoreNativePortrait();
    }
    navigate(`/student/games/${gameType}`);
  }, [gameType, navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !['GAME_ONE', 'GAME_TWO', 'GAME_FOUR'].includes(gameType)) {
      return undefined;
    }

    ScreenOrientation.lock({ orientation: 'landscape-primary' }).catch(() => undefined);

    return () => {
      ScreenOrientation.lock({ orientation: 'portrait-primary' }).catch(() => undefined);
    };
  }, [gameType]);

  useEffect(() => {
    const handleClick = () => {
      playStudentClickSound();
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  if (!gameType) {
    return <Navigate to="/student" replace />;
  }

  if (routeGameType !== gameType) {
    return <Navigate to={`/student/games/${gameType}/levels/${levelNumber}/play`} replace />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StudentGameOverlay
        key={`${gameType}-${levelNumber}`}
        gameType={gameType}
        levelNumber={levelNumber}
        onClose={closeGame}
        forceFullReloadOnAdvance={gameType === 'GAME_ONE'}
        onAdvanceToLevel={(nextLevelNumber) => navigate(`/student/games/${gameType}/levels/${nextLevelNumber}/play`, { replace: true })}
        onContinueToGame={(nextGameType) => navigate(`/student/games/${nextGameType}`)}
      />
    </Suspense>
  );
};

export default StudentGamePlayPage;
