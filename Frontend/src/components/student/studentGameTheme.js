import { Boxes, Cpu, Keyboard, Snowflake, Sparkles, Target } from 'lucide-react';

const STUDENT_GAME_THEME_MAP = Object.freeze({
  GAME_ONE: {
    tone: 'emerald',
    Icon: Sparkles,
  },
  GAME_TWO: {
    tone: 'sky',
    Icon: Cpu,
  },
  GAME_THREE: {
    tone: 'amber',
    Icon: Target,
  },
  GAME_FOUR: {
    tone: 'teal',
    Icon: Boxes,
  },
  GAME_FIVE: {
    tone: 'sky',
    Icon: Snowflake,
  },
  GAME_SIX: {
    tone: 'emerald',
    Icon: Keyboard,
  },
  DEFAULT: {
    tone: 'slate',
    Icon: Sparkles,
  },
});

export const getStudentGameTheme = (gameType) => (
  STUDENT_GAME_THEME_MAP[String(gameType || '').toUpperCase()]
  || STUDENT_GAME_THEME_MAP.DEFAULT
);
