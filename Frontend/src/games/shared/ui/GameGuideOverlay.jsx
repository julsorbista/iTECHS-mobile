import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
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
import './GameFourGuide.css';

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
  const source = `${kicker} ${title}`.toLowerCase().replace(/[_-]+/g, ' ');
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
  if (text.includes('gear') || text.includes('gears') || text.includes('carrot') || text.includes('orange') || text.includes('restore')) return 'fruit';
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
  exitLabel = 'Exit',
  startLabel = 'Start Level',
  useGameSixMobileLayout = false,
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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage >= safeSections.length - 1;

  useEffect(() => {
    if (!useGameSixMobileLayout || typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 700px)');
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener?.('change', updateViewport);
    return () => mediaQuery.removeEventListener?.('change', updateViewport);
  }, [useGameSixMobileLayout]);

  useEffect(() => {
    setPage(0);
  }, [kicker, title, safeSections.length]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const usesLandscapeGuide = ['game-guide-theme-one', 'game-guide-theme-two'].includes(themeClass);
    ScreenOrientation.lock({
      orientation: usesLandscapeGuide ? 'landscape-primary' : 'portrait-primary',
    }).catch(() => undefined);

    // Do not apply another orientation lock while unmounting. The owning game
    // page decides whether the destination is gameplay (landscape) or the
    // level list (portrait). Re-locking landscape here races with Back/Exit
    // and leaves the portrait screen rendered sideways on Android.
    return undefined;
  }, [themeClass]);

  const handleBack = () => {
    if (!isFirstPage) {
      setPage((value) => Math.max(0, value - 1));
      return;
    }
    onExit?.();
  };

  const handleNext = () => {
    if (!isLastPage) {
      setPage((value) => Math.min(safeSections.length - 1, value + 1));
      return;
    }
    onStart?.();
  };

  const usesLegacyLayout = ['game-guide-theme-one', 'game-guide-theme-two', 'game-guide-theme-four'].includes(themeClass)
    && !(useGameSixMobileLayout && isMobileViewport);

  if (usesLegacyLayout) {
    return createPortal(
      <div className={`g4-guide-screen ${themeClass}`} role="dialog" aria-modal="true" aria-label={`${title || 'Game'} guidelines`}>
        <div className="g4-guide-board">
          <section className="g4-guide-paper">
            <h2>{currentSection.title}</h2>
            <ul key={currentPage} tabIndex={0} aria-label="Guideline instructions">
              {(currentSection.items || []).map((item, index) => (
                <li key={index}>
                  <img src={GUIDE_ICON_IMAGES[getGuideIconType(item)] || iconDot} alt="" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <nav className="g4-guide-footer" aria-label="Guideline pages">
            <button type="button" className="game-guide-nav-back" onClick={handleBack}>{isFirstPage ? exitLabel : 'Back'}</button>
            <span aria-live="polite">{currentPage + 1} / {safeSections.length}</span>
            {(!isLastPage || onStart) ? <button type="button" className="game-guide-nav-next" onClick={handleNext}>{isLastPage ? 'Start' : 'Next'}</button> : <span />}
          </nav>
        </div>
      </div>, document.body,
    );
  }

  return createPortal(
    <div className={`game-guide-backdrop game-guide-wood ${themeClass}`}>
      <div className={`game-guide-card game-guide-card--wood${useGameSixMobileLayout ? ' game-guide-card--game-four' : ''}`}>
        <div className="game-guide-vine game-guide-vine-left" aria-hidden="true" />
        <div className="game-guide-vine game-guide-vine-right" aria-hidden="true" />
        <h3 className="game-guide-main-title">GUIDELINES</h3>
        <div className="game-guide-grid">
          <section className="game-guide-section">
            <h4>{useGameSixMobileLayout ? title : currentSection.title}</h4>
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
            ← {isFirstPage ? exitLabel : 'Back'}
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
            <button type="button" className="game-guide-nav-button game-guide-nav-next" onClick={handleNext}>
              {isLastPage ? 'Start' : 'NEXT →'}
            </button>
          ) : <span className="game-guide-nav-spacer" aria-hidden="true" />}
        </div>
      </div>
    </div>, document.body
  );
};

export default GameGuideOverlay;
