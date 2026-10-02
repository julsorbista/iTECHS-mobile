import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, Heart, Shield, ShieldCheck, Zap } from 'lucide-react';
import tutorialHand from '../../shared/ui/tutorial-hand.png';
import tutorialParchment from '../../shared/ui/tutorial4.png';
import './GameOneInteractiveTutorial.css';
import './GameOneTutorialParchment.css';

const clamp = (n, min, max) => Math.min(Math.max(min, max), Math.max(min, n));
const overlaps = (a, b) => b ? Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)) : 0;
const toPixels = (rect, stage) => rect && ({ x: rect.x * stage.width, y: rect.y * stage.height, width: rect.width * stage.width, height: rect.height * stage.height });
const displayKey = (key) => ({ A: '←', D: '→', W: 'Jump', SPACE: 'Jump', SHIFT: 'Dash', J: 'Attack' })[key] || key;

export default function GameOneInteractiveTutorial({ state, canvasRef, levelNumber = 1, isReplay, onPageChange, onAcknowledge, onFinish }) {
  const [stage, setStage] = useState(null);
  const [hand, setHand] = useState(null);
  const [panelSize, setPanelSize] = useState({ width: 410, height: 320 });
  const panelRef = useRef(null);
  const keyRef = useRef(null);
  const actionRef = useRef(null);
  const step = state?.step;
  const page = state?.page || step?.page || 1;

  useLayoutEffect(() => {
    const element = canvasRef.current?.querySelector('canvas');
    if (!element) return;
    const measure = () => {
      const r = element.getBoundingClientRect();
      setStage({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [canvasRef, Boolean(state)]);

  useLayoutEffect(() => {
    if (!panelRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      // Include the panel padding/border when reserving space in the room.
      const r = entry.target.getBoundingClientRect();
      setPanelSize({ width: r.width, height: r.height });
    });
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [Boolean(stage)]);


  const target = stage && toPixels(state?.target, stage);
  const player = stage && toPixels(state?.player, stage);
  const marker = stage && toPixels(state?.movement, stage);
  const infoStep = step && !step.control && step.id !== 'ready';
  const panel = { x: 12, y: 12 };
  if (stage) {
    const right = Math.max(12, stage.width - panelSize.width - 14);
    const hudBottom = Math.max(0, ...(state?.hud || []).map((rect) => (rect.y + rect.height) * stage.height));
    const hudHandSpace = !step?.control && target && target.y < hudBottom ? 66 : 12;
    const top = clamp(hudBottom + hudHandSpace, 72, stage.height - panelSize.height - 12);
    const bottom = Math.max(top, stage.height - panelSize.height - 16);
    const candidates = [right, 14, 14 + (right - 14) / 4, 14 + (right - 14) / 2, 14 + (right - 14) * 3 / 4]
      .flatMap((x) => [{ x, y: top }, { x, y: bottom }]);
    const playerSpace = player && { x: player.x - 12, y: player.y - 32, width: player.width + 24, height: player.height + 40 };
    const practiceSpace = toPixels(state?.practiceArea, stage);
    const score = (point) => overlaps({ ...point, ...panelSize }, target) * 1000 + overlaps({ ...point, ...panelSize }, playerSpace) * 1000
      + overlaps({ ...point, ...panelSize }, practiceSpace) * 1000
      + (state?.obstacles || []).reduce((sum, rect) => sum + overlaps({ ...point, ...panelSize }, toPixels(rect, stage)), 0);
    Object.assign(panel, candidates.reduce((best, point) => score(point) < score(best) ? point : best, candidates[0]));
    if ([1, 2].includes(page)) panel.x = right;
    if ([3, 5].includes(page)) panel.x = 14;
  }
  const jumpingForDash = step?.id === 'dash' && !state.completed && step.jumpKeys?.length > 0 && (state.grounded || state.demoPressed && state.demoControl === 'jump');
  const primaryKeys = jumpingForDash ? step.jumpKeys : step?.id === 'jump' ? ['W'] : step?.keys || [];
  const primaryControl = jumpingForDash ? 'jump' : step?.control;
  const waitingForLanding = step?.id === 'jump' && state.jumped && !state.completed && !state.demoPressed;
  const hasVisibleObjectTarget = state?.objectVisible !== false;
  const pointingAtRoom = infoStep || (step?.id === 'ready' && hasVisibleObjectTarget) || waitingForLanding;
  const warning = ['health', 'hazard'].includes(step?.id);
  const targetPadding = step?.id === 'scroll' ? 2 : 7;

  useLayoutEffect(() => {
    if (!stage) return;
    let point;
    if (keyRef.current && step?.control && !waitingForLanding) {
      const r = keyRef.current.getBoundingClientRect();
      // The fingertip lands ON the key's lower-right corner, clear of its label.
      point = { x: r.right - stage.left - 6, y: r.top - stage.top + r.height * 0.72, mirror: false };
    } else if (target && pointingAtRoom) {
      const mirror = target.x + target.width + 65 > stage.width;
      point = { x: mirror ? target.x - 8 : target.x + target.width + 8, y: target.y + target.height * 0.5, mirror };
      // Leave space for the palm as well as the fingertip beside dense HUD rows.
      const blockers = (state.hud || []).map((rect) => toPixels(rect, stage));
      if (blockers.some((rect) => overlaps({ x: point.x - (mirror ? 54 : 0), y: point.y, width: 54, height: 60 }, rect))) {
        point.y = Math.max(...blockers.map((rect) => rect.y + rect.height)) + 16;
      }
    } else if (actionRef.current) {
      const r = actionRef.current.getBoundingClientRect();
      point = { x: r.right - stage.left + 6, y: r.top - stage.top + 12, mirror: false };
    }
    if (point) setHand({ ...point, x: clamp(point.x, 14, stage.width - 56), y: clamp(point.y, 14, stage.height - 66) });
  }, [stage, step?.id, jumpingForDash, waitingForLanding, panel.x, panel.y, panelSize, target?.x, target?.y, target?.width, target?.height, pointingAtRoom]);


  if (!stage) return null;
  const prompt = state?.completed ? (step.control ? 'Demo complete. You can select Next to continue.' : step.success)
    : state?.recovery ? 'Returning safely. The demo will try again.'
    : waitingForLanding ? 'Watch the player land on the platform.'
    : step?.control ? ({ left: 'Hold ← to move left.', right: 'Hold → to move right.', jump: 'Tap Jump to jump onto the platform.', attack: 'Tap Attack to attack.', dash: jumpingForDash ? 'Tap Jump, then Dash.' : 'Tap Dash to dash.' })[step.id]
    : step?.prompt || 'Preparing your practice room…';
  const actionGesture = pointingAtRoom ? (warning ? 'warning' : 'point')
    : step?.control ? (['left', 'right'].includes(primaryControl) ? 'hold' : 'press') : 'press';
  const gestureKey = `${step?.id}-${primaryControl}-${actionGesture}`;

  return createPortal(
    <div className={`g1-coach g1-parchment g1-parchment--automatic ${state?.demoPressed ? 'g1-parchment--pressed' : ''} ${state?.completed ? 'g1-coach--success' : ''} ${warning ? 'g1-coach--warning' : ''}`} style={stage} data-testid="game-one-tutorial" data-page={page}>
      {target && !step?.control && <div className="g1-coach__focus-shade" aria-hidden="true" style={{ left: target.x - 8, top: target.y - 8, width: target.width + 16, height: target.height + 16 }} />}
      {target && infoStep && <button type="button" className={`g1-coach__target ${step.id === 'hazard' ? 'g1-coach__target--warning' : ''}`}
        aria-label={`Inspect ${step.target}`} onClick={onAcknowledge} disabled={state.completed}
        style={{ left: target.x - targetPadding, top: target.y - targetPadding, width: Math.max(step.id === 'scroll' ? 24 : 36, target.width + targetPadding * 2), height: Math.max(step.id === 'scroll' ? 24 : 30, target.height + targetPadding * 2) }}>
        {target.y > 90 && <span>{state.completed ? '✓' : step.id === 'hazard' ? 'Watch out!' : 'Look here'}</span>}
      </button>}
      {target && step?.id === 'ready' && hasVisibleObjectTarget && <div className="g1-coach__target" aria-hidden="true" style={{ pointerEvents: 'none', left: target.x - 7, top: target.y - 7, width: target.width + 14, height: target.height + 14 }}><span>Treasure destination</span></div>}
      {target && step?.id === 'jump' && <div className={`g1-coach__landing ${waitingForLanding ? 'g1-coach__landing--active' : ''}`} style={{ left: target.x, top: target.y - 3, width: target.width }} aria-hidden="true"><span>{state.completed ? '✓ Safe landing' : 'Land here'}</span></div>}
      {marker && !state?.completed && <div className="g1-coach__marker" style={{ left: marker.x, top: marker.y, '--direction': step?.id === 'left' ? '-3px' : '3px' }} aria-hidden="true">{step?.id === 'left' ? <ArrowLeft /> : <ArrowRight />}</div>}
      {player && step?.control && <div className="g1-coach__player-label" style={{ left: player.x + player.width / 2, top: player.y - 24 }} aria-hidden="true">
        {state.completed ? <><Check size={12} /> Demo complete</> : <><span /> {waitingForLanding ? 'Landing' : 'Watch the demo'}</>}
      </div>}

      <section className={`g1-coach__bubble g1-parchment__panel ${step?.control ? 'g1-parchment__panel--movement' : ''}`} ref={panelRef}
        style={{ left: panel.x, top: panel.y }} aria-label={`Game 1 tutorial page ${page} of 6`}>
        <img className="g1-parchment__background" src={tutorialParchment} alt="" draggable="false" />
        <header className="g1-coach__header g1-parchment__header">
          <span className="g1-parchment__page" aria-label={`Page ${page} of 6`}>{page} / 6</span>
          <button className="g1-parchment__close" type="button" onClick={onFinish} aria-label="Close tutorial" title="Close tutorial" />
        </header>
        <div className="g1-parchment__body">
          <h3>{step?.title || 'MOVEMENTS'}</h3>
          {step?.control && <div className="g1-parchment__movements">
            <div className="g1-parchment__active-control">
              <span key={gestureKey} ref={keyRef}
                className={`g1-coach__key g1-coach__key--${actionGesture}`}
                aria-label={`Demonstrating ${primaryControl}`}>
                {displayKey(primaryKeys[0])}
              </span>
            </div>
            <ul className="g1-parchment__control-list" aria-label="Movement controls">
              {(state.movementControls || []).map((item) => <li key={item.id} className={item.id === step.id ? 'is-current' : ''}>
                <b>{displayKey(item.id === 'jump' ? 'W' : item.keys[0])}</b>
                <span>— {({ left: 'Move Left', right: 'Move Right', jump: 'Jump', attack: 'Attack', dash: 'Dash' })[item.id]}</span>
              </li>)}
            </ul>
          </div>}
          <p className="g1-coach__instruction" role="status">{prompt}</p>
          {step?.id === 'booster' && <div className="g1-parchment__boost-preview" aria-label="Examples of power-ups">
            <span><Zap size={15} aria-hidden="true" /> Speed</span>
            <span><ArrowRight size={15} aria-hidden="true" /> Jump</span>
            <span><Shield size={15} aria-hidden="true" /> Shield</span>
            <span><Heart size={15} aria-hidden="true" /> Health</span>
          </div>}
          {!step?.control && <p className="g1-parchment__note">{state?.objectVisible === false
            ? ({ booster: 'Examples above: collect them when you see them in a room.', coin: 'Check your coins in the highlighted counter.', scroll: 'No scroll is visible here yet. Check your clue counter.', hazard: 'No monster is visible here yet. Stay alert as you explore.', ready: 'Follow the room destination. The Treasure awaits in the final stage.' })[step?.id]
            : step?.tip}</p>}
        </div>
        <footer className="g1-parchment__footer">
          {page > 1 ? <button type="button" className="g1-parchment__back" onClick={() => onPageChange(page - 1)}><ArrowLeft size={12} /> Back</button>
            : <span><ShieldCheck size={11} /> Auto demo · no input needed</span>}
          {step?.id !== 'ready' && <button type="button" className="g1-coach__continue" ref={actionRef} onClick={onAcknowledge}>
            Next <ArrowRight size={13} />
          </button>}
          {step?.id === 'ready' && <button type="button" ref={actionRef} className="g1-coach__continue g1-coach__continue--return" onClick={onFinish}>
            {isReplay ? 'Return to game' : `Start Level ${levelNumber}`} <ArrowRight size={13} />
          </button>}
        </footer>
      </section>
      {hand && target && pointingAtRoom && hand.y > target.y + target.height + 16 && <svg className="g1-coach__connector" aria-hidden="true">
        <line x1={target.x + target.width} y1={target.y + target.height / 2} x2={hand.x} y2={hand.y} />
      </svg>}
      {hand && step && <div className={`g1-coach__hand g1-coach__hand--${actionGesture} ${hand.mirror ? 'g1-coach__hand--mirrored' : ''}`}
        style={{ left: hand.x, top: hand.y, ...(waitingForLanding ? { transition: 'left 160ms ease, top 160ms ease 160ms' } : {}) }} aria-hidden="true">
        <span key={`touch-${gestureKey}`} className="g1-coach__touch" /><img key={gestureKey} src={tutorialHand} alt="" draggable="false" />
      </div>}
    </div>,
    document.body,
  );
}
