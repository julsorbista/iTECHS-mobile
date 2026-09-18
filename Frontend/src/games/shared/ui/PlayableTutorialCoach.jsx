import { CheckCircle2 } from 'lucide-react';
import { TutorialActionHand } from './TutorialHandPointer';

const PlayableTutorialCoach = ({
  kicker = '',
  steps = [],
  stepIndex = 0,
  stats = [],
  badgeLabel = 'Safe practice',
  onExit,
  exitLabel = 'Exit',
  onContinue,
}) => {
  const safeSteps = Array.isArray(steps) && steps.length > 0
    ? steps
    : [{ title: 'Tutorial', body: 'Practice this game before Level 1 starts.', buttonLabel: 'Continue' }];
  const currentIndex = Math.min(Math.max(0, stepIndex), safeSteps.length - 1);
  const currentStep = safeSteps[currentIndex];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#24192a]/60 px-6">
      <div className="w-full max-w-xl border-[4px] border-[#432644] bg-[#fff8df] p-5 text-[#24192a] shadow-[10px_10px_0_rgba(67,38,68,0.8)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">
              {kicker || `Tutorial Step ${currentIndex + 1} of ${safeSteps.length}`}
            </p>
            {!kicker && (
              <p className="sr-only">
                Tutorial Step {currentIndex + 1} of {safeSteps.length}
              </p>
            )}
            <h3 className="mt-1 text-3xl font-black">{currentStep.title}</h3>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 border-[3px] border-[#0f766e] bg-[#d9fff7] px-3 py-2 text-sm font-black text-[#134e4a]">
            <CheckCircle2 className="h-4 w-4" />
            {badgeLabel}
          </span>
        </div>

        <p className="text-base font-bold leading-relaxed">{currentStep.body}</p>

        {stats.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {stats.map((stat) => (
              <div key={stat.label} className="border-[3px] border-[#70415f] bg-white p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#70415f]">{stat.label}</p>
                <p className="mt-1 text-lg font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex flex-1 gap-1.5">
            {safeSteps.map((step, index) => (
              <span
                key={`${step.title}-${index}`}
                className={`h-3 flex-1 border-2 border-[#432644] ${index <= currentIndex ? 'bg-[#14b8a6]' : 'bg-white'}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                type="button"
                className="border-[3px] border-[#432644] bg-white px-5 py-3 text-base font-black shadow-[4px_4px_0_#432644] transition hover:bg-slate-100"
                onClick={onExit}
              >
                {exitLabel}
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                className="border-[3px] border-[#432644] bg-[#dff3ff] px-5 py-3 text-base font-black shadow-[4px_4px_0_#432644] transition hover:bg-[#cbe9f7]"
                onClick={onContinue}
              >
                {currentStep.buttonLabel || 'Continue'}
              </button>
              <TutorialActionHand />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayableTutorialCoach;
