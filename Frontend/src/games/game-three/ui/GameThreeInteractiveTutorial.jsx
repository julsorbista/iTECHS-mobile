import React, { useMemo } from 'react';
import InGameTutorial from '../../shared/ui/InGameTutorial';

export default function GameThreeInteractiveTutorial({ rootRef, onDemo, deck, levelNumber = 1, flipBackMs = 900, isFirstPlay, onStart }) {
  const steps = useMemo(() => {
    const first = deck[0], pair = first && deck.find((card) => card.cardId !== first.cardId && card.pairId === first.pairId);
    const other = first && deck.find((card) => card.pairId !== first.pairId);
    const selector = (card) => card ? `[data-demo-card="${deck.indexOf(card)}"]` : '.game-three-board';
    const model = (revealed = [], matched = []) => ({ revealed: revealed.filter(Boolean).map((card) => card.cardId), matched: matched.filter(Boolean).map((card) => card.pairId) });
    return [
      { title: 'Flip. Remember. Match.', text: 'Match cards with the same picture and concept. Watch the demonstration on your own board.', tip: 'Click or tap one card at a time during real play; no dragging is needed.', target: selector(first), frame: () => ({ display: model() }) },
      { title: 'A matching pair', text: 'Watch the first card flip, then its matching partner. Matching cards stay face up.', duration: 3200,
        frame: (t) => ({ target: selector(t < 1700 ? first : pair), gesture: 'press', pressed: t >= 800 && t < 1050 || t >= 2200 && t < 2450, display: model(t >= 2300 ? [first, pair] : t >= 900 ? [first] : [], t >= 2900 ? [first] : []) }) },
      { title: 'When cards differ', text: other ? 'Different cards turn face down again. Remember their pictures and positions.' : 'This board has only one pair. On larger boards, different cards turn back over.', duration: 2700 + flipBackMs, panelPlacement: 'bottom-right',
        frame: (t) => ({ target: selector(t < 1600 ? first : other), gesture: 'press', pressed: t >= 800 && t < 1050 || t >= 2000 && t < 2250, display: model(!other || t >= 2300 + flipBackMs ? [] : t >= 2100 ? [first, other] : t >= 900 ? [first] : []) }) },
      { title: 'Make each turn count', text: `Selecting two cards uses one flip attempt. You begin with ${deck.length} attempts. Match all pairs before they run out.`, target: '.game-three-side-status', frame: () => ({ display: model() }) },
      { title: 'Matches earn rewards', text: 'Each matched pair adds 100 to the Stars counter. Pairs tracks matches; Moves counts turns; Misses counts mismatches.', tip: 'The real counters do not change during this demonstration.', target: '.game-three-side-panel', panelPlacement: 'bottom-left', frame: () => ({ display: model([first, pair], [first]) }) },
      { title: 'Your board is ready', text: 'Flip two, remember positions, and match every pair. Game Tutorial is available any time.', tip: 'Your original card positions, timer and progress will be restored.', target: '.game-three-board-footer', frame: () => ({ display: model() }) },
    ];
  }, [deck, flipBackMs]);
  return <InGameTutorial game={3} rootRef={rootRef} steps={steps} onDemo={onDemo} onStart={onStart} anchor=".game-three-side-panel" avoid=".game-three-card-flipped" finishLabel={isFirstPlay ? `Start Level ${levelNumber}` : 'Return to game'} />;
}
