import React from 'react';

const GameOneInstructionsOnly = ({
  controls = [],
  onBack,
}) => (
  <div className="game-guide-backdrop">
    <div className="game-guide-card">
      <p className="student-mini-kicker">Game One Tutorial</p>
      <h3>Platformer + Quiz: Complete Guide</h3>
      <p className="game-guide-lead">
        Review the movement rules, room objectives, and question flow only. Gameplay, level screens, and other frames are intentionally excluded here.
      </p>

      <div className="game-guide-grid">
        <section className="game-guide-section">
          <h4>1. Goal</h4>
          <ul>
            <li>Avoid enemies, traps, and platform obstacles.</li>
            <li>Reach the Question Statue or Villain.</li>
            <li>Answer correctly to clear the room and progress through the level.</li>
          </ul>
        </section>

        <section className="game-guide-section">
          <h4>2. Controls</h4>
          <ul>
            {controls.map(({ label }) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </section>

        <section className="game-guide-section">
          <h4>3. Question Rules</h4>
          <ul>
            <li>Only 1 answer attempt is allowed per question.</li>
            <li>Wrong answers restart the current room.</li>
            <li>A new question is generated on each retry.</li>
          </ul>
        </section>

        <section className="game-guide-section">
          <h4>4. Lives</h4>
          <ul>
            <li>Players start with 3 lives.</li>
            <li>Taking damage removes 1 Heart.</li>
            <li>Losing all Hearts ends the level attempt.</li>
          </ul>
        </section>

        <section className="game-guide-section">
          <h4>5. Room Failure</h4>
          <ul>
            <li>Players may fail up to 3 questions per room.</li>
            <li>Excessive mistakes reduce stars and rewards.</li>
            <li>Exceeding the limit ends the game.</li>
          </ul>
        </section>

        <section className="game-guide-section">
          <h4>6. Condition</h4>
          <ul>
            <li>Earn at least 2 Stars to unlock the next level.</li>
            <li>Higher accuracy improves final ranking and rewards.</li>
          </ul>
        </section>
      </div>

      <div className="game-guide-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Return
        </button>
      </div>
    </div>
  </div>
);

export default GameOneInstructionsOnly;
