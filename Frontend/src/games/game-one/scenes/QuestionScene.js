import Phaser from 'phaser';
import { getStudentSfxVolume } from '../../../utils/studentMenuAudio';

const CHOICE_LABEL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PALETTE = Object.freeze({
  overlay: 0x110912,
  modalOverlay: 0x0f172a,
  panelShadow: 0x241224,
  panelBase: 0xf3e6c3,
  panelInner: 0xfcf6e6,
  panelBorder: 0x7e5679,
  panelBorderSoft: 0xa87fa4,
  header: 0x6d496a,
  headerDark: 0x4b2c49,
  headerAccent: 0xf4cc58,
  textDark: '#24151f',
  textSoft: '#654a61',
  promptBg: 0xf7df9b,
  optionBg: 0xfff8eb,
  optionHover: 0xf6e6c7,
  optionShadow: 0xcdb994,
  medallion: 0x6d496a,
  medallionText: '#fff7dc',
  hintButton: 0x6d496a,
  hintButtonDisabled: 0xbcabbc,
  hintCard: 0xf2dca8,
  hintIconBg: 0xf8e9bf,
  hintIconBorder: 0x53324f,
  hintIconActive: 0xf4cc58,
  modalCard: 0xfff7e8,
  modalMuted: '#5f4959',
  success: 0x4d8755,
  successDark: 0x2f6237,
  danger: 0xb85c60,
  dangerDark: 0x86393d,
});

function getChoiceLabelByIndex(index) {
  const normalizedIndex = Number(index);
  if (Number.isInteger(normalizedIndex) && normalizedIndex >= 0 && normalizedIndex < CHOICE_LABEL_ALPHABET.length) {
    return CHOICE_LABEL_ALPHABET[normalizedIndex];
  }
  return String((Number.isInteger(normalizedIndex) ? normalizedIndex : 0) + 1);
}

function stripChoicePrefix(choiceText) {
  if (typeof choiceText !== 'string') {
    return '';
  }

  return choiceText.replace(/^\s*(?:\(?[A-Za-z]\)|[A-Za-z]|\d+)[\)\].:\-]\s*/, '').trim();
}

function normalizeHintCoinCost(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Phaser.Math.Clamp(Math.round(parsed), 0, 3);
}

function formatCoins(amount) {
  const count = Math.max(0, Math.round(Number(amount) || 0));
  return `${count} coin${count === 1 ? '' : 's'}`;
}

function buildQuestionHints(question, choices = []) {
  const authoredHints = Array.isArray(question?.hints)
    ? question.hints
      .map((hint) => (typeof hint === 'string' ? hint.trim() : ''))
      .filter(Boolean)
    : [];

  const topic = typeof question?.topic === 'string' && question.topic.trim()
    ? question.topic.trim()
    : '';
  const choiceCount = Array.isArray(choices) && choices.length ? choices.length : 4;
  const fallbackHints = [
    topic
      ? `Focus on the main idea connected to ${topic}.`
      : 'Read the question again and remove choices that do not fit the prompt.',
    `Compare all ${choiceCount} choices before selecting one.`,
    topic
      ? `Recall how ${topic} behaves when Java runs the code.`
      : 'Connect the question to the lesson clues you collected before answering.',
  ];
  const hints = [...authoredHints];
  fallbackHints.forEach((hint) => {
    if (hints.length < 3 && !hints.includes(hint)) hints.push(hint);
  });
  return hints.slice(0, 3);
}

function fitTextHeight(textObject, maxHeight, minFontSize = 12) {
  const rawFontSize = Number.parseInt(String(textObject.style.fontSize || '16').replace('px', ''), 10);
  let fontSize = Number.isFinite(rawFontSize) ? rawFontSize : 16;

  while (textObject.height > maxHeight && fontSize > minFontSize) {
    fontSize -= 1;
    textObject.setFontSize(fontSize);
  }
}

function getCanvasDisplayScale(sceneWidth, sceneHeight, canvas) {
  const bounds = canvas?.getBoundingClientRect?.();
  const displayWidth = Number(bounds?.width);
  const displayHeight = Number(bounds?.height);

  if (!Number.isFinite(displayWidth) || !Number.isFinite(displayHeight) || displayWidth <= 0 || displayHeight <= 0) {
    return 1;
  }

  return Math.min(displayWidth / Math.max(1, sceneWidth), displayHeight / Math.max(1, sceneHeight));
}

function fontSize(baseSize, scale = 1) {
  return `${Math.round(baseSize * scale)}px`;
}

function fitDomTextGroup(container, entries = [], minGap = 4) {
  if (!container) {
    return;
  }

  const validEntries = entries.filter((entry) => entry?.element);
  if (validEntries.length === 0) {
    return;
  }

  while (
    container.scrollHeight > container.clientHeight
    || container.scrollWidth > container.clientWidth
  ) {
    let changed = false;

    validEntries.forEach(({ element, minSize, step = 1 }) => {
      const currentSize = Number.parseFloat(element.style.fontSize || '0');
      if (Number.isFinite(currentSize) && currentSize > minSize) {
        element.style.fontSize = `${Math.max(minSize, currentSize - step)}px`;
        changed = true;
      }
    });

    const currentGap = Number.parseFloat(container.style.gap || '0');
    if (Number.isFinite(currentGap) && currentGap > minGap) {
      container.style.gap = `${Math.max(minGap, currentGap - 1)}px`;
      changed = true;
    }

    if (!changed) {
      break;
    }
  }
}

function resetTextFontSize(textObject, nextFontSize) {
  if (!textObject) {
    return;
  }

  textObject.setFontSize(nextFontSize);
}

function parsePromptContent(promptSource) {
  const lines = String(promptSource || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return {
      title: '',
      body: lines[0] || 'Solve the challenge.',
    };
  }

  return {
    title: lines[0],
    body: lines.slice(1).join('\n'),
  };
}

function addDiamond(scene, x, y, size, color, strokeColor = null) {
  const diamond = scene.add.rectangle(x, y, size, size, color, 1).setAngle(45);
  if (strokeColor !== null) {
    diamond.setStrokeStyle(2, strokeColor, 1);
  }
  return diamond;
}

function addRoundedPanel(scene, x, y, width, height, radius, fillColor, fillAlpha = 1, strokeColor = null, strokeWidth = 0) {
  const graphics = scene.add.graphics();
  graphics.fillStyle(fillColor, fillAlpha);
  graphics.fillRoundedRect(x - (width / 2), y - (height / 2), width, height, radius);
  if (strokeColor !== null && strokeWidth > 0) {
    graphics.lineStyle(strokeWidth, strokeColor, 1);
    graphics.strokeRoundedRect(x - (width / 2), y - (height / 2), width, height, radius);
  }
  return graphics;
}

export default class QuestionScene extends Phaser.Scene {
  constructor() {
    super('QuestionScene');
  }

  init(data) {
    this.question = data.question;
    this.questionId = data.questionId;
    this.hasAnswered = false;
    this.hintIndex = Math.max(0, Math.round(Number(data.revealedHintCount) || 0));
    this.hintCoinCost = normalizeHintCoinCost(data.hintCoinCost ?? data.hintStarCost);
    this.availableCoins = Math.max(0, Math.round(Number(data.availableCoins) || 0));
  }

  create() {
    const sceneWidth = this.scale.width;
    const sceneHeight = this.scale.height;
    const centerX = sceneWidth / 2;
    const centerY = sceneHeight / 2;
    const cleanupHandlers = [];

    const rawChoices = Array.isArray(this.question?.choices) ? this.question.choices : [];
    const questionModeText = [this.question?.formattedQuestion, this.question?.prompt]
      .filter((value) => typeof value === 'string')
      .join('\n');
    const legacyJumbledWordMatch = questionModeText.match(/jumbled\s+word\s*:\s*([a-z]+)/i);
    const isWordScramble = this.question?.challengeType === 'WORD_SCRAMBLE'
      || Boolean(this.question?.jumbledWord)
      || Boolean(legacyJumbledWordMatch);
    const normalizedChoices = rawChoices.length >= 2 ? rawChoices : ['Option A', 'Option B', 'Option C', 'Option D'];
    const preparedChoices = normalizedChoices.map((choice, index) => {
      const label = getChoiceLabelByIndex(index);
      const rawChoice = typeof choice === 'string' ? choice : String(choice ?? '');
      const cleanedChoice = stripChoicePrefix(rawChoice.trim());
      return {
        label,
        text: cleanedChoice || `Option ${label}`,
      };
    });

    const hints = buildQuestionHints(this.question, preparedChoices).slice(0, 3);
    const choiceCount = isWordScramble ? 2 : preparedChoices.length;
    const displayScale = getCanvasDisplayScale(sceneWidth, sceneHeight, this.game.canvas);
    const uiScale = Phaser.Math.Clamp(0.92 / Math.max(displayScale, 0.6), 0.96, 1.18);
    const rawPromptSource = typeof this.question?.formattedQuestion === 'string' && this.question.formattedQuestion.trim()
      ? this.question.formattedQuestion.trim()
      : (typeof this.question?.prompt === 'string' && this.question.prompt.trim()
        ? this.question.prompt.trim()
        : 'Solve the challenge.');
    const promptSource = rawPromptSource
      .replace(/\n?\s*jumbled\s+word\s*:\s*[a-z]+\s*/ig, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    const { title: promptTitle, body: promptBody } = parsePromptContent(promptSource);
    const displayPromptTitle = isWordScramble ? 'FINAL TREASURE RIDDLE' : promptTitle;

    const wordScrambleAspect = 608 / 391;
    const panelWidth = isWordScramble
      ? Math.min(sceneWidth - 28, (sceneHeight - 20) * wordScrambleAspect, 1100)
      : Math.min(sceneWidth - 28, 1100);
    const panelHeight = isWordScramble
      ? panelWidth / wordScrambleAspect
      : Math.min(sceneHeight - 20, 660);
    const panelLeft = centerX - (panelWidth / 2);
    const panelRight = centerX + (panelWidth / 2);
    const panelTop = centerY - (panelHeight / 2);
    const panelBottom = centerY + (panelHeight / 2);
    // The treasure artwork is authored at 608x391. Position its overlay
    // content in that coordinate system so scaling cannot cause text drift.
    const treasureFrameScale = panelWidth / 608;
    const treasureY = (sourceY) => panelTop + (sourceY * treasureFrameScale);
    const innerInset = Math.round((isWordScramble ? 72 : 34) * uiScale);
    const innerLeft = panelLeft + innerInset;
    const innerRight = panelRight - innerInset;
    const innerWidth = innerRight - innerLeft;
    const optionHeight = Math.round((choiceCount >= 6 ? 42 : (choiceCount >= 5 ? 48 : 54)) * uiScale);
    const optionGap = Math.round((choiceCount >= 6 ? 8 : 12) * uiScale);
    const optionsTotalHeight = (choiceCount * optionHeight) + ((choiceCount - 1) * optionGap);
    const topControlsY = panelTop + Math.round((isWordScramble ? 42 : 28) * uiScale);
    const headerY = panelTop + Math.round(82 * uiScale);
    const headerHeight = Math.round(54 * uiScale);
    const headerBottom = headerY + (headerHeight / 2);
    const promptTop = headerBottom + Math.round(16 * uiScale);
    const preferredPromptHeight = Math.round((choiceCount >= 6 ? 116 : (choiceCount >= 5 ? 136 : 158)) * uiScale);
    const promptBoxHeight = preferredPromptHeight;
    const promptBoxY = promptTop + (promptBoxHeight / 2);
    const optionsTop = promptTop + promptBoxHeight + Math.round(20 * uiScale);
    const optionsBottom = optionsTop + optionsTotalHeight;
    const promptViewportWidth = innerWidth - Math.round(42 * uiScale);
    const promptViewportHeight = isWordScramble
      ? Math.round(72 * treasureFrameScale)
      : promptBoxHeight - Math.round(16 * uiScale);
    const promptViewportTop = isWordScramble
      ? treasureY(122)
      : promptBoxY - (promptBoxHeight / 2) + Math.round(8 * uiScale);
    const promptBounds = new Phaser.Geom.Rectangle(
      centerX - (promptViewportWidth / 2),
      promptViewportTop,
      promptViewportWidth,
      promptViewportHeight,
    );

    // Blur only the scenes underneath this modal. The question artwork and
    // all of its text remain on this camera, so they stay perfectly sharp.
    if (this.game.renderer?.type === Phaser.WEBGL) {
      this.scene.manager.getScenes(true).forEach((activeScene) => {
        if (activeScene === this) return;
        activeScene.cameras.cameras.forEach((camera) => {
          if (!camera.postFX?.addBlur) return;
          const blurEffect = camera.postFX.addBlur(0, 2, 2, 1, 0xffffff, 4);
          cleanupHandlers.push(() => camera.postFX?.remove(blurEffect));
        });
      });
    }

    this.add.rectangle(centerX, centerY, sceneWidth, sceneHeight, PALETTE.overlay, 0.78).setInteractive();
    const hasQuestionFrame = isWordScramble && this.textures.exists('game-one-ui-question-frame');
    if (hasQuestionFrame) {
      this.add.image(centerX, centerY, 'game-one-ui-question-frame')
        .setDisplaySize(panelWidth, panelHeight);
    } else if (isWordScramble && this.textures.exists('game-one-treasure-jb-background')) {
      const panelRadius = Math.round(34 * uiScale);
      addRoundedPanel(this, centerX + 10, centerY + 13, panelWidth - 8, panelHeight - 8, panelRadius, 0x160b05, 0.45);
      this.add.image(centerX, centerY, 'game-one-treasure-jb-background').setDisplaySize(panelWidth, panelHeight);
    } else {
      this.add.rectangle(centerX + 12, centerY + 14, panelWidth + 18, panelHeight + 18, PALETTE.panelShadow, 0.34);
      this.add.rectangle(centerX, centerY, panelWidth, panelHeight, PALETTE.panelBase, 1).setStrokeStyle(4, PALETTE.panelBorder, 1);
      this.add.rectangle(centerX, centerY, panelWidth - 22, panelHeight - 22, PALETTE.panelInner, 1).setStrokeStyle(2, PALETTE.panelBorderSoft, 1);
    }

    const headerWidth = panelWidth - Math.round(42 * uiScale);
    const challengeHeaderColor = isWordScramble ? 0x6b371e : PALETTE.header;
    const challengeBorderColor = isWordScramble ? 0x3f2112 : PALETTE.headerDark;
    const challengeAccentColor = isWordScramble ? 0xe0a73a : PALETTE.headerAccent;
    if (isWordScramble) {
      if (!hasQuestionFrame) addRoundedPanel(this, centerX, headerY, headerWidth, headerHeight, 14, challengeHeaderColor, 0.92, challengeBorderColor, 2);
    } else {
      this.add.rectangle(centerX, headerY, headerWidth, headerHeight, challengeHeaderColor, 1)
        .setStrokeStyle(2, challengeBorderColor, 1);
    }
    if (!hasQuestionFrame) {
      addDiamond(this, panelLeft + Math.round((isWordScramble ? 78 : 34) * uiScale), headerY, Math.round(12 * uiScale), challengeAccentColor);
      addDiamond(this, panelRight - Math.round((isWordScramble ? 78 : 34) * uiScale), headerY, Math.round(12 * uiScale), challengeAccentColor);
    }

    const headerKickerY = hasQuestionFrame ? treasureY(39) : headerY - Math.round(6 * uiScale);
    const headerTitleY = hasQuestionFrame ? treasureY(60) : headerY + Math.round(12 * uiScale);
    this.add.text(centerX, headerKickerY, isWordScramble ? 'Java Treasure' : 'Question Challenge', {
      fontFamily: 'PixelOperator8, monospace',
      fontSize: fontSize(hasQuestionFrame ? 8 : 13, hasQuestionFrame ? treasureFrameScale : uiScale),
      fontStyle: 'bold',
      color: isWordScramble ? '#ffe7a3' : '#fff7e2',
      align: 'center',
      stroke: isWordScramble ? '#31551f' : undefined,
      strokeThickness: isWordScramble ? Math.max(1, Math.round(treasureFrameScale)) : 0,
    }).setOrigin(0.5);

    this.add.text(centerX, headerTitleY, isWordScramble ? 'Unscramble the final answer' : 'Select the best answer', {
      fontFamily: 'PixelOperator8, monospace',
      fontSize: fontSize(hasQuestionFrame ? 10 : 20, hasQuestionFrame ? treasureFrameScale : uiScale),
      fontStyle: 'bold',
      color: isWordScramble ? '#fff3ce' : '#fff0c9',
      align: 'center',
      stroke: isWordScramble ? '#8b3d1c' : undefined,
      strokeThickness: isWordScramble ? Math.max(1, Math.round(treasureFrameScale)) : 0,
    }).setOrigin(0.5);

    const coinBadgeWidth = Math.round(hasQuestionFrame ? 82 * treasureFrameScale : 148 * uiScale);
    const coinBadgeHeight = Math.round(hasQuestionFrame ? 34 * treasureFrameScale : 30 * uiScale);
    const closeButtonWidth = Math.round(hasQuestionFrame ? 66 * treasureFrameScale : 96 * uiScale);
    const closeButtonHeight = Math.round(hasQuestionFrame ? 62 * treasureFrameScale : 28 * uiScale);
    const topControlGap = Math.round(20 * uiScale);
    const closeQuestionX = hasQuestionFrame
      ? panelLeft + (575 * treasureFrameScale)
      : innerRight - (closeButtonWidth / 2);
    const coinBadgeY = hasQuestionFrame ? treasureY(64) : topControlsY;
    const coinBadgeX = hasQuestionFrame
      ? panelLeft + (493 * treasureFrameScale)
      : closeQuestionX - (closeButtonWidth / 2) - topControlGap - (coinBadgeWidth / 2);

    if (isWordScramble) {
      if (!hasQuestionFrame) addRoundedPanel(this, coinBadgeX, coinBadgeY, coinBadgeWidth, coinBadgeHeight, 9, 0xf4d58a, 1, challengeBorderColor, 2);
    } else {
      this.add.rectangle(coinBadgeX, coinBadgeY, coinBadgeWidth, coinBadgeHeight, 0xfdf4de, 1)
        .setStrokeStyle(2, PALETTE.headerDark, 1);
    }
    const coinBalanceLabel = this.add.text(coinBadgeX, coinBadgeY, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(hasQuestionFrame ? 10 : 22, hasQuestionFrame ? treasureFrameScale : uiScale),
      fontStyle: 'normal',
      color: hasQuestionFrame ? '#ffffff' : (isWordScramble ? '#4b2816' : PALETTE.textDark),
      stroke: hasQuestionFrame ? '#4b2816' : undefined,
      strokeThickness: hasQuestionFrame ? Math.max(1, Math.round(treasureFrameScale)) : 0,
    }).setOrigin(0.5);
    // The coin icon is painted into the left side of the artwork. Center the
    // balance inside the remaining text area instead of over the icon.
    if (hasQuestionFrame) {
      coinBalanceLabel.setPosition(
        panelLeft + (497 * treasureFrameScale),
        coinBadgeY + (2 * treasureFrameScale),
      );
    }

    const closeQuestionButton = this.add.rectangle(
      closeQuestionX,
      coinBadgeY,
      closeButtonWidth,
      closeButtonHeight,
      isWordScramble ? 0xe7bd68 : 0xefe3c3,
      hasQuestionFrame ? 0.001 : 1,
    ).setStrokeStyle(2, isWordScramble ? challengeBorderColor : PALETTE.panelBorder, hasQuestionFrame ? 0 : 1)
      .setInteractive({ useHandCursor: true })
      .setDepth(hasQuestionFrame ? 50 : 0);
    const closeQuestionLabel = this.add.text(closeQuestionButton.x, closeQuestionButton.y, hasQuestionFrame ? '' : 'Close', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(hasQuestionFrame ? 30 : 20, uiScale),
      color: isWordScramble ? '#4b2816' : PALETTE.textDark,
    }).setOrigin(0.5);

    if (isWordScramble) {
      if (!hasQuestionFrame) addRoundedPanel(this, centerX, promptBoxY, innerWidth, promptBoxHeight, 18, 0xffefbd, 0.72, 0x7b4823, 3);
    } else {
      this.add.rectangle(centerX, promptBoxY, innerWidth, promptBoxHeight, PALETTE.promptBg, 1)
        .setStrokeStyle(3, PALETTE.panelBorder, 1);
    }
    const promptPaddingX = Math.round(26 * uiScale);
    const promptPaddingY = Math.round(4 * uiScale);
    const promptTextWidth = Math.round(isWordScramble && hasQuestionFrame
      ? 330 * treasureFrameScale
      : promptViewportWidth - (promptPaddingX * 2));
    const promptTextHeight = Math.round(promptViewportHeight - (promptPaddingY * 2));
    const promptTextLeft = Math.round(isWordScramble && hasQuestionFrame
      ? centerX - (promptTextWidth / 2)
      : promptBounds.x + promptPaddingX);
    const promptTextTop = Math.round(isWordScramble && hasQuestionFrame
      ? treasureY(125)
      : promptViewportTop + promptPaddingY);
    const promptDomWrapper = document.createElement('div');
    promptDomWrapper.style.width = `${promptTextWidth}px`;
    promptDomWrapper.style.height = `${promptTextHeight}px`;
    promptDomWrapper.style.display = 'flex';
    promptDomWrapper.style.justifyContent = 'center';
    promptDomWrapper.style.alignItems = 'flex-start';
    promptDomWrapper.style.overflow = 'hidden';
    promptDomWrapper.style.overflowWrap = 'anywhere';
    promptDomWrapper.style.pointerEvents = 'none';
    promptDomWrapper.style.boxSizing = 'border-box';
    promptDomWrapper.style.background = 'transparent';

    const promptDomContent = document.createElement('div');
    promptDomContent.style.width = '100%';
    promptDomContent.style.maxWidth = '100%';
    promptDomContent.style.display = 'flex';
    promptDomContent.style.flexDirection = 'column';
    promptDomContent.style.alignItems = 'center';
    promptDomContent.style.gap = `${Math.round(10 * uiScale)}px`;
    promptDomContent.style.color = PALETTE.textDark;
    promptDomContent.style.fontFamily = 'Manrope, Arial, sans-serif';
    promptDomContent.style.textAlign = 'center';
    promptDomContent.style.justifyContent = 'flex-start';

    let promptDomTitle = null;
    if (displayPromptTitle && !(isWordScramble && hasQuestionFrame)) {
      promptDomTitle = document.createElement('div');
      promptDomTitle.textContent = displayPromptTitle;
      promptDomTitle.style.fontFamily = 'PixelOperator8, monospace';
      promptDomTitle.style.fontSize = `${Math.round(20 * uiScale)}px`;
      promptDomTitle.style.fontWeight = '700';
      promptDomTitle.style.lineHeight = '1.25';
      promptDomTitle.style.color = '#231821';
      promptDomTitle.style.letterSpacing = '0';
      promptDomTitle.style.textAlign = 'center';
      promptDomContent.appendChild(promptDomTitle);
    }

    if (displayPromptTitle && isWordScramble && hasQuestionFrame) {
      this.add.text(centerX, treasureY(105), displayPromptTitle.toUpperCase(), {
        fontFamily: 'PixelOperator8, monospace',
        fontSize: fontSize(11, treasureFrameScale),
        fontStyle: 'bold',
        color: '#fff8dc',
        stroke: '#244b27',
        strokeThickness: Math.max(1, Math.round(treasureFrameScale)),
        align: 'center',
      }).setOrigin(0.5);
    }

    const promptDomBody = document.createElement('div');
    promptDomBody.textContent = isWordScramble && hasQuestionFrame
      ? promptBody.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((line) => line.trim()).join('\n') || promptBody
      : promptBody;
    promptDomBody.style.fontSize = `${Math.round(isWordScramble && hasQuestionFrame
      ? 13 * treasureFrameScale
      : 20 * uiScale)}px`;
    promptDomBody.style.fontWeight = '400';
    promptDomBody.style.lineHeight = '1.35';
    promptDomBody.style.color = PALETTE.textDark;
    promptDomBody.style.whiteSpace = 'pre-wrap';
    promptDomBody.style.wordBreak = 'break-word';
    promptDomBody.style.textAlign = 'center';
    promptDomContent.appendChild(promptDomBody);

    promptDomWrapper.appendChild(promptDomContent);

    const promptText = isWordScramble && hasQuestionFrame
      ? this.add.text(centerX, treasureY(145), promptBody || 'Use the clues to identify the Java term.', {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: fontSize(13, treasureFrameScale),
        fontStyle: 'normal',
        color: '#4b2816',
        align: 'center',
        wordWrap: { width: promptTextWidth, useAdvancedWrap: true },
        lineSpacing: Math.max(1, Math.round(2 * treasureFrameScale)),
      }).setOrigin(0.5, 0)
      : this.add.dom(promptTextLeft, promptTextTop, promptDomWrapper).setOrigin(0, 0);
    const fitPromptText = () => fitDomTextGroup(promptDomWrapper, [
      promptDomTitle ? { element: promptDomTitle, minSize: Math.round(13 * uiScale), step: 1 } : null,
      {
        element: promptDomBody,
        minSize: Math.round((isWordScramble && hasQuestionFrame ? 9 : 12) * (isWordScramble && hasQuestionFrame ? treasureFrameScale : uiScale)),
        step: 1,
      },
    ], 4);
    if (!(isWordScramble && hasQuestionFrame)) fitPromptText();
    const promptFitFrame = window.requestAnimationFrame(() => {
      if (!(isWordScramble && hasQuestionFrame)) fitPromptText();
    });
    cleanupHandlers.push(() => window.cancelAnimationFrame(promptFitFrame));

    const feedbackWidth = isWordScramble && hasQuestionFrame
      ? Math.round(238 * treasureFrameScale)
      : innerWidth - Math.round(56 * uiScale);
    const feedbackHeight = isWordScramble && hasQuestionFrame
      ? Math.round(30 * treasureFrameScale)
      : Math.round(90 * uiScale);
    const footerY = isWordScramble
      ? treasureY(356)
      : Math.min(
        panelBottom - (feedbackHeight / 2) - Math.round(8 * uiScale),
        optionsBottom + Math.round(12 * uiScale) + (feedbackHeight / 2),
      );
    // The reference footer starts every status line immediately after the
    // bulb. A fixed left edge keeps Hint, Correct, and Incorrect aligned.
    const feedbackX = isWordScramble && hasQuestionFrame
      ? panelLeft + Math.round(309 * treasureFrameScale)
      : centerX;
    this.feedbackText = this.add.text(feedbackX, footerY, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(
        isWordScramble && hasQuestionFrame ? 8.5 : 16,
        isWordScramble && hasQuestionFrame ? treasureFrameScale : uiScale,
      ),
      fontStyle: 'normal',
      color: PALETTE.textDark,
      align: 'center',
      wordWrap: { width: feedbackWidth, useAdvancedWrap: true },
      lineSpacing: 1,
      fixedWidth: feedbackWidth,
      fixedHeight: feedbackHeight,
      padding: { left: 2, right: 2, top: 1, bottom: 1 },
    }).setOrigin(0.5).setVisible(false).setDepth(51);

    const showFeedback = (message, color = PALETTE.textDark) => {
      this.feedbackText
        .setColor(color)
        .setText(message || '')
        .setVisible(Boolean(message));
      if (message) fitTextHeight(
        this.feedbackText,
        feedbackHeight - 2,
        Math.max(7, Math.round(6 * (isWordScramble && hasQuestionFrame ? treasureFrameScale : uiScale))),
      );
    };

    const purchasableHints = hints.slice(0, Math.min(3, hints.length));
    const hasHintsAvailable = purchasableHints.length > 0;
    const hintButtonWidth = Math.round(hasQuestionFrame ? 108 * treasureFrameScale : 78 * uiScale);
    const hintButtonHeight = Math.round(hasQuestionFrame ? 48 * treasureFrameScale : 34 * uiScale);
    const hintButtonX = hasQuestionFrame
      ? panelLeft + (86 * treasureFrameScale)
      : innerLeft + Math.round(26 * uiScale);
    const hintButtonY = hasQuestionFrame ? treasureY(64) : topControlsY;
    const hintHotspot = this.add.rectangle(hintButtonX, hintButtonY, hintButtonWidth, hintButtonHeight, isWordScramble ? 0xe7bd68 : PALETTE.hintIconBg, 1)
      .setStrokeStyle(2, isWordScramble ? challengeBorderColor : PALETTE.hintIconBorder, 1)
      .setInteractive({ useHandCursor: true });
    const hintHotspotInner = this.add.rectangle(
      hintButtonX,
      hintButtonY,
      hintButtonWidth - Math.round(20 * uiScale),
      hintButtonHeight - Math.round(14 * uiScale),
      isWordScramble ? 0xf6d98b : PALETTE.hintIconActive,
      hasQuestionFrame ? 0.001 : 1
    );
    const hintHotspotLabel = this.add.text(hintButtonX, hintButtonY + 1, 'Hint', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(hasQuestionFrame ? 13 : 11, hasQuestionFrame ? treasureFrameScale : uiScale),
      fontStyle: 'bold',
      color: isWordScramble ? '#4b2816' : PALETTE.textDark,
      stroke: hasQuestionFrame ? '#f6d98b' : undefined,
      strokeThickness: hasQuestionFrame ? Math.max(1, Math.round(0.7 * treasureFrameScale)) : 0,
    }).setOrigin(0.5);
    if (hasQuestionFrame) {
      hintHotspot.setAlpha(0.001);
      hintHotspotInner.setAlpha(0.001);
      // Keep the label centered in the clear area to the right of the bulb.
      hintHotspotLabel.setPosition(panelLeft + (105 * treasureFrameScale), hintButtonY);
    }

    const hintOverlayBackdrop = this.add.rectangle(centerX, centerY, sceneWidth, sceneHeight, PALETTE.modalOverlay, 0.82)
      .setVisible(false)
      .setDepth(60)
      .setInteractive();
    const hintJournalContainer = this.add.container(0, 0).setVisible(false).setDepth(61);
    const hintJournalWidth = Math.min(panelWidth - Math.round(72 * uiScale), Math.round(560 * uiScale));
    const hintJournalHeight = Math.round(388 * uiScale);
    const hintJournalY = centerY + Math.round(14 * uiScale);
    const hintJournalTop = hintJournalY - (hintJournalHeight / 2);
    const hintJournalBottom = hintJournalY + (hintJournalHeight / 2);
    const hintJournalInnerPadding = Math.round(22 * uiScale);
    const hintJournalBodyWidth = Math.max(Math.round(220 * uiScale), hintJournalWidth - Math.round(166 * uiScale));
    const hintJournalBodyHeight = Math.round(180 * uiScale);
    const hintJournalBodyY = hintJournalTop + Math.round(196 * uiScale);
    const hintJournalBodyMaxHeight = hintJournalBodyHeight - (hintJournalInnerPadding * 2);
    const hintJournalBodyTextWidth = hintJournalBodyWidth - (hintJournalInnerPadding * 2);
    const hintJournalBodyTop = hintJournalBodyY - (hintJournalBodyHeight / 2) + hintJournalInnerPadding;
    const hintJournalFootnoteY = hintJournalBottom - Math.round(104 * uiScale);
    const hintJournalBg = this.add.rectangle(centerX, hintJournalY, hintJournalWidth, hintJournalHeight, PALETTE.modalCard, 1)
      .setStrokeStyle(3, PALETTE.panelBorder, 1);
    const hintJournalHeader = this.add.rectangle(centerX, hintJournalTop + Math.round(30 * uiScale), hintJournalWidth - Math.round(14 * uiScale), Math.round(42 * uiScale), PALETTE.header, 1)
      .setStrokeStyle(2, PALETTE.headerDark, 1);
    const hintJournalTitle = this.add.text(centerX, hintJournalTop + Math.round(28 * uiScale), 'Hint Journal', {
      fontFamily: 'PixelOperator8, monospace',
      fontSize: fontSize(11, uiScale),
      fontStyle: 'bold',
      color: '#fff7e2',
      align: 'center',
    }).setOrigin(0.5);
    const hintJournalSubtitle = this.add.text(centerX, hintJournalTop + Math.round(82 * uiScale), '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(16, uiScale),
      fontStyle: 'normal',
      color: PALETTE.modalMuted,
      align: 'center',
    }).setOrigin(0.5);
    const hintJournalBody = this.add.rectangle(centerX, hintJournalBodyY, hintJournalBodyWidth, hintJournalBodyHeight, PALETTE.hintCard, 1)
      .setStrokeStyle(3, PALETTE.headerDark, 0.8);
    const hintJournalText = this.add.text(centerX - (hintJournalBodyWidth / 2) + hintJournalInnerPadding, hintJournalBodyTop, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(18, uiScale),
      fontStyle: 'normal',
      color: PALETTE.textDark,
      wordWrap: { width: hintJournalBodyTextWidth },
      lineSpacing: Math.round(5 * uiScale),
    }).setOrigin(0, 0);
    const hintJournalFootnote = this.add.text(centerX - (hintJournalWidth / 2) + hintJournalInnerPadding, hintJournalFootnoteY, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(15, uiScale),
      fontStyle: 'normal',
      color: PALETTE.modalMuted,
      wordWrap: { width: hintJournalWidth - (hintJournalInnerPadding * 2) },
      lineSpacing: Math.round(3 * uiScale),
    }).setOrigin(0, 0);
    const hintNavRadius = Math.round(18 * uiScale);
    const hintPrevButton = this.add.circle(
      centerX - (hintJournalBodyWidth / 2) - Math.round(26 * uiScale),
      hintJournalBodyY,
      hintNavRadius,
      PALETTE.header,
      1,
    ).setStrokeStyle(2, PALETTE.headerDark, 1)
      .setInteractive({ useHandCursor: true });
    const hintPrevLabel = this.add.text(hintPrevButton.x, hintPrevButton.y, '<', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(32, uiScale),
      color: '#fff7e2',
    }).setOrigin(0.5);
    const hintNextButton = this.add.circle(
      centerX + (hintJournalBodyWidth / 2) + Math.round(26 * uiScale),
      hintJournalBodyY,
      hintNavRadius,
      PALETTE.header,
      1,
    ).setStrokeStyle(2, PALETTE.headerDark, 1)
      .setInteractive({ useHandCursor: true });
    const hintNextLabel = this.add.text(hintNextButton.x, hintNextButton.y, '>', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(32, uiScale),
      color: '#fff7e2',
    }).setOrigin(0.5);
    const createModalButton = (x, y, width, labelText, fillColor, textColor, strokeColor = PALETTE.headerDark) => {
      const button = this.add.rectangle(x, y, width, Math.round(36 * uiScale), fillColor, 1)
        .setStrokeStyle(2, strokeColor, 1)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, labelText, {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: fontSize(14, uiScale),
        color: textColor,
      }).setOrigin(0.5);
      return { button, label };
    };
    const closeJournal = createModalButton(
      centerX - Math.round(102 * uiScale),
      hintJournalBottom - Math.round(28 * uiScale),
      Math.round(126 * uiScale),
      'Close',
      0xefe3c3,
      PALETTE.textDark,
      PALETTE.panelBorder,
    );
    const buyHintButton = createModalButton(
      centerX + Math.round(102 * uiScale),
      hintJournalBottom - Math.round(28 * uiScale),
      Math.round(234 * uiScale),
      '',
      PALETTE.hintButton,
      '#fff7dc',
      PALETTE.headerDark,
    );
    hintJournalContainer.add([
      hintJournalBg,
      hintJournalHeader,
      hintJournalTitle,
      hintJournalSubtitle,
      hintJournalBody,
      hintJournalText,
      hintJournalFootnote,
      hintPrevButton,
      hintPrevLabel,
      hintNextButton,
      hintNextLabel,
      closeJournal.button,
      closeJournal.label,
      buyHintButton.button,
      buyHintButton.label,
    ]);

    const hintConfirmContainer = this.add.container(0, 0).setVisible(false).setDepth(62);
    const hintConfirmWidth = Math.min(panelWidth - Math.round(220 * uiScale), Math.round(380 * uiScale));
    const hintConfirmHeight = Math.round(178 * uiScale);
    const hintConfirmY = centerY - Math.round(16 * uiScale);
    const hintConfirmBg = this.add.rectangle(centerX, hintConfirmY, hintConfirmWidth, hintConfirmHeight, PALETTE.modalCard, 1)
      .setStrokeStyle(3, PALETTE.panelBorder, 1);
    const hintConfirmTitle = this.add.text(centerX, hintConfirmY - Math.round(42 * uiScale), 'Unlock Hint?', {
      fontFamily: 'PixelOperator8, monospace',
      fontSize: fontSize(11, uiScale),
      color: PALETTE.textDark,
      align: 'center',
    }).setOrigin(0.5);
    const hintConfirmText = this.add.text(centerX, hintConfirmY - Math.round(2 * uiScale), '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(16, uiScale),
      color: PALETTE.textDark,
      align: 'center',
      wordWrap: { width: hintConfirmWidth - Math.round(44 * uiScale) },
      lineSpacing: Math.round(4 * uiScale),
    }).setOrigin(0.5);
    const cancelHintConfirm = createModalButton(
      centerX - Math.round(70 * uiScale),
      hintConfirmY + Math.round(46 * uiScale),
      Math.round(110 * uiScale),
      'Cancel',
      0xefe3c3,
      PALETTE.textDark,
      PALETTE.panelBorder,
    );
    const acceptHintConfirm = createModalButton(
      centerX + Math.round(70 * uiScale),
      hintConfirmY + Math.round(46 * uiScale),
      Math.round(120 * uiScale),
      'Unlock',
      PALETTE.hintButton,
      '#fff7dc',
      PALETTE.headerDark,
    );
    hintConfirmContainer.add([
      hintConfirmBg,
      hintConfirmTitle,
      hintConfirmText,
      cancelHintConfirm.button,
      cancelHintConfirm.label,
      acceptHintConfirm.button,
      acceptHintConfirm.label,
    ]);

    let pendingHintPurchase = false;
    let pendingAnswerResult = null;
    let questionResultSent = false;
    const hideHintOverlays = () => {
      pendingHintPurchase = false;
      hintOverlayBackdrop.setVisible(false);
      hintJournalContainer.setVisible(false);
      hintConfirmContainer.setVisible(false);
    };
    const closeQuestionScene = () => {
      if (!isWordScramble && this.question?.lockAttemptSessionOnClose) {
        showFeedback('Complete this treasure attempt session before closing.', PALETTE.textSoft);
        return;
      }

      hideHintOverlays();
      this.hasAnswered = true;
      if (questionResultSent) return;
      questionResultSent = true;
      const levelScene = this.scene.get('LevelScene');
      if (typeof pendingAnswerResult === 'boolean') {
        levelScene.events.emit('question:answered', {
          questionId: this.questionId,
          correct: pendingAnswerResult,
        });
      } else {
        levelScene.events.emit('question:closed', {
          questionId: this.questionId,
        });
      }
      this.scene.stop();
    };
    const closeQuestionKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    if (closeQuestionKey) {
      const closeQuestionKeyHandler = () => {
        closeQuestionScene();
      };
      closeQuestionKey.on('down', closeQuestionKeyHandler);
      cleanupHandlers.push(() => closeQuestionKey.off('down', closeQuestionKeyHandler));
    }
    const getRevealedHints = () => purchasableHints.slice(0, this.hintIndex);
    const canPurchaseAnotherHint = () => !this.hasAnswered && this.hintIndex < purchasableHints.length;
    const canAffordAnotherHint = () => this.hintCoinCost <= 0 || this.availableCoins >= this.hintCoinCost;
    const showLatestHintFeedback = () => {
      const revealedHints = getRevealedHints();
      const latestHint = revealedHints[revealedHints.length - 1];
      if (latestHint) {
        showFeedback(`Hint: ${latestHint}`, PALETTE.textDark);
      }
    };
    const unlockNextHint = () => {
      if (!canPurchaseAnotherHint()) {
        if (this.hintIndex > 0) {
          showLatestHintFeedback();
        } else {
          showFeedback('All available hints are already unlocked.', PALETTE.textSoft);
        }
        updateHintButtonState();
        return;
      }
      if (!canAffordAnotherHint()) {
        showFeedback(`Need ${formatCoins(this.hintCoinCost)} for the next hint.`, '#8f4040');
        updateHintButtonState();
        return;
      }
      if (this.hintCoinCost > 0) {
        this.availableCoins = Math.max(0, this.availableCoins - this.hintCoinCost);
      }
      this.hintIndex += 1;
      const levelScene = this.scene.get('LevelScene');
      levelScene.events.emit('question:hintPurchased', {
        questionId: this.questionId,
        hintIndex: this.hintIndex,
        hintCoinCost: this.hintCoinCost,
        hintStarCost: this.hintCoinCost,
      });
      updateHintButtonState();
      showLatestHintFeedback();
    };
    const openHintConfirmation = () => {
      if (!hasHintsAvailable) {
        showFeedback('This question does not have extra hints yet.', PALETTE.textSoft);
        return;
      }
      if (!canPurchaseAnotherHint()) {
        showFeedback('All available hints are already unlocked.', PALETTE.textSoft);
        return;
      }
      pendingHintPurchase = true;
      hintOverlayBackdrop.setVisible(true);
      hintJournalContainer.setVisible(false);
      hintConfirmContainer.setVisible(true);
      hintConfirmText.setText(
        this.hintCoinCost > 0
          ? `Spend ${formatCoins(this.hintCoinCost)} to unlock hint ${this.hintIndex + 1}/${purchasableHints.length}?`
          : `Unlock hint ${this.hintIndex + 1}/${purchasableHints.length}?`,
      );
      fitTextHeight(hintConfirmText, Math.round(56 * uiScale), 14);
    };
    const openHintJournal = () => {
      const revealedHints = getRevealedHints();
      hintOverlayBackdrop.setVisible(true);
      hintConfirmContainer.setVisible(false);
      hintJournalContainer.setVisible(true);
      hintJournalSubtitle.setText(
        revealedHints.length
          ? `${revealedHints.length}/${purchasableHints.length} hints unlocked`
          : 'No hints unlocked yet',
      );
      fitTextHeight(hintJournalSubtitle, Math.round(28 * uiScale), 10);
      const journalBody = revealedHints.length
        ? revealedHints.map((hint, index) => `Hint ${index + 1}\n${hint}`).join('\n\n')
        : 'Hints help without revealing the answer. Unlock one to get a nudge in the right direction.';
      hintJournalText.setText(journalBody);
      fitTextHeight(hintJournalText, hintJournalBodyMaxHeight, 14);
      if (canPurchaseAnotherHint()) {
        buyHintButton.button.setVisible(true);
        buyHintButton.label.setVisible(true);
        buyHintButton.button.setFillStyle(canAffordAnotherHint() ? PALETTE.hintButton : PALETTE.hintButtonDisabled, 1);
        buyHintButton.button.setStrokeStyle(2, canAffordAnotherHint() ? PALETTE.headerDark : PALETTE.panelBorderSoft, 1);
        buyHintButton.label.setColor(canAffordAnotherHint() ? '#fff7dc' : '#f5efe6');
        buyHintButton.label.setText(
          this.hintCoinCost > 0
            ? `Unlock Hint ${this.hintIndex + 1} (${formatCoins(this.hintCoinCost)})`
            : `Unlock Hint ${this.hintIndex + 1}`,
        );
        fitTextHeight(buyHintButton.label, Math.round(24 * uiScale), 10);
        hintJournalFootnote.setText(
          canAffordAnotherHint()
            ? 'Unlocked hints stay available each time you reopen this journal.'
            : `You need ${formatCoins(this.hintCoinCost)} to unlock the next hint.`,
        );
        fitTextHeight(hintJournalFootnote, Math.round(40 * uiScale), 12);
      } else {
        buyHintButton.button.setVisible(false);
        buyHintButton.label.setVisible(false);
        hintJournalFootnote.setText(
          revealedHints.length
            ? 'All available hints for this question are already unlocked.'
            : 'This question has no hint purchases available.',
        );
        fitTextHeight(hintJournalFootnote, Math.round(40 * uiScale), 12);
      }
    };
    const updateHintButtonState = () => {
      coinBalanceLabel.setText(`Coins: ${this.availableCoins}`);
      const hasUnlockedHints = this.hintIndex > 0;
      hintHotspotLabel.setText('Hint');
      hintHotspot.setFillStyle(hasUnlockedHints ? 0xfff3c7 : (isWordScramble ? 0xe7bd68 : PALETTE.hintIconBg), 1);
      hintHotspot.setStrokeStyle(2, hasUnlockedHints ? challengeAccentColor : (isWordScramble ? challengeBorderColor : PALETTE.hintIconBorder), 1);
      hintHotspotInner.setFillStyle(
        hasHintsAvailable
          ? (hasUnlockedHints ? PALETTE.headerAccent : PALETTE.hintIconActive)
          : PALETTE.hintButtonDisabled,
        1,
      );
      hintHotspotLabel.setAlpha(hasHintsAvailable ? 1 : 0.58);
    };
    hintOverlayBackdrop.on('pointerup', () => {
      hideHintOverlays();
      updateHintButtonState();
    });
    closeJournal.button.on('pointerup', () => {
      hideHintOverlays();
      updateHintButtonState();
    });
    buyHintButton.button.on('pointerup', () => {
      hideHintOverlays();
      unlockNextHint();
    });
    cancelHintConfirm.button.on('pointerup', () => {
      hideHintOverlays();
      if (this.hintIndex > 0) {
        showLatestHintFeedback();
      } else {
        updateHintButtonState();
      }
    });
    acceptHintConfirm.button.on('pointerup', () => {
      hideHintOverlays();
      unlockNextHint();
    });
    let answerInputElement = null;
    let answerFocusHotspot = null;
    let submitHotspot = null;
    let activateSubmit = null;
    const blurAnswerInput = () => {
      if (answerInputElement && document.activeElement === answerInputElement) {
        answerInputElement.blur();
      }
    };
    const focusAnswerInput = () => {
      if (!answerInputElement || answerInputElement.disabled) return;
      answerInputElement.focus({ preventScroll: true });
    };
    const activateHintHotspot = () => {
      hideHintOverlays();
      if (!hasHintsAvailable) {
        showFeedback('This question does not have extra hints yet.', PALETTE.textSoft);
        updateHintButtonState();
        return;
      }
      unlockNextHint();
    };
    const containsPointer = (gameObject, pointer) => {
      const bounds = gameObject.getBounds();
      const x = Number(pointer?.worldX ?? pointer?.x);
      const y = Number(pointer?.worldY ?? pointer?.y);
      return Number.isFinite(x) && Number.isFinite(y) && bounds.contains(x, y);
    };
    // Use one scene-level listener for the two artwork buttons. Android/iOS
    // WebViews can miss a GameObject event when the canvas itself is scaled,
    // while the scene pointer still reports the correct game coordinate.
    const handleTopControlTap = (pointer) => {
      if (containsPointer(closeQuestionButton, pointer)) {
        blurAnswerInput();
        closeQuestionScene();
        return;
      }
      if (containsPointer(hintHotspot, pointer)) {
        blurAnswerInput();
        activateHintHotspot();
        return;
      }
      if (answerFocusHotspot && containsPointer(answerFocusHotspot, pointer)) {
        focusAnswerInput();
        return;
      }
      if (submitHotspot && containsPointer(submitHotspot, pointer)) {
        blurAnswerInput();
        activateSubmit?.();
        return;
      }
      blurAnswerInput();
    };
    this.input.on('pointerdown', handleTopControlTap);
    cleanupHandlers.push(() => this.input.off('pointerdown', handleTopControlTap));

    const optionButtons = [];
    const optionWidth = innerWidth;
    const medallionRadius = Math.max(15, Math.round(17 * uiScale));
    const optionLabelX = innerLeft + Math.round(76 * uiScale);
    const answerIndexRaw = Number(this.question?.answerIndex);
    const answerIndex = Number.isInteger(answerIndexRaw)
      ? Phaser.Math.Clamp(answerIndexRaw, 0, preparedChoices.length - 1)
      : 0;

    if (isWordScramble) {
      const jumbledWord = String(
        this.question?.jumbledWord || legacyJumbledWordMatch?.[1] || '',
      ).trim().toUpperCase();
      const expectedAnswer = String(
        this.question?.answer || preparedChoices[answerIndex]?.text || '',
      ).replace(/[^a-z]/gi, '').toUpperCase();
      const tileSize = Math.round(25 * treasureFrameScale);
      const tileGap = Math.round(6 * treasureFrameScale);
      const tileRowWidth = (jumbledWord.length * tileSize) + (Math.max(0, jumbledWord.length - 1) * tileGap);
      const tileStartX = centerX - (tileRowWidth / 2) + (tileSize / 2);
      const tileY = treasureY(222);

      [...jumbledWord].forEach((letter, index) => {
        const tileX = tileStartX + (index * (tileSize + tileGap));
        addRoundedPanel(this, tileX + 3, tileY + 4, tileSize, tileSize, 7, 0x3b1d0c, 0.42);
        addRoundedPanel(this, tileX, tileY, tileSize, tileSize, 7, 0xf4cf7a, 0.96, 0xb8732f, 2);
        this.add.text(tileX, tileY, letter, {
          fontFamily: 'Manrope, Arial, sans-serif',
          fontSize: fontSize(16, treasureFrameScale),
          fontStyle: 'bold',
          color: '#4b2b20',
        }).setOrigin(0.5);
      });

      const answerY = treasureY(259);
      const answerGap = Math.max(5, Math.round(7 * treasureFrameScale));
      const answerRowWidth = Math.round(innerWidth * 0.82);
      const answerSlotSize = Math.min(
        Math.round(26 * treasureFrameScale),
        Math.floor((answerRowWidth - (answerGap * Math.max(0, expectedAnswer.length - 1))) / expectedAnswer.length),
      );
      const actualAnswerWidth = (answerSlotSize * expectedAnswer.length) + (answerGap * Math.max(0, expectedAnswer.length - 1));
      const answerStartX = centerX - (actualAnswerWidth / 2) + (answerSlotSize / 2);
      addRoundedPanel(
        this,
        centerX,
        answerY,
        actualAnswerWidth + Math.round(28 * treasureFrameScale),
        answerSlotSize + Math.round(4 * treasureFrameScale),
        Math.round(10 * treasureFrameScale),
        0xfff0c8,
        0.24,
        0x2f6650,
        2,
      );
      const answerSlots = Array.from({ length: expectedAnswer.length }, (_, index) => {
        const x = answerStartX + (index * (answerSlotSize + answerGap));
        const box = this.add.rectangle(x, answerY, answerSlotSize, answerSlotSize, 0xffdfa3, 0.72)
          .setStrokeStyle(2, 0xe8bd70, 1);
        const label = this.add.text(x, answerY, '', {
          fontFamily: 'Manrope, Arial, sans-serif',
          fontSize: fontSize(16, treasureFrameScale),
          fontStyle: 'bold',
          color: '#4b2816',
        }).setOrigin(0.5);
        return { box, label };
      });

      const answerWrapper = document.createElement('div');
      answerWrapper.style.width = `${actualAnswerWidth}px`;
      answerWrapper.style.height = `${answerSlotSize}px`;
      answerWrapper.style.position = 'relative';

      const answerInput = document.createElement('input');
      answerInputElement = answerInput;
      answerInput.type = 'text';
      answerInput.autocomplete = 'off';
      answerInput.spellcheck = false;
      answerInput.maxLength = expectedAnswer.length;
      answerInput.setAttribute('aria-label', 'Unscrambled treasure answer');
      answerInput.style.position = 'absolute';
      answerInput.style.inset = '0';
      answerInput.style.width = '100%';
      answerInput.style.height = '100%';
      answerInput.style.boxSizing = 'border-box';
      answerInput.style.border = '0';
      answerInput.style.outline = 'none';
      answerInput.style.background = 'transparent';
      answerInput.style.color = 'transparent';
      answerInput.style.caretColor = 'transparent';
      // Phaser owns the tap area. Keeping this DOM input out of pointer hit
      // testing prevents its scaled overlay from covering Hint or Close on
      // mobile WebViews.
      answerInput.style.opacity = '1';
      answerInput.style.fontFamily = 'Manrope, Arial, sans-serif';
      answerInput.style.fontSize = `${Math.round(21 * uiScale)}px`;
      answerInput.style.fontWeight = '400';
      answerInput.style.letterSpacing = '0.14em';
      answerInput.style.textAlign = 'center';
      answerInput.style.textTransform = 'uppercase';
      answerInput.style.padding = '0';
      answerInput.style.pointerEvents = 'none';
      answerInput.style.cursor = 'text';
      answerWrapper.appendChild(answerInput);
      answerFocusHotspot = this.add.zone(centerX, answerY, actualAnswerWidth, answerSlotSize);
      answerInput.addEventListener('input', () => {
        const letters = answerInput.value.replace(/[^a-z]/gi, '').toUpperCase();
        if (answerInput.value !== letters) answerInput.value = letters;
        answerSlots.forEach((slot, index) => { slot.label.setText(letters[index] || ''); });
      });
      this.add.dom(centerX, answerY, answerWrapper).setOrigin(0.5);

      // The green button is painted into the frame around source y=308.
      // Keep its label, hit area, and status message on that same baseline.
      const submitY = treasureY(308);
      const submitButton = this.add.rectangle(
        centerX,
        submitY,
        Math.round(270 * uiScale),
        Math.round(42 * uiScale),
        challengeHeaderColor,
        1,
      ).setStrokeStyle(2, challengeBorderColor, 1)
        .setInteractive({ useHandCursor: true });
      submitHotspot = submitButton;
      if (hasQuestionFrame) submitButton.setAlpha(0.001);
      const submitLabel = this.add.text(
        centerX,
        hasQuestionFrame ? submitY - (2 * treasureFrameScale) : submitY,
        'UNLOCK TREASURE',
        {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: fontSize(hasQuestionFrame ? 12 : 16, hasQuestionFrame ? treasureFrameScale : uiScale),
        fontStyle: 'bold',
        color: '#fff4cc',
        },
      ).setOrigin(0.5);
      let attemptInProgress = false;
      const submitWordAnswer = () => {
        if (this.hasAnswered || attemptInProgress) return;
        const submittedAnswer = answerInput.value.replace(/[^a-z]/gi, '').toUpperCase();
        if (!submittedAnswer) {
          showFeedback('Enter the unscrambled word before unlocking the treasure.', '#8f4040');
          return;
        }

        hideHintOverlays();
        attemptInProgress = true;
        submitButton.disableInteractive();
        answerInput.disabled = true;
        const correct = submittedAnswer === expectedAnswer;
        const answerSoundKey = correct ? 'gameOneCorrectAnswer' : 'gameOneIncorrectAnswer';
        if (this.cache.audio.exists(answerSoundKey)) {
          this.sound.play(answerSoundKey, { volume: getStudentSfxVolume(0.9) });
        }
        pendingAnswerResult = correct;
        answerInput.style.borderColor = correct ? '#2f6237' : '#8f4040';
        answerInput.style.background = correct ? '#eef8df' : '#fff0eb';
        submitButton.setFillStyle(correct ? PALETTE.success : PALETTE.danger, 1);
        submitButton.setStrokeStyle(3, correct ? PALETTE.successDark : PALETTE.dangerDark, 1);
        const explanation = typeof this.question?.explanation === 'string'
          ? this.question.explanation.trim()
          : '';
        const successText = typeof this.question?.successText === 'string' && this.question.successText.trim()
          ? this.question.successText.trim()
          : 'Correct!';
        const configuredFailureMessages = Array.isArray(this.question?.failureMessages)
          ? this.question.failureMessages.filter((message) => typeof message === 'string' && message.trim())
          : [];
        const failureMessages = configuredFailureMessages.length >= 3 ? configuredFailureMessages : [
          'Incorrect. Review the three scroll clues and try again.',
          'Incorrect. Think about what stores data in Java.',
          'The chest remains sealed. Return to the checkpoint and try again.',
        ];
        const failureText = failureMessages[0];
        const feedbackMessage = correct && explanation
          ? `${successText} ${explanation}`
          : (correct ? successText : failureText);
        showFeedback(feedbackMessage, correct ? '#2f6237' : '#8f4040');
        updateHintButtonState();

        this.tweens.add({
          targets: [submitButton, submitLabel],
          scaleX: 1.025,
          scaleY: 1.025,
          duration: 120,
          yoyo: true,
        });

        this.hasAnswered = true;
        this.time.delayedCall(500, () => {
          if (questionResultSent) return;
          questionResultSent = true;
          const levelScene = this.scene.get('LevelScene');
          levelScene.events.emit('question:answered', {
            questionId: this.questionId,
            correct,
          });
          this.scene.stop();
        });
      };
      activateSubmit = submitWordAnswer;

      submitButton.on('pointerover', () => {
        if (!this.hasAnswered) submitButton.setFillStyle(0x8c5129, 1);
      });
      submitButton.on('pointerout', () => {
        if (!this.hasAnswered) submitButton.setFillStyle(challengeHeaderColor, 1);
      });
      submitButton.on('pointerdown', submitWordAnswer);
      const handleAnswerKeyDown = (event) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          event.preventDefault();
          submitWordAnswer();
        }
      };
      const stopAnswerKeyPropagation = (event) => event.stopPropagation();
      answerInput.addEventListener('keydown', handleAnswerKeyDown);
      answerInput.addEventListener('keyup', stopAnswerKeyPropagation);
      answerInput.addEventListener('keypress', stopAnswerKeyPropagation);
      cleanupHandlers.push(() => {
        answerInput.removeEventListener('keydown', handleAnswerKeyDown);
        answerInput.removeEventListener('keyup', stopAnswerKeyPropagation);
        answerInput.removeEventListener('keypress', stopAnswerKeyPropagation);
      });
    } else preparedChoices.forEach((choice, index) => {
      const y = optionsTop + (optionHeight / 2) + (index * (optionHeight + optionGap));
      const optionShadow = this.add.rectangle(centerX + Math.round(4 * uiScale), y + Math.round(4 * uiScale), optionWidth, optionHeight, PALETTE.optionShadow, 0.9);
      const optionBackground = this.add.rectangle(centerX, y, optionWidth, optionHeight, PALETTE.optionBg, 1)
        .setStrokeStyle(2, PALETTE.panelBorder, 1)
        .setInteractive({ useHandCursor: true });
      const numberMedallion = this.add.circle(innerLeft + Math.round(36 * uiScale), y, medallionRadius, PALETTE.medallion, 1)
        .setStrokeStyle(2, PALETTE.headerDark, 1);
      const numberLabelWrapper = document.createElement('div');
      numberLabelWrapper.style.width = `${Math.round(medallionRadius * 2)}px`;
      numberLabelWrapper.style.height = `${Math.round(medallionRadius * 2)}px`;
      numberLabelWrapper.style.display = 'flex';
      numberLabelWrapper.style.alignItems = 'center';
      numberLabelWrapper.style.justifyContent = 'center';
      numberLabelWrapper.style.pointerEvents = 'none';
      numberLabelWrapper.style.background = 'transparent';
      numberLabelWrapper.style.boxSizing = 'border-box';

      const numberLabelContent = document.createElement('div');
      numberLabelContent.textContent = choice.label;
      numberLabelContent.style.fontFamily = 'Manrope, Arial, sans-serif';
      numberLabelContent.style.fontSize = `${Math.round(13 * uiScale)}px`;
      numberLabelContent.style.fontWeight = '400';
      numberLabelContent.style.lineHeight = '1';
      numberLabelContent.style.display = 'flex';
      numberLabelContent.style.alignItems = 'center';
      numberLabelContent.style.justifyContent = 'center';
      numberLabelContent.style.width = '100%';
      numberLabelContent.style.height = '100%';
      numberLabelContent.style.textAlign = 'center';
      numberLabelContent.style.color = PALETTE.medallionText;
      numberLabelWrapper.appendChild(numberLabelContent);

      const numberLabel = this.add.dom(Math.round(numberMedallion.x), Math.round(y), numberLabelWrapper)
        .setOrigin(0.5);

      const optionLabelWidth = optionWidth - Math.round(108 * uiScale);
      const optionLabelHeight = optionHeight - Math.round(8 * uiScale);
      const optionLabelWrapper = document.createElement('div');
      optionLabelWrapper.style.width = `${optionLabelWidth}px`;
      optionLabelWrapper.style.height = `${optionLabelHeight}px`;
      optionLabelWrapper.style.display = 'flex';
      optionLabelWrapper.style.alignItems = 'center';
      optionLabelWrapper.style.justifyContent = 'center';
      optionLabelWrapper.style.pointerEvents = 'none';
      optionLabelWrapper.style.background = 'transparent';
      optionLabelWrapper.style.overflow = 'hidden';
      optionLabelWrapper.style.boxSizing = 'border-box';

      const optionLabelContent = document.createElement('div');
      optionLabelContent.textContent = choice.text;
      optionLabelContent.style.width = '100%';
      optionLabelContent.style.height = '100%';
      optionLabelContent.style.display = 'flex';
      optionLabelContent.style.alignItems = 'center';
      optionLabelContent.style.fontFamily = 'Manrope, Arial, sans-serif';
      optionLabelContent.style.fontSize = `${Math.round(18 * uiScale)}px`;
      optionLabelContent.style.fontWeight = '400';
      optionLabelContent.style.lineHeight = '1.2';
      optionLabelContent.style.color = PALETTE.textDark;
      optionLabelContent.style.whiteSpace = 'pre-wrap';
      optionLabelContent.style.wordBreak = 'break-word';
      optionLabelContent.style.textAlign = 'left';
      optionLabelWrapper.appendChild(optionLabelContent);

      const optionLabel = this.add.dom(Math.round(optionLabelX), Math.round(y), optionLabelWrapper)
        .setOrigin(0, 0.5);

      const buttonRecord = {
        optionBackground,
        optionShadow,
        numberMedallion,
        numberLabel,
        numberLabelContent,
        optionLabel,
        optionLabelContent,
      };
      optionButtons.push(buttonRecord);

      optionBackground.on('pointerover', () => {
        if (this.hasAnswered) {
          return;
        }

        optionBackground.setFillStyle(PALETTE.optionHover, 1);
      });

      optionBackground.on('pointerout', () => {
        if (this.hasAnswered) {
          return;
        }

        optionBackground.setFillStyle(PALETTE.optionBg, 1);
      });

      optionBackground.on('pointerup', () => {
        if (this.hasAnswered) {
          return;
        }

        hideHintOverlays();
        this.hasAnswered = true;
        closeQuestionButton.disableInteractive();
        closeQuestionButton.setAlpha(0.6);
        closeQuestionLabel.setAlpha(0.6);
        const correct = index === answerIndex;
        const answerSoundKey = correct ? 'gameOneCorrectAnswer' : 'gameOneIncorrectAnswer';
        if (this.cache.audio.exists(answerSoundKey)) {
          this.sound.play(answerSoundKey, { volume: getStudentSfxVolume(0.9) });
        }

        optionButtons.forEach((button, buttonIndex) => {
          button.optionBackground.disableInteractive();

          if (correct && buttonIndex === answerIndex) {
            button.optionBackground.setFillStyle(PALETTE.success, 1);
            button.optionBackground.setStrokeStyle(3, PALETTE.successDark, 1);
            button.numberMedallion.setFillStyle(PALETTE.successDark, 1);
            button.numberLabelContent.style.color = PALETTE.medallionText;
            button.optionLabelContent.style.color = '#f3fbe9';
            return;
          }

          if (!correct && button.optionBackground === optionBackground) {
            button.optionBackground.setFillStyle(PALETTE.danger, 1);
            button.optionBackground.setStrokeStyle(3, PALETTE.dangerDark, 1);
            button.numberMedallion.setFillStyle(PALETTE.dangerDark, 1);
            button.numberLabelContent.style.color = PALETTE.medallionText;
            button.optionLabelContent.style.color = '#fff0eb';
            return;
          }

          button.optionBackground.setAlpha(0.46);
          button.optionShadow.setAlpha(0.08);
          button.numberMedallion.setAlpha(0.45);
          button.numberLabel.setAlpha(0.45);
          button.optionLabel.setAlpha(0.5);
        });

        const explanation = typeof this.question?.explanation === 'string'
          ? this.question.explanation.trim()
          : '';
        const successText = typeof this.question?.successText === 'string' && this.question.successText.trim()
          ? this.question.successText.trim()
          : 'Correct!';
        const failureText = typeof this.question?.failureText === 'string' && this.question.failureText.trim()
          ? this.question.failureText.trim()
          : 'Not quite. Try again.';
        const feedbackBase = correct ? successText : failureText;
        const feedbackMessage = correct && explanation
          ? `${feedbackBase} ${explanation}`
          : feedbackBase;

        showFeedback(feedbackMessage, correct ? '#2f6237' : '#8f4040');
        updateHintButtonState();

        this.tweens.add({
          targets: [optionBackground, optionShadow],
          scaleX: 1.016,
          scaleY: 1.016,
          duration: 120,
          yoyo: true,
        });

        this.time.delayedCall(500, () => {
          const levelScene = this.scene.get('LevelScene');
          levelScene.events.emit('question:answered', {
            questionId: this.questionId,
            correct,
          });
          this.scene.stop();
        });
      });
    });

    updateHintButtonState();

    this.events.once('shutdown', () => {
      cleanupHandlers.forEach((cleanup) => {
        try {
          cleanup();
        } catch {
          // Ignore cleanup errors during scene shutdown.
        }
      });
      promptText.destroy();
    });
  }
}
