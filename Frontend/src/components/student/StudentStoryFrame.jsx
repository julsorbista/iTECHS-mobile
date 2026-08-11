import React, { useEffect, useMemo, useState } from 'react';
import logo from '../../assets/logo.png';

const TYPE_SPEED_MS = 16;

const StudentStoryFrame = ({
  frame,
  page,
  pages = [],
  currentPage = 0,
  totalPages,
  mode = 'intro',
  onBack,
  onPrimary,
  onNext,
  onPrevious,
  onSkip,
  primaryLabel,
  backLabel = 'Previous',
}) => {
  const activePage = page || frame || {};
  const isCompletion = mode === 'completion' || mode === 'outro';
  const pageTotal = Number(totalPages ?? pages.length ?? activePage.totalPages ?? 1) || 1;
  const pageIndex = currentPage ?? 0;
  const pageNumber = pageIndex + 1;
  const isFirstPage = pageIndex <= 0;
  const isLastPage = pageIndex >= pageTotal - 1;
  const isImageOnly = Boolean(activePage.imageOnly);
  const storyWorldClass = activePage.world
    ? ` student-story-${String(activePage.world).toLowerCase()}`
    : '';

  const fullText = activePage.text || activePage.body || '';
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    setTypedText('');
    if (!fullText || isImageOnly) return undefined;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedText(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(timer);
      }
    }, TYPE_SPEED_MS);
    return () => window.clearInterval(timer);
  }, [fullText, activePage.id, isImageOnly]);

  const renderedText = useMemo(() => (
    typedText.split('\n').map((line, i, lines) => (
      <React.Fragment key={`${activePage.id || 'story'}-${i}`}>
        {line}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    ))
  ), [activePage.id, typedText]);

  return (
    <main
      className={`student-story-preview-stage student-story-rpg-stage${storyWorldClass}${isImageOnly ? ' student-story-image-only' : ''}${activePage.useLegacyStoryAsset ? ' student-story-image-legacy' : ''}`}
      aria-label="Storyline animation frame"
      style={{
        '--story-bg': activePage.suppressStageBackground || !activePage.background
          ? undefined
          : `url("${activePage.background}")`,
      }}
    >
      <div className="student-story-rpg-bg" />
      <div className="student-story-rpg-frost" />

      <div className="student-story-stage-ribbon">
        <div className="student-story-brand-pill">
          <img src={logo} alt="iTECHS Logo" className="student-story-brand-logo" />
          {activePage.worldTitle || 'iTECHS Core Quest'}
        </div>
        <div className="student-story-preview-pill">
          {isCompletion ? 'Ending' : 'Intro'} {pageNumber}/{pageTotal}
        </div>
      </div>

      {isImageOnly ? (
        <section key={activePage.id || pageNumber} className="student-story-rpg-scene student-story-image-scene">
          <div className="student-story-image-frame-shell">
            <img
              className="student-story-page-image"
              src={activePage.image || activePage.background}
              alt={`Story page ${pageNumber}`}
            />
          </div>
        </section>
      ) : (
        <section key={activePage.id || pageNumber} className="student-story-rpg-scene">
          <div className="student-story-rpg-character-wrap">
            {activePage.character && (
              <img
                className="student-story-rpg-character"
                src={activePage.character}
                alt={activePage.speaker || ''}
              />
            )}
          </div>

          <div className="student-story-rpg-dialogue">
            <div className="student-story-rpg-speaker">{activePage.speaker || 'Byte'}</div>
            <h1 id={isCompletion ? 'story-complete-title' : 'story-intro-title'}>
              {activePage.title || (isCompletion ? 'Mission Complete' : 'Mission Briefing')}
            </h1>
            <p className="student-story-rpg-text">
              {renderedText}
              <span className="student-story-type-caret" aria-hidden="true">|</span>
            </p>

            <div className="student-story-rpg-actions">
              {onSkip && (
                <button className="student-story-scene-button" type="button" onClick={onSkip}>
                  Skip
                </button>
              )}
              <button
                className="student-story-scene-button"
                type="button"
                onClick={isFirstPage ? onBack : onPrevious}
                disabled={isFirstPage && !onBack}
              >
                {isFirstPage ? 'Back' : backLabel}
              </button>
              <button
                className="student-story-begin-button"
                type="button"
                onClick={isLastPage ? onPrimary : onNext}
              >
                {isLastPage
                  ? (primaryLabel || (isCompletion ? 'Continue' : 'Start'))
                  : 'Next'}
              </button>
            </div>
          </div>
        </section>
      )}

      {isImageOnly && (
        <div className="student-story-image-actions">
          {onSkip && (
            <button className="student-story-scene-button" type="button" onClick={onSkip}>
              Skip
            </button>
          )}
          <button
            className="student-story-scene-button"
            type="button"
            onClick={isFirstPage ? onBack : onPrevious}
            disabled={isFirstPage && !onBack}
          >
            {isFirstPage ? 'Back' : backLabel}
          </button>
          <button
            className="student-story-begin-button"
            type="button"
            onClick={isLastPage ? onPrimary : onNext}
          >
            {isLastPage
              ? (primaryLabel || (isCompletion ? 'Continue' : 'Start'))
              : 'Next'}
          </button>
        </div>
      )}

      <div className="student-story-rpg-progress" aria-hidden="true">
        {Array.from({ length: pageTotal }).map((_, index) => (
          <span key={index} className={index === pageIndex ? 'active' : ''} />
        ))}
      </div>
    </main>
  );
};

export default StudentStoryFrame;
