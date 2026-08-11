import React from 'react';
import { getResultHeadline } from '../systems/progressBridge';

const ResultOverlay = ({
  result,
  gameplay,
  isSubmitting,
  canAdvanceLevel,
  onRetry,
  onBack,
  onNextLevel,
}) => {
  if (!result && !isSubmitting) {
    return null;
  }

  const headline = getResultHeadline(result);
  const stars = Number(result?.starsEarned || 0);
  const isFailure = result?.result === 'FAILED';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4">
      <div
        className="w-full max-w-[760px] space-y-[18px] rounded-[28px] border-4 border-[#4a3721] bg-[#f5e8ce] px-[30px] py-[30px] text-center shadow-2xl"
        style={{ fontFamily: 'Manrope, Arial, sans-serif' }}
      >
        <div>
          <p className="text-[18px] font-bold text-[#166534]">Game 1 Result</p>
          <h2 className="mt-[18px] text-[40px] font-bold leading-none text-[#1f2937]">
            {isSubmitting ? 'Saving Result...' : headline}
          </h2>
          <p className="mx-auto mt-[18px] max-w-[620px] text-[20px] font-normal leading-[1.5] text-[#4b5563]">
            {isSubmitting
              ? 'Updating your progress, stars, and score for this run.'
              : result?.result === 'COMPLETED'
                ? 'The stage is cleared. You can replay it or move on to the next challenge.'
                : 'The run ended before the stage was cleared. Retry the level to keep progressing.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-[14px]">
          <div className="flex h-[118px] flex-col items-center justify-center rounded-[20px] border-2 border-[#d97706] bg-[#fff4d6] px-4">
            <p className="text-[14px] font-bold uppercase text-[#9a3412]">Stars</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-[#7c2d12]">{isSubmitting ? '...' : stars}</p>
          </div>
          <div className="flex h-[118px] flex-col items-center justify-center rounded-[20px] border-2 border-[#475569] bg-[#e2e8f0] px-4">
            <p className="text-[14px] font-bold uppercase text-[#475569]">Score</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-[#111827]">
              {isSubmitting ? '...' : (result?.finalScore ?? '--')}
            </p>
          </div>
          <div className="flex h-[118px] flex-col items-center justify-center rounded-[20px] border-2 border-[#15803d] bg-[#dcfce7] px-4">
            <p className="text-[14px] font-bold uppercase text-[#166534]">Coins</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-[#14532d]">
              {gameplay?.coinsCollected ?? 0}/{gameplay?.totalCoins ?? 0}
            </p>
          </div>
        </div>

        {!isSubmitting && (
          <div className="flex justify-center gap-3">
            {!isFailure && canAdvanceLevel ? (
              <button
                type="button"
                className="h-[58px] flex-1 rounded-[18px] border-[3px] border-[#14532d] bg-[#166534] px-[18px] text-[20px] font-bold text-white transition hover:bg-[#15803d]"
                onClick={onNextLevel}
              >
                Next Level
              </button>
            ) : null}
            <button
              type="button"
              className={`h-[58px] flex-1 rounded-[18px] border-[3px] px-[18px] text-[20px] font-bold text-white transition ${
                !isFailure && canAdvanceLevel
                  ? 'border-[#9a3412] bg-[#d97706] hover:bg-[#ea8a06]'
                  : 'border-[#14532d] bg-[#166534] hover:bg-[#15803d]'
              }`}
              onClick={onRetry}
            >
              {isFailure ? 'Retry Level' : 'Play Again'}
            </button>
            <button
              type="button"
              className="h-[58px] flex-1 rounded-[18px] border-[3px] border-[#334155] bg-[#475569] px-[18px] text-[20px] font-bold text-white transition hover:bg-[#53657e]"
              onClick={onBack}
            >
              Back To Levels
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultOverlay;
