import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import panelAsset from './tutorial4.png';
import handAsset from './tutorial-hand.png';
import './InGameTutorial.css';

const overlap = (a, b) => Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
const empty = {};

// Presentation only. The host publishes a temporary display model to its own
// renderer; this component never invokes gameplay handlers, APIs or storage.
export default function InGameTutorial({ rootRef, steps, onDemo, onStart, finishLabel = 'Return to game', game, anchor, avoid = '', panelImage = panelAsset, panelWidth = 520, panelMinHeight = 300, autoScrollTargets = false }) {
  const [page, setPage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [layout, setLayout] = useState(null);
  const panelRef = useRef(null);
  const stablePanelRef = useRef(null);
  const step = steps[page];
  const frame = useMemo(() => step.frame?.(elapsed) || empty, [step, elapsed]);
  const target = frame.target ?? step.target;
  const gesture = frame.gesture || step.gesture || 'point';

  useEffect(() => {
    let time = 0;
    const timer = setInterval(() => {
      if (document.hidden) return;
      time = Math.min(time + 80, step.duration || 3200);
      setElapsed(time);
      if (time >= (step.duration || 3200)) clearInterval(timer);
    }, 80);
    return () => clearInterval(timer);
  }, [step]);
  useLayoutEffect(() => { onDemo?.(frame.display || null); }, [frame, onDemo]);
  useLayoutEffect(() => () => onDemo?.(null), [onDemo]);
  useLayoutEffect(() => {
    if (!autoScrollTargets || typeof target !== 'string') return undefined;
    let cancelled = false;
    let scrollRequested = false;
    const bringTargetIntoView = () => {
      if (cancelled || scrollRequested) return;
      const element = rootRef.current?.querySelector(target);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
      const margin = 28;
      if (rect.top < viewportTop + margin || rect.bottom > viewportBottom - margin) {
        scrollRequested = true;
        element.scrollIntoView?.({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    };
    const animation = requestAnimationFrame(bringTargetIntoView);
    const timers = [120, 360, 700].map((delay) => setTimeout(bringTargetIntoView, delay));
    return () => {
      cancelled = true;
      cancelAnimationFrame(animation);
      timers.forEach(clearTimeout);
    };
  }, [autoScrollTargets, page, rootRef, target]);
  useLayoutEffect(() => {
    const root = rootRef.current, focus = document.activeElement;
    const inert = root?.inert;
    const scrollers = root ? [root, ...root.querySelectorAll('*')].filter((el) => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth).map((el) => [el, el.scrollTop, el.scrollLeft]) : [];
    if (root) { root.inert = true; root.classList.add('in-game-demo-open'); }
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      if (root) { root.inert = inert; root.classList.remove('in-game-demo-open'); }
      scrollers.forEach(([el, top, left]) => { el.scrollTop = top; el.scrollLeft = left; });
      if (focus?.isConnected) focus.focus({ preventScroll: true });
    };
  }, [rootRef]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    let element = null;
    // Scroll the actual display, not a second practice board, to a target if needed.
    const initialElement = typeof target === 'string' ? root?.querySelector(target) : null;
    if (initialElement && !autoScrollTargets) {
      const r = initialElement.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) initialElement.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
    const measure = () => {
      if (!root || !panelRef.current) return;
      const nextElement = typeof target === 'string' ? root.querySelector(target) : null;
      if (element !== nextElement) {
        element?.removeAttribute('data-tutorial-highlight');
        element = nextElement;
        element?.setAttribute('data-tutorial-highlight', 'true');
      }
      const r = root.getBoundingClientRect();
      const mobile = innerWidth <= 1024;
      const landscape = innerWidth > innerHeight;
      const left = mobile ? 8 : Math.max(8, r.left + 8), top = mobile ? 8 : Math.max(8, r.top + 8);
      const right = mobile ? innerWidth - 8 : Math.min(innerWidth - 8, r.right - 8), bottom = mobile ? innerHeight - 8 : Math.min(innerHeight - 8, r.bottom - 8);
      const a = anchor && root.querySelector(anchor)?.getBoundingClientRect();
      // Anchors suggest placement, never the panel size. Narrow sidebars used
      // to squeeze the parchment into a tall card unlike the Game 1 panel.
      const width = Math.min(mobile ? (landscape ? Math.min(340, innerWidth * .43) : 360) : panelWidth, Math.max(0, right - left));
      const copyHeight = panelRef.current.querySelector('.in-game-tutorial__copy')?.scrollHeight || 0;
      const panelStyle = getComputedStyle(panelRef.current);
      const spacing = (parseFloat(panelStyle.paddingTop) || 0) + (parseFloat(panelStyle.paddingBottom) || 0)
        + (parseFloat(panelStyle.rowGap) || 0) + (panelRef.current.querySelector('nav')?.offsetHeight || 0) + 12;
      const height = Math.min(Math.max(mobile ? 240 : panelMinHeight, Math.ceil(copyHeight + Math.max(mobile ? 0 : 176, spacing))), mobile && !landscape ? innerHeight * .46 : Infinity, Math.max(0, bottom - top));
      const rect = typeof target === 'function' ? target(root) : element?.getBoundingClientRect();
      const blockers = [rect, ...(avoid ? [...root.querySelectorAll(avoid)].map((el) => el.getBoundingClientRect()) : [])].filter(Boolean);
      const candidates = [{ left, top }, { left: Math.max(left, right - width), top },
        { left, top: Math.max(top, bottom - height) }, { left: Math.max(left, right - width), top: Math.max(top, bottom - height) }];
      if (a && a.width >= width * .8) candidates.unshift({ left: Math.max(left, Math.min(a.left, right - width)), top: Math.max(top, Math.min(a.top, bottom - height)) });
      const score = (c) => blockers.reduce((sum, b, index) => sum + overlap({ ...c, width, height }, b) * (index === 0 ? 100 : 1), 0);
      const fixedPlacement = {
        'top-left': candidates[0],
        'top-right': candidates[1],
        'bottom-left': candidates[2],
        'bottom-right': candidates[3],
      }[step.panelPlacement];
      const suggestedPanel = (!mobile && fixedPlacement) || candidates.reduce((best, c) => score(c) < score(best) ? c : best, candidates[0]);
      // Game 3's animated demo changes card targets mid-step. Keep the
      // instruction parchment still while the highlight and hand move.
      const previousPanel = stablePanelRef.current;
      const canReuseGameThreePanel = game === 3
        && previousPanel?.page === page
        && previousPanel.left >= left
        && previousPanel.top >= top
        && previousPanel.left + width <= right
        && previousPanel.top + height <= bottom;
      const panel = canReuseGameThreePanel
        ? { left: previousPanel.left, top: previousPanel.top }
        : suggestedPanel;
      stablePanelRef.current = { page, left: panel.left, top: panel.top };
      let hand = null;
      const handRect = frame.handOnKeys ? panelRef.current.querySelector('kbd')?.getBoundingClientRect() : rect;
      if (handRect && handRect.width > 0 && handRect.height > 0) {
        const progress = frame.swipe;
        hand = { left: progress == null ? handRect.right - 4 : handRect.left + handRect.width * progress,
          top: progress == null ? handRect.bottom - 5 : handRect.top + handRect.height / 2 };
        hand.left = Math.max(left, Math.min(right - 48, hand.left));
        hand.top = Math.max(top, Math.min(bottom - 55, hand.top));
      }
      setLayout({ bounds: mobile ? { left: 0, top: 0, width: innerWidth, height: innerHeight } : { left: Math.max(0, r.left), top: Math.max(0, r.top), width: Math.max(0, right - Math.max(0, r.left) + 8), height: Math.max(0, bottom - Math.max(0, r.top) + 8) }, panel: { ...panel, width, height }, rect: rect && { left: rect.left - 5, top: rect.top - 5, width: rect.width + 10, height: rect.height + 10 }, hand });
    };
    measure();
    // Host display commits may insert or move the target after this layout effect.
    const animation = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    if (root) observer.observe(root);
    if (element) observer.observe(element);
    const copy = panelRef.current?.querySelector('.in-game-tutorial__copy');
    if (copy) observer.observe(copy);
    window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true);
    return () => { cancelAnimationFrame(animation); element?.removeAttribute('data-tutorial-highlight'); observer.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [rootRef, target, anchor, avoid, autoScrollTargets, frame, game, panelMinHeight, panelWidth, step.panelPlacement]);

  const navigate = (next) => { stablePanelRef.current = null; setElapsed(0); setPage(next); };
  return createPortal(<div className={`in-game-tutorial in-game-tutorial--${gesture}`} style={layout?.bounds} data-game={game} data-page={page + 1}>
    {layout?.rect && <div className="in-game-tutorial__highlight" style={layout.rect} aria-hidden="true" />}
    <section ref={panelRef} className="in-game-tutorial__panel" style={layout?.panel} role="dialog" aria-modal="true" aria-label={`Game ${game} tutorial page ${page + 1} of ${steps.length}`} tabIndex={-1}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onStart(); }
        if (event.key !== 'Tab') return;
        const buttons = [...panelRef.current.querySelectorAll('button:not(:disabled)')];
        const index = buttons.indexOf(document.activeElement);
        event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }}>
      <img className="in-game-tutorial__frame" src={panelImage} alt="" draggable="false" />
      <button className="in-game-tutorial__close" aria-label="Close tutorial" onClick={onStart} />
      <span className="in-game-tutorial__page">{page + 1} / {steps.length}</span>
      <div className="in-game-tutorial__content">
        <div className="in-game-tutorial__copy">
        <h3>{step.title}</h3>
        <p role="status">{frame.text || step.text}</p>
        {step.tip && <small>{step.tip}</small>}
        {frame.keys && <div className="in-game-tutorial__keys">{frame.keys.map((key) => <kbd key={key} className={frame.pressed ? 'is-pressed' : ''}>{key}</kbd>)}</div>}
        <span className="in-game-tutorial__safe">Auto demo · real progress unchanged</span>
        </div>
      </div>
      <nav>
        <button disabled={!page} onClick={() => navigate(page - 1)}><ArrowLeft size={15} strokeWidth={3} aria-hidden="true" /> Back</button>
        <button className={page === steps.length - 1 ? 'in-game-tutorial__finish' : ''} onClick={() => page === steps.length - 1 ? onStart() : navigate(page + 1)}>
          {page === steps.length - 1 ? finishLabel : 'Next'} <ArrowRight size={15} strokeWidth={3} aria-hidden="true" />
        </button>
      </nav>
    </section>
    {layout?.hand && <div className={`in-game-tutorial__hand ${frame.pressed ? 'is-pressed' : ''}`} style={layout.hand} aria-hidden="true"><i /><img src={handAsset} alt="" draggable="false" /></div>}
  </div>, document.body);
}
