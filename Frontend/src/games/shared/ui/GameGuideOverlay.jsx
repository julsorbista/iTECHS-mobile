import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import iconCards from '../../../assets/guidelines-icons/icon-cards.png';
import iconCheck from '../../../assets/guidelines-icons/icon-check.png';
import iconClock from '../../../assets/guidelines-icons/icon-clock.png';
import iconCode from '../../../assets/guidelines-icons/icon-code.png';
import iconCoin from '../../../assets/guidelines-icons/icon-coin.png';
import iconDot from '../../../assets/guidelines-icons/icon-dot.png';
import iconFruit from '../../../assets/guidelines-icons/icon-fruit.png';
import iconGrid from '../../../assets/guidelines-icons/icon-grid.png';
import iconHazard from '../../../assets/guidelines-icons/icon-hazard.png';
import iconHeart from '../../../assets/guidelines-icons/icon-heart.png';
import iconHint from '../../../assets/guidelines-icons/icon-hint.png';
import iconLock from '../../../assets/guidelines-icons/icon-lock.png';
import iconMove from '../../../assets/guidelines-icons/icon-move.png';
import iconQuestion from '../../../assets/guidelines-icons/icon-question.png';
import iconRetry from '../../../assets/guidelines-icons/icon-retry.png';
import iconScore from '../../../assets/guidelines-icons/icon-score.png';
import iconStar from '../../../assets/guidelines-icons/icon-star.png';
import iconTrophy from '../../../assets/guidelines-icons/icon-trophy.png';
import iconWrong from '../../../assets/guidelines-icons/icon-wrong.png';
import guidelinesMobileBackground from '../../../assets/guidelines-icons/Guidelinesformobile.png';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

const GUIDE_ICON_IMAGES = {
  cards: iconCards,
  check: iconCheck,
  clock: iconClock,
  code: iconCode,
  coin: iconCoin,
  dot: iconDot,
  fruit: iconFruit,
  grid: iconGrid,
  hazard: iconHazard,
  heart: iconHeart,
  hint: iconHint,
  lock: iconLock,
  move: iconMove,
  question: iconQuestion,
  retry: iconRetry,
  score: iconScore,
  star: iconStar,
  trophy: iconTrophy,
  wrong: iconWrong,
};

const getGuideThemeClass = (kicker = '', title = '') => {
  const source = `${kicker} ${title}`.toLowerCase();
  if (source.includes('game one') || source.includes('game 1')) return 'game-guide-theme-one';
  if (source.includes('game two') || source.includes('game 2')) return 'game-guide-theme-two';
  if (source.includes('game three') || source.includes('game 3')) return 'game-guide-theme-three';
  if (source.includes('game four') || source.includes('game 4')) return 'game-guide-theme-four';
  if (source.includes('game five') || source.includes('game 5')) return 'game-guide-theme-five';
  if (source.includes('game six') || source.includes('game 6')) return 'game-guide-theme-six';
  return 'game-guide-theme-default';
};

const getGuideIconType = (item = '') => {
  const text = String(item).toLowerCase();
  if (text.includes('time') || text.includes('timer') || text.includes('ms') || text.includes('second') || text.includes('spawn') || text.includes('speed')) return 'clock';
  if (text.includes('fruit') || text.includes('banana') || text.includes('carrot') || text.includes('orange') || text.includes('restore')) return 'fruit';
  if (text.includes('bomb') || text.includes('hazard') || text.includes('trap') || text.includes('enemy')) return 'hazard';
  if (text.includes('lock')) return 'lock';
  if (text.includes('coin')) return 'coin';
  if (text.includes('hint')) return 'hint';
  if (text.includes('question')) return 'question';
  if (text.includes('star')) return 'star';
  if (text.includes('life') || text.includes('lives') || text.includes('heart') || text.includes('health')) return 'heart';
  if (text.includes('score') || text.includes('point') || text.includes('reward')) return 'score';
  if (text.includes('wrong') || text.includes('mistake') || text.includes('fail') || text.includes('incorrect')) return 'wrong';
  if (text.includes('pass') || text.includes('unlock') || text.includes('clear') || text.includes('complete') || text.includes('finish') || text.includes('objective') || text.includes('goal')) return 'trophy';
  if (text.includes('card') || text.includes('pair') || text.includes('match')) return 'cards';
  if (text.includes('board') || text.includes('grid') || text.includes('column')) return 'grid';
  if (text.includes('code') || text.includes('syntax') || text.includes('java') || text.includes('token') || text.includes('output')) return 'code';
  if (text.includes('move') || text.includes('drag') || text.includes('swipe') || text.includes('slice') || text.includes('key') || text.includes('control') || text.includes('arrow')) return 'move';
  if (text.includes('retry') || text.includes('reset') || text.includes('restart') || text.includes('attempt')) return 'retry';
  if (text.includes('answer') || text.includes('correct')) return 'check';
  return 'dot';
};

/**
 * Informational pre-level guideline only.
 *
 * The playable "How to Play" tutorial is intentionally handled by the game
 * canvases and ActualGameTutorialOverlay. Keeping this component stateless
 * prevents guideline content from changing tutorial steps or spotlight targets.
 */
const GameGuideOverlay = ({
  kicker,
  title,
  lead,
  summary = [],
  sections = [],
  onExit,
  onStart,
  exitLabel = 'Exit Level',
  startLabel = 'Start Level',
  lockLandscapeOnStart = false,
}) => {
  const pagedSections = [
    ...(summary.length ? [{ title: title || 'Overview', items: summary }] : []),
    ...sections,
  ];
  const safeSections = pagedSections.length ? pagedSections : [{ title: title || 'Guidelines', items: [] }];
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, safeSections.length - 1);
  const currentSection = safeSections[currentPage] || safeSections[0];
  const themeClass = useMemo(() => getGuideThemeClass(kicker, title), [kicker, title]);
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage >= safeSections.length - 1;
  const [isStarting, setIsStarting] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    setPage(0);
  }, [kicker, title, safeSections.length]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const locationText = `${window.location.pathname} ${window.location.hash}`
      .trim()
      .replace(/[-/]/g, '_')
      .toUpperCase();
    const shouldRestoreLandscape = locationText.includes('GAME_TWO') || locationText.includes('GAME_FOUR');

    ScreenOrientation.lock({ orientation: 'portrait-primary' }).catch(() => undefined);

    return () => {
      ScreenOrientation.lock({
        orientation: startedRef.current && (lockLandscapeOnStart || shouldRestoreLandscape)
          ? 'landscape-primary'
          : 'portrait-primary',
      }).catch(() => undefined);
    };
  }, [lockLandscapeOnStart]);

  const handleBack = () => {
    if (!isFirstPage) {
      setPage((value) => Math.max(0, value - 1));
      return;
    }
    onExit?.();
  };

  const waitForLandscapeViewport = () => new Promise((resolve) => {
    if (typeof window === 'undefined' || window.innerWidth > window.innerHeight) {
      resolve();
      return;
    }

    let settled = false;
    let orientationListener;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      orientationListener?.remove?.();
      resolve();
    };
    const check = () => {
      if (window.innerWidth > window.innerHeight) finish();
    };
    const checkNativeOrientation = (orientation) => {
      if (String(orientation?.type || '').includes('landscape')) finish();
    };

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    ScreenOrientation.orientation()
      .then(checkNativeOrientation)
      .catch(() => undefined);
    ScreenOrientation.addListener('screenOrientationChange', checkNativeOrientation)
      .then((listener) => {
        if (settled) {
          listener?.remove?.();
          return;
        }
        orientationListener = listener;
      })
      .catch(() => undefined);
    if (window.innerWidth > window.innerHeight) {
      finish();
    }
    window.setTimeout(finish, 1200);
  });

  const handleNext = async () => {
    if (!isLastPage) {
      setPage((value) => Math.min(safeSections.length - 1, value + 1));
      return;
    }

    if (isStarting) return;
    setIsStarting(true);
    if (lockLandscapeOnStart && Capacitor.isNativePlatform()) {
      await ScreenOrientation.lock({ orientation: 'landscape-primary' }).catch(() => undefined);
      await waitForLandscapeViewport();
    }
    startedRef.current = true;
    onStart?.();
  };

  const overlay = (
    <div className={`game-guide-backdrop game-guide-wood ${themeClass}`}>
      <div
        className="game-guide-card game-guide-card--wood"
        style={{ '--game-guide-mobile-bg': `url(${guidelinesMobileBackground})` }}
      >
        <div className="game-guide-vine game-guide-vine-left" aria-hidden="true" />
        <div className="game-guide-vine game-guide-vine-right" aria-hidden="true" />
        <h3 className="game-guide-main-title">GUIDELINES</h3>
        <div className="game-guide-grid">
          <section className="game-guide-section">
            <h4>{currentSection.title}</h4>
            <ul>
              {(currentSection.items || []).map((item, index) => {
                const iconType = getGuideIconType(item);
                const iconSrc = GUIDE_ICON_IMAGES[iconType] || GUIDE_ICON_IMAGES.dot;
                return (
                  <li key={`${item}-${index}`}>
                    <span className={`game-guide-item-icon game-guide-item-icon--image game-guide-icon-${iconType}`} aria-hidden="true">
                      <img src={iconSrc} alt="" draggable="false" />
                    </span>
                    <span>{item}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
        <div className="game-guide-actions">
          <button type="button" className="game-guide-nav-button game-guide-nav-back" onClick={handleBack}>
            ← BACK
          </button>
          <div className="game-guide-page-status" aria-label={`Page ${currentPage + 1} of ${safeSections.length}`}>
            <div className="game-guide-page-dots" aria-hidden="true">
              {safeSections.map((section, index) => (
                <span key={`${section.title}-${index}`} className={index === currentPage ? 'is-active' : ''} />
              ))}
            </div>
            <span>{currentPage + 1} / {safeSections.length}</span>
          </div>
          {(!isLastPage || onStart) ? (
            <button type="button" className="game-guide-nav-button game-guide-nav-next" onClick={handleNext} disabled={isStarting}>
              {isLastPage ? 'START →' : 'NEXT →'}
            </button>
          ) : <span className="game-guide-nav-spacer" aria-hidden="true" />}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
};

export default GameGuideOverlay;
