const draftCardModules = import.meta.glob(
  '../../../assets/game-three/*.{png,jpg,jpeg,webp}',
  { eager: true, import: 'default' },
);

const DRAFT_GAME_THREE_ASSET_ORDER = Object.freeze([
  'Inheritance',
  'Boolean',
  'Class',
  'Argument',
  'Variable',
  'Params',
  'Return',
  'Parenthesis',
  'Polymorphism',
  'EqualityOperator',
  'Terminal',
  'Float',
  'Encapsulation',
  'Imports',
  'Debugging',
  'Array',
  'Java',
  'Numbers',
  'Looping',
  'SetGet',
  'Print',
  'Object',
  'Switch',
  'Tags',
  'String',
  'Abstraction',
  'Methods',
  'API',
  'SemiColon',
  'CodeBlock',
  'Condition',
]);

const moduleEntries = Object.entries(draftCardModules).map(([importPath, url]) => {
  const fileName = importPath.split('/').pop() || '';
  const key = fileName.replace(/\.[^.]+$/, '');
  return [key, url];
});

const draftCardUrlByName = Object.freeze(Object.fromEntries(moduleEntries));

const GAME_THREE_CARD_DISPLAY_LABELS = Object.freeze({
  Abstraction: 'Abstraction',
  API: 'API',
  Argument: 'Argument',
  Array: 'Array',
  Boolean: 'Boolean',
  Class: 'Class',
  CodeBlock: 'Code Block',
  Condition: 'Condition',
  Debugging: 'Debugging',
  Encapsulation: 'Encapsulation',
  EqualityOperator: 'Equality Operator',
  Float: 'Float',
  Imports: 'Import',
  Inheritance: 'Inheritance',
  Java: 'Java',
  Looping: 'Looping',
  Methods: 'Methods',
  Numbers: 'Int',
  Object: 'Object',
  Params: 'Parameter',
  Parenthesis: 'Parentheses',
  Polymorphism: 'Polymorphism',
  Print: 'System.out.println()',
  Return: 'Return',
  SemiColon: 'Semi Colon',
  SetGet: 'Setter & Getter',
  String: 'String',
  Switch: 'Switch',
  Tags: 'HTML Tags',
  Terminal: 'Terminal',
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
  api: 'API',
  argument: 'Argument',
  array: 'Array',
  boolean: 'Boolean',
  class: 'Class',
  codeblock: 'CodeBlock',
  condition: 'Condition',
  debugging: 'Debugging',
  encapsulation: 'Encapsulation',
  equalityoperator: 'EqualityOperator',
  float: 'Float',
  htmltags: 'Tags',
  import: 'Imports',
  imports: 'Imports',
  inheritance: 'Inheritance',
  int: 'Numbers',
  integer: 'Numbers',
  java: 'Java',
  looping: 'Looping',
  loop: 'Looping',
  method: 'Methods',
  methods: 'Methods',
  object: 'Object',
  oop: 'Class',
  parameter: 'Params',
  parameters: 'Params',
  params: 'Params',
  parentheses: 'Parenthesis',
  parenthesis: 'Parenthesis',
  polymorphism: 'Polymorphism',
  return: 'Return',
  semicolon: 'SemiColon',
  settergetter: 'SetGet',
  setterandgetter: 'SetGet',
  setget: 'SetGet',
  string: 'String',
  switch: 'Switch',
  systemprintln: 'Print',
  print: 'Print',
  terminal: 'Terminal',
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
