import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const StudentPage = lazy(() => import('./pages/StudentPage'));
const StudentMaterialPage = lazy(() => import('./pages/StudentMaterialPage'));
const StudentGameLevelsPage = lazy(() => import('./pages/StudentGameLevelsPage'));
const StudentGamePlayPage = lazy(() => import('./pages/StudentGamePlayPage'));

const NativeLifecycle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let backListener;
    let resumeListener;

    const configureNativeShell = async () => {
      const gamePlayMatch = location.pathname.match(
        /\/student\/games\/([^/]+)\/levels\/[^/]+\/play$/,
      );
      const activeGameType = String(gamePlayMatch?.[1] || '')
        .trim()
        .replace(/-/g, '_')
        .toUpperCase();
      const isLandscapeGameScreen = ['GAME_ONE', 'GAME_TWO', 'GAME_FOUR'].includes(activeGameType);
      await ScreenOrientation.lock({
        orientation: isLandscapeGameScreen ? 'landscape-primary' : 'portrait-primary',
      }).catch(() => undefined);
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
      await StatusBar.setBackgroundColor({ color: '#16876d' }).catch(() => undefined);
      await SplashScreen.hide().catch(() => undefined);

      backListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (location.pathname !== '/' && location.pathname !== '/student') {
          navigate(-1);
          return;
        }
        if (canGoBack) {
          window.history.back();
          return;
        }
        CapacitorApp.exitApp();
      });

      resumeListener = await CapacitorApp.addListener('resume', () => {
        window.dispatchEvent(new Event('itechs:mobile-resume'));
      });
    };

    configureNativeShell();
    return () => {
      backListener?.remove();
      resumeListener?.remove();
    };
  }, [location.pathname, navigate]);

  return null;
};

const StudentHomeRedirect = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (isAuthenticated && user?.role === 'STUDENT') return <Navigate to="/student" replace />;
  return <LoginPage />;
};

const MobileStudentApp = () => (
  <AuthProvider>
    <HashRouter>
      <NativeLifecycle />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<StudentHomeRedirect />} />
          <Route path="/login" element={<StudentHomeRedirect />} />
          <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentPage /></ProtectedRoute>} />
          <Route path="/student/materials/:materialId" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentMaterialPage /></ProtectedRoute>} />
          <Route path="/student/materials/:materialId/quiz" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentMaterialPage /></ProtectedRoute>} />
          <Route path="/student/materials/:materialId/result/:attemptId" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentMaterialPage /></ProtectedRoute>} />
          <Route path="/student/games/:gameType" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentGameLevelsPage /></ProtectedRoute>} />
          <Route path="/student/games/:gameType/levels/:levelNumber/play" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentGamePlayPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster position="top-center" />
    </HashRouter>
  </AuthProvider>
);

export default MobileStudentApp;
