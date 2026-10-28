import React, { useEffect, useRef, useState } from 'react';
import '../../shared/ui/AnnouncementBoard.css';
import { createPortal } from 'react-dom';
import announcementBoard from '../../../assets/announcement-board.png';
import beepOne from '../assets/beep-1.mp3';
import beepTwo from '../assets/beep-2.mp3';
import beepThree from '../assets/beep-3.mp3';
import { getStudentSfxVolume } from '../../../utils/studentMenuAudio';

const ANNOUNCEMENT_MS = 5500;
const COUNTDOWN_SECONDS = 3;
const FADE_MS = 350;

const LEVEL_CHALLENGES = Object.freeze({
  1: {
    name: 'Speed-Up Wave',
    instruction: 'Type each Java term before it reaches the bottom. The falling speed increases as you progress.',
  },
  2: {
    name: 'Incomplete Letters',
    instruction: 'Use the visible letters to identify and type the complete Java term.',
  },
  3: {
    name: 'Target Words',
    instruction: 'Type only terms that belong to the displayed target category. Ignore the other words.',
  },
  4: {
    name: 'Fake Syntaxes',
    instruction: 'Type the real Java syntax and allow the believable fake syntax to fall.',
  },
  5: {
    name: 'Odd Pair',
    instruction: 'Find and type the two related Java terms before they reach the bottom. Ignore the distractors.',
  },
});

/** Game 6-only timed challenge announcement and countdown. */
const GameSixAnnouncementBoard = ({ levelNumber = 1, onStart }) => {
  const level = Math.min(5, Math.max(1, Number(levelNumber) || 1));
  const challenge = LEVEL_CHALLENGES[level];
  const [countdown, setCountdown] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const onStartRef = useRef(onStart);
  const hasStartedRef = useRef(false);
  const countdownAudioRef = useRef({});
  onStartRef.current = onStart;

  useEffect(() => {
    const sounds = {
      1: new Audio(beepOne),
      2: new Audio(beepTwo),
      3: new Audio(beepThree),
    };
    Object.values(sounds).forEach((sound) => {
      sound.preload = 'auto';
      sound.load();
    });
    countdownAudioRef.current = sounds;
    return () => {
      Object.values(sounds).forEach((sound) => {
        sound.pause();
        sound.currentTime = 0;
      });
      countdownAudioRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!countdown) return;
    const sourceSound = countdownAudioRef.current[countdown];
    if (!sourceSound) return;

    // Use a fresh one-shot instance so the final beep cannot be interrupted
    // when the announcement board begins its exit transition.
    const sound = sourceSound.cloneNode();
    sound.muted = false;
    sound.volume = getStudentSfxVolume(1);
    sound.currentTime = 0;
    sound.play().catch(() => {});

    return () => {
      if (countdown !== 1) {
        sound.pause();
        sound.currentTime = 0;
      }
    };
  }, [countdown]);

  useEffect(() => {
    hasStartedRef.current = false;
    setCountdown(null);
    setLeaving(false);
    const timers = [
      window.setTimeout(() => setCountdown(3), ANNOUNCEMENT_MS),
      window.setTimeout(() => setCountdown(2), ANNOUNCEMENT_MS + 1000),
      window.setTimeout(() => setCountdown(1), ANNOUNCEMENT_MS + 2000),
      window.setTimeout(() => setLeaving(true), ANNOUNCEMENT_MS + (COUNTDOWN_SECONDS * 1000) - FADE_MS),
      window.setTimeout(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;
        onStartRef.current?.();
      }, ANNOUNCEMENT_MS + (COUNTDOWN_SECONDS * 1000)),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [level]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.add('game-six-announcement-open');

    return () => {
      document.body.classList.remove('game-six-announcement-open');
    };
  }, []);

  const isCountingDown = countdown !== null;
  const announcement = (
    <div className={`announcement-guide-backdrop${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-labelledby="announcement-guide-title">
      <section className="announcement-guide-board" style={{ backgroundImage: `url(${announcementBoard})` }}>
        <div className="announcement-guide-paper">
          {isCountingDown ? (
            <div className="announcement-guide-countdown" role="timer" aria-live="assertive">
              <p>GET READY!</p>
              <strong key={countdown}>{countdown}</strong>
            </div>
          ) : (
            <>
              <p className="announcement-guide-level">CHALLENGE ANNOUNCEMENT</p>
              <h2 id="announcement-guide-title">READY?</h2>
              <div className="announcement-guide-divider" aria-hidden="true" />
              <h3 className="announcement-guide-challenge-title">LEVEL {level}: {challenge.name.toUpperCase()} ROUND</h3>
              <p className="announcement-guide-instruction">{challenge.instruction}</p>
            </>
          )}
        </div>
      </section>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(announcement, document.body)
    : announcement;
};

export default GameSixAnnouncementBoard;
