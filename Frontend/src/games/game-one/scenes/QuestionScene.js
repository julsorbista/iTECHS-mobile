import Phaser from 'phaser';

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

  if (authoredHints.length > 0) {
    return authoredHints.slice(0, 3);
  }

  const topic = typeof question?.topic === 'string' && question.topic.trim()
    ? question.topic.trim()
    : '';
  const choiceCount = Array.isArray(choices) && choices.length ? choices.length : 4;

  return [
    topic
      ? `Focus on the main idea connected to ${topic}.`
      : 'Read the question again and remove choices that do not fit the prompt.',
    `Compare all ${choiceCount} choices before selecting one.`,
  ];
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

  while (container.scrollHeight > container.clientHeight) {
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

    const hints = buildQuestionHints(this.question, preparedChoices).slice(0, 2);
    const choiceCount = preparedChoices.length;
    const displayScale = getCanvasDisplayScale(sceneWidth, sceneHeight, this.game.canvas);
    const uiScale = Phaser.Math.Clamp(0.92 / Math.max(displayScale, 0.6), 0.96, 1.18);
    const renderResolution = 1;
    const rawPromptSource = typeof this.question?.formattedQuestion === 'string' && this.question.formattedQuestion.trim()
      ? this.question.formattedQuestion.trim()
      : (typeof this.question?.prompt === 'string' && this.question.prompt.trim()
        ? this.question.prompt.trim()
        : 'Solve the challenge.');
    const promptSource = rawPromptSource.replace(/\n\s*\n/g, '\n').trim();
    const { title: promptTitle, body: promptBody } = parsePromptContent(promptSource);

    const panelWidth = Math.min(sceneWidth - 64, 1010);
    const panelHeight = Math.min(sceneHeight - 44, 600);
    const panelLeft = centerX - (panelWidth / 2);
    const panelRight = centerX + (panelWidth / 2);
    const panelTop = centerY - (panelHeight / 2);
    const panelBottom = centerY + (panelHeight / 2);
    const innerInset = Math.round(34 * uiScale);
    const innerLeft = panelLeft + innerInset;
    const innerRight = panelRight - innerInset;
    const innerWidth = innerRight - innerLeft;
    const optionHeight = Math.round((choiceCount >= 6 ? 42 : (choiceCount >= 5 ? 48 : 54)) * uiScale);
    const optionGap = Math.round((choiceCount >= 6 ? 8 : 12) * uiScale);
    const optionsTotalHeight = (choiceCount * optionHeight) + ((choiceCount - 1) * optionGap);
    const topControlsY = panelTop + Math.round(28 * uiScale);
    const headerY = panelTop + Math.round(82 * uiScale);
    const headerHeight = Math.round(54 * uiScale);
    const headerBottom = headerY + (headerHeight / 2);
    const footerReserve = Math.round(112 * uiScale);
    const promptTop = headerBottom + Math.round(16 * uiScale);
    const maxPromptHeight = Math.max(
      Math.round(112 * uiScale),
      Math.floor(panelBottom - footerReserve - optionsTotalHeight - promptTop - Math.round(14 * uiScale)),
    );
    const promptBoxHeight = maxPromptHeight;
    const promptBoxY = promptTop + (promptBoxHeight / 2);
    const promptViewportWidth = innerWidth - Math.round(42 * uiScale);
    const promptViewportHeight = promptBoxHeight - Math.round(16 * uiScale);
    const promptViewportTop = promptBoxY - (promptBoxHeight / 2) + Math.round(8 * uiScale);
    const promptBounds = new Phaser.Geom.Rectangle(
      centerX - (promptViewportWidth / 2),
      promptViewportTop,
      promptViewportWidth,
      promptViewportHeight,
    );

    this.add.rectangle(centerX, centerY, sceneWidth, sceneHeight, PALETTE.overlay, 0.74).setInteractive();
    this.add.rectangle(centerX + 12, centerY + 14, panelWidth + 18, panelHeight + 18, PALETTE.panelShadow, 0.34);
    this.add.rectangle(centerX, centerY, panelWidth, panelHeight, PALETTE.panelBase, 1).setStrokeStyle(4, PALETTE.panelBorder, 1);
    this.add.rectangle(centerX, centerY, panelWidth - 22, panelHeight - 22, PALETTE.panelInner, 1).setStrokeStyle(2, PALETTE.panelBorderSoft, 1);

    const headerWidth = panelWidth - Math.round(42 * uiScale);
    this.add.rectangle(centerX, headerY, headerWidth, headerHeight, PALETTE.header, 1).setStrokeStyle(2, PALETTE.headerDark, 1);
    addDiamond(this, panelLeft + Math.round(34 * uiScale), headerY, Math.round(12 * uiScale), PALETTE.headerAccent);
    addDiamond(this, panelRight - Math.round(34 * uiScale), headerY, Math.round(12 * uiScale), PALETTE.headerAccent);

    this.add.text(centerX, headerY - Math.round(6 * uiScale), 'Question Challenge', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(13, uiScale),
      color: '#fff7e2',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(centerX, headerY + Math.round(12 * uiScale), 'Select the best answer', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(20, uiScale),
      color: '#fff0c9',
      align: 'center',
    }).setOrigin(0.5);

    const coinBadgeWidth = Math.round(148 * uiScale);
    const coinBadgeHeight = Math.round(30 * uiScale);
    const closeButtonWidth = Math.round(96 * uiScale);
    const closeButtonHeight = Math.round(28 * uiScale);
    const topControlGap = Math.round(20 * uiScale);
    const closeQuestionX = innerRight - (closeButtonWidth / 2);
    const coinBadgeY = topControlsY;
    const coinBadgeX = closeQuestionX - (closeButtonWidth / 2) - topControlGap - (coinBadgeWidth / 2);

    this.add.rectangle(coinBadgeX, coinBadgeY, coinBadgeWidth, coinBadgeHeight, 0xfdf4de, 1)
      .setStrokeStyle(2, PALETTE.headerDark, 1);
    const coinBalanceLabel = this.add.text(coinBadgeX, coinBadgeY, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(22, uiScale),
      color: PALETTE.textDark,
    }).setOrigin(0.5);

    const closeQuestionButton = this.add.rectangle(
      closeQuestionX,
      topControlsY,
      closeButtonWidth,
      closeButtonHeight,
      0xefe3c3,
      1,
    ).setStrokeStyle(2, PALETTE.panelBorder, 1)
      .setInteractive({ useHandCursor: true });
    const closeQuestionLabel = this.add.text(closeQuestionButton.x, closeQuestionButton.y, 'Close', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(20, uiScale),
      color: PALETTE.textDark,
    }).setOrigin(0.5);

    this.add.rectangle(centerX, promptBoxY, innerWidth, promptBoxHeight, PALETTE.promptBg, 1).setStrokeStyle(3, PALETTE.panelBorder, 1);
    const promptPaddingX = Math.round(26 * uiScale);
    const promptPaddingY = Math.round(8 * uiScale);
    const promptTextWidth = Math.round(promptViewportWidth - (promptPaddingX * 2));
    const promptTextHeight = Math.round(promptViewportHeight - (promptPaddingY * 2));
    const promptTextLeft = Math.round(promptBounds.x + promptPaddingX);
    const promptTextTop = Math.round(promptViewportTop + promptPaddingY);
    const promptDomWrapper = document.createElement('div');
    promptDomWrapper.style.width = `${promptTextWidth}px`;
    promptDomWrapper.style.height = `${promptTextHeight}px`;
    promptDomWrapper.style.display = 'flex';
    promptDomWrapper.style.justifyContent = 'center';
    promptDomWrapper.style.alignItems = 'flex-start';
    promptDomWrapper.style.overflow = 'hidden';
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
    if (promptTitle) {
      promptDomTitle = document.createElement('div');
      promptDomTitle.textContent = promptTitle;
      promptDomTitle.style.fontSize = `${Math.round(22 * uiScale)}px`;
      promptDomTitle.style.fontWeight = '700';
      promptDomTitle.style.lineHeight = '1.25';
      promptDomTitle.style.color = '#231821';
      promptDomTitle.style.letterSpacing = '0';
      promptDomTitle.style.textAlign = 'center';
      promptDomContent.appendChild(promptDomTitle);
    }

    const promptDomBody = document.createElement('div');
    promptDomBody.textContent = promptBody;
    promptDomBody.style.fontSize = `${Math.round(22 * uiScale)}px`;
    promptDomBody.style.fontWeight = '600';
    promptDomBody.style.lineHeight = '1.25';
    promptDomBody.style.color = PALETTE.textDark;
    promptDomBody.style.whiteSpace = 'pre-wrap';
    promptDomBody.style.wordBreak = 'break-word';
    promptDomBody.style.textAlign = 'center';
    promptDomContent.appendChild(promptDomBody);

    promptDomWrapper.appendChild(promptDomContent);

    const promptText = this.add.text(
      centerX,
      promptBoxY,
      [promptTitle, promptBody].filter(Boolean).join('\n'),
      {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: fontSize(20, uiScale),
        fontStyle: '600',
        color: PALETTE.textDark,
        align: 'center',
        wordWrap: { width: promptTextWidth, useAdvancedWrap: true },
        lineSpacing: Math.round(4 * uiScale),
      },
    ).setOrigin(0.5);

    const footerY = panelBottom - Math.round(44 * uiScale);
    const feedbackWidth = innerWidth - Math.round(56 * uiScale);
    const feedbackHeight = Math.round(66 * uiScale);
    const feedbackWrapper = document.createElement('div');
    feedbackWrapper.style.width = `${feedbackWidth}px`;
    feedbackWrapper.style.height = `${feedbackHeight}px`;
    feedbackWrapper.style.display = 'flex';
    feedbackWrapper.style.alignItems = 'center';
    feedbackWrapper.style.justifyContent = 'center';
    feedbackWrapper.style.pointerEvents = 'none';
    feedbackWrapper.style.background = 'transparent';
    feedbackWrapper.style.boxSizing = 'border-box';

    const feedbackContent = document.createElement('div');
    feedbackContent.style.width = '100%';
    feedbackContent.style.fontFamily = 'Manrope, Arial, sans-serif';
    feedbackContent.style.fontSize = `${Math.round(18 * uiScale)}px`;
    feedbackContent.style.fontWeight = '600';
    feedbackContent.style.lineHeight = '1.35';
    feedbackContent.style.textAlign = 'center';
    feedbackContent.style.wordBreak = 'break-word';
    feedbackContent.style.whiteSpace = 'pre-wrap';
    feedbackContent.style.color = PALETTE.textDark;
    feedbackContent.textContent = '';

    feedbackWrapper.appendChild(feedbackContent);

    this.feedbackText = this.add.text(centerX, footerY, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(16, uiScale),
      fontStyle: '600',
      color: PALETTE.textDark,
      align: 'center',
      wordWrap: { width: feedbackWidth, useAdvancedWrap: true },
    }).setOrigin(0.5);

    const showFeedback = (message, color = PALETTE.textDark) => {
      this.feedbackText.setColor(color);
      this.feedbackText.setText(message);
    };

    const purchasableHints = hints.slice(0, Math.min(2, hints.length));
    const hasHintsAvailable = purchasableHints.length > 0;
    const hintButtonWidth = Math.round(78 * uiScale);
    const hintButtonHeight = Math.round(34 * uiScale);
    const hintButtonX = innerLeft + Math.round(26 * uiScale);
    const hintButtonY = topControlsY;
    const hintHotspot = this.add.rectangle(hintButtonX, hintButtonY, hintButtonWidth, hintButtonHeight, PALETTE.hintIconBg, 1)
      .setStrokeStyle(2, PALETTE.hintIconBorder, 1)
      .setInteractive({ useHandCursor: true });
    const hintHotspotInner = this.add.rectangle(
      hintButtonX,
      hintButtonY,
      hintButtonWidth - Math.round(20 * uiScale),
      hintButtonHeight - Math.round(14 * uiScale),
      PALETTE.hintIconActive,
      1
    );
    const hintHotspotLabel = this.add.text(hintButtonX, hintButtonY + 1, 'Hint', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(11, uiScale),
      color: PALETTE.textDark,
    }).setOrigin(0.5);

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
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(11, uiScale),
      color: '#fff7e2',
      align: 'center',
    }).setOrigin(0.5);
    const hintJournalSubtitle = this.add.text(centerX, hintJournalTop + Math.round(82 * uiScale), '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(16, uiScale),
      color: PALETTE.modalMuted,
      align: 'center',
    }).setOrigin(0.5);
    const hintJournalBody = this.add.rectangle(centerX, hintJournalBodyY, hintJournalBodyWidth, hintJournalBodyHeight, PALETTE.hintCard, 1)
      .setStrokeStyle(3, PALETTE.headerDark, 0.8);
    const hintJournalText = this.add.text(centerX - (hintJournalBodyWidth / 2) + hintJournalInnerPadding, hintJournalBodyTop, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(18, uiScale),
      color: PALETTE.textDark,
      wordWrap: { width: hintJournalBodyTextWidth },
      lineSpacing: Math.round(5 * uiScale),
    }).setOrigin(0, 0);
    const hintJournalFootnote = this.add.text(centerX - (hintJournalWidth / 2) + hintJournalInnerPadding, hintJournalFootnoteY, '', {
      fontFamily: 'Manrope, Arial, sans-serif',
      fontSize: fontSize(15, uiScale),
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
      fontFamily: 'Manrope, Arial, sans-serif',
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
    const hideHintOverlays = () => {
      pendingHintPurchase = false;
      hintOverlayBackdrop.setVisible(false);
      hintJournalContainer.setVisible(false);
      hintConfirmContainer.setVisible(false);
    };
    const closeQuestionScene = () => {
      if (this.hasAnswered) {
        return;
      }

      hideHintOverlays();
      this.hasAnswered = true;
      closeQuestionButton.disableInteractive();
      closeQuestionButton.setAlpha(0.6);
      closeQuestionLabel.setAlpha(0.6);
      const levelScene = this.scene.get('LevelScene');
      levelScene.events.emit('question:closed', {
        questionId: this.questionId,
      });
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
      hintHotspot.setFillStyle(hasUnlockedHints ? 0xfff3c7 : PALETTE.hintIconBg, 1);
      hintHotspot.setStrokeStyle(2, hasUnlockedHints ? PALETTE.headerAccent : PALETTE.hintIconBorder, 1);
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
    hintHotspot.on('pointerup', () => {
      hideHintOverlays();
      if (!hasHintsAvailable) {
        showFeedback('This question does not have extra hints yet.', PALETTE.textSoft);
        updateHintButtonState();
        return;
      }
      unlockNextHint();
    });
    closeQuestionButton.on('pointerup', () => {
      closeQuestionScene();
    });

    const optionButtons = [];
    const optionsTop = promptTop + promptBoxHeight + Math.round(20 * uiScale);
    const optionWidth = innerWidth;
    const medallionRadius = Math.max(15, Math.round(17 * uiScale));
    const optionLabelX = innerLeft + Math.round(76 * uiScale);
    const answerIndexRaw = Number(this.question?.answerIndex);
    const answerIndex = Number.isInteger(answerIndexRaw)
      ? Phaser.Math.Clamp(answerIndexRaw, 0, preparedChoices.length - 1)
      : 0;

    preparedChoices.forEach((choice, index) => {
      const y = optionsTop + (optionHeight / 2) + (index * (optionHeight + optionGap));
      const optionShadow = this.add.rectangle(centerX + Math.round(4 * uiScale), y + Math.round(4 * uiScale), optionWidth, optionHeight, PALETTE.optionShadow, 0.9);
      const optionBackground = this.add.rectangle(centerX, y, optionWidth, optionHeight, PALETTE.optionBg, 1)
        .setStrokeStyle(2, PALETTE.panelBorder, 1)
        .setInteractive({ useHandCursor: true });
      const numberMedallion = this.add.circle(innerLeft + Math.round(36 * uiScale), y, medallionRadius, PALETTE.medallion, 1)
        .setStrokeStyle(2, PALETTE.headerDark, 1);
      const numberLabel = this.add.text(numberMedallion.x, y, choice.label, {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: fontSize(13, uiScale),
        fontStyle: '700',
        color: PALETTE.medallionText,
        align: 'center',
      }).setOrigin(0.5);

      const optionLabelWidth = optionWidth - Math.round(108 * uiScale);
      const optionLabelHeight = optionHeight - Math.round(8 * uiScale);
      const optionLabel = this.add.text(optionLabelX, y, choice.text, {
        fontFamily: 'Manrope, Arial, sans-serif',
        fontSize: fontSize(16, uiScale),
        fontStyle: '600',
        color: PALETTE.textDark,
        align: 'left',
        wordWrap: { width: optionLabelWidth, useAdvancedWrap: true },
      }).setOrigin(0, 0.5);

      const buttonRecord = {
        optionBackground,
        optionShadow,
        numberMedallion,
        numberLabel,
        optionLabel,
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

        optionButtons.forEach((button, buttonIndex) => {
          button.optionBackground.disableInteractive();

          if (correct && buttonIndex === answerIndex) {
            button.optionBackground.setFillStyle(PALETTE.success, 1);
            button.optionBackground.setStrokeStyle(3, PALETTE.successDark, 1);
            button.numberMedallion.setFillStyle(PALETTE.successDark, 1);
            button.numberLabel.setColor(PALETTE.medallionText);
            button.optionLabel.setColor('#f3fbe9');
            return;
          }

          if (!correct && button.optionBackground === optionBackground) {
            button.optionBackground.setFillStyle(PALETTE.danger, 1);
            button.optionBackground.setStrokeStyle(3, PALETTE.dangerDark, 1);
            button.numberMedallion.setFillStyle(PALETTE.dangerDark, 1);
            button.numberLabel.setColor(PALETTE.medallionText);
            button.optionLabel.setColor('#fff0eb');
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

        this.time.delayedCall(3000, () => {
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
