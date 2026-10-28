import tutorialHand from './tutorial-hand.png';
import './TutorialHandPointer.css';

export const inferTutorialHandAction = (step = {}, gameType = '') => {
  const text = [step.title, step.body, ...(step.items || [])].join(' ').toLowerCase();
  if (/drag|swipe|slice|arrange/.test(text)) return 'drag';
  if (/move|left|right|arrow|catcher|basket|platform/.test(text)) return 'move';
  if (/click|tap|select|button|card|flip|keyboard|enter/.test(text)) return 'tap';
  if (gameType === 'GAME_TWO' && /code|syntax|hazard/.test(text)) return 'drag';
  return 'point';
};

export const TutorialActionHand = ({ action = 'tap' }) => (
  <span className={`tutorial-action-hand tutorial-action-hand--${action}`} aria-hidden="true">
    <span className="tutorial-action-hand__pulse" />
    <img src={tutorialHand} alt="" draggable="false" />
  </span>
);

const TutorialHandPointer = ({ target, secondaryTarget, action = 'point', label = 'Tutorial pointer' }) => {
  if (!target) return null;

  const targetX = target.left + (target.width * 0.5);
  const targetY = target.top + (target.height * 0.52);
  const secondaryX = secondaryTarget
    ? secondaryTarget.left + (secondaryTarget.width * 0.5)
    : targetX;
  const secondaryY = secondaryTarget
    ? secondaryTarget.top + (secondaryTarget.height * 0.52)
    : targetY;

  return (
    <div
      className={`tutorial-hand-pointer tutorial-hand-pointer--${action}`}
      style={{
        left: `${Math.round(targetX)}px`,
        top: `${Math.round(targetY)}px`,
        '--tutorial-hand-dx': `${Math.round(secondaryX - targetX)}px`,
        '--tutorial-hand-dy': `${Math.round(secondaryY - targetY)}px`,
      }}
      aria-hidden="true"
    >
      <span className="tutorial-hand-pointer__pulse" />
      <img src={tutorialHand} alt={label} draggable="false" />
    </div>
  );
};

export default TutorialHandPointer;
