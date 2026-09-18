// import clsx from 'clsx';
// import { AnimatePresence, motion } from 'framer-motion';
// import { createPortal } from 'react-dom';
// import {
//   CheckCircle2,
//   Coins,
//   Loader2,
//   XCircle,
// } from 'lucide-react';
// import { useEffect, useMemo, useRef, useState } from 'react';

// const BOX_IMAGE = new URL('../assets/processed/box.png', import.meta.url).href;
// const BOMB_IMAGE = new URL('../assets/processed/bomb.png', import.meta.url).href;
// const COIN_IMAGE = new URL('../assets/processed/coins.png', import.meta.url).href;
// const BANANA_IMAGE = new URL('../assets/processed/banana.png', import.meta.url).href;
// const CARROT_IMAGE = new URL('../assets/processed/carrot.png', import.meta.url).href;
// const ORANGE_IMAGE = new URL('../assets/processed/orange.png', import.meta.url).href;
// const WINTER_BACKGROUND_IMAGE = new URL('../assets/processed/bg.jpg', import.meta.url).href;

// const ITEM_IMAGE_BY_TYPE = Object.freeze({
//   bomb: BOMB_IMAGE,
//   coin: COIN_IMAGE,
//   banana: BANANA_IMAGE,
//   carrot: CARROT_IMAGE,
//   orange: ORANGE_IMAGE,
// });

// const renderScreenModal = (content) => (
//   typeof document !== 'undefined'
//     ? createPortal(content, document.body)
//     : null
// );

// const DEFAULT_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
// const ZIP_GAME_AREA_WIDTH = 780;
// const ZIP_GAME_AREA_HEIGHT = 540;
// const CATCH_AREA_SCALE = 1.18;
// const PLAYER_WIDTH = 146;
// const PLAYER_HEIGHT = 110;
// const PLAYER_HITBOX_INSET_X = 10;
// const ITEM_SIZE = 65;
// const PLAYER_START_X = 330;
// const PLAYER_MAX_X = 660;
// const CATCH_LINE_Y = 420;
// const MISS_LINE_Y = 540;
// const MAX_COIN_SPAWNS_PER_ROUND = 2;

// const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
// const getLevelNumber = (levelData) => clamp(Math.round(Number(levelData?.levelNumber) || 1), 1, 99);
// const resolveLevelBasedSpawnInterval = (levelNumber, fallback) => {
//   if (levelNumber <= 1) return 1200;
//   if (levelNumber === 2) return 1080;
//   if (levelNumber === 3) return 980;
//   if (levelNumber === 4) return 920;
//   return fallback;
// };
// const resolveLevelBasedFallSpeed = (levelNumber, fallback) => {
//   if (levelNumber <= 2) return 180;
//   if (levelNumber === 3) return 210;
//   if (levelNumber === 4) return 240;
//   return fallback;
// };
// const resolveRespawnY = (itemsOnScreen, levelNumber) => {
//   const minVerticalGap = levelNumber <= 2 ? 190 : levelNumber === 3 ? 170 : 150;
//   const highestVisibleY = itemsOnScreen.reduce(
//     (highest, item) => Math.min(highest, Number.isFinite(item?.y) ? item.y : 0),
//     0,
//   );

//   return Math.min(-40, highestVisibleY - minVerticalGap);
// };
// const shuffleTokens = (tokens) => {
//   const next = [...tokens];
//   for (let index = next.length - 1; index > 0; index -= 1) {
//     const swapIndex = Math.floor(Math.random() * (index + 1));
//     [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
//   }
//   if (next.length > 1 && next.every((token, index) => token === tokens[index])) {
//     [next[0], next[1]] = [next[1], next[0]];
//   }
//   return next;
// };

// const GAME_FOUR_STATEMENT_POOLS = Object.freeze({
//   1: [
//     { type: 'int', name: 'score', value: '10', valueLabel: 'integer', concept: 'whole-number variable declaration' },
//     { type: 'String', name: 'name', value: '"Java"', valueLabel: 'text', concept: 'String variable declaration' },
//     { type: 'boolean', name: 'isReady', value: 'true', valueLabel: 'boolean', concept: 'boolean variable declaration' },
//     { type: 'int', name: 'level', value: '1', valueLabel: 'integer', concept: 'whole-number variable declaration' },
//     { type: 'String', name: 'section', value: '"ICT"', valueLabel: 'text', concept: 'String variable declaration' },
//   ],
//   2: [
//     { type: 'double', name: 'price', value: '99.99', valueLabel: 'decimal', concept: 'decimal variable declaration' },
//     { type: 'char', name: 'grade', value: "'A'", valueLabel: 'character', concept: 'character variable declaration' },
//     { type: 'int', name: 'lives', value: '3', valueLabel: 'integer', concept: 'whole-number variable declaration' },
//     { type: 'double', name: 'distance', value: '15.5', valueLabel: 'decimal', concept: 'decimal variable declaration' },
//     { type: 'char', name: 'initial', value: "'J'", valueLabel: 'character', concept: 'character variable declaration' },
//   ],
//   3: [
//     { type: 'float', name: 'temperature', value: '36.5f', valueLabel: 'float', concept: 'float variable declaration' },
//     { type: 'long', name: 'population', value: '1000000L', valueLabel: 'long integer', concept: 'long variable declaration' },
//     { type: 'String', name: 'course', value: '"Variables"', valueLabel: 'text', concept: 'String variable declaration' },
//     { type: 'float', name: 'speed', value: '12.75f', valueLabel: 'float', concept: 'float variable declaration' },
//     { type: 'long', name: 'viewCount', value: '250000L', valueLabel: 'long integer', concept: 'long variable declaration' },
//   ],
//   4: [
//     { qualifier: 'final', type: 'int', name: 'MAX_STUDENTS', value: '40', valueLabel: 'constant integer', concept: 'constant declaration' },
//     { type: 'boolean', name: 'hasPassed', value: 'false', valueLabel: 'boolean', concept: 'boolean variable declaration' },
//     { type: 'double', name: 'averageScore', value: '87.5', valueLabel: 'decimal', concept: 'decimal variable declaration' },
//     { qualifier: 'final', type: 'String', name: 'COURSE_NAME', value: '"Java I"', valueLabel: 'constant text', concept: 'constant String declaration' },
//     { type: 'long', name: 'fileSize', value: '4096L', valueLabel: 'long integer', concept: 'long variable declaration' },
//   ],
//   5: [
//     { qualifier: 'final', type: 'String', name: 'userName', value: '"Coder"', valueLabel: 'constant text', concept: 'constant String declaration' },
//     { type: 'int', name: 'attemptCount', value: '1', valueLabel: 'integer', concept: 'whole-number variable declaration' },
//     { type: 'boolean', name: 'debugMode', value: 'true', valueLabel: 'boolean', concept: 'boolean variable declaration' },
//     { qualifier: 'final', type: 'double', name: 'PASSING_RATE', value: '75.5', valueLabel: 'constant decimal', concept: 'constant decimal declaration' },
//     { qualifier: 'final', type: 'char', name: 'GRADE_MARK', value: "'B'", valueLabel: 'constant character', concept: 'constant character declaration' },
//   ],
// });

// const getStatementPoolForLevel = (levelNumber) => {
//   if (levelNumber <= 1) return GAME_FOUR_STATEMENT_POOLS[1];
//   if (levelNumber === 2) return GAME_FOUR_STATEMENT_POOLS[2];
//   if (levelNumber === 3) return GAME_FOUR_STATEMENT_POOLS[3];
//   if (levelNumber === 4) return GAME_FOUR_STATEMENT_POOLS[4];
//   return GAME_FOUR_STATEMENT_POOLS[5];
// };

// const buildStatementTokens = (template) => (
//   [
//     ...(template.qualifier ? [template.qualifier] : []),
//     template.type,
//     template.name,
//     '=',
//     template.value,
//     ';',
//   ]
// );

// const buildGeneratedHints = (template) => {
//   const hints = [];

//   if (template.qualifier === 'final') {
//     hints.push('This statement starts with a Java modifier before the data type.');
//   }

//   hints.push(`Start with ${template.qualifier ? `the modifier and the ${template.type} data type` : `the ${template.type} data type`}.`);
//   hints.push(`${template.name} is the variable name, so place it before the equals sign.`);

//   if (template.type === 'String') {
//     hints.push('String values stay inside double quotation marks.');
//   } else if (template.type === 'char') {
//     hints.push('A char value uses single quotation marks around one character.');
//   } else if (template.type === 'boolean') {
//     hints.push('Boolean values use true or false without quotation marks.');
//   } else if (template.type === 'float') {
//     hints.push('A float literal keeps the f suffix at the end of the number.');
//   } else if (template.type === 'long') {
//     hints.push('A long literal keeps the L suffix at the end of the number.');
//   } else {
//     hints.push('Place the value after the equals sign, then end the statement with a semicolon.');
//   }

//   return hints.slice(0, 3);
// };

// const buildGeneratedRound = (template, levelNumber, roundIndex) => {
//   const targetTokens = buildStatementTokens(template);
//   return {
//     id: `generated-g4-l${levelNumber}-r${roundIndex + 1}`,
//     topic: 'Java Variables',
//     prompt: `Build a valid ${template.concept} for ${template.name}.`,
//     targetTokens,
//     hints: buildGeneratedHints(template),
//   };
// };

// const buildGeneratedRounds = (levelData, levelNumber) => {
//   const requestedCount = Math.max(
//     1,
//     Array.isArray(levelData?.rounds) && levelData.rounds.length
//       ? levelData.rounds.length
//       : 3,
//   );
//   const pool = getStatementPoolForLevel(levelNumber);
//   const startIndex = levelNumber > 0 ? (levelNumber - 1) % pool.length : 0;

//   return Array.from({ length: requestedCount }, (_, roundIndex) => {
//     const template = pool[(startIndex + roundIndex) % pool.length];
//     return buildGeneratedRound(template, levelNumber, roundIndex);
//   });
// };

// const createInventoryCountMap = (tokens) => (
//   tokens.reduce((accumulator, token) => {
//     accumulator[token] = (accumulator[token] || 0) + 1;
//     return accumulator;
//   }, {})
// );

// const getRemainingTokens = (inventory, assembled, targetTokens) => {
//   const inventoryMap = createInventoryCountMap(inventory);
//   const assembledMap = createInventoryCountMap(assembled);

//   return targetTokens.filter((token) => (inventoryMap[token] || 0) > (assembledMap[token] || 0));
// };
// const getRemainingChoiceTokens = (choiceOrder, assembled) => {
//   const assembledMap = createInventoryCountMap(assembled);
//   return choiceOrder.filter((token) => {
//     if ((assembledMap[token] || 0) <= 0) {
//       return true;
//     }

//     assembledMap[token] -= 1;
//     return false;
//   });
// };

// const formatCodeStatement = (tokens = []) => (
//   tokens.join(' ').replace(/\s+;/g, ';')
// );

// const hasCollectedTarget = (inventory, targetTokens) => {
//   const inventoryMap = createInventoryCountMap(inventory);
//   const targetMap = createInventoryCountMap(targetTokens);
//   return Object.entries(targetMap).every(([token, count]) => (inventoryMap[token] || 0) >= count);
// };

// const getSpawnableTargetTokens = (round, inventory, itemsOnScreen = []) => {
//   const targetMap = createInventoryCountMap(Array.isArray(round?.targetTokens) ? round.targetTokens : []);
//   const inventoryMap = createInventoryCountMap(inventory);
//   const visibleTokenMap = createInventoryCountMap(
//     itemsOnScreen
//       .filter((item) => item?.kind === 'token' && item?.value)
//       .map((item) => item.value),
//   );

//   return Object.entries(targetMap).flatMap(([token, neededCount]) => {
//     const alreadyReserved = (inventoryMap[token] || 0) + (visibleTokenMap[token] || 0);
//     const remainingCount = Math.max(0, neededCount - alreadyReserved);
//     return Array.from({ length: remainingCount }, () => token);
//   });
// };

// const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];

// const makeFallingItem = (
//   round,
//   inventory,
//   viewportWidth,
//   fallSpeed,
//   idSeed,
//   startY = 0,
//   options = {},
// ) => {
//   const {
//     itemsOnScreen = [],
//     coinsSpawned = 0,
//     forceCoin = false,
//   } = options;
//   const remainingTargetTokens = getSpawnableTargetTokens(round, inventory, itemsOnScreen);
//   const shouldUseCodeToken = Math.random() < 0.45 && remainingTargetTokens.length > 0;
//   const miscCandidates = [
//     ...(coinsSpawned < MAX_COIN_SPAWNS_PER_ROUND ? [{ kind: 'coin', value: 'coin' }] : []),
//     { kind: 'bomb', value: 'bomb' },
//     { kind: 'bonus', value: 'banana' },
//     { kind: 'bonus', value: 'carrot' },
//     { kind: 'bonus', value: 'orange' },
//   ];
//   const candidate = forceCoin && coinsSpawned < MAX_COIN_SPAWNS_PER_ROUND
//     ? { kind: 'coin', value: 'coin' }
//     : shouldUseCodeToken
//     ? { kind: 'token', value: randomFrom(remainingTargetTokens) }
//     : randomFrom(miscCandidates);
//   const maxX = Math.max(0, viewportWidth - ITEM_SIZE);

//   return {
//     id: `${candidate.kind}-${candidate.value}-${idSeed}`,
//     kind: candidate.kind,
//     value: candidate.value,
//     x: Math.floor(Math.random() * maxX),
//     y: startY,
//     speed: fallSpeed,
//   };
// };

// const buildRoundCompleteState = ({ roundsCleared, totalRounds, points, bonusPoints, mistakes, hintsUsed, coinsRemaining }) => ({
//   outcome: roundsCleared >= totalRounds ? 'COMPLETED' : 'FAILED',
//   roundsCleared,
//   totalRounds,
//   points,
//   bonusPoints,
//   mistakes,
//   hintsUsed,
//   coinsRemaining,
// });

// const GameCanvasGameFour = ({
//   levelData,
//   onLevelComplete,
//   onExitRequest,
//   resultData,
//   isSubmitting,
//   canAdvanceLevel,
//   hideResultOverlay = false,
//   onRetry,
//   onBack,
//   onNextLevel,
//   hintCoinCost = 1,
// }) => {
//   const viewport = levelData?.viewport || DEFAULT_VIEWPORT;
//   const levelNumber = getLevelNumber(levelData);
//   const rounds = useMemo(
//     () => buildGeneratedRounds(levelData, levelNumber),
//     [levelData, levelNumber],
//   );
//   const settings = levelData?.settings || {};
//   const spawnIntervalMs = clamp(
//     resolveLevelBasedSpawnInterval(levelNumber, Math.round(Number(settings.spawnIntervalMs) || 900)),
//     700,
//     1800,
//   );
//   const moveSpeed = clamp(Number(settings.moveSpeed) || 460, 260, 760);
//   const fallSpeed = clamp(
//     resolveLevelBasedFallSpeed(levelNumber, Number(settings.fallSpeed) || 240),
//     160,
//     420,
//   );
//   const maxMistakes = clamp(Math.round(Number(settings.maxMistakes) || 3), 1, 8);
//   const startingLives = clamp(Math.round(Number(settings.lives) || 3), 1, 5);
//   const statementReward = clamp(Math.round(Number(settings.statementReward) || 120), 40, 400);

//   const [showTutorial, setShowTutorial] = useState(true);
//   const [roundIndex, setRoundIndex] = useState(0);
//   const [mode, setMode] = useState('catch');
//   const [inventory, setInventory] = useState([]);
//   const [assembledTokens, setAssembledTokens] = useState([]);
//   const [assemblyChoices, setAssemblyChoices] = useState([]);
//   const [fallingItems, setFallingItems] = useState([]);
//   const [playerX, setPlayerX] = useState(PLAYER_START_X);
//   const [coins, setCoins] = useState(0);
//   const [bonusPoints, setBonusPoints] = useState(0);
//   const [points, setPoints] = useState(0);
//   const [mistakes, setMistakes] = useState(0);
//   const [lives, setLives] = useState(startingLives);
//   const [hintsUsed, setHintsUsed] = useState(0);
//   const [revealedHintCount, setRevealedHintCount] = useState(0);
//   const [hintMessage, setHintMessage] = useState('');
//   const [feedbackMessage, setFeedbackMessage] = useState('');
//   const [roundsCleared, setRoundsCleared] = useState(0);
//   const [localOutcome, setLocalOutcome] = useState(null);
//   const [roundFeedback, setRoundFeedback] = useState('');

//   const requestRef = useRef(null);
//   const previousTsRef = useRef(null);
//   const spawnAccumulatorRef = useRef(0);
//   const keyStateRef = useRef({ left: false, right: false });
//   const itemIdRef = useRef(0);
//   const coinsSpawnedThisRoundRef = useRef(0);
//   const submittedRef = useRef(false);

//   const activeRound = rounds[roundIndex] || null;
//   const totalRounds = rounds.length;
//   const concurrentFallingCount = roundIndex >= 2 ? 2 : 1;
//   const resolvedHintCost = clamp(Math.round(Number(hintCoinCost) || 0), 0, 5);
//   const activeHints = useMemo(
//     () => (Array.isArray(activeRound?.hints)
//       ? activeRound.hints
//         .map((hint) => String(hint || '').trim())
//         .filter(Boolean)
//       : []),
//     [activeRound],
//   );
//   const remainingAssemblyTokens = useMemo(
//     () => getRemainingChoiceTokens(assemblyChoices, assembledTokens),
//     [assembledTokens, assemblyChoices],
//   );

//   useEffect(() => {
//     setShowTutorial(true);
//     setRoundIndex(0);
//     setMode('catch');
//     setInventory([]);
//     setAssembledTokens([]);
//     setAssemblyChoices([]);
//     setFallingItems([]);
//     setPlayerX(PLAYER_START_X);
//     setCoins(0);
//     setBonusPoints(0);
//     setPoints(0);
//     setMistakes(0);
//     setLives(startingLives);
//     setHintsUsed(0);
//     setRevealedHintCount(0);
//     setHintMessage('');
//     setFeedbackMessage('');
//     setRoundsCleared(0);
//     setLocalOutcome(null);
//     setRoundFeedback('');
//     previousTsRef.current = null;
//     spawnAccumulatorRef.current = 0;
//     itemIdRef.current = 0;
//     coinsSpawnedThisRoundRef.current = 0;
//     submittedRef.current = false;
//   }, [levelData, startingLives, viewport.width]);

//   useEffect(() => {
//     setInventory([]);
//     setAssembledTokens([]);
//     setAssemblyChoices([]);
//     coinsSpawnedThisRoundRef.current = 0;
//     spawnAccumulatorRef.current = 0;
//     previousTsRef.current = null;
//     setFallingItems(() => (
//       activeRound
//         ? Array.from({ length: concurrentFallingCount }, (_, index) => (
//           null
//         ))
//           .map((_, index, initialItems) => {
//             const item = makeFallingItem(
//               activeRound,
//               [],
//               ZIP_GAME_AREA_WIDTH,
//               fallSpeed,
//               `${roundIndex}-start-${index + 1}`,
//               index === 0 ? 0 : -100,
//               {
//                 itemsOnScreen: initialItems.filter(Boolean),
//                 coinsSpawned: coinsSpawnedThisRoundRef.current,
//                 forceCoin: index === 0,
//               },
//             );
//             if (item.kind === 'coin') {
//               coinsSpawnedThisRoundRef.current += 1;
//             }
//             initialItems[index] = item;
//             return item;
//           })
//         : []
//     ));
//     setMode('catch');
//     setRevealedHintCount(0);
//     setHintMessage('');
//     setFeedbackMessage('');
//     setRoundFeedback('');
//   }, [activeRound, concurrentFallingCount, fallSpeed, roundIndex]);

//   useEffect(() => {
//     const handleKeyDown = (event) => {
//       if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
//         keyStateRef.current.left = true;
//       }
//       if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
//         keyStateRef.current.right = true;
//       }
//     };

//     const handleKeyUp = (event) => {
//       if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
//         keyStateRef.current.left = false;
//       }
//       if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
//         keyStateRef.current.right = false;
//       }
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     window.addEventListener('keyup', handleKeyUp);

//     return () => {
//       window.removeEventListener('keydown', handleKeyDown);
//       window.removeEventListener('keyup', handleKeyUp);
//     };
//   }, []);

//   useEffect(() => {
//     if (!activeRound || showTutorial || localOutcome || resultData || isSubmitting || mode !== 'catch') {
//       if (requestRef.current) {
//         cancelAnimationFrame(requestRef.current);
//         requestRef.current = null;
//       }
//       return undefined;
//     }

//     const tick = (timestamp) => {
//       if (previousTsRef.current === null) {
//         previousTsRef.current = timestamp;
//       }

//       const deltaMs = timestamp - previousTsRef.current;
//       previousTsRef.current = timestamp;
//       const deltaSeconds = deltaMs / 1000;
//       const horizontalDelta = moveSpeed * deltaSeconds;

//       setPlayerX((current) => {
//         let next = current;
//         if (keyStateRef.current.left) {
//           next -= horizontalDelta;
//         }
//         if (keyStateRef.current.right) {
//           next += horizontalDelta;
//         }
//         return clamp(next, 0, PLAYER_MAX_X);
//       });

//       spawnAccumulatorRef.current += deltaMs;
//       setFallingItems((currentItems) => {
//         const nextItems = [];
//         const caughtEvents = [];
//         const missedEvents = [];

//         currentItems.forEach((item) => {
//           const nextY = item.y + (item.speed * deltaSeconds);
//           const itemLeft = item.x;
//           const itemRight = item.x + ITEM_SIZE;
//           const itemBottom = nextY + ITEM_SIZE;
//           const playerHitboxLeft = playerX + PLAYER_HITBOX_INSET_X;
//           const playerHitboxRight = playerX + PLAYER_WIDTH - PLAYER_HITBOX_INSET_X;
//           const intersectsPlayer = itemBottom >= CATCH_LINE_Y && itemRight >= playerHitboxLeft && itemLeft <= playerHitboxRight;

//           if (intersectsPlayer) {
//             caughtEvents.push(item);
//             return;
//           }

//           if (nextY > MISS_LINE_Y) {
//             missedEvents.push(item);
//             return;
//           }

//           nextItems.push({ ...item, y: nextY });
//         });

//         while (spawnAccumulatorRef.current >= spawnIntervalMs && nextItems.length < concurrentFallingCount) {
//           spawnAccumulatorRef.current -= spawnIntervalMs;
//           itemIdRef.current += 1;
//           const spawnedItem = makeFallingItem(
//             activeRound,
//             inventory,
//             ZIP_GAME_AREA_WIDTH,
//             fallSpeed,
//             itemIdRef.current,
//             0,
//             {
//               itemsOnScreen: nextItems,
//               coinsSpawned: coinsSpawnedThisRoundRef.current,
//             },
//           );
//           if (spawnedItem.kind === 'coin') {
//             coinsSpawnedThisRoundRef.current += 1;
//           }
//           nextItems.push(spawnedItem);
//         }

//         if (caughtEvents.length > 0 || missedEvents.length > 0) {
//           let caughtToken = false;
//           let damageTaken = 0;
//           let bonusDelta = 0;
//           let coinDelta = 0;
//           const nextInventory = [...inventory];
//           let nextFeedbackMessage = feedbackMessage;
//           let immediateFailure = null;
//           let shouldEndCatchPhase = false;

//           caughtEvents.forEach((item) => {
//             if (item.kind === 'token') {
//               if (!nextInventory.includes(item.value)) {
//                 nextInventory.push(item.value);
//               }
//               caughtToken = true;
//               if (hasCollectedTarget(nextInventory, activeRound.targetTokens)) {
//                 shouldEndCatchPhase = true;
//               } else {
//                 itemIdRef.current += 1;
//                 const respawnY = resolveRespawnY(nextItems, levelNumber);
//                 const spawnedItem = makeFallingItem(
//                   activeRound,
//                   nextInventory,
//                   ZIP_GAME_AREA_WIDTH,
//                   fallSpeed,
//                   itemIdRef.current,
//                   respawnY,
//                   {
//                     itemsOnScreen: nextItems,
//                     coinsSpawned: coinsSpawnedThisRoundRef.current,
//                   },
//                 );
//                 if (spawnedItem.kind === 'coin') {
//                   coinsSpawnedThisRoundRef.current += 1;
//                 }
//                 nextItems.push(spawnedItem);
//               }
//             } else if (item.kind === 'coin') {
//               coinDelta += 1;
//               itemIdRef.current += 1;
//               const respawnY = resolveRespawnY(nextItems, levelNumber);
//               const spawnedItem = makeFallingItem(
//                 activeRound,
//                 nextInventory,
//                 ZIP_GAME_AREA_WIDTH,
//                 fallSpeed,
//                 itemIdRef.current,
//                 respawnY,
//                 {
//                   itemsOnScreen: nextItems,
//                   coinsSpawned: coinsSpawnedThisRoundRef.current,
//                 },
//               );
//               if (spawnedItem.kind === 'coin') {
//                 coinsSpawnedThisRoundRef.current += 1;
//               }
//               nextItems.push(spawnedItem);
//             } else if (item.kind === 'bonus') {
//               bonusDelta += 5;
//               itemIdRef.current += 1;
//               const respawnY = resolveRespawnY(nextItems, levelNumber);
//               const spawnedItem = makeFallingItem(
//                 activeRound,
//                 nextInventory,
//                 ZIP_GAME_AREA_WIDTH,
//                 fallSpeed,
//                 itemIdRef.current,
//                 respawnY,
//                 {
//                   itemsOnScreen: nextItems,
//                   coinsSpawned: coinsSpawnedThisRoundRef.current,
//                 },
//               );
//               if (spawnedItem.kind === 'coin') {
//                 coinsSpawnedThisRoundRef.current += 1;
//               }
//               nextItems.push(spawnedItem);
//             } else if (item.kind === 'bomb') {
//               immediateFailure = 'Game over: you caught the bomb.';
//             }
//           });

//           missedEvents.forEach((item) => {
//             if (item.kind === 'token') {
//               immediateFailure = `Game over: you missed ${item.value}.`;
//             } else {
//               itemIdRef.current += 1;
//               const respawnY = resolveRespawnY(nextItems, levelNumber);
//               const spawnedItem = makeFallingItem(
//                 activeRound,
//                 nextInventory,
//                 ZIP_GAME_AREA_WIDTH,
//                 fallSpeed,
//                 itemIdRef.current,
//                 respawnY,
//                 {
//                   itemsOnScreen: nextItems,
//                   coinsSpawned: coinsSpawnedThisRoundRef.current,
//                 },
//               );
//               if (spawnedItem.kind === 'coin') {
//                 coinsSpawnedThisRoundRef.current += 1;
//               }
//               nextItems.push(spawnedItem);
//             }
//           });

//           if (immediateFailure) {
//             setFeedbackMessage(immediateFailure);
//             setRoundFeedback(immediateFailure);
//             setLocalOutcome(buildRoundCompleteState({
//               roundsCleared,
//               totalRounds,
//               points,
//               bonusPoints,
//               mistakes: mistakes + 1,
//               hintsUsed,
//               coinsRemaining: coins + coinDelta,
//             }));
//             return [];
//           }

//           if (coinDelta > 0) {
//             setCoins((value) => value + coinDelta);
//           }
//           if (bonusDelta > 0) {
//             setBonusPoints((value) => value + bonusDelta);
//           }
//           if ((caughtEvents.length > 0 || missedEvents.length > 0) && nextFeedbackMessage) {
//             setFeedbackMessage(nextFeedbackMessage);
//           }
//           if (damageTaken > 0) {
//             setMistakes((value) => value + damageTaken);
//             setLives((value) => Math.max(0, value - damageTaken));
//           }
//           if (caughtToken) {
//             setInventory(nextInventory);
//             if (shouldEndCatchPhase) {
//               setAssemblyChoices(shuffleTokens(nextInventory));
//               setMode('assemble');
//               return [];
//             }
//           }
//         }

//         return nextItems;
//       });

//       requestRef.current = requestAnimationFrame(tick);
//     };

//     requestRef.current = requestAnimationFrame(tick);

//     return () => {
//       if (requestRef.current) {
//         cancelAnimationFrame(requestRef.current);
//         requestRef.current = null;
//       }
//     };
//   }, [
//     activeRound,
//     fallSpeed,
//     inventory,
//     isSubmitting,
//     levelData,
//     localOutcome,
//     mode,
//     moveSpeed,
//     feedbackMessage,
//     levelNumber,
//     playerX,
//     resultData,
//     roundsCleared,
//     showTutorial,
//     spawnIntervalMs,
//     totalRounds,
//     concurrentFallingCount,
//     points,
//     bonusPoints,
//     mistakes,
//     hintsUsed,
//     coins,
//   ]);

//   useEffect(() => {
//     if (localOutcome || resultData || isSubmitting) {
//       return;
//     }

//     if (mistakes >= maxMistakes || lives <= 0) {
//       setLocalOutcome(buildRoundCompleteState({
//         roundsCleared,
//         totalRounds,
//         points,
//         bonusPoints,
//         mistakes,
//         hintsUsed,
//         coinsRemaining: coins,
//       }));
//     }
//   }, [bonusPoints, coins, hintsUsed, isSubmitting, lives, localOutcome, maxMistakes, mistakes, points, resultData, roundsCleared, totalRounds]);

//   useEffect(() => {
//     if (!localOutcome || submittedRef.current) {
//       return;
//     }

//     submittedRef.current = true;
//     onLevelComplete?.(localOutcome);
//   }, [localOutcome, onLevelComplete]);

//   const handleRevealHint = () => {
//     if (!activeRound || activeHints.length === 0) {
//       setFeedbackMessage('No hint available for this level.');
//       return;
//     }

//     if (revealedHintCount >= activeHints.length) {
//       setHintMessage(activeHints.map((hint, index) => `Hint ${index + 1}: ${hint}`).join('\n'));
//       setFeedbackMessage('All available hints are already shown.');
//       return;
//     }

//     if (resolvedHintCost > 0 && coins < resolvedHintCost) {
//       setFeedbackMessage(`You need at least ${resolvedHintCost} coin${resolvedHintCost === 1 ? '' : 's'} to use a hint.`);
//       return;
//     }

//     if (resolvedHintCost > 0) {
//       setCoins((value) => Math.max(0, value - resolvedHintCost));
//     }

//     setFeedbackMessage('');
//     setHintsUsed((value) => value + 1);
//     const nextHintCount = Math.min(activeHints.length, revealedHintCount + 1);
//     setRevealedHintCount(nextHintCount);
//     setHintMessage(activeHints.slice(0, nextHintCount).map((hint, index) => `Hint ${index + 1}: ${hint}`).join('\n'));
//   };

//   const handleResetAssembly = () => {
//     setAssembledTokens([]);
//     setHintMessage('');
//     setFeedbackMessage('');
//   };

//   const handleAssembleToken = (token) => {
//     if (!remainingAssemblyTokens.includes(token)) {
//       return;
//     }

//     setAssembledTokens((current) => [...current, token]);
//   };

//   const handleSubmitAssembly = () => {
//     if (!activeRound) {
//       return;
//     }

//     setHintMessage('');

//     const isCorrect = assembledTokens.length === activeRound.targetTokens.length
//       && assembledTokens.every((token, index) => token === activeRound.targetTokens[index]);

//     if (!isCorrect) {
//       setFeedbackMessage(
//         assembledTokens.length !== activeRound.targetTokens.length
//           ? 'Incomplete answer.'
//           : 'Wrong order.'
//       );
//       return;
//     }

//     const nextRoundsCleared = roundsCleared + 1;
//     setRoundsCleared(nextRoundsCleared);
//     setPoints((value) => value + statementReward);
//     setRoundFeedback('You completed the Java code correctly!');
//     setFeedbackMessage('');

//     if (roundIndex >= totalRounds - 1) {
//       setLocalOutcome(buildRoundCompleteState({
//         roundsCleared: nextRoundsCleared,
//         totalRounds,
//         points: points + statementReward,
//         bonusPoints,
//         mistakes,
//         hintsUsed,
//         coinsRemaining: coins,
//       }));
//       return;
//     }

//     setRoundFeedback('');
//     setHintMessage('');
//     setFeedbackMessage('');
//     setRoundIndex((value) => value + 1);
//   };

//   const hintDisplay = hintMessage || '';
//   const isAssembleMode = mode === 'assemble';
//   const shouldShowTopHint = !isAssembleMode && Boolean(hintDisplay);
//   const shouldShowTopFeedback = !isAssembleMode && Boolean(feedbackMessage);
//   const hintButtonDisabled = activeHints.length === 0
//     || revealedHintCount >= activeHints.length
//     || (resolvedHintCost > 0 && coins < resolvedHintCost);
//   const hintButtonLabel = activeHints.length === 0
//     ? 'No Hints'
//     : revealedHintCount >= activeHints.length
//       ? 'All Hints Shown'
//       : `Reveal Hint${resolvedHintCost > 0 ? ` - ${resolvedHintCost} Coin${resolvedHintCost === 1 ? '' : 's'}` : ''}`;
//   return (
//     <div className="game-four-readable-ui relative overflow-hidden border-[4px] border-[#70415f] bg-[#f5d98c] p-3 shadow-[10px_10px_0_#432644]">
//       <div
//         className="relative overflow-hidden bg-[#f5d98c] text-[#24192a]"
//         style={{ aspectRatio: `${viewport.width} / ${viewport.height}` }}
//       >
//         <div className="flex h-full flex-col gap-3">
//           <section className="flex items-center justify-between gap-4 border-[3px] border-[#70415f] bg-[#fff3c8] px-4 py-3">
//             <div>
//               <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#70415f]">Game 4 Mission</p>
//               <h2 className="text-3xl font-black leading-none text-[#24192a]">Catch the Falling Java Code</h2>
//             </div>
//             <div className="flex flex-wrap justify-end gap-2 text-sm font-black">
//               <span className="border-[3px] border-[#70415f] bg-[#fff7dc] px-3 py-2 shadow-[4px_4px_0_#432644]">
//                 Level: {levelNumber}
//               </span>
//               <span className="border-[3px] border-[#70415f] bg-[#fff7dc] px-3 py-2 shadow-[4px_4px_0_#432644]">
//                 <Coins className="mr-1 inline h-4 w-4" /> Coins: {coins}
//               </span>
//               <span className="border-[3px] border-[#70415f] bg-[#fff7dc] px-3 py-2 shadow-[4px_4px_0_#432644]">
//                 Lives: {lives} / {startingLives}
//               </span>
//               <span className="border-[3px] border-[#70415f] bg-[#fff7dc] px-3 py-2 shadow-[4px_4px_0_#432644]">
//                 Round: {Math.min(roundIndex + 1, Math.max(1, totalRounds))} / {Math.max(1, totalRounds)}
//               </span>
//             </div>
//           </section>

//           {mode === 'catch' ? (
//             <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-3">
//               <section className="relative grid place-items-center overflow-hidden border-[4px] border-[#70415f] bg-[#fff3c8] p-2 shadow-[8px_8px_0_rgba(67,38,68,0.8)]">
//                 <div
//                   className="relative"
//                   style={{
//                     width: `${ZIP_GAME_AREA_WIDTH * CATCH_AREA_SCALE}px`,
//                     height: `${ZIP_GAME_AREA_HEIGHT * CATCH_AREA_SCALE}px`,
//                   }}
//                 >
//                   <div
//                     className="relative origin-top-left overflow-hidden border-[3px] border-black bg-[#dff3ff]"
//                     style={{
//                       width: `${ZIP_GAME_AREA_WIDTH}px`,
//                       height: `${ZIP_GAME_AREA_HEIGHT}px`,
//                       transform: `scale(${CATCH_AREA_SCALE})`,
//                     }}
//                   >
//                     <img
//                       src={WINTER_BACKGROUND_IMAGE}
//                       alt=""
//                       aria-hidden="true"
//                       className="absolute inset-0 h-full w-full object-cover"
//                     />
//                     {fallingItems.map((item) => (
//                       <div
//                         key={item.id}
//                         className="absolute flex items-center justify-center"
//                         style={{
//                           left: item.x,
//                           top: item.y,
//                           width: ITEM_SIZE,
//                           height: ITEM_SIZE,
//                         }}
//                       >
//                         {ITEM_IMAGE_BY_TYPE[item.value] ? (
//                           <img src={ITEM_IMAGE_BY_TYPE[item.value]} alt={item.value} className="h-[65px] w-[65px] object-contain" />
//                         ) : (
//                           <span className={clsx(
//                             'rounded-md border border-black bg-[#222] px-4 py-2 text-lg font-black text-white shadow-[0_10px_18px_rgba(15,23,42,0.18)]',
//                             item.kind === 'token'
//                               ? ''
//                               : 'bg-[#7a1f1f]',
//                           )}>
//                             {item.value}
//                           </span>
//                         )}
//                       </div>
//                     ))}

//                     <div
//                       className="absolute"
//                       style={{ left: playerX, bottom: '5px', width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}
//                     >
//                       <img src={BOX_IMAGE} alt="Catcher" className="h-full w-full object-contain" />
//                     </div>

//                     <div className="absolute left-4 top-4 border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-slate-900">
//                       Move with <span className="font-black">A / D</span> or <span className="font-black">Arrow Keys</span>.
//                     </div>
//                   </div>
//                 </div>
//               </section>

//               <aside className="grid content-start gap-3 border-[4px] border-[#70415f] bg-[#fff3c8] p-3 shadow-[8px_8px_0_rgba(67,38,68,0.8)]">
//                 <section className="border-[3px] border-[#70415f] bg-[#fff1b8] p-3">
//                   <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#70415f]">Objective</p>
//                   <h3 className="text-2xl font-black">{levelData?.title || 'Variable Catch Basics'}</h3>
//                   <p className="mt-2 text-sm font-bold leading-relaxed">
//                     {activeRound?.prompt || levelData?.objective || 'Collect the correct Java code parts and arrange them.'}
//                   </p>
//                 </section>

//                 <section className="border-[3px] border-[#70415f] bg-white p-3">
//                   <div className="flex justify-center gap-2">
//                     <button
//                       type="button"
//                       className="border-[3px] border-[#432644] bg-[#dff3ff] px-3 py-2 text-sm font-black shadow-[3px_3px_0_#432644] transition hover:bg-[#cbe9f7]"
//                       onClick={() => setShowTutorial(true)}
//                     >
//                       Tutorial
//                     </button>
//                     <button
//                       type="button"
//                       className="border-[3px] border-[#432644] bg-white px-3 py-2 text-sm font-black shadow-[3px_3px_0_#432644] transition hover:bg-slate-100"
//                       onClick={onExitRequest}
//                     >
//                       Exit
//                     </button>
//                   </div>
//                 </section>
//               </aside>
//             </div>
//           ) : (
//             <section className="grid min-h-0 flex-1 grid-cols-1 border-[4px] border-[#70415f] bg-[#fff8df] p-3 shadow-[8px_8px_0_rgba(67,38,68,0.8)]">
//               <div className="border-[3px] border-[#70415f] bg-white/80 p-3">
//                 <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#70415f]">Arrange Phase</p>
//                 <h3 className="text-3xl font-black">Arrange the Java Code</h3>
//                 <p className="mt-1 text-base font-bold">Click the collected parts in the correct order to compile the declaration.</p>

//                 <div className="mt-4 flex min-h-[92px] flex-wrap items-center gap-3 border-[3px] border-dashed border-[#70415f] bg-gradient-to-br from-[#fffdf1] to-[#fff1c8] p-4">
//                   {assembledTokens.length > 0 ? assembledTokens.map((token, index) => (
//                     <span
//                       key={`${token}-${index}`}
//                       className={clsx(
//                         'border-[3px] border-[#432644] px-4 py-3 text-base font-black shadow-[4px_4px_0_rgba(67,38,68,0.45)]',
//                         index === 0 ? 'bg-[#dff8e9]' : token.match(/^\d+|^"/) ? 'bg-[#ffe7a3]' : 'bg-[#e9f7ff]',
//                       )}
//                     >
//                       {token}
//                     </span>
//                   )) : null}
//                 </div>

//                 <div className="mt-4 flex flex-wrap justify-center gap-3">
//                   {remainingAssemblyTokens.length > 0 ? remainingAssemblyTokens.map((token, index) => (
//                     <button
//                       key={`${token}-${index}`}
//                       type="button"
//                       onClick={() => handleAssembleToken(token)}
//                       className="border-[3px] border-[#432644] bg-[#e9f7ff] px-4 py-2 text-base font-black shadow-[4px_4px_0_rgba(67,38,68,0.55)] transition hover:bg-[#d6efff]"
//                     >
//                       {token}
//                     </button>
//                   )) : (
//                     <span className="text-sm font-bold text-slate-600">No more tokens left for this round.</span>
//                   )}
//                 </div>

//                 <div className="mt-4 flex flex-wrap justify-center gap-3">
//                   <button
//                     type="button"
//                     onClick={handleSubmitAssembly}
//                     className="border-[3px] border-[#432644] bg-[#dff3ff] px-5 py-3 text-base font-black shadow-[4px_4px_0_#432644] transition hover:bg-[#cbe9f7]"
//                   >
//                     Show Answer
//                   </button>
//                   <button
//                     type="button"
//                     onClick={handleResetAssembly}
//                     className="border-[3px] border-[#432644] bg-white px-5 py-3 text-base font-black shadow-[4px_4px_0_#432644] transition hover:bg-slate-100"
//                   >
//                     Reset
//                   </button>
//                   <button
//                     type="button"
//                     onClick={handleRevealHint}
//                     className="border-[3px] border-[#432644] bg-white px-5 py-3 text-base font-black shadow-[4px_4px_0_#432644] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
//                     disabled={hintButtonDisabled}
//                   >
//                     {hintButtonLabel}
//                   </button>
//                 </div>

//                 <div className="mt-4 min-h-[58px] border-[3px] border-[#70415f] bg-[#fffdf1] p-3 text-center">
//                     {hintDisplay && (
//                       <p className="whitespace-pre-line text-sm font-black text-[#0f8f6f]">{hintDisplay}</p>
//                     )}
//                     {feedbackMessage && (
//                       <p className="mt-1 text-sm font-bold text-[#24192a]">{feedbackMessage}</p>
//                     )}
//                 </div>
//               </div>
//             </section>
//           )}
//         </div>

//         {renderScreenModal(
//           <AnimatePresence>
//             {showTutorial && (
//               <motion.div
//                 className="game-guide-backdrop"
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//               >
//                 <motion.div
//                   className="game-guide-card"
//                   initial={{ opacity: 0, y: 14, scale: 0.95 }}
//                   animate={{ opacity: 1, y: 0, scale: 1 }}
//                   exit={{ opacity: 0, y: 10, scale: 0.97 }}
//                 >
//                   <p className="student-mini-kicker">Game Four Tutorial</p>
//                   <h3>{levelData?.title || 'Catch the Falling Java Code'}: Complete Guide</h3>
//                   <ul className="game-guide-summary">
//                     <li>Catch the correct Java code pieces while avoiding bombs.</li>
//                     <li>Collect all needed parts before arranging the variable declaration.</li>
//                     <li>Spend coins on hints only when you need help with the topic.</li>
//                   </ul>

//                   <div className="game-guide-grid">
//                     <section className="game-guide-section">
//                       <h4>Goal</h4>
//                       <ul>
//                         <li>Catch the required tokens for the current Java Variables round.</li>
//                         <li>Avoid dangerous drops and keep the round alive.</li>
//                         <li>Arrange the collected code in the correct Java syntax order.</li>
//                       </ul>
//                     </section>

//                     <section className="game-guide-section">
//                       <h4>Catch Phase</h4>
//                       <ul>
//                         <li>Move the basket with `A / D` or the arrow keys.</li>
//                         <li>Catching a bomb ends the level attempt immediately.</li>
//                         <li>Missing a required code piece also ends the level attempt.</li>
//                       </ul>
//                     </section>

//                     <section className="game-guide-section">
//                       <h4>Arrange Phase</h4>
//                       <ul>
//                         <li>Click the code parts in the correct order to build the answer.</li>
//                         <li>`Reset` clears your arranged answer so you can try again.</li>
//                         <li>`Check Answer` verifies the full Java declaration.</li>
//                       </ul>
//                     </section>

//                     <section className="game-guide-section">
//                       <h4>Hints And Coins</h4>
//                       <ul>
//                         <li>Coins collected in the level can be spent on hints.</li>
//                         <li>Hints are tied to the current Java Variables topic.</li>
//                         <li>Use the Tutorial button anytime to review this guide.</li>
//                       </ul>
//                     </section>
//                   </div>

//                   <div className="game-guide-actions">
//                     <button
//                       type="button"
//                       className="btn btn-secondary"
//                       onClick={onExitRequest}
//                     >
//                       Exit Level
//                     </button>
//                     <button
//                       type="button"
//                       className="btn btn-primary"
//                       onClick={() => setShowTutorial(false)}
//                     >
//                       Start Level
//                     </button>
//                   </div>
//                 </motion.div>
//               </motion.div>
//             )}
//           </AnimatePresence>,
//         )}

//         <AnimatePresence>
//           {(localOutcome || ((resultData && !hideResultOverlay) || isSubmitting)) && !showTutorial && (
//             <motion.div
//               className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 px-5"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//             >
//               <motion.div
//                 className="w-full max-w-xl border-[4px] border-slate-900 bg-white p-7 text-slate-900 shadow-[0_20px_45px_rgba(15,23,42,0.25)]"
//                 initial={{ y: 18, scale: 0.97, opacity: 0 }}
//                 animate={{ y: 0, scale: 1, opacity: 1 }}
//                 exit={{ y: 12, scale: 0.98, opacity: 0 }}
//               >
//                 {isSubmitting ? (
//                   <div className="flex flex-col items-center justify-center gap-4 py-8 text-center text-slate-900">
//                     <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
//                     <p className="text-lg font-black">Submitting your Game 4 run...</p>
//                   </div>
//                 ) : (
//                   <>
//                     <div className="flex items-center gap-3">
//                       {(resultData?.result === 'COMPLETED' || localOutcome?.outcome === 'COMPLETED')
//                         ? <CheckCircle2 className="h-8 w-8 text-green-700" />
//                         : <XCircle className="h-8 w-8 text-red-700" />}
//                       <div>
//                         <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Game Four Result</p>
//                         <h3 className="text-3xl font-black text-slate-900">
//                           {(resultData?.result === 'COMPLETED' || localOutcome?.outcome === 'COMPLETED')
//                             ? 'You Finished All Levels!'
//                             : 'Game Over'}
//                         </h3>
//                       </div>
//                     </div>

//                     {roundFeedback && (
//                       <p className="mt-4 text-lg font-bold text-slate-800">{roundFeedback}</p>
//                     )}

//                     <div className="mt-6 grid gap-3 sm:grid-cols-2">
//                       <div className="border-2 border-slate-900 bg-[#f8f8f8] p-4">
//                         <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Rounds Cleared</p>
//                         <p className="mt-2 text-3xl font-black text-slate-900">{localOutcome?.roundsCleared ?? roundsCleared}</p>
//                       </div>
//                       <div className="border-2 border-slate-900 bg-[#f8f8f8] p-4">
//                         <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Total Score</p>
//                         <p className="mt-2 text-3xl font-black text-slate-900">{points + bonusPoints}</p>
//                       </div>
//                       <div className="border-2 border-slate-900 bg-[#f8f8f8] p-4">
//                         <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Mistakes</p>
//                         <p className="mt-2 text-3xl font-black text-slate-900">{mistakes}</p>
//                       </div>
//                       <div className="border-2 border-slate-900 bg-[#f8f8f8] p-4">
//                         <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Hints Used</p>
//                         <p className="mt-2 text-3xl font-black text-slate-900">{hintsUsed}</p>
//                       </div>
//                     </div>

//                     <div className="mt-6 flex flex-wrap justify-end gap-3">
//                       <button
//                         type="button"
//                         className="border-2 border-slate-900 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-100"
//                         onClick={onBack || onExitRequest}
//                       >
//                         Levels
//                       </button>
//                       <button
//                         type="button"
//                         className="border-2 border-slate-900 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-100"
//                         onClick={onRetry}
//                       >
//                         Retry
//                       </button>
//                       {canAdvanceLevel && (
//                         <button
//                           type="button"
//                           className="border-2 border-slate-900 bg-[#dff3ff] px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-[#cbe9f7]"
//                           onClick={onNextLevel}
//                         >
//                           Next Level
//                         </button>
//                       )}
//                     </div>
//                   </>
//                 )}
//               </motion.div>
//             </motion.div>
//           )}
//         </AnimatePresence>

//           <AnimatePresence>
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// };

// export default GameCanvasGameFour;


import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Coins,
  Heart,
  Loader2,
  LogOut,
  Star,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getStudentMusicPreference,
  getStudentMusicVolume,
  getStudentSfxPreference,
  getStudentSfxVolume,
} from '../../../utils/studentMenuAudio';
import { levelAPI } from '../../../utils/api';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import GameFourInteractiveTutorial from './GameFourInteractiveTutorial';
import PlayableTutorialCoach from '../../shared/ui/PlayableTutorialCoach';
import { TutorialActionHand } from '../../shared/ui/TutorialHandPointer';
import { addUserCoins, spendUserCoins } from '../../shared/gameSessionPersistence';
import { buildGameFourGuideContent } from '../../shared/ui/levelGuideBuilders';

// Add screen shake CSS animation
const shakeStyle = `
  @keyframes screenShake {
    0% { transform: translate(0, 0) rotate(0deg); }
    10% { transform: translate(-5px, -5px) rotate(0.5deg); }
    20% { transform: translate(5px, -5px) rotate(-0.5deg); }
    30% { transform: translate(-5px, 5px) rotate(0.5deg); }
    40% { transform: translate(5px, 5px) rotate(-0.5deg); }
    50% { transform: translate(-5px, 0) rotate(0.5deg); }
    60% { transform: translate(5px, 0) rotate(-0.5deg); }
    70% { transform: translate(-3px, -3px) rotate(0.3deg); }
    80% { transform: translate(3px, 3px) rotate(-0.3deg); }
    90% { transform: translate(-2px, 0) rotate(0.2deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }
  
  .screen-shake {
    animation: screenShake 0.5s;
  }

  @keyframes codeSparkBurst {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.45);
    }
    18% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.75);
    }
  }

  @keyframes codeScorePop {
    0% {
      opacity: 0;
      transform: translate(-50%, 4px) scale(0.8);
    }
    18% {
      opacity: 1;
      transform: translate(-50%, -8px) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -54px) scale(0.92);
    }
  }

  .code-catch-effect {
    pointer-events: none;
    position: absolute;
    z-index: 8;
  }

  .code-spark {
    animation: codeSparkBurst 520ms ease-out forwards;
    background: #ecfeff;
    border: 2px solid #0891b2;
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.85);
    color: #075985;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  }

  .code-score-pop {
    animation: codeScorePop 680ms ease-out forwards;
    background: #fef3c7;
    border: 2px solid #0f172a;
    box-shadow: 3px 3px 0 rgba(15, 23, 42, 0.85);
    color: #0f172a;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  }

  @keyframes gameFourComboPop {
    0% {
      opacity: 0;
      transform: translate(-50%, -35%) scale(0.72);
    }
    18% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.14);
    }
    58% {
      opacity: 1;
      transform: translate(-50%, -58%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -88%) scale(0.92);
    }
  }

  .game-four-combo-feedback {
    pointer-events: none;
    position: absolute;
    left: 50%;
    top: 36%;
    z-index: 18;
    display: grid;
    place-items: center;
    gap: 4px;
    min-width: 190px;
    padding: 12px 22px;
    border: 3px solid #2d2240;
    border-radius: 18px;
    background: linear-gradient(145deg, rgba(255, 249, 217, 0.98), rgba(255, 216, 122, 0.96));
    box-shadow: 0 0 28px rgba(251, 191, 36, 0.58), 6px 6px 0 rgba(67, 38, 68, 0.72);
    color: #432644;
    text-align: center;
    animation: gameFourComboPop 900ms ease-out forwards;
  }

  .game-four-combo-feedback strong {
    color: #7c3f00;
    font-size: clamp(1.6rem, 3vw, 3rem);
    font-weight: 1000;
    line-height: 1;
    text-shadow: 0 2px 0 #fff2b8, 0 0 16px rgba(245, 158, 11, 0.64);
    text-transform: uppercase;
  }

  .game-four-combo-feedback span {
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .game-four-combo-feedback {
    top: 112px;
    z-index: 24;
    gap: 0;
    min-width: 220px;
    padding: 15px 26px;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: #fff7c2;
    filter: drop-shadow(0 8px 5px rgba(23, 10, 3, 0.42));
    font-size: clamp(1.2rem, 2.4vw, 1.65rem);
    line-height: 1;
    isolation: isolate;
    animation: gameFourComboMilestone 1.25s cubic-bezier(.16, .84, .24, 1) both;
  }

  .game-four-combo-line {
    display: flex;
    align-items: baseline;
    gap: 10px;
    transform: rotate(-1deg);
    text-shadow:
      0 3px 0 #9a3412,
      3px 0 0 #7c2d12,
      -3px 0 0 #7c2d12,
      0 -3px 0 #7c2d12,
      0 7px 8px rgba(0, 0, 0, 0.42);
  }

  .game-four-combo-feedback .game-four-combo-number {
    color: #fde047;
    font-size: 1.85em;
    font-style: italic;
    letter-spacing: -0.05em;
  }

  .game-four-combo-feedback .game-four-combo-word {
    font-size: 1.05em;
    font-style: italic;
    letter-spacing: 0.06em;
  }

  .game-four-combo-feedback .game-four-combo-multiplier {
    margin-top: 8px;
    color: #ffffff;
    font-size: 1.35em;
    font-style: italic;
    text-shadow:
      0 3px 0 #0f766e,
      3px 0 0 #115e59,
      -3px 0 0 #115e59,
      0 -3px 0 #115e59,
      0 0 16px rgba(45, 212, 191, 0.95);
    animation: gameFourMultiplierSlam 1.25s cubic-bezier(.2, .9, .25, 1) both;
  }

  .game-four-combo-burst {
    position: absolute;
    inset: 4px -18px;
    z-index: -1;
    background:
      radial-gradient(circle, rgba(255, 255, 255, 0.9) 0 3%, transparent 4%),
      repeating-conic-gradient(from 8deg, rgba(250, 204, 21, 0.78) 0 4deg, transparent 4deg 19deg);
    clip-path: polygon(50% 0, 58% 35%, 88% 12%, 70% 43%, 100% 50%, 68% 58%, 88% 88%, 57% 66%, 50% 100%, 43% 66%, 12% 88%, 32% 57%, 0 50%, 32% 42%, 12% 12%, 43% 35%);
    opacity: 1;
    animation: gameFourComboBurst 650ms ease-out both;
  }

  @keyframes gameFourComboMilestone {
    0% { opacity: 0; transform: translate(-50%, 18px) scale(0.35) rotate(-7deg); filter: brightness(1.7) blur(5px); }
    12% { opacity: 1; transform: translate(-50%, -5px) scale(1.42) rotate(3deg); filter: brightness(1.35) blur(0); }
    23% { transform: translate(-50%, 2px) scale(0.9) rotate(-2deg); }
    34%, 72% { opacity: 1; transform: translate(-50%, 0) scale(1) rotate(0); filter: brightness(1); }
    100% { opacity: 0; transform: translate(-50%, -42px) scale(1.08); filter: blur(2px); }
  }

  @keyframes gameFourMultiplierSlam {
    0%, 17% { opacity: 0; transform: translateY(-12px) scale(2.2); }
    28% { opacity: 1; transform: translateY(3px) scale(0.82); }
    39%, 76% { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-10px) scale(1.08); }
  }

  @keyframes gameFourComboBurst {
    0% { opacity: 0; transform: scale(0.25) rotate(-18deg); }
    20% { opacity: 0.95; transform: scale(1.12) rotate(3deg); }
    100% { opacity: 0; transform: scale(1.45) rotate(10deg); }
  }

  .game-four-story-card {
    width: min(96vw, 980px);
    max-height: 92vh;
    border: 4px solid #432644;
    background: #fff8df;
    box-shadow: 12px 12px 0 rgba(67, 38, 68, 0.75);
    padding: 14px;
  }

  .game-four-story-image-wrap {
    display: flex;
    min-height: 0;
    max-height: calc(92vh - 122px);
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 3px solid #70415f;
    background: #1f1530;
  }

  .game-four-story-image {
    max-height: calc(92vh - 132px);
    width: 100%;
    object-fit: contain;
  }
`;

// Inject CSS into document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shakeStyle;
  document.head.appendChild(style);
}

const GAME_FOUR_BACKGROUND_MUSIC_SRC = new URL(
  '../assets/audio/background-music.mp3',
  import.meta.url,
).href;

// Sound Effects
const CATCH_TOKEN_SOUND_SRC = new URL(
  '../assets/audio/fruits.mp3',
  import.meta.url,
).href;

const CATCH_FRUIT_SOUND_SRC = new URL(
  '../assets/audio/fruits.mp3',
  import.meta.url,
).href;

const CATCH_COIN_SOUND_SRC = new URL(
  '../assets/audio/coins.mp3',
  import.meta.url,
).href;

const CATCH_BOMB_SOUND_SRC = new URL(
  '../assets/audio/bomb.mp3',
  import.meta.url,
).href;

const GAME_FOUR_COMBO_SOUND_SRC = new URL(
  '../assets/audio/game4combo.mp3',
  import.meta.url,
).href;

const GAME_OVER_SOUND_SRC = new URL(
  '../../../../assets/Game/game_four/Music&Sound Effects/game-over.mp3',
  import.meta.url,
).href;

const CORRECT_ANSWER_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/correct answer sf.mp3',
  import.meta.url,
).href;

const INCORRECT_ANSWER_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/incorrect answer sf.mp3',
  import.meta.url,
).href;

const HINT_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/hint sf.mp3',
  import.meta.url,
).href;

const PLAYER_IMAGE = new URL('../assets/processed/robotofgame4.png', import.meta.url).href;
const BOMB_IMAGE = new URL('../assets/processed/bomb.png', import.meta.url).href;
const COIN_IMAGE = new URL('../assets/processed/coins.png', import.meta.url).href;
const BANANA_IMAGE = new URL('../assets/processed/gas.png', import.meta.url).href;
const CARROT_IMAGE = new URL('../assets/processed/gear.png', import.meta.url).href;
const ORANGE_IMAGE = new URL('../assets/processed/program.png', import.meta.url).href;
const GAME_FOUR_BACKGROUND_IMAGE = new URL('../assets/processed/backgroundofgame4.png', import.meta.url).href;
const GAME_FOUR_ARRANGE_BACKGROUND_IMAGE = new URL('../assets/processed/background2.png', import.meta.url).href;
const GAME_FOUR_LEVEL_ICON = new URL('../assets/processed/level.png', import.meta.url).href;
const GAME_FOUR_LIVES_ICON = new URL('../assets/processed/heart.png', import.meta.url).href;
const GAME_FOUR_ROUND_ICON = new URL('../assets/processed/round.png', import.meta.url).href;

const ITEM_IMAGE_BY_TYPE = Object.freeze({
  bomb: BOMB_IMAGE,
  coin: COIN_IMAGE,
  banana: BANANA_IMAGE,
  carrot: CARROT_IMAGE,
  orange: ORANGE_IMAGE,
});

const GAME_FOUR_STORY_PAGE_MODULES = import.meta.glob(
  '../../../assets/story/world4/*.{png,jpg,jpeg,webp,svg}',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
);

const GAME_FOUR_STORY_PAGES = Object.entries(GAME_FOUR_STORY_PAGE_MODULES)
  .map(([path, src]) => {
    const fileName = path.split('/').pop() || '';
    const pageNumber = Number.parseInt(fileName, 10);
    return { pageNumber, src };
  })
  .filter((page) => Number.isFinite(page.pageNumber) && page.pageNumber >= 1 && page.pageNumber <= 8)
  .sort((first, second) => first.pageNumber - second.pageNumber)
  .map((page) => page.src);

const renderScreenModal = (content) => (
  typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null
);

const DEFAULT_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
const ZIP_GAME_AREA_WIDTH = 780;
const ZIP_GAME_AREA_HEIGHT = 540;
const CATCH_AREA_SCALE = 1.43;
const PLAYER_WIDTH = 146;
const PLAYER_HEIGHT = 110;
const ITEM_SIZE = 65;
const CODE_TOKEN_EDGE_INSET = 76;
const ITEM_HITBOX_INSET = 8;
const PLAYER_START_X = 330;
const PLAYER_MAX_X = 660;
const PLAYER_BOTTOM_OFFSET = 5;
// The image is contained inside a 146x110 player element. Its visible basket
// is the narrow opening centered at the very top of that element.
const BASKET_HITBOX_OFFSET_X = 42;
const BASKET_HITBOX_OFFSET_Y = 0;
const BASKET_HITBOX_WIDTH = 62;
const BASKET_HITBOX_HEIGHT = 18;
const MISS_LINE_Y = 540;
const MAX_COIN_SPAWNS_PER_ROUND = 2;
const MAX_LIVES = 3;
const FRUITS_PER_EXTRA_LIFE = 3;
const getGameFourComboMultiplier = (combo) => {
  if (combo >= 10) return 5;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
};
const GAME_FOUR_TUTORIAL_STEPS = Object.freeze([
  {
    title: 'Practice Tutorial',
    body: 'This practice level teaches the controls while you play. You cannot lose here, so follow each prompt and try the move.',
    buttonLabel: 'Start Practice',
  },
  {
    title: 'Catch A Gear',
    body: 'Gear fills the gear meter. Catch 3 gears to gain 1 extra life, but lives can only go up to 3/3.',
    buttonLabel: 'Catch The Gear',
    targetKind: 'bonus',
    targetValue: 'orange',
  },
  {
    title: 'Bombs Remove Lives',
    body: 'A bomb normally removes 1 life. In this tutorial, catch this bomb so you can see the lives display change without losing.',
    buttonLabel: 'Try The Bomb',
    targetKind: 'bomb',
    targetValue: 'bomb',
  },
  {
    title: 'Catch Code Parts',
    body: 'Now catch the Java code pieces. Missing one in the real level is dangerous, but here it will respawn so you can practice.',
    buttonLabel: 'Catch Code',
    targetKind: 'token',
  },
  {
    title: 'Arrange The Code',
    body: 'Great. Click the collected parts in the correct order, then press Show Answer to finish the tutorial and start Level 1.',
    buttonLabel: 'Arrange Code',
  },
]);
const CODE_CATCH_SYMBOLS = Object.freeze(['{ }', ';', '=', 'int', 'String', 'var']);
const CODE_CATCH_SPARK_OFFSETS = Object.freeze([
  { tx: -56, ty: -34 },
  { tx: -30, ty: -60 },
  { tx: 0, ty: -70 },
  { tx: 34, ty: -54 },
  { tx: 58, ty: -26 },
  { tx: 42, ty: 14 },
  { tx: -46, ty: 18 },
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getLevelNumber = (levelData) => clamp(Math.round(Number(levelData?.levelNumber) || 1), 1, 99);
const resolveLevelBasedSpawnInterval = (levelNumber, fallback) => {
  if (levelNumber <= 1) return 1200;
  if (levelNumber === 2) return 1080;
  if (levelNumber === 3) return 980;
  if (levelNumber === 4) return 920;
  return fallback;
};
const resolveLevelBasedFallSpeed = (levelNumber, fallback) => {
  if (levelNumber <= 2) return 180;
  if (levelNumber === 3) return 210;
  if (levelNumber === 4) return 240;
  return fallback;
};
const resolveRespawnY = (itemsOnScreen, levelNumber) => {
  const minVerticalGap = levelNumber <= 2 ? 190 : levelNumber === 3 ? 170 : 150;
  const highestVisibleY = itemsOnScreen.reduce(
    (highest, item) => Math.min(highest, Number.isFinite(item?.y) ? item.y : 0),
    0,
  );

  return Math.min(-40, highestVisibleY - minVerticalGap);
};
const shuffleTokens = (tokens) => {
  const next = [...tokens];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  if (next.length > 1 && next.every((token, index) => token === tokens[index])) {
    [next[0], next[1]] = [next[1], next[0]];
  }
  return next;
};

const GAME_FOUR_STATEMENT_POOLS = Object.freeze({
  1: [
    { type: 'int', name: 'score', value: '10', valueLabel: 'integer', concept: 'whole-number variable declaration' },
    { type: 'String', name: 'name', value: '"Java"', valueLabel: 'text', concept: 'String variable declaration' },
    { type: 'boolean', name: 'isReady', value: 'true', valueLabel: 'boolean', concept: 'boolean variable declaration' },
    { type: 'int', name: 'level', value: '1', valueLabel: 'integer', concept: 'whole-number variable declaration' },
    { type: 'String', name: 'section', value: '"ICT"', valueLabel: 'text', concept: 'String variable declaration' },
  ],
  2: [
    { type: 'double', name: 'price', value: '99.99', valueLabel: 'decimal', concept: 'decimal variable declaration' },
    { type: 'char', name: 'grade', value: "'A'", valueLabel: 'character', concept: 'character variable declaration' },
    { type: 'int', name: 'lives', value: '3', valueLabel: 'integer', concept: 'whole-number variable declaration' },
    { type: 'double', name: 'distance', value: '15.5', valueLabel: 'decimal', concept: 'decimal variable declaration' },
    { type: 'char', name: 'initial', value: "'J'", valueLabel: 'character', concept: 'character variable declaration' },
  ],
  3: [
    { type: 'float', name: 'temperature', value: '36.5f', valueLabel: 'float', concept: 'float variable declaration' },
    { type: 'long', name: 'population', value: '1000000L', valueLabel: 'long integer', concept: 'long variable declaration' },
    { type: 'String', name: 'course', value: '"Variables"', valueLabel: 'text', concept: 'String variable declaration' },
    { type: 'float', name: 'speed', value: '12.75f', valueLabel: 'float', concept: 'float variable declaration' },
    { type: 'long', name: 'viewCount', value: '250000L', valueLabel: 'long integer', concept: 'long variable declaration' },
  ],
  4: [
    { qualifier: 'final', type: 'int', name: 'MAX_STUDENTS', value: '40', valueLabel: 'constant integer', concept: 'constant declaration' },
    { type: 'boolean', name: 'hasPassed', value: 'false', valueLabel: 'boolean', concept: 'boolean variable declaration' },
    { type: 'double', name: 'averageScore', value: '87.5', valueLabel: 'decimal', concept: 'decimal variable declaration' },
    { qualifier: 'final', type: 'String', name: 'COURSE_NAME', value: '"Java I"', valueLabel: 'constant text', concept: 'constant String declaration' },
    { type: 'long', name: 'fileSize', value: '4096L', valueLabel: 'long integer', concept: 'long variable declaration' },
  ],
  5: [
    { qualifier: 'final', type: 'String', name: 'userName', value: '"Coder"', valueLabel: 'constant text', concept: 'constant String declaration' },
    { type: 'int', name: 'attemptCount', value: '1', valueLabel: 'integer', concept: 'whole-number variable declaration' },
    { type: 'boolean', name: 'debugMode', value: 'true', valueLabel: 'boolean', concept: 'boolean variable declaration' },
    { qualifier: 'final', type: 'double', name: 'PASSING_RATE', value: '75.5', valueLabel: 'constant decimal', concept: 'constant decimal declaration' },
    { qualifier: 'final', type: 'char', name: 'GRADE_MARK', value: "'B'", valueLabel: 'constant character', concept: 'constant character declaration' },
  ],
});

const getStatementPoolForLevel = (levelNumber) => {
  if (levelNumber <= 1) return GAME_FOUR_STATEMENT_POOLS[1];
  if (levelNumber === 2) return GAME_FOUR_STATEMENT_POOLS[2];
  if (levelNumber === 3) return GAME_FOUR_STATEMENT_POOLS[3];
  if (levelNumber === 4) return GAME_FOUR_STATEMENT_POOLS[4];
  return GAME_FOUR_STATEMENT_POOLS[5];
};

const buildStatementTokens = (template) => (
  [
    ...(template.qualifier ? [template.qualifier] : []),
    template.type,
    template.name,
    '=',
    template.value,
    ';',
  ]
);

const buildGeneratedHints = (template) => {
  const hints = [];

  if (template.qualifier === 'final') {
    hints.push('This statement starts with a Java modifier before the data type.');
  }

  hints.push(`Start with ${template.qualifier ? `the modifier and the ${template.type} data type` : `the ${template.type} data type`}.`);
  hints.push(`${template.name} is the variable name, so place it before the equals sign.`);

  if (template.type === 'String') {
    hints.push('String values stay inside double quotation marks.');
  } else if (template.type === 'char') {
    hints.push('A char value uses single quotation marks around one character.');
  } else if (template.type === 'boolean') {
    hints.push('Boolean values use true or false without quotation marks.');
  } else if (template.type === 'float') {
    hints.push('A float literal keeps the f suffix at the end of the number.');
  } else if (template.type === 'long') {
    hints.push('A long literal keeps the L suffix at the end of the number.');
  } else {
    hints.push('Place the value after the equals sign, then end the statement with a semicolon.');
  }

  return hints.slice(0, 3);
};

const buildGeneratedRound = (template, levelNumber, roundIndex) => {
  const targetTokens = buildStatementTokens(template);
  return {
    id: `generated-g4-l${levelNumber}-r${roundIndex + 1}`,
    topic: 'Java Variables',
    prompt: `Build a valid ${template.concept} for ${template.name}.`,
    targetTokens,
    hints: buildGeneratedHints(template),
  };
};

const buildGeneratedRounds = (levelData, levelNumber) => {
  const requestedCount = Math.max(
    1,
    Array.isArray(levelData?.rounds) && levelData.rounds.length
      ? levelData.rounds.length
      : 3,
  );
  const pool = getStatementPoolForLevel(levelNumber);
  const shouldRandomizeStatements = levelData?.settings?.randomizeStatements !== false;
  const selectedPool = shouldRandomizeStatements ? shuffleTokens(pool) : [...pool];
  const startIndex = levelNumber > 0 ? (levelNumber - 1) % pool.length : 0;

  return Array.from({ length: requestedCount }, (_, roundIndex) => {
    const templateIndex = shouldRandomizeStatements
      ? roundIndex % selectedPool.length
      : (startIndex + roundIndex) % selectedPool.length;
    const template = selectedPool[templateIndex];
    return buildGeneratedRound(template, levelNumber, roundIndex);
  });
};

const createInventoryCountMap = (tokens) => (
  tokens.reduce((accumulator, token) => {
    accumulator[token] = (accumulator[token] || 0) + 1;
    return accumulator;
  }, {})
);

const getRemainingTokens = (inventory, assembled, targetTokens) => {
  const inventoryMap = createInventoryCountMap(inventory);
  const assembledMap = createInventoryCountMap(assembled);

  return targetTokens.filter((token) => (inventoryMap[token] || 0) > (assembledMap[token] || 0));
};
const getRemainingChoiceTokens = (choiceOrder, assembled) => {
  const assembledMap = createInventoryCountMap(assembled);
  return choiceOrder.filter((token) => {
    if ((assembledMap[token] || 0) <= 0) {
      return true;
    }

    assembledMap[token] -= 1;
    return false;
  });
};

const hasCollectedTarget = (inventory, targetTokens) => {
  const inventoryMap = createInventoryCountMap(inventory);
  const targetMap = createInventoryCountMap(targetTokens);
  return Object.entries(targetMap).every(([token, count]) => (inventoryMap[token] || 0) >= count);
};

const getSpawnableTargetTokens = (round, inventory, itemsOnScreen = []) => {
  const targetMap = createInventoryCountMap(Array.isArray(round?.targetTokens) ? round.targetTokens : []);
  const inventoryMap = createInventoryCountMap(inventory);
  const visibleTokenMap = createInventoryCountMap(
    itemsOnScreen
      .filter((item) => item?.kind === 'token' && item?.value)
      .map((item) => item.value),
  );

  return Object.entries(targetMap).flatMap(([token, neededCount]) => {
    const alreadyReserved = (inventoryMap[token] || 0) + (visibleTokenMap[token] || 0);
    const remainingCount = Math.max(0, neededCount - alreadyReserved);
    return Array.from({ length: remainingCount }, () => token);
  });
};

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];

const makeFallingItem = (
  round,
  inventory,
  viewportWidth,
  fallSpeed,
  idSeed,
  startY = 0,
  options = {},
) => {
  const {
    itemsOnScreen = [],
    coinsSpawned = 0,
    forceCoin = false,
    forceToken = null,
  } = options;
  const remainingTargetTokens = getSpawnableTargetTokens(round, inventory, itemsOnScreen);
  const shouldUseCodeToken = Math.random() < 0.45 && remainingTargetTokens.length > 0;
  const miscCandidates = [
    ...(coinsSpawned < MAX_COIN_SPAWNS_PER_ROUND ? [{ kind: 'coin', value: 'coin' }] : []),
    { kind: 'bomb', value: 'bomb' },
    { kind: 'bonus', value: 'banana' },
    { kind: 'bonus', value: 'carrot' },
    { kind: 'bonus', value: 'orange' },
  ];
  const candidate = forceToken !== null
    ? { kind: 'token', value: forceToken }
    : forceCoin && coinsSpawned < MAX_COIN_SPAWNS_PER_ROUND
    ? { kind: 'coin', value: 'coin' }
    : shouldUseCodeToken
    ? { kind: 'token', value: randomFrom(remainingTargetTokens) }
    : randomFrom(miscCandidates);
  const edgeInset = candidate.kind === 'token' ? CODE_TOKEN_EDGE_INSET : 0;
  const maxX = Math.max(0, viewportWidth - ITEM_SIZE - (edgeInset * 2));

  return {
    id: `${candidate.kind}-${candidate.value}-${idSeed}`,
    kind: candidate.kind,
    value: candidate.value,
    x: edgeInset + Math.floor(Math.random() * (maxX + 1)),
    y: startY,
    speed: fallSpeed,
  };
};

const buildRoundCompleteState = ({ roundsCleared, totalRounds, points, bonusPoints, mistakes, hintsUsed, coinsRemaining }) => ({
  outcome: roundsCleared >= totalRounds ? 'COMPLETED' : 'FAILED',
  roundsCleared,
  totalRounds,
  points,
  bonusPoints,
  mistakes,
  hintsUsed,
  coinsRemaining,
});

const GameCanvasGameFour = ({
  levelData,
  onLevelComplete,
  onExitRequest,
  resultData,
  isSubmitting,
  canAdvanceLevel,
  hideResultOverlay = false,
  onRetry,
  onBack,
  onNextLevel,
  onStartRealLevel,
  hintCoinCost = 1,
  freeMistakes = 3,
  hintStarCost = 1,
  suppressIntroTutorial = false,
  showLevelGuideline = false,
  gameTutorialRequested = false,
  onTutorialRequest,
  continueToTutorialAfterGuide = false,
  playerId = 'guest',
  initialCoins = 0,
  onCoinBalanceChange,
}) => {
  const viewport = levelData?.viewport || DEFAULT_VIEWPORT;
  const tutorialRootRef = useRef(null);
  const isTutorialLevel = Boolean(levelData?.isTutorialLevel);
  const levelNumber = getLevelNumber(levelData);
  const isFirstLevelGuide = levelNumber === 1;
  const rounds = useMemo(
    () => buildGeneratedRounds(levelData, levelNumber),
    [levelData, levelNumber],
  );
  const settings = levelData?.settings || {};
  const guideContent = useMemo(
    () => buildGameFourGuideContent(levelData, { freeMistakes, hintStarCost }),
    [freeMistakes, hintStarCost, levelData],
  );
  const spawnIntervalMs = clamp(
    resolveLevelBasedSpawnInterval(levelNumber, Math.round(Number(settings.spawnIntervalMs) || 900)),
    700,
    1800,
  );
  const moveSpeed = clamp(Number(settings.moveSpeed) || 460, 260, 760);
  const fallSpeed = clamp(
    resolveLevelBasedFallSpeed(levelNumber, Number(settings.fallSpeed) || 240),
    160,
    420,
  );
  const startingLives = clamp(Math.round(Number(settings.lives) || MAX_LIVES), 1, MAX_LIVES);
  const statementReward = clamp(Math.round(Number(settings.statementReward) || 120), 40, 400);
  const normalizedInitialCoins = Math.max(0, Math.round(Number(initialCoins || 0)));

  const [showTutorial, setShowTutorial] = useState(
    gameTutorialRequested || (showLevelGuideline && (!isFirstLevelGuide || GAME_FOUR_STORY_PAGES.length === 0)),
  );
  const [tutorialView, setTutorialView] = useState(
    gameTutorialRequested || (showLevelGuideline && (!isFirstLevelGuide || GAME_FOUR_STORY_PAGES.length === 0))
      ? 'guide'
      : null,
  );
  const [guideOpenedDuringGameplay, setGuideOpenedDuringGameplay] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [mode, setMode] = useState('catch');
  const [inventory, setInventory] = useState([]);
  const [assembledTokens, setAssembledTokens] = useState([]);
  const [draggedAssemblyIndex, setDraggedAssemblyIndex] = useState(null);
  const [incorrectTokenIndexes, setIncorrectTokenIndexes] = useState([]);
  const [assemblyChoices, setAssemblyChoices] = useState([]);
  const [fallingItems, setFallingItems] = useState([]);
  const [playerX, setPlayerX] = useState(PLAYER_START_X);
  const [coins, setCoins] = useState(normalizedInitialCoins);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [points, setPoints] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [lives, setLives] = useState(startingLives);
  const [fruitCatchCount, setFruitCatchCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const [hintMessage, setHintMessage] = useState('');
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [roundsCleared, setRoundsCleared] = useState(0);
  const [localOutcome, setLocalOutcome] = useState(null);
  const [roundFeedback, setRoundFeedback] = useState('');
  const [screenShake, setScreenShake] = useState(false);
  const [catchEffects, setCatchEffects] = useState([]);
  const [comboFeedback, setComboFeedback] = useState(null);
  const [showStoryline, setShowStoryline] = useState(
    !gameTutorialRequested
    && isFirstLevelGuide
    && !suppressIntroTutorial
    && GAME_FOUR_STORY_PAGES.length > 0,
  );
  const [storyPageIndex, setStoryPageIndex] = useState(0);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialCoachOpen, setTutorialCoachOpen] = useState(isTutorialLevel);
  const [playfieldScale, setPlayfieldScale] = useState({
    x: CATCH_AREA_SCALE,
    y: CATCH_AREA_SCALE,
  });

  const requestRef = useRef(null);
  const playfieldViewportRef = useRef(null);
  const previousTsRef = useRef(null);
  const spawnAccumulatorRef = useRef(0);
  const keyStateRef = useRef({ left: false, right: false });
  const playerXRef = useRef(PLAYER_START_X);
  const itemIdRef = useRef(0);
  const effectIdRef = useRef(0);
  const effectTimersRef = useRef([]);
  const coinsSpawnedThisRoundRef = useRef(0);
  const comboStreakRef = useRef(0);
  const comboCatchIdRef = useRef(null);
  const submittedRef = useRef(false);
  const backgroundMusicRef = useRef(null);
  const backgroundMusicBlockedRef = useRef(false);
  const gameplayPausedRef = useRef(true);
  const catchTokenSoundRef = useRef(null);
  const catchFruitSoundRef = useRef(null);
  const catchCoinSoundRef = useRef(null);
  const catchBombSoundRef = useRef(null);
  const comboSoundRef = useRef(null);
  const gameOverSoundRef = useRef(null);
  const correctAnswerSoundRef = useRef(null);
  const incorrectAnswerSoundRef = useRef(null);
  const hintSoundRef = useRef(null);

  const activeRound = rounds[roundIndex] || null;
  const totalRounds = rounds.length;
  const concurrentFallingCount = roundIndex >= 2 ? 2 : 1;
  // Game 4 hints always cost exactly one coin.
  const resolvedHintCost = 1;
  const activeHints = useMemo(
    () => (Array.isArray(activeRound?.hints)
      ? activeRound.hints
        .map((hint) => String(hint || '').trim())
        .filter(Boolean)
      : []),
    [activeRound],
  );
  const syncCoinBalance = useCallback((nextBalance) => {
    const safeBalance = Math.max(0, Math.round(Number(nextBalance || 0)));
    setCoins(safeBalance);
    onCoinBalanceChange?.(safeBalance);
    return safeBalance;
  }, [onCoinBalanceChange]);

  const awardSharedCoins = useCallback((amount = 0) => {
    const result = addUserCoins(playerId, amount);
    return syncCoinBalance(result.balance);
  }, [playerId, syncCoinBalance]);

  const spendSharedCoins = useCallback((amount = 0) => {
    const result = spendUserCoins(playerId, amount);
    if (result.success) {
      syncCoinBalance(result.balance);
    }
    return result;
  }, [playerId, syncCoinBalance]);

  useEffect(() => {
    setCoins(normalizedInitialCoins);
  }, [normalizedInitialCoins]);

  useEffect(() => {
    if (mode !== 'catch') {
      return undefined;
    }

    const viewport = playfieldViewportRef.current;

    if (!viewport || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const updatePlayfieldScale = () => {
      const { width, height } = viewport.getBoundingClientRect();
      const nextScaleX = width > 0 ? width / ZIP_GAME_AREA_WIDTH : CATCH_AREA_SCALE;
      const nextScaleY = height > 0 ? height / ZIP_GAME_AREA_HEIGHT : CATCH_AREA_SCALE;

      setPlayfieldScale((currentScale) => {
        if (
          Math.abs(currentScale.x - nextScaleX) < 0.005
          && Math.abs(currentScale.y - nextScaleY) < 0.005
        ) {
          return currentScale;
        }

        return {
          x: nextScaleX,
          y: nextScaleY,
        };
      });
    };

    updatePlayfieldScale();

    const observer = new ResizeObserver(updatePlayfieldScale);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [mode]);
  const remainingAssemblyTokens = useMemo(
    () => getRemainingChoiceTokens(assemblyChoices, assembledTokens),
    [assembledTokens, assemblyChoices],
  );
  const currentStoryPage = GAME_FOUR_STORY_PAGES[storyPageIndex] || null;
  const hasStoryline = isFirstLevelGuide && !suppressIntroTutorial && GAME_FOUR_STORY_PAGES.length > 0;
  const isLastStoryPage = storyPageIndex >= GAME_FOUR_STORY_PAGES.length - 1;
  const currentTutorialStep = isTutorialLevel
    ? GAME_FOUR_TUTORIAL_STEPS[Math.min(tutorialStepIndex, GAME_FOUR_TUTORIAL_STEPS.length - 1)]
    : null;
  const shouldPauseForTutorialCoach = Boolean(isTutorialLevel && tutorialCoachOpen && currentTutorialStep);
  const showGuide = showTutorial && tutorialView === 'guide';
  const showPracticeIntro = showTutorial && tutorialView === 'practice';
  const [tutorialDemo, setTutorialDemo] = useState(null);
  const activeDemo = showPracticeIntro ? tutorialDemo : null;
  const canInitializeGameplay = Boolean(
    activeRound
    && !showStoryline
    && !showTutorial
    && !shouldPauseForTutorialCoach
  );
  const isGameplayActive = Boolean(
    canInitializeGameplay
    && mode === 'catch'
    && !localOutcome
    && !resultData
    && !isSubmitting
  );
  const isGameplayPaused = showStoryline || showTutorial || shouldPauseForTutorialCoach;
  gameplayPausedRef.current = isGameplayPaused;
  useEffect(() => {
    if (isGameplayPaused) keyStateRef.current = { left: false, right: false };
  }, [isGameplayPaused]);

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0 && !isTutorialLevel) {
      setShowStoryline(false);
      setShowTutorial(true);
      setTutorialView('practice');
    }
  }, [gameTutorialRequested, isTutorialLevel]);

  const triggerCodeCatchEffect = useCallback((item) => {
    effectIdRef.current += 1;
    const effectId = `code-catch-${effectIdRef.current}`;
    const symbolStartIndex = effectIdRef.current % CODE_CATCH_SYMBOLS.length;
    const sparks = CODE_CATCH_SPARK_OFFSETS.map((offset, index) => ({
      ...offset,
      symbol: CODE_CATCH_SYMBOLS[(symbolStartIndex + index) % CODE_CATCH_SYMBOLS.length],
      delay: index * 24,
    }));

    setCatchEffects((current) => [
      ...current,
      {
        id: effectId,
        x: item.x + ITEM_SIZE / 2,
        y: item.y + ITEM_SIZE / 2,
        value: item.value,
        sparks,
      },
    ]);

    const timerId = window.setTimeout(() => {
      setCatchEffects((current) => current.filter((effect) => effect.id !== effectId));
      effectTimersRef.current = effectTimersRef.current.filter((timer) => timer !== timerId);
    }, 760);
    effectTimersRef.current.push(timerId);
  }, []);

  const triggerComboFeedback = useCallback((count) => {
    const id = `game-four-combo-${Date.now()}-${Math.random()}`;
    setComboFeedback({
      id,
      count: Math.max(1, Math.round(Number(count || 1))),
      multiplier: getGameFourComboMultiplier(count),
    });
    const timerId = window.setTimeout(() => {
      setComboFeedback((current) => (current?.id === id ? null : current));
      effectTimersRef.current = effectTimersRef.current.filter((timer) => timer !== timerId);
    }, 920);
    effectTimersRef.current.push(timerId);
  }, []);

  const handleAdvanceStoryline = () => {
    if (!isLastStoryPage) {
      setStoryPageIndex((current) => Math.min(current + 1, GAME_FOUR_STORY_PAGES.length - 1));
      return;
    }

    setShowStoryline(false);
    setShowTutorial(showLevelGuideline);
    setTutorialView(showLevelGuideline ? 'guide' : null);
  };

  const handleContinueTutorialStep = () => {
    keyStateRef.current = { left: false, right: false };
    previousTsRef.current = null;
    spawnAccumulatorRef.current = spawnIntervalMs;
    setTutorialCoachOpen(false);
  };

  useEffect(() => {
    const shouldShowIntroTutorial = showLevelGuideline && !hasStoryline;

    setShowTutorial(shouldShowIntroTutorial);
    setTutorialView(shouldShowIntroTutorial ? 'guide' : null);
    setGuideOpenedDuringGameplay(false);
    setShowStoryline(hasStoryline);
    setStoryPageIndex(0);
    setRoundIndex(0);
    setMode('catch');
    setInventory([]);
    setAssembledTokens([]);
    setAssemblyChoices([]);
    setFallingItems([]);
    setPlayerX(PLAYER_START_X);
    playerXRef.current = PLAYER_START_X;
    setCoins(normalizedInitialCoins);
    setBonusPoints(0);
    setPoints(0);
    setMistakes(0);
    setLives(startingLives);
    setFruitCatchCount(0);
    setHintsUsed(0);
    setRevealedHintCount(0);
    setHintMessage('');
    setFeedbackMessage('');
    setRoundsCleared(0);
    setLocalOutcome(null);
    setRoundFeedback('');
    setScreenShake(false);
    setCatchEffects([]);
    setComboFeedback(null);
    comboStreakRef.current = 0;
    comboCatchIdRef.current = null;
    setTutorialStepIndex(0);
    setTutorialCoachOpen(isTutorialLevel);
    previousTsRef.current = null;
    spawnAccumulatorRef.current = 0;
    itemIdRef.current = 0;
    effectIdRef.current = 0;
    coinsSpawnedThisRoundRef.current = 0;
    submittedRef.current = false;
  }, [hasStoryline, isFirstLevelGuide, isTutorialLevel, levelData, showLevelGuideline, startingLives, suppressIntroTutorial, viewport.width]);

  useEffect(() => (
    () => {
      effectTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      effectTimersRef.current = [];
    }
  ), []);

  // Background music — plays when the component mounts, stops on unmount.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') {
      return undefined;
    }

    if (!getStudentMusicPreference()) {
      return undefined;
    }

    const backgroundMusic = new Audio(GAME_FOUR_BACKGROUND_MUSIC_SRC);
    backgroundMusic.loop = true;
    backgroundMusic.preload = 'auto';
    backgroundMusic.volume = getStudentMusicVolume(0.45);
    backgroundMusicRef.current = backgroundMusic;

    if (!gameplayPausedRef.current) {
      const playPromise = backgroundMusic.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          backgroundMusicBlockedRef.current = true;
        });
      }
    }

    const resumeBackgroundMusic = () => {
      if (gameplayPausedRef.current || !getStudentMusicPreference()) {
        return;
      }

      const resumePromise = backgroundMusic.play();
      if (resumePromise?.then) {
        resumePromise
          .then(() => {
            backgroundMusicBlockedRef.current = false;
          })
          .catch(() => {
            backgroundMusicBlockedRef.current = true;
          });
      }
    };

    window.addEventListener('pointerdown', resumeBackgroundMusic);
    window.addEventListener('keydown', resumeBackgroundMusic);

    return () => {
      window.removeEventListener('pointerdown', resumeBackgroundMusic);
      window.removeEventListener('keydown', resumeBackgroundMusic);
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
      backgroundMusicBlockedRef.current = false;
      if (backgroundMusicRef.current === backgroundMusic) {
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const backgroundMusic = backgroundMusicRef.current;
    if (!backgroundMusic || !getStudentMusicPreference()) {
      return;
    }

    if (isGameplayPaused) {
      backgroundMusic.pause();
      return;
    }

    const playPromise = backgroundMusic.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        backgroundMusicBlockedRef.current = true;
      });
    }
  }, [isGameplayPaused]);

  // Initialize sound effects
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') {
      return undefined;
    }

    if (!getStudentSfxPreference()) {
      return undefined;
    }

    const playSound = (soundRef, soundSrc) => {
      try {
        if (!soundRef.current) {
          soundRef.current = new Audio(soundSrc);
          soundRef.current.preload = 'auto';
          soundRef.current.volume = getStudentSfxVolume(0.7);
        } else {
          soundRef.current.currentTime = 0;
        }
        soundRef.current.play().catch(() => {
          // Sound play blocked, ignore
        });
      } catch (error) {
        // Ignore sound errors
      }
    };

    // Store playSound function in refs so it can be used in the catch logic
    window.playCatchTokenSound = () => playSound(catchTokenSoundRef, CATCH_TOKEN_SOUND_SRC);
    window.playCatchFruitSound = () => playSound(catchFruitSoundRef, CATCH_FRUIT_SOUND_SRC);
    window.playCatchCoinSound = () => playSound(catchCoinSoundRef, CATCH_COIN_SOUND_SRC);
    window.playCatchBombSound = () => playSound(catchBombSoundRef, CATCH_BOMB_SOUND_SRC);
    window.playGameFourComboSound = () => playSound(comboSoundRef, GAME_FOUR_COMBO_SOUND_SRC);
    window.playGameOverSound = () => playSound(gameOverSoundRef, GAME_OVER_SOUND_SRC);
    window.playGameFourCorrectAnswerSound = () => playSound(correctAnswerSoundRef, CORRECT_ANSWER_SOUND_SRC);
    window.playGameFourIncorrectAnswerSound = () => playSound(incorrectAnswerSoundRef, INCORRECT_ANSWER_SOUND_SRC);
    window.playGameFourHintSound = () => playSound(hintSoundRef, HINT_SOUND_SRC);

    return () => {
      // Clean up sound objects on unmount
      [
        catchTokenSoundRef,
        catchFruitSoundRef,
        catchCoinSoundRef,
        catchBombSoundRef,
        comboSoundRef,
        gameOverSoundRef,
        correctAnswerSoundRef,
        incorrectAnswerSoundRef,
        hintSoundRef,
      ].forEach((ref) => {
        if (ref.current) {
          ref.current.pause();
          ref.current.currentTime = 0;
          ref.current = null;
        }
      });
      delete window.playCatchTokenSound;
      delete window.playCatchFruitSound;
      delete window.playCatchCoinSound;
      delete window.playCatchBombSound;
      delete window.playGameFourComboSound;
      delete window.playGameOverSound;
      delete window.playGameFourCorrectAnswerSound;
      delete window.playGameFourIncorrectAnswerSound;
      delete window.playGameFourHintSound;
    };
  }, []);

  useEffect(() => {
    setInventory([]);
    setAssembledTokens([]);
    setAssemblyChoices([]);
    coinsSpawnedThisRoundRef.current = 0;
    spawnAccumulatorRef.current = 0;
    previousTsRef.current = null;
    setMode('catch');
    setCatchEffects([]);
    setRevealedHintCount(0);
    setHintMessage('');
    setFeedbackMessage('');
    setRoundFeedback('');
    // Initialize only for a new round. Opening either guide pauses the existing
    // items through isGameplayActive; it must not clear inventory or hint state.
    setFallingItems(() => (
      activeRound
        ? Array.from({ length: concurrentFallingCount }, (_, index) => (
          null
        ))
          .map((_, index, initialItems) => {
            const item = makeFallingItem(
              activeRound,
              [],
              ZIP_GAME_AREA_WIDTH,
              fallSpeed,
              `${roundIndex}-start-${index + 1}`,
              index === 0 ? 0 : -100,
              {
                itemsOnScreen: initialItems.filter(Boolean),
                coinsSpawned: coinsSpawnedThisRoundRef.current,
                forceCoin: index === 0,
              },
            );
            if (item.kind === 'coin') {
              coinsSpawnedThisRoundRef.current += 1;
            }
            initialItems[index] = item;
            return item;
          })
        : []
    ));
  }, [activeRound, concurrentFallingCount, fallSpeed, isTutorialLevel, roundIndex]);

  useEffect(() => {
    if (!isGameplayActive || !isTutorialLevel || tutorialCoachOpen || !currentTutorialStep?.targetKind) {
      return;
    }

    itemIdRef.current += 1;
    const targetValue = currentTutorialStep.targetKind === 'token'
      ? activeRound.targetTokens?.find((token) => !inventory.includes(token)) || activeRound.targetTokens?.[0]
      : currentTutorialStep.targetValue;

    if (!targetValue) {
      return;
    }

    const tutorialEdgeInset = currentTutorialStep.targetKind === 'token' ? CODE_TOKEN_EDGE_INSET : 0;
    const x = clamp(
      playerXRef.current + (PLAYER_WIDTH / 2) - (ITEM_SIZE / 2),
      tutorialEdgeInset,
      ZIP_GAME_AREA_WIDTH - ITEM_SIZE - tutorialEdgeInset,
    );
    const tutorialItem = {
      id: `tutorial-${currentTutorialStep.targetKind}-${targetValue}-${itemIdRef.current}`,
      kind: currentTutorialStep.targetKind,
      value: targetValue,
      x,
      y: -ITEM_SIZE,
      speed: Math.max(130, fallSpeed * 0.72),
    };

    setFallingItems((items) => [
      tutorialItem,
      ...items.filter((item) => item?.kind !== currentTutorialStep.targetKind).slice(0, Math.max(0, concurrentFallingCount - 1)),
    ]);
    spawnAccumulatorRef.current = 0;
    previousTsRef.current = null;
  }, [
    activeRound,
    concurrentFallingCount,
    currentTutorialStep,
    fallSpeed,
    isGameplayActive,
    inventory,
    isTutorialLevel,
    tutorialCoachOpen,
  ]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (gameplayPausedRef.current) return;
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        keyStateRef.current.left = true;
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        keyStateRef.current.right = true;
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        keyStateRef.current.left = false;
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        keyStateRef.current.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!isGameplayActive) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      previousTsRef.current = null;
      keyStateRef.current = { left: false, right: false };
      return undefined;
    }

    const tick = (timestamp) => {
      if (previousTsRef.current === null) {
        previousTsRef.current = timestamp;
      }

      const deltaMs = timestamp - previousTsRef.current;
      previousTsRef.current = timestamp;
      const deltaSeconds = deltaMs / 1000;
      const horizontalDelta = moveSpeed * deltaSeconds;

      setPlayerX((current) => {
        let next = current;
        if (keyStateRef.current.left) {
          next -= horizontalDelta;
        }
        if (keyStateRef.current.right) {
          next += horizontalDelta;
        }
        const clampedNext = clamp(next, 0, PLAYER_MAX_X);
        playerXRef.current = clampedNext;
        return clampedNext;
      });

      spawnAccumulatorRef.current += deltaMs;
      setFallingItems((currentItems) => {
        const nextItems = [];
        const caughtEvents = [];
        const missedEvents = [];

        currentItems.forEach((item) => {
          const nextY = item.y + (item.speed * deltaSeconds);
          const itemLeft = item.x + ITEM_HITBOX_INSET;
          const itemRight = item.x + ITEM_SIZE - ITEM_HITBOX_INSET;
          const itemTop = nextY + ITEM_HITBOX_INSET;
          const itemBottom = nextY + ITEM_SIZE;
          const currentPlayerX = playerXRef.current;
          const playerTop = ZIP_GAME_AREA_HEIGHT - PLAYER_BOTTOM_OFFSET - PLAYER_HEIGHT;
          const basketHitboxLeft = currentPlayerX + BASKET_HITBOX_OFFSET_X;
          const basketHitboxRight = basketHitboxLeft + BASKET_HITBOX_WIDTH;
          const basketHitboxTop = playerTop + BASKET_HITBOX_OFFSET_Y;
          const basketHitboxBottom = basketHitboxTop + BASKET_HITBOX_HEIGHT;
          const intersectsBasket = itemRight >= basketHitboxLeft
            && itemLeft <= basketHitboxRight
            && itemBottom >= basketHitboxTop
            && itemTop <= basketHitboxBottom;

          if (intersectsBasket) {
            caughtEvents.push({ ...item, y: nextY });
            return;
          }

          if (nextY > MISS_LINE_Y) {
            missedEvents.push(item);
            return;
          }

          nextItems.push({ ...item, y: nextY });
        });

        while (spawnAccumulatorRef.current >= spawnIntervalMs && nextItems.length < concurrentFallingCount) {
          spawnAccumulatorRef.current -= spawnIntervalMs;
          itemIdRef.current += 1;
          const spawnedItem = makeFallingItem(
            activeRound,
            inventory,
            ZIP_GAME_AREA_WIDTH,
            fallSpeed,
            itemIdRef.current,
            0,
            {
              itemsOnScreen: nextItems,
              coinsSpawned: coinsSpawnedThisRoundRef.current,
            },
          );
          if (spawnedItem.kind === 'coin') {
            coinsSpawnedThisRoundRef.current += 1;
          }
          nextItems.push(spawnedItem);
        }

        if (caughtEvents.length > 0 || missedEvents.length > 0) {
          let caughtToken = false;
          let damageTaken = 0;
          let bonusDelta = 0;
          let coinDelta = 0;
          let simulatedLives = lives;
          let nextFruitCatchCount = fruitCatchCount;
          const nextInventory = [...inventory];
          let nextFeedbackMessage = feedbackMessage;
          let immediateFailure = null;
          let shouldEndCatchPhase = false;

          caughtEvents.forEach((item) => {
            if (item.kind === 'token') {
              if (!nextInventory.includes(item.value)) {
                nextInventory.push(item.value);
              }
              caughtToken = true;
              window.playCatchTokenSound?.();
              triggerCodeCatchEffect(item);
              if (hasCollectedTarget(nextInventory, activeRound.targetTokens)) {
                shouldEndCatchPhase = true;
              } else {
                itemIdRef.current += 1;
                const respawnY = resolveRespawnY(nextItems, levelNumber);
                const spawnedItem = makeFallingItem(
                  activeRound,
                  nextInventory,
                  ZIP_GAME_AREA_WIDTH,
                  fallSpeed,
                  itemIdRef.current,
                  respawnY,
                  {
                    itemsOnScreen: nextItems,
                    coinsSpawned: coinsSpawnedThisRoundRef.current,
                  },
                );
                if (spawnedItem.kind === 'coin') {
                  coinsSpawnedThisRoundRef.current += 1;
                }
                nextItems.push(spawnedItem);
              }
            } else if (item.kind === 'coin') {
              coinDelta += 1;
              window.playCatchCoinSound?.();
              itemIdRef.current += 1;
              const respawnY = resolveRespawnY(nextItems, levelNumber);
              const spawnedItem = makeFallingItem(
                activeRound,
                nextInventory,
                ZIP_GAME_AREA_WIDTH,
                fallSpeed,
                itemIdRef.current,
                respawnY,
                {
                  itemsOnScreen: nextItems,
                  coinsSpawned: coinsSpawnedThisRoundRef.current,
                },
              );
              if (spawnedItem.kind === 'coin') {
                coinsSpawnedThisRoundRef.current += 1;
              }
              nextItems.push(spawnedItem);
            } else if (item.kind === 'bonus') {
              window.playCatchFruitSound?.();
              if (comboCatchIdRef.current !== item.id) {
                comboCatchIdRef.current = item.id;
                const nextComboCount = comboStreakRef.current + 1;
                comboStreakRef.current = nextComboCount;
                bonusDelta += 5 * getGameFourComboMultiplier(nextComboCount);
                nextFruitCatchCount += 1;
                if ([3, 5, 10].includes(nextComboCount)) {
                  window.playGameFourComboSound?.();
                  triggerComboFeedback(nextComboCount);
                }
              }
              if (isTutorialLevel && tutorialStepIndex <= 1) {
                setTutorialStepIndex(2);
                setTutorialCoachOpen(true);
              }
              if (nextFruitCatchCount >= FRUITS_PER_EXTRA_LIFE) {
                nextFruitCatchCount = 0;
                if (simulatedLives < startingLives) {
                  simulatedLives = Math.min(startingLives, simulatedLives + 1);
                  nextFeedbackMessage = `Extra life gained! Lives: ${simulatedLives}/${startingLives}.`;
                } else {
                  nextFeedbackMessage = 'Fruit bonus ready, but lives are already full.';
                }
              } else {
                const remainingFruitCount = FRUITS_PER_EXTRA_LIFE - nextFruitCatchCount;
                nextFeedbackMessage = `Caught ${nextFruitCatchCount}/${FRUITS_PER_EXTRA_LIFE} fruits. Catch ${remainingFruitCount} more for an extra life.`;
              }
              itemIdRef.current += 1;
              const respawnY = resolveRespawnY(nextItems, levelNumber);
              const spawnedItem = makeFallingItem(
                activeRound,
                nextInventory,
                ZIP_GAME_AREA_WIDTH,
                fallSpeed,
                itemIdRef.current,
                respawnY,
                {
                  itemsOnScreen: nextItems,
                  coinsSpawned: coinsSpawnedThisRoundRef.current,
                },
              );
              if (spawnedItem.kind === 'coin') {
                coinsSpawnedThisRoundRef.current += 1;
              }
              nextItems.push(spawnedItem);
            } else if (item.kind === 'bomb') {
              window.playCatchBombSound?.();
              comboStreakRef.current = 0;
              comboCatchIdRef.current = null;
              damageTaken += 1;
              simulatedLives = Math.max(0, simulatedLives - 1);
              setScreenShake(true);
              setTimeout(() => setScreenShake(false), 500);
              if (isTutorialLevel && tutorialStepIndex <= 2) {
                setTutorialStepIndex(3);
                setTutorialCoachOpen(true);
              }
              if (simulatedLives <= 0 && isTutorialLevel) {
                simulatedLives = 1;
                nextFeedbackMessage = 'Tutorial safety: bombs teach damage here, but they cannot end practice.';
                itemIdRef.current += 1;
                const respawnY = resolveRespawnY(nextItems, levelNumber);
                const spawnedItem = makeFallingItem(
                  activeRound,
                  nextInventory,
                  ZIP_GAME_AREA_WIDTH,
                  fallSpeed,
                  itemIdRef.current,
                  respawnY,
                  {
                    itemsOnScreen: nextItems,
                    coinsSpawned: coinsSpawnedThisRoundRef.current,
                  },
                );
                if (spawnedItem.kind === 'coin') {
                  coinsSpawnedThisRoundRef.current += 1;
                }
                nextItems.push(spawnedItem);
              } else if (simulatedLives <= 0) {
                window.playGameOverSound?.();
                immediateFailure = 'Game over: no lives remaining.';
              } else {
                nextFeedbackMessage = `Bomb caught! ${simulatedLives}/${startingLives} lives remaining.`;
                itemIdRef.current += 1;
                const respawnY = resolveRespawnY(nextItems, levelNumber);
                const spawnedItem = makeFallingItem(
                  activeRound,
                  nextInventory,
                  ZIP_GAME_AREA_WIDTH,
                  fallSpeed,
                  itemIdRef.current,
                  respawnY,
                  {
                    itemsOnScreen: nextItems,
                    coinsSpawned: coinsSpawnedThisRoundRef.current,
                  },
                );
                if (spawnedItem.kind === 'coin') {
                  coinsSpawnedThisRoundRef.current += 1;
                }
                nextItems.push(spawnedItem);
              }
            }
          });

          missedEvents.forEach((item) => {
            if (item.kind === 'token') {
              if (isTutorialLevel) {
                nextFeedbackMessage = `Tutorial safety: ${item.value} respawned so you can try again.`;
                itemIdRef.current += 1;
                const respawnY = resolveRespawnY(nextItems, levelNumber);
                const spawnedItem = makeFallingItem(
                  activeRound,
                  nextInventory,
                  ZIP_GAME_AREA_WIDTH,
                  fallSpeed,
                  itemIdRef.current,
                  respawnY,
                  {
                    itemsOnScreen: nextItems,
                    coinsSpawned: coinsSpawnedThisRoundRef.current,
                    forceToken: item.value,
                  },
                );
                if (spawnedItem.kind === 'coin') {
                  coinsSpawnedThisRoundRef.current += 1;
                }
                nextItems.push(spawnedItem);
            } else {
              comboStreakRef.current = 0;
              comboCatchIdRef.current = null;
              damageTaken += 1;
              simulatedLives = Math.max(0, simulatedLives - 1);
              setScreenShake(true);
              setTimeout(() => setScreenShake(false), 500);

              if (simulatedLives <= 0) {
                window.playGameOverSound?.();
                immediateFailure = 'Game over: no lives remaining.';
              } else {
                nextFeedbackMessage = `Missed ${item.value}! ${simulatedLives}/${startingLives} lives remaining. It will fall again.`;
                itemIdRef.current += 1;
                const respawnY = resolveRespawnY(nextItems, levelNumber);
                const spawnedItem = makeFallingItem(
                  activeRound,
                  nextInventory,
                  ZIP_GAME_AREA_WIDTH,
                  fallSpeed,
                  itemIdRef.current,
                  respawnY,
                  {
                    itemsOnScreen: nextItems,
                    coinsSpawned: coinsSpawnedThisRoundRef.current,
                    forceToken: item.value,
                  },
                );
                if (spawnedItem.kind === 'coin') {
                  coinsSpawnedThisRoundRef.current += 1;
                }
                nextItems.push(spawnedItem);
              }
            }
            } else if (item.kind === 'bonus') {
              comboStreakRef.current = 0;
              comboCatchIdRef.current = null;
              itemIdRef.current += 1;
              const respawnY = resolveRespawnY(nextItems, levelNumber);
              const spawnedItem = makeFallingItem(
                activeRound,
                nextInventory,
                ZIP_GAME_AREA_WIDTH,
                fallSpeed,
                itemIdRef.current,
                respawnY,
                {
                  itemsOnScreen: nextItems,
                  coinsSpawned: coinsSpawnedThisRoundRef.current,
                },
              );
              if (spawnedItem.kind === 'coin') {
                coinsSpawnedThisRoundRef.current += 1;
              }
              nextItems.push(spawnedItem);
            } else {
              itemIdRef.current += 1;
              const respawnY = resolveRespawnY(nextItems, levelNumber);
              const spawnedItem = makeFallingItem(
                activeRound,
                nextInventory,
                ZIP_GAME_AREA_WIDTH,
                fallSpeed,
                itemIdRef.current,
                respawnY,
                {
                  itemsOnScreen: nextItems,
                  coinsSpawned: coinsSpawnedThisRoundRef.current,
                },
              );
              if (spawnedItem.kind === 'coin') {
                coinsSpawnedThisRoundRef.current += 1;
              }
              nextItems.push(spawnedItem);
            }
          });

          const updatedCoinBalance = coinDelta > 0 ? awardSharedCoins(coinDelta) : coins;

          if (immediateFailure) {
            // Stop background music when game ends
            if (backgroundMusicRef.current) {
              backgroundMusicRef.current.pause();
              backgroundMusicRef.current.currentTime = 0;
            }
            setFeedbackMessage(immediateFailure);
            setRoundFeedback(immediateFailure);
            setLocalOutcome(buildRoundCompleteState({
              roundsCleared,
              totalRounds,
              points,
              bonusPoints,
              mistakes: mistakes + Math.max(1, damageTaken),
              hintsUsed,
              coinsRemaining: updatedCoinBalance,
            }));
            return [];
          }

          if (bonusDelta > 0) {
            setBonusPoints((value) => value + bonusDelta);
          }
          if (nextFruitCatchCount !== fruitCatchCount) {
            setFruitCatchCount(nextFruitCatchCount);
          }
          if ((caughtEvents.length > 0 || missedEvents.length > 0) && nextFeedbackMessage) {
            setFeedbackMessage(nextFeedbackMessage);
          }
          if (damageTaken > 0) {
            setMistakes((value) => value + damageTaken);
          }
          if (simulatedLives !== lives) {
            setLives(simulatedLives);
          }
          if (caughtToken) {
            setInventory(nextInventory);
            if (shouldEndCatchPhase) {
              setAssemblyChoices(shuffleTokens(nextInventory));
              setMode('assemble');
              return [];
            }
          }
        }

        return nextItems;
      });

      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [
    activeRound,
    awardSharedCoins,
    fallSpeed,
    inventory,
    isSubmitting,
    isTutorialLevel,
    levelData,
    localOutcome,
    mode,
    moveSpeed,
    feedbackMessage,
    levelNumber,
    resultData,
    roundsCleared,
    showStoryline,
    showTutorial,
    shouldPauseForTutorialCoach,
    spawnIntervalMs,
    triggerCodeCatchEffect,
    triggerComboFeedback,
    totalRounds,
    concurrentFallingCount,
    points,
    bonusPoints,
    mistakes,
    hintsUsed,
    isGameplayActive,
    coins,
    fruitCatchCount,
    lives,
    startingLives,
    tutorialStepIndex,
  ]);

  useEffect(() => {
    if (localOutcome || resultData || isSubmitting) {
      return;
    }

    if (isGameplayActive && !isTutorialLevel && lives <= 0) {
      setLocalOutcome(buildRoundCompleteState({
        roundsCleared,
        totalRounds,
        points,
        bonusPoints,
        mistakes,
        hintsUsed,
        coinsRemaining: coins,
      }));
    }
  }, [bonusPoints, coins, hintsUsed, isGameplayActive, isSubmitting, isTutorialLevel, lives, localOutcome, mistakes, points, resultData, roundsCleared, totalRounds]);

  useEffect(() => {
    if (!isTutorialLevel || mode !== 'assemble' || localOutcome || resultData || isSubmitting) {
      return;
    }

    setTutorialStepIndex((current) => Math.max(current, 4));
    setTutorialCoachOpen(true);
  }, [isSubmitting, isTutorialLevel, localOutcome, mode, resultData]);

  useEffect(() => {
    if (!localOutcome || submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    onLevelComplete?.(localOutcome);
  }, [localOutcome, onLevelComplete]);

  const handleRevealHint = async () => {
    if (!activeRound || activeHints.length === 0) {
      setFeedbackMessage('No hint available for this level.');
      return;
    }

    if (revealedHintCount >= activeHints.length) {
      setHintMessage(activeHints.map((hint, index) => `Hint ${index + 1}: ${hint}`).join('\n'));
      setFeedbackMessage('All available hints are already shown.');
      return;
    }

    if (resolvedHintCost > 0 && coins < resolvedHintCost) {
      setFeedbackMessage(`You need at least ${resolvedHintCost} coin${resolvedHintCost === 1 ? '' : 's'} to use a hint.`);
      return;
    }

    const nextHintCount = Math.min(activeHints.length, revealedHintCount + 1);
    const fallbackHint = activeHints[nextHintCount - 1];

    setIsGeneratingHint(true);
    setFeedbackMessage('Creating a hint for your current answer...');

    let generatedHint = fallbackHint;
    try {
      const response = await levelAPI.generateGameHint('GAME_FOUR', levelNumber, {
        topic: activeRound.topic,
        objective: activeRound.prompt,
        availableTokens: assemblyChoices,
        assembledTokens,
        hintNumber: nextHintCount,
        fallbackHint,
      });
      generatedHint = String(response?.data?.hint || fallbackHint).trim() || fallbackHint;
    } catch {
      generatedHint = fallbackHint;
    } finally {
      setIsGeneratingHint(false);
    }

    if (resolvedHintCost > 0) {
      const spendResult = spendSharedCoins(1);
      if (!spendResult.success) {
        setFeedbackMessage('You need at least 1 coin to use a hint.');
        return;
      }
    }

    setFeedbackMessage('');
    setHintsUsed((value) => value + 1);
    setRevealedHintCount(nextHintCount);
    setHintMessage((current) => (
      [current, `Hint ${nextHintCount}: ${generatedHint}`].filter(Boolean).join('\n')
    ));
    window.playGameFourHintSound?.();
  };

  const handleResetAssembly = () => {
    setAssembledTokens([]);
    setDraggedAssemblyIndex(null);
    setIncorrectTokenIndexes([]);
    setHintMessage('');
    setFeedbackMessage('');
  };

  const handleAssembleToken = (token) => {
    if (!remainingAssemblyTokens.includes(token)) {
      return;
    }

    setAssembledTokens((current) => [...current, token]);
    setIncorrectTokenIndexes([]);
    setFeedbackMessage('');
  };

  const handleRemoveAssemblyToken = (index) => {
    setAssembledTokens((current) => current.filter((_, tokenIndex) => tokenIndex !== index));
    setIncorrectTokenIndexes([]);
    setFeedbackMessage('');
  };

  const handleReorderAssemblyToken = (targetIndex) => {
    if (draggedAssemblyIndex === null || draggedAssemblyIndex === targetIndex) {
      setDraggedAssemblyIndex(null);
      return;
    }

    setAssembledTokens((current) => {
      const next = [...current];
      if (targetIndex >= next.length) {
        const [movedToken] = next.splice(draggedAssemblyIndex, 1);
        next.push(movedToken);
      } else {
        [next[draggedAssemblyIndex], next[targetIndex]] = [next[targetIndex], next[draggedAssemblyIndex]];
      }
      return next;
    });
    setDraggedAssemblyIndex(null);
    setIncorrectTokenIndexes([]);
    setFeedbackMessage('');
  };

  const handleSubmitAssembly = () => {
    if (!activeRound) {
      return;
    }

    setHintMessage('');

    const isCorrect = assembledTokens.length === activeRound.targetTokens.length
      && assembledTokens.every((token, index) => token === activeRound.targetTokens[index]);

    if (!isCorrect) {
      window.playGameFourIncorrectAnswerSound?.();
      const mismatchedIndexes = assembledTokens.reduce((indexes, token, index) => {
        if (token !== activeRound.targetTokens[index]) indexes.push(index);
        return indexes;
      }, []);
      const missingCount = Math.max(0, activeRound.targetTokens.length - assembledTokens.length);
      setIncorrectTokenIndexes(mismatchedIndexes);

      if (missingCount > 0) {
        const misplacedText = mismatchedIndexes.length > 0
          ? ` ${mismatchedIndexes.length} placed piece${mismatchedIndexes.length === 1 ? ' is' : 's are'} also in the wrong position.`
          : '';
        setFeedbackMessage(
          `The statement is missing ${missingCount} code piece${missingCount === 1 ? '' : 's'}.${misplacedText}`,
        );
      } else {
        const nextLives = Math.max(0, lives - 1);
        const positionList = mismatchedIndexes.map((index) => index + 1).join(', ');
        setLives(nextLives);
        setMistakes((value) => value + 1);

        if (nextLives <= 0) {
          window.playGameOverSound?.();
          const failureMessage = 'Game over: no lives remaining.';
          setFeedbackMessage(failureMessage);
          setRoundFeedback(failureMessage);
          setLocalOutcome(buildRoundCompleteState({
            roundsCleared,
            totalRounds,
            points,
            bonusPoints,
            mistakes: mistakes + 1,
            hintsUsed,
            coinsRemaining: coins,
          }));
          return;
        }

        setFeedbackMessage(
          `Incorrect order. You lost 1 heart (${nextLives}/${startingLives} remaining). ${mismatchedIndexes.length} code piece${mismatchedIndexes.length === 1 ? ' is' : 's are'} out of place at position${mismatchedIndexes.length === 1 ? '' : 's'} ${positionList}. Drag the red pieces to reorder them.`,
        );
      }
      return;
    }

    window.playGameFourCorrectAnswerSound?.();
    setIncorrectTokenIndexes([]);
    const nextRoundsCleared = roundsCleared + 1;
    setRoundsCleared(nextRoundsCleared);
    setPoints((value) => value + statementReward);
    setRoundFeedback('You completed the Java code correctly!');
    setFeedbackMessage('');

    if (roundIndex >= totalRounds - 1) {
      setLocalOutcome(buildRoundCompleteState({
        roundsCleared: nextRoundsCleared,
        totalRounds,
        points: points + statementReward,
        bonusPoints,
        mistakes,
        hintsUsed,
        coinsRemaining: coins,
      }));
      return;
    }

    setRoundFeedback('');
    setHintMessage('');
    setFeedbackMessage('');
    setRoundIndex((value) => value + 1);
  };

  const hintDisplay = hintMessage || '';
  // Tutorial models only override rendering; real round state stays paused.
  const isAssembleMode = (activeDemo?.mode || mode) === 'assemble';
  const displayItems = activeDemo ? (activeDemo.item ? [{ ...activeDemo.item, id: 'tutorial-item', x: activeDemo.item.x * (ZIP_GAME_AREA_WIDTH - ITEM_SIZE), y: activeDemo.item.y * (ZIP_GAME_AREA_HEIGHT - ITEM_SIZE) }] : []) : fallingItems;
  const displayAssembled = activeDemo?.assembled || assembledTokens;
  const displayRemaining = activeDemo?.mode === 'assemble' ? activeDemo.remaining : remainingAssemblyTokens;
  const shouldShowTopHint = !isAssembleMode && Boolean(hintDisplay);
  const shouldShowTopFeedback = !isAssembleMode && Boolean(feedbackMessage);
  const hintButtonDisabled = activeHints.length === 0
    || revealedHintCount >= activeHints.length
    || isGeneratingHint
    || (resolvedHintCost > 0 && coins < resolvedHintCost);
  const hintButtonLabel = isGeneratingHint
    ? 'Creating Hint...'
    : activeHints.length === 0
    ? 'No Hints'
    : revealedHintCount >= activeHints.length
      ? 'All Hints Shown'
      : `Reveal Hint (-${resolvedHintCost} Coin${resolvedHintCost === 1 ? '' : 's'})`;
  const fruitsRemainingForLife = FRUITS_PER_EXTRA_LIFE - fruitCatchCount;
  const fruitProgressText = fruitCatchCount > 0
    ? `Caught ${fruitCatchCount}/${FRUITS_PER_EXTRA_LIFE} fruits. Catch ${fruitsRemainingForLife} more for an extra life.`
    : `Catch ${FRUITS_PER_EXTRA_LIFE} fruits for an extra life.`;
  const fruitSlots = Array.from({ length: FRUITS_PER_EXTRA_LIFE }, (_, index) => index < fruitCatchCount);
  const visualCounterScaleY = playfieldScale.y ? playfieldScale.x / playfieldScale.y : 1;
  return (
    <div ref={tutorialRootRef} className={clsx(
      'game-four-readable-ui game-four-stage relative overflow-visible border-[4px] border-[#70415f] bg-[#f5d98c] p-3 shadow-[10px_10px_0_#432644]',
      isAssembleMode && 'game-four-mode-assemble',
    )}>
      <div
        className="game-four-layout relative overflow-hidden bg-[#f5d98c] text-[#24192a]"
        style={{ aspectRatio: `${viewport.width} / ${viewport.height}` }}
      >
        <div className="flex h-full flex-col gap-3">
          <section className="game-four-header flex items-center justify-between gap-4 border-[3px] border-[#70415f] bg-[#fff3c8] px-4 py-3">
            <div>
              <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#70415f]">Game 4 Mission</p>
              <h2 className="text-3xl font-black leading-none text-[#24192a]">Catch the Falling Java Code</h2>
            </div>
            <div className="game-four-hud flex flex-wrap justify-end gap-2 text-sm font-black">
              <span className="game-four-hud-status game-four-level-status border-[3px] border-[#70415f] bg-[#fff7dc] px-3 py-2 shadow-[4px_4px_0_#432644]">
                <span className="game-four-hud-label">
                  {isAssembleMode ? (
                    <img src={GAME_FOUR_LEVEL_ICON} alt="" aria-hidden="true" className="game-four-hud-icon game-four-hud-image-icon" />
                  ) : (
                    <Star className="game-four-hud-icon fill-amber-300 text-amber-500" />
                  )}
                  <span className="game-four-hud-text">Level</span>
                </span>
                <strong className="game-four-hud-value">{isTutorialLevel ? 'Tutorial' : String(levelNumber).padStart(2, '0')}</strong>
              </span>
              {isTutorialLevel && (
                <span className="border-[3px] border-[#0f766e] bg-[#d9fff7] px-3 py-2 text-[#134e4a] shadow-[4px_4px_0_#432644]">
                  Tutorial: no game over
                </span>
              )}
              {isTutorialLevel && currentTutorialStep && (
                <span className="border-[3px] border-[#70415f] bg-[#fff7dc] px-3 py-2 shadow-[4px_4px_0_#432644]">
                  Step: {Math.min(tutorialStepIndex + 1, GAME_FOUR_TUTORIAL_STEPS.length)} / {GAME_FOUR_TUTORIAL_STEPS.length}
              </span>
              )}
              {!isAssembleMode && (
                <span className="game-four-hud-status game-four-coins-status border-[3px] border-[#70415f] bg-[#fff7dc] px-3 py-2 shadow-[4px_4px_0_#432644]">
                  <span className="game-four-hud-label">
                    <Coins className="game-four-hud-icon" />
                    Coins
                  </span>
                  <strong className="game-four-hud-value">{coins}</strong>
                </span>
              )}
              <span className="game-four-hud-status game-four-lives-status border-[3px] border-[#70415f] bg-[#fff7dc] px-3 py-2 shadow-[4px_4px_0_#432644]">
                <span className="game-four-hud-label">
                  {isAssembleMode ? (
                    <img src={GAME_FOUR_LIVES_ICON} alt="" aria-hidden="true" className="game-four-hud-icon game-four-hud-image-icon" />
                  ) : (
                    <Heart className="game-four-hud-icon fill-red-500 text-red-600" />
                  )}
                  <span className="game-four-hud-text">Lives</span>
                </span>
                <strong className="game-four-hud-value">{lives} / {startingLives}</strong>
              </span>
              {!isAssembleMode && (
                <button
                  type="button"
                  className="game-four-hud-status game-four-hud-tutorial-button"
                  onClick={() => {
                    setGuideOpenedDuringGameplay(true);
                    setTutorialView('guide');
                    setShowTutorial(true);
                  }}
                >
                  Guidelines
                </button>
              )}
              {!isAssembleMode && (
                <button
                  type="button"
                  className="game-four-hud-status game-four-hud-tutorial-button"
                  onClick={() => onTutorialRequest?.()}
                >
                  Game Tutorial
                </button>
              )}
              <span className="game-four-hud-status game-four-round-status border-[3px] border-[#70415f] bg-[#fff7dc] px-3 py-2 shadow-[4px_4px_0_#432644]">
                <span className="game-four-hud-label">
                  {isAssembleMode && (
                    <img src={GAME_FOUR_ROUND_ICON} alt="" aria-hidden="true" className="game-four-hud-icon game-four-hud-image-icon" />
                  )}
                  <span className="game-four-hud-text">Round</span>
                </span>
                <strong className="game-four-hud-value">
                  {Math.min(roundIndex + 1, Math.max(1, totalRounds))} / {Math.max(1, totalRounds)}
                </strong>
              </span>
            </div>
          </section>

          {!isAssembleMode ? (
            <div className="game-four-catch-layout grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-3">
              <aside className="game-four-sidebar grid content-start gap-3 border-[4px] border-[#70415f] bg-[#fff3c8] p-3 shadow-[8px_8px_0_rgba(67,38,68,0.8)]">
                <section className="game-four-objective-card border-[3px] border-[#70415f] bg-[#fff1b8] p-3">
                  <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#70415f]">Objective</p>
                  <h3 className="text-2xl font-black">{levelData?.title || 'Variable Catch Basics'}</h3>
                  <p className="mt-2 text-sm font-bold leading-relaxed">
                    {activeRound?.prompt || levelData?.objective || 'Collect the correct Java code parts and arrange them.'}
                  </p>
                </section>

                <section className="game-four-sidebar-movement-card">
                  <span className="game-four-sidebar-keyboard-icon" aria-hidden="true">⌨</span>
                  <p>Move with <span>A / D</span> or Arrow Keys.</p>
                </section>

                <section className="game-four-sidebar-gear-card" title={fruitProgressText}>
                  <div className="game-four-sidebar-gear-title">
                    <span>Gear</span>
                    <strong>{fruitCatchCount}/{FRUITS_PER_EXTRA_LIFE}</strong>
                  </div>
                  <div className="game-four-sidebar-gear-slots">
                    {fruitSlots.map((isFilled, index) => (
                      <span
                        key={`gear-sidebar-slot-${index}`}
                        className={clsx(
                          'game-four-sidebar-gear-slot',
                          !isFilled && 'is-empty',
                        )}
                      >
                        <img src={ORANGE_IMAGE} alt="" aria-hidden="true" />
                      </span>
                    ))}
                  </div>
                </section>

                <section className="game-four-sidebar-guide-card">
                  <p className="game-four-sidebar-guide-heading">Guide</p>
                  <p className="game-four-sidebar-guide-text">
                    Catch the correct code, avoid the bombs, and catch gears for extra lives!
                  </p>
                </section>

                {isTutorialLevel && (
                  <section className="game-four-tutorial-side-card">
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.18em]">Tutorial Guide</p>
                    <h3 className="text-xl font-black">{currentTutorialStep?.title || 'Practice'}</h3>
                    <p className="mt-2 text-sm font-bold leading-relaxed">
                      {currentTutorialStep?.body || 'Follow the prompts inside the play area.'}
                    </p>
                    <div className="mt-3 flex gap-1.5">
                      {GAME_FOUR_TUTORIAL_STEPS.map((step, index) => (
                        <span
                          key={step.title}
                          className={clsx(
                            'h-3 flex-1 border-2 border-[#134e4a]',
                            index <= tutorialStepIndex ? 'bg-[#14b8a6]' : 'bg-white',
                          )}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </section>
                )}

                <section className="game-four-side-actions border-[3px] border-[#70415f] bg-white p-3">
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      className="border-[3px] border-[#432644] bg-white px-3 py-2 text-sm font-black shadow-[3px_3px_0_#432644] transition hover:bg-slate-100"
                      onClick={onExitRequest}
                    >
                      <LogOut className="mr-1 inline h-4 w-4" aria-hidden="true" />
                      <span>Back</span>
                    </button>
                  </div>
                </section>
              </aside>

              <section
                ref={playfieldViewportRef}
                className={clsx('game-four-play-card relative overflow-hidden border-[4px] border-[#70415f] bg-[#fff3c8] p-2 shadow-[8px_8px_0_rgba(67,38,68,0.8)]', screenShake && 'screen-shake')}
              >
                <div
                  className="absolute inset-0 overflow-hidden"
                >
                  <img
                    src={GAME_FOUR_BACKGROUND_IMAGE}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div
                    className="relative origin-top-left overflow-hidden border-[3px] border-black bg-transparent"
                    style={{
                      width: `${ZIP_GAME_AREA_WIDTH}px`,
                      height: `${ZIP_GAME_AREA_HEIGHT}px`,
                      transform: `scale(${playfieldScale.x}, ${playfieldScale.y})`,
                    }}
                  >
                    {displayItems.map((item) => (
                      <div
                        key={item.id}
                        data-demo-falling={activeDemo ? '' : undefined}
                        data-demo-motion={activeDemo ? '' : undefined}
                        className="absolute flex items-center justify-center"
                        style={{
                          left: item.x,
                          top: item.y,
                          width: ITEM_SIZE,
                          height: ITEM_SIZE,
                        }}
                      >
                        {ITEM_IMAGE_BY_TYPE[item.value] ? (
                          <img
                            src={ITEM_IMAGE_BY_TYPE[item.value]}
                            alt={item.value}
                            className="h-[60px] w-[60px] object-contain"
                            style={{
                              transform: `scaleY(${visualCounterScaleY})`,
                              transformOrigin: 'center center',
                            }}
                          />
                        ) : (
                          <span className={clsx(
                            'rounded-md border border-black bg-[#222] px-4 py-2 text-[13px] font-black text-white shadow-[0_10px_18px_rgba(15,23,42,0.18)]',
                            item.kind === 'token'
                              ? ''
                              : 'bg-[#7a1f1f]',
                          )}
                          style={{
                            transform: `scaleY(${visualCounterScaleY})`,
                            transformOrigin: 'center center',
                          }}>
                            {item.value}
                          </span>
                        )}
                      </div>
                    ))}

                    {catchEffects.map((effect) => (
                      <div
                        key={effect.id}
                        className="code-catch-effect"
                        style={{
                          left: effect.x,
                          top: effect.y,
                        }}
                      >
                        {effect.sparks.map((spark, index) => (
                          <span
                            key={`${effect.id}-spark-${index}`}
                            className="code-spark absolute flex h-8 min-w-8 items-center justify-center rounded px-1 text-[11px] font-black"
                            style={{
                              '--tx': `${spark.tx}px`,
                              '--ty': `${spark.ty}px`,
                              animationDelay: `${spark.delay}ms`,
                            }}
                          >
                            {spark.symbol}
                          </span>
                        ))}
                        <span className="code-score-pop absolute left-0 top-6 whitespace-nowrap px-2 py-1 text-sm font-black">
                          +1 {effect.value}
                        </span>
                      </div>
                    ))}

                    {comboFeedback && (
                      <div key={comboFeedback.id} className="game-four-combo-feedback" aria-hidden="true">
                        <span className="game-four-combo-burst" aria-hidden="true" />
                        <span className="game-four-combo-line" aria-hidden="true">
                          <strong className="game-four-combo-number">{comboFeedback.count}</strong>
                          <span className="game-four-combo-word">COMBO</span>
                        </span>
                        <strong className="game-four-combo-multiplier" aria-hidden="true">×{comboFeedback.multiplier}</strong>
                      </div>
                    )}

                    <div
                      className="game-four-catcher absolute"
                      data-demo-motion={activeDemo ? '' : undefined}
                      style={{ left: activeDemo ? activeDemo.player * (ZIP_GAME_AREA_WIDTH - PLAYER_WIDTH) : playerX, bottom: `${PLAYER_BOTTOM_OFFSET}px`, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}
                    >
                      <span
                        className="game-four-catcher-target pointer-events-none absolute bottom-0"
                        style={{
                          left: BASKET_HITBOX_OFFSET_X,
                          width: BASKET_HITBOX_WIDTH,
                          height: PLAYER_HEIGHT,
                        }}
                        aria-hidden="true"
                      />
                      <img
                        src={PLAYER_IMAGE}
                        alt="Catcher"
                        className="game-four-catcher-sprite h-full w-full object-contain"
                        style={{
                          transform: `scaleY(${visualCounterScaleY})`,
                          transformOrigin: 'center bottom',
                        }}
                      />
                    </div>

                  </div>
                </div>
              </section>
            </div>
          ) : (
            <section
              className="game-four-arrange-shell grid min-h-0 flex-1 grid-cols-1 border-[4px] border-[#70415f] bg-[#fff8df] p-3 shadow-[8px_8px_0_rgba(67,38,68,0.8)]"
              style={{ '--game-four-arrange-bg': `url(${GAME_FOUR_ARRANGE_BACKGROUND_IMAGE})` }}
            >
              <div className="game-four-arrange-card border-[3px] border-[#70415f] bg-white/80 p-3">
                <div className="game-four-arrange-header">
                  <div>
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#70415f]">Arrange Phase</p>
                    <h3 className="text-3xl font-black">Arrange the Java Code</h3>
                    <p className="mt-1 text-base font-bold">Click the collected parts in the correct order to compile the declaration.</p>
                  </div>
                  <div className="game-four-arrange-coins" aria-label={`Coins ${coins}`}>
                    <Coins className="game-four-arrange-coins-icon" />
                    <span>Coins</span>
                    <strong>{coins}</strong>
                  </div>
                </div>

                <div
                  className="game-four-assembly-output mt-4 flex min-h-[92px] flex-wrap items-center gap-3 border-[3px] border-dashed border-[#70415f] bg-gradient-to-br from-[#fffdf1] to-[#fff1c8] p-4"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleReorderAssemblyToken(assembledTokens.length)}
                >
                  {displayAssembled.length > 0 ? displayAssembled.map((token, index) => (
                    <span
                      key={`${token}-${index}`}
                      className={clsx(
                        'game-four-assembled-token border-[3px] border-[#432644] px-4 py-3 text-base font-black shadow-[4px_4px_0_rgba(67,38,68,0.45)]',
                        index === 0 ? 'bg-[#dff8e9]' : token.match(/^\d+|^"/) ? 'bg-[#ffe7a3]' : 'bg-[#e9f7ff]',
                        token === activeRound?.targetTokens?.[index] && 'is-correct-position',
                        incorrectTokenIndexes.includes(index) && 'is-wrong-position',
                      )}
                      draggable
                      role="button"
                      tabIndex={0}
                      title="Drag to reorder, or click to return this piece"
                      onDragStart={() => setDraggedAssemblyIndex(index)}
                      onDragEnd={() => setDraggedAssemblyIndex(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.stopPropagation();
                        handleReorderAssemblyToken(index);
                      }}
                      onClick={() => handleRemoveAssemblyToken(index)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleRemoveAssemblyToken(index);
                        }
                      }}
                    >
                      {token}
                    </span>
                  )) : null}
                </div>

                <p className="game-four-token-label mt-5 text-xs font-black uppercase tracking-[0.14em] text-[#70415f]">
                  Available code pieces
                  <span className="mt-1 block normal-case tracking-normal">Drag pieces to reorder them. Click an assembled piece to return it.</span>
                </p>
                <div className="game-four-token-bank mt-3 flex flex-wrap justify-center gap-3">
                  {displayRemaining.length > 0 ? displayRemaining.map((token, index) => (
                    <button
                      key={`${token}-${index}`}
                      type="button"
                      onClick={() => handleAssembleToken(token)}
                      className="border-[3px] border-[#432644] bg-[#e9f7ff] px-4 py-2 text-base font-black shadow-[4px_4px_0_rgba(67,38,68,0.55)] transition hover:bg-[#d6efff]"
                    >
                      {token}
                    </button>
                  )) : (
                    <span className="text-sm font-bold text-slate-600">No more tokens left for this round.</span>
                  )}
                </div>

                <div className="game-four-arrange-actions mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmitAssembly}
                    className="game-four-check-answer-button border-[3px] border-[#432644] bg-[#dff3ff] px-5 py-3 text-base font-black shadow-[4px_4px_0_#432644] transition hover:bg-[#cbe9f7]"
                  >
                    Check Answer
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAssembly}
                    className="game-four-reset-answer-button border-[3px] border-[#432644] bg-white px-5 py-3 text-base font-black shadow-[4px_4px_0_#432644] transition hover:bg-slate-100"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleRevealHint}
                    className="border-[3px] border-[#432644] bg-white px-5 py-3 text-base font-black shadow-[4px_4px_0_#432644] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                    disabled={hintButtonDisabled}
                  >
                    {hintButtonLabel}
                  </button>
                </div>

                <div className="game-four-arrange-feedback mt-5 min-h-[58px] border-[3px] border-[#70415f] bg-[#fffdf1] p-3 text-center">
                    {hintDisplay && (
                      <p className="whitespace-pre-line text-sm font-black text-[#0f8f6f]">{hintDisplay}</p>
                    )}
                    {feedbackMessage && (
                      <p className="mt-1 text-sm font-bold text-[#24192a]">{feedbackMessage}</p>
                    )}
                </div>
              </div>
            </section>
          )}
        </div>

        <AnimatePresence>
          {shouldPauseForTutorialCoach && currentTutorialStep && (
            <motion.div
              className="absolute inset-0 z-40 flex items-center justify-center bg-[#24192a]/55 px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="game-four-tutorial-step-card w-full max-w-xl border-[4px] border-[#432644] bg-[#fff8df] p-5 text-[#24192a] shadow-[10px_10px_0_rgba(67,38,68,0.8)]"
                initial={{ y: 16, scale: 0.96, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 10, scale: 0.98, opacity: 0 }}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">
                      Tutorial Step {Math.min(tutorialStepIndex + 1, GAME_FOUR_TUTORIAL_STEPS.length)} of {GAME_FOUR_TUTORIAL_STEPS.length}
                    </p>
                    <h3 className="mt-1 text-3xl font-black">{currentTutorialStep.title}</h3>
                  </div>
                  <span className="shrink-0 border-[3px] border-[#0f766e] bg-[#d9fff7] px-3 py-2 text-sm font-black text-[#134e4a]">
                    Safe practice
                  </span>
                </div>

                <p className="text-base font-bold leading-relaxed">{currentTutorialStep.body}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="game-four-tutorial-step-stat border-[3px] border-[#70415f] bg-white p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#70415f]">Lives</p>
                    <p className="mt-1 text-lg font-black">
                      {lives}/{startingLives} remaining
                    </p>
                  </div>
                  <div className="game-four-tutorial-step-stat border-[3px] border-[#70415f] bg-white p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#70415f]">Fruit Meter</p>
                    <p className="mt-1 text-lg font-black">
                      {fruitCatchCount}/{FRUITS_PER_EXTRA_LIFE} caught
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex flex-1 gap-1.5">
                    {GAME_FOUR_TUTORIAL_STEPS.map((step, index) => (
                      <span
                        key={`tutorial-modal-${step.title}`}
                        className={clsx(
                          'h-3 flex-1 border-2 border-[#432644]',
                          index <= tutorialStepIndex ? 'bg-[#14b8a6]' : 'bg-white',
                        )}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      className="border-[3px] border-[#432644] bg-[#dff3ff] px-5 py-3 text-base font-black shadow-[4px_4px_0_#432644] transition hover:bg-[#cbe9f7]"
                      onClick={handleContinueTutorialStep}
                    >
                      {currentTutorialStep.buttonLabel}
                    </button>
                    <TutorialActionHand />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {renderScreenModal(
          <AnimatePresence>
            {showStoryline && currentStoryPage && (
              <motion.div
                className="game-guide-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="game-four-story-card"
                  initial={{ opacity: 0, y: 14, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="student-mini-kicker">Catch The Code Story</p>
                      <h3 className="text-2xl font-black text-[#24192a]">
                        Page {storyPageIndex + 1} of {GAME_FOUR_STORY_PAGES.length}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onExitRequest}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>Back</span>
                    </button>
                  </div>

                  <div className="game-four-story-image-wrap">
                    <img
                      src={currentStoryPage}
                      alt={`Catch the Code story page ${storyPageIndex + 1}`}
                      className="game-four-story-image"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                      {GAME_FOUR_STORY_PAGES.map((_, index) => (
                        <span
                          key={`story-dot-${index}`}
                          className={clsx(
                            'h-3 w-3 border-2 border-[#432644]',
                            index === storyPageIndex ? 'bg-[#2563eb]' : 'bg-white',
                          )}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleAdvanceStoryline}
                    >
                      {isLastStoryPage ? 'Start Level' : 'Next'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {!showStoryline && showTutorial && (
              <motion.div
                className="actual-game-tutorial-motion"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {showGuide ? (
                  <GameGuideOverlay
                    kicker={guideContent.kicker}
                    title={guideContent.title}
                    lead={guideContent.lead}
                    summary={guideContent.summary}
                    sections={guideContent.sections}
                    onExit={guideOpenedDuringGameplay ? () => {
                      setGuideOpenedDuringGameplay(false);
                      setTutorialView(null);
                      setShowTutorial(false);
                    } : onExitRequest}
                    onStart={() => {
                      if (guideOpenedDuringGameplay) {
                        setGuideOpenedDuringGameplay(false);
                        setTutorialView(null);
                        setShowTutorial(false);
                        return;
                      }
                      if (continueToTutorialAfterGuide) {
                        setTutorialView('practice');
                      } else {
                        setTutorialView(null);
                        setShowTutorial(false);
                      }
                    }}
                    startLabel={guideOpenedDuringGameplay ? 'Continue' : 'Next'}
                  />
                ) : null}
                {showPracticeIntro ? (
                  <GameFourInteractiveTutorial
                    onDemo={setTutorialDemo}
                    rootRef={tutorialRootRef}
                    isFirstPlay={continueToTutorialAfterGuide && !gameTutorialRequested}
                    tokens={activeRound?.targetTokens || []}
                    assets={{ player: PLAYER_IMAGE, bomb: BOMB_IMAGE, coin: COIN_IMAGE, bonus: [BANANA_IMAGE, CARROT_IMAGE, ORANGE_IMAGE], background: GAME_FOUR_BACKGROUND_IMAGE, arrangeBackground: GAME_FOUR_ARRANGE_BACKGROUND_IMAGE }}
                    hintCost={resolvedHintCost}
                    maxLives={startingLives}
                    levelNumber={levelData?.levelNumber || 1}
                    onExit={onExitRequest}
                    onStart={() => {
                      setTutorialView(null);
                      setShowTutorial(false);
                    }}
                  />
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>,
        )}

        <AnimatePresence>
          {!hideResultOverlay && (localOutcome || resultData || isSubmitting) && !showStoryline && !showTutorial && (
            <motion.div
              className="game-four-result-backdrop absolute inset-0 z-50 flex items-center justify-center bg-black/45 px-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="game-four-result-card w-full max-w-xl border-[4px] border-slate-900 bg-white p-7 text-slate-900 shadow-[0_20px_45px_rgba(15,23,42,0.25)]"
                initial={{ y: 18, scale: 0.97, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 12, scale: 0.98, opacity: 0 }}
              >
                {isSubmitting ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8 text-center text-slate-900">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
                    <p className="text-lg font-black">Submitting your Game 4 run...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {(resultData?.result === 'COMPLETED' || localOutcome?.outcome === 'COMPLETED')
                        ? <CheckCircle2 className="h-8 w-8 text-green-700" />
                        : <XCircle className="h-8 w-8 text-red-700" />}
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Game Four Result</p>
                        <h3 className="text-3xl font-black text-slate-900">
                          {isTutorialLevel && localOutcome?.outcome === 'COMPLETED'
                            ? 'Tutorial Complete'
                            : (resultData?.result === 'COMPLETED' || localOutcome?.outcome === 'COMPLETED')
                            ? 'You Finished All Levels!'
                            : 'Game Over'}
                        </h3>
                      </div>
                    </div>

                    {isTutorialLevel && localOutcome?.outcome === 'COMPLETED' && (
                      <p className="mt-4 border-2 border-[#0f766e] bg-[#d9fff7] p-4 text-base font-black text-[#134e4a]">
                        Nice practice run. Press Start Level 1 to begin the real level.
                      </p>
                    )}

                    {roundFeedback && (
                      <p className="mt-4 text-lg font-bold text-slate-800">{roundFeedback}</p>
                    )}

                    <div className="game-four-result-stats mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="border-2 border-slate-900 bg-[#f8f8f8] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Rounds Cleared</p>
                        <p className="mt-2 text-3xl font-black text-slate-900">{localOutcome?.roundsCleared ?? roundsCleared}</p>
                      </div>
                      <div className="border-2 border-slate-900 bg-[#f8f8f8] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Total Score</p>
                        <p className="mt-2 text-3xl font-black text-slate-900">{points + bonusPoints}</p>
                      </div>
                      <div className="border-2 border-slate-900 bg-[#f8f8f8] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Mistakes</p>
                        <p className="mt-2 text-3xl font-black text-slate-900">{mistakes}</p>
                      </div>
                      <div className="border-2 border-slate-900 bg-[#f8f8f8] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Hints Used</p>
                        <p className="mt-2 text-3xl font-black text-slate-900">{hintsUsed}</p>
                      </div>
                    </div>

                    <div className="game-four-result-actions mt-6 flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        className="border-2 border-slate-900 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-100"
                        onClick={onBack || onExitRequest}
                      >
                        Levels
                      </button>
                      <button
                        type="button"
                        className="border-2 border-slate-900 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-100"
                        onClick={onRetry}
                      >
                        Retry
                      </button>
                      {isTutorialLevel && localOutcome?.outcome === 'COMPLETED' ? (
                        <button
                          type="button"
                          className="border-2 border-slate-900 bg-[#dff3ff] px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-[#cbe9f7]"
                          onClick={onStartRealLevel}
                        >
                          Start Level 1
                        </button>
                      ) : canAdvanceLevel && (
                        <button
                          type="button"
                          className="border-2 border-slate-900 bg-[#dff3ff] px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-[#cbe9f7]"
                          onClick={onNextLevel}
                        >
                          Next Level
                        </button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

          <AnimatePresence>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameCanvasGameFour;
