const draftCardModules = import.meta.glob(
  '../../../assets/game-three/new-cards/*.{png,jpg,jpeg,webp}',
  { eager: true, import: 'default' },
);

const DRAFT_GAME_THREE_ASSET_ORDER = Object.freeze([
  'Abstraction',
  'Array',
  'Boolean',
  'Byte',
  'Class',
  'Condition',
  'Debugging',
  'Encapsulation',
  'Float',
  'Imports',
  'Inheritance',
  'Looping',
  'Methods',
  'Numbers',
  'Object',
  'Params',
  'Polymorphism',
  'SemiColon',
  'String',
  'Variable',
]);

const moduleEntries = Object.entries(draftCardModules).map(([importPath, url]) => {
  const fileName = importPath.split('/').pop() || '';
  const key = fileName.replace(/\.[^.]+$/, '');
  return [key, url];
});

const draftCardUrlByName = Object.freeze(Object.fromEntries(moduleEntries));

const GAME_THREE_CARD_DISPLAY_LABELS = Object.freeze({
  Abstraction: 'Abstraction',
  Array: 'Array',
  Boolean: 'Boolean',
  Class: 'Class',
  Condition: 'Condition',
  Debugging: 'Debugging',
  Encapsulation: 'Encapsulation',
  Float: 'Float',
  Imports: 'Import',
  Inheritance: 'Inheritance',
  Looping: 'Looping',
  Methods: 'Methods',
  Numbers: 'Int',
  Object: 'Object',
  Params: 'Parameter',
  Polymorphism: 'Polymorphism',
  SemiColon: 'Semi Colon',
  String: 'String',
  Variable: 'Variable',
});

const getDisplayLabelForAssetName = (assetName = '') => (
  GAME_THREE_CARD_DISPLAY_LABELS[String(assetName || '').trim()]
  || String(assetName || '').trim()
);

const normalizeAssetKey = (value = '') => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
);

const GAME_THREE_CARD_ART_ALIASES = Object.freeze({
  abstraction: 'Abstraction',
  api: 'Imports',
  argument: 'Params',
  array: 'Array',
  boolean: 'Boolean',
  class: 'Class',
  codeblock: 'Methods',
  condition: 'Condition',
  debugging: 'Debugging',
  encapsulation: 'Encapsulation',
  equalityoperator: 'Boolean',
  float: 'Float',
  htmltags: 'String',
  import: 'Imports',
  imports: 'Imports',
  inheritance: 'Inheritance',
  int: 'Numbers',
  integer: 'Numbers',
  java: 'Class',
  looping: 'Looping',
  loop: 'Looping',
  method: 'Methods',
  methods: 'Methods',
  object: 'Object',
  oop: 'Class',
  parameter: 'Params',
  parameters: 'Params',
  params: 'Params',
  parentheses: 'Methods',
  parenthesis: 'Methods',
  polymorphism: 'Polymorphism',
  return: 'Methods',
  semicolon: 'SemiColon',
  settergetter: 'Encapsulation',
  setterandgetter: 'Encapsulation',
  setget: 'Encapsulation',
  string: 'String',
  switch: 'Condition',
  systemprintln: 'Methods',
  print: 'Methods',
  terminal: 'Imports',
  variable: 'Variable',
});

export const getGameThreeDraftCardCount = () => DRAFT_GAME_THREE_ASSET_ORDER.length;

export const getGameThreeDraftTopicForSlot = (levelNumber = 1, slotIndex = 0) => {
  if (DRAFT_GAME_THREE_ASSET_ORDER.length === 0) {
    return null;
  }

  const safeLevelNumber = Number.isFinite(Number(levelNumber))
    ? Math.max(1, Math.trunc(Number(levelNumber)))
    : 1;
  const safeSlotIndex = Number.isFinite(Number(slotIndex))
    ? Math.max(0, Math.trunc(Number(slotIndex)))
    : 0;
  const offset = (safeLevelNumber - 1) * 2;
  const assetName = DRAFT_GAME_THREE_ASSET_ORDER[
    (offset + safeSlotIndex) % DRAFT_GAME_THREE_ASSET_ORDER.length
  ];

  return {
    label: getDisplayLabelForAssetName(assetName),
    url: draftCardUrlByName[assetName] || '',
  };
};

export const getGameThreeCardArtByIndex = (slotIndex = 0, levelNumber = 1) => (
  getGameThreeDraftTopicForSlot(levelNumber, slotIndex)?.url || ''
);

export const getGameThreeCardArtByKey = (cardArtKey = '', fallbackSlotIndex = 0, levelNumber = 1) => {
  const normalizedKey = normalizeAssetKey(cardArtKey);
  const assetName = GAME_THREE_CARD_ART_ALIASES[normalizedKey] || cardArtKey;
  const directUrl = draftCardUrlByName[assetName] || draftCardUrlByName[String(assetName || '').trim()];

  return directUrl || getGameThreeCardArtByIndex(fallbackSlotIndex, levelNumber);
};

export const getGameThreeCardDisplayNameByIndex = (slotIndex = 0, levelNumber = 1) => (
  getGameThreeDraftTopicForSlot(levelNumber, slotIndex)?.label || ''
);

export const getGameThreeCardDisplayNameByKey = (cardArtKey = '', fallbackSlotIndex = 0, levelNumber = 1) => {
  const normalizedKey = normalizeAssetKey(cardArtKey);
  const assetName = GAME_THREE_CARD_ART_ALIASES[normalizedKey] || cardArtKey;
  const directUrl = draftCardUrlByName[assetName] || draftCardUrlByName[String(assetName || '').trim()];

  return directUrl
    ? getDisplayLabelForAssetName(assetName)
    : getGameThreeCardDisplayNameByIndex(fallbackSlotIndex, levelNumber);
};

export default getGameThreeDraftTopicForSlot;
