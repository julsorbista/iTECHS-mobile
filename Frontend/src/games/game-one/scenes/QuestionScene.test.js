import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/games/game-one/scenes/QuestionScene.js'),
  'utf8',
);

describe('Room 5 treasure question flow', () => {
  it('does not retain the former three-attempt scramble flow', () => {
    expect(source).not.toContain('attempts remaining');
    expect(source).not.toContain('TREASURE_WORD_SCRAMBLE_MAX_ATTEMPTS');
  });

  it('allows the scramble close button to return immediately', () => {
    expect(source).toContain("if (!isWordScramble && this.question?.lockAttemptSessionOnClose)");
    expect(source).toContain("levelScene.events.emit('question:closed'");
    expect(source).toContain("levelScene.events.emit('question:answered'");
    expect(source).toContain("typeof pendingAnswerResult === 'boolean'");
    expect(source).toContain("this.input.on('pointerdown', handleTopControlTap)");
    expect(source).toContain('containsPointer(closeQuestionButton, pointer)');
    expect(source).toContain('blurAnswerInput();');
  });

  it('processes correct and incorrect answers without a long result delay', () => {
    expect(source).toContain("correct ? 'gameOneCorrectAnswer' : 'gameOneIncorrectAnswer'");
    expect(source).toContain('this.time.delayedCall(500, () =>');
    expect(source).not.toContain('this.time.delayedCall(3000, () =>');
    expect(source).not.toContain("'Treasure unlocked!'");
  });

  it('focuses the answer only when its slots are tapped and renders tile text at frame scale', () => {
    expect(source).toContain('answerFocusHotspot = this.add.zone(centerX, answerY, actualAnswerWidth, answerSlotSize)');
    expect(source).toContain('answerFocusHotspot && containsPointer(answerFocusHotspot, pointer)');
    expect(source).toContain("answerInput.style.pointerEvents = 'none'");
    expect(source).toContain('blurAnswerInput();');
    expect(source).toContain("answerInput.style.opacity = '1'");
    expect(source).not.toContain('requestAnimationFrame(() => answerInput.focus())');
    expect(source).not.toContain('this.time.delayedCall(120, () => answerInput.focus())');
    expect(source).toContain('fontSize: fontSize(16, treasureFrameScale)');
  });

  it('uses a bold Hint label and one shared feedback location', () => {
    expect(source).toMatch(/hintHotspotLabel[\s\S]*?fontStyle: 'bold'/);
    expect(source).toContain("this.feedbackText = this.add.text(feedbackX, footerY, '', {");
    expect(source).toContain('hintHotspotLabel.setPosition(panelLeft + (86 * treasureFrameScale), hintButtonY)');
    expect(source).toContain('coinBadgeY + (2 * treasureFrameScale)');
    expect(source).toContain('? Math.round(238 * treasureFrameScale)');
    expect(source).toContain("wordWrap: { width: feedbackWidth, useAdvancedWrap: true }");
    expect(source).toContain('panelLeft + Math.round(309 * treasureFrameScale)');
    expect(source).toContain("submitButton.on('pointerdown', submitWordAnswer)");
    expect(source).toContain('containsPointer(hintHotspot, pointer)');
    expect(source).toContain('hasQuestionFrame ? submitY - (2 * treasureFrameScale) : submitY');
  });

  it('allows up to three hints for a Game 1 question', () => {
    expect(source).toContain('return hints.slice(0, 3)');
    expect(source).toContain('buildQuestionHints(this.question, preparedChoices).slice(0, 3)');
    expect(source).not.toContain('buildQuestionHints(this.question, preparedChoices).slice(0, 2)');
    expect(source).toContain('hints.slice(0, Math.min(3, hints.length))');
    expect(source).toContain("hintHotspotLabel.setText('Hint')");
  });
});
