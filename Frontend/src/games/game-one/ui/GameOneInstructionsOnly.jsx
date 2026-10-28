import React from 'react';

const GameOneInstructionsOnly = ({
  controls = [],
  onBack,
}) => (
  <div className="game-guide-backdrop">
    <div className="game-guide-card">
      <p className="student-mini-kicker">Game One Tutorial</p>
      <h3>Platform Adventure: Complete Guide</h3>
      <p className="game-guide-lead">
        Review the movement rules, room objectives, hazards, and portal progression.
      </p>

      <div className="game-guide-grid">
        <section className="game-guide-section">
          <h4>1. Goal</h4>
          <ul>
            <li>Avoid enemies, traps, and platform obstacles.</li>
            <li>Explore each room and complete its objective.</li>
            <li>Reach the portal to continue to the next room.</li>
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
          <h4>3. Room Progress</h4>
          <ul>
            <li>Collect any required keys, scrolls, or power-ups.</li>
            <li>Defeat or avoid enemies blocking the route.</li>
            <li>Enter the portal when the room objective is complete.</li>
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
          <h4>5. Room Hazards</h4>
          <ul>
            <li>Watch for spikes, fire, traps, and moving platforms.</li>
            <li>Enemy attacks and hazards reduce your Hearts.</li>
            <li>Use checkpoints and safe platforms to cross each room.</li>
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
