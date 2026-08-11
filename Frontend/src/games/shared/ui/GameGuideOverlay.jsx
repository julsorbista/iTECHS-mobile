import React from 'react';

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
}) => (
  <div className="game-guide-backdrop">
    <div className="game-guide-card">
      {kicker ? <p className="student-mini-kicker">{kicker}</p> : null}
      {title ? <h3>{title}</h3> : null}
      {lead ? <p className="game-guide-lead">{lead}</p> : null}
      {summary.length > 0 ? (
        <ul className="game-guide-summary">
          {summary.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      <div className="game-guide-grid">
        {sections.map((section) => (
          <section key={section.title} className="game-guide-section">
            <h4>{section.title}</h4>
            <ul>{(section.items || []).map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ))}
      </div>
      <div className="game-guide-actions">
        {onExit ? (
          <button type="button" className="btn btn-secondary" onClick={onExit}>
            {exitLabel}
          </button>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={onStart}>
          {startLabel}
        </button>
      </div>
    </div>
  </div>
);

export default GameGuideOverlay;
