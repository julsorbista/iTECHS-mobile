import tutorialHand from './tutorial-hand.png';
import './GameOneTutorialDemonstration.css';

const Key = ({ children, className = '' }) => <kbd className={className}>{children}</kbd>;

const GameOneTutorialDemonstration = ({ stepIndex, target, allowProjectile, allowMidairDash }) => {
  if (!target) return null;

  const placeHandOnLeft = target.left + target.width + 90 > window.innerWidth;

  const style = {
    left: `${Math.round(target.left)}px`,
    top: `${Math.round(target.top)}px`,
    width: `${Math.round(target.width)}px`,
    height: `${Math.round(target.height)}px`,
  };

  return (
    <div className={`game-one-tutorial-demo game-one-tutorial-demo--step-${stepIndex} ${placeHandOnLeft ? 'place-hand-left' : 'place-hand-right'}`} style={style} aria-hidden="true">
      {stepIndex === 0 && (
        <>
          <span className="game-one-demo-motion-path" />
          <div className="game-one-demo-keys game-one-demo-keys--movement">
            <Key className="key-a">A</Key><Key className="key-left">&larr;</Key>
            <Key className="key-d">D</Key><Key className="key-right">&rarr;</Key>
            <Key className="key-w">W</Key><Key className="key-up">&uarr;</Key><Key className="key-space">SPACE</Key>
          </div>
          <img className="game-one-demo-hand game-one-demo-hand--controls" src={tutorialHand} alt="" />
          <span className="game-one-demo-sequence-label" />
        </>
      )}

      {stepIndex === 1 && (
        <div className="game-one-demo-lives">
          <img className="game-one-demo-hand game-one-demo-hand--lives" src={tutorialHand} alt="" />
        </div>
      )}

      {stepIndex === 2 && (
        <div className={`game-one-demo-combat ${allowProjectile ? 'has-projectile' : 'no-projectile'}`}>
          {allowProjectile && <div className="game-one-demo-key-action"><Key>J</Key></div>}
          {allowProjectile && <span className="game-one-demo-bolt" />}
          <img className="game-one-demo-hand game-one-demo-hand--hazard" src={tutorialHand} alt="" />
        </div>
      )}

      {stepIndex === 3 && (
        <div className={`game-one-demo-dash ${allowMidairDash ? 'is-enabled' : 'is-disabled'}`}>
          {allowMidairDash ? (
            <>
              <div className="game-one-demo-key-action game-one-demo-key-action--shift"><Key>SHIFT</Key></div>
              <img className="game-one-demo-hand game-one-demo-hand--dash" src={tutorialHand} alt="" />
              <span className="game-one-demo-dash-trail" />
            </>
          ) : (
            <>
              <img className="game-one-demo-hand game-one-demo-hand--safe" src={tutorialHand} alt="" />
            </>
          )}
        </div>
      )}

      {stepIndex === 4 && (
        <div className="game-one-demo-collectible">
          <img className="game-one-demo-hand game-one-demo-hand--collectible" src={tutorialHand} alt="" />
        </div>
      )}

      {stepIndex === 5 && (
        <div className="game-one-demo-destination">
          <img className="game-one-demo-hand game-one-demo-hand--portal" src={tutorialHand} alt="" />
        </div>
      )}
    </div>
  );
};

export default GameOneTutorialDemonstration;
