import coreNexusImage from '../assets/storyline/itechs-core-nexus.png';
import corruptedPortalsImage from '../assets/storyline/mission-corrupted-portals.png';
import repairBayImage from '../assets/storyline/mission-repair-bay.png';
import memoryArchiveImage from '../assets/storyline/mission-memory-archive.png';
import coreCompilerImage from '../assets/storyline/mission-core-compiler.png';

const storyAsset = (world, file) => new URL(`../assets/story/${world}/${file}`, import.meta.url).href;
const legacyStoryAsset = (file) => new URL(`../../assets/story/${file}`, import.meta.url).href;
const legacySrcStoryAsset = (file) => new URL(`../assets/story/${file}`, import.meta.url).href;

export const STORY_WORLD = Object.freeze({
  title: 'iTECHS Core Quest',
  eyebrow: 'Level Journey',
  image: coreNexusImage,
  shortSummary: 'Clear colorful tech stops one level at a time and bring the iTECHS Core back to life.',
  summary: 'The iTECHS map is split into playful tech zones. Each level is a stop on the journey: clear the challenge, collect a core chip, and open the path to the next stop until the whole learning world lights up again.',
  progressLabel: 'Map restored',
});

const WORLD_META = Object.freeze({
  GAME_ONE: {
    world: 'world1',
    title: 'The Frozen Pathways',
    gameName: '2D Platformer',
    oldImage: corruptedPortalsImage,
  },
  GAME_TWO: {
    world: 'world2',
    title: 'The Assembly Fortress',
    gameName: 'Drag-and-Drop Game',
    oldImage: repairBayImage,
  },
  GAME_THREE: {
    world: 'world3',
    title: 'The Memory Veil',
    gameName: 'Memory Card Game',
    oldImage: memoryArchiveImage,
  },
  GAME_FOUR: {
    world: 'world4',
    title: 'Code Catcher',
    gameName: 'Catch and Arrange Syntax',
    oldImage: coreCompilerImage,
  },
  GAME_FIVE: {
    world: 'world5',
    title: 'Code Robot',
    gameName: 'Guess the Word',
    oldImage: coreCompilerImage,
  },
  GAME_SIX: {
    world: 'world6',
    title: 'The Blizzard Terminal',
    gameName: 'Typing Game',
    oldImage: coreNexusImage,
  },
  DEFAULT: {
    world: 'world1',
    title: 'The Frozen Pathways',
    gameName: 'Learning Game',
    oldImage: coreNexusImage,
  },
});

const INTRO_PAGES = Object.freeze({
  GAME_ONE: [
    {
      speaker: 'Aeris',
      text: `Snow fell endlessly from the gray skies as Aeris slowly opened their eyes.

The sound of static echoed through the frozen forest.

Broken monitors were buried beneath thick snow, while old cables hung from dead trees like vines. Somewhere in the distance, alarms continuously beeped.`,
    },
    {
      speaker: 'Byte',
      text: `A small glowing fox suddenly appeared beside Aeris.

"Finally… you're awake," the creature said softly.

Aeris stepped back in shock.

"What… are you?"

"My name is Byte. I was created by the iTECHS Core System before the kingdom collapsed."`,
    },
    {
      speaker: 'Byte',
      text: `Byte looked toward the ruined city ahead.

"Null has frozen this world. If the crystal fragments are not recovered soon, every memory of programming and technology will disappear forever."

The cold wind suddenly became stronger.

From the snow, corrupted shadow creatures slowly emerged.

Their bodies flickered like broken code.`,
    },
    {
      speaker: 'Byte',
      text: `Byte's ears lowered.

"They found us already…"

Aeris clenched their fists.

"I don't even know why I'm here."

Byte smiled faintly.

"Maybe not yet. But the system chose you for a reason."

The gates of the frozen city slowly opened.

And so, the journey began.`,
    },
  ],

  GAME_TWO: [
    {
      speaker: 'Byte',
      imageFile: 'bg1.png',
      text: `Deep beneath the frozen city stood the Assembly Fortress.

Massive machines slept under layers of ice.

Mechanical arms twitched occasionally as if trying to wake up.`,
    },
    {
      speaker: 'Aeris',
      imageFile: 'bg2.png',
      text: `Aeris stepped carefully across the metal floor.

Every footstep echoed through the empty fortress.

Broken computer parts were scattered everywhere, half-buried in snow and dust.`,
    },
    {
      speaker: 'Byte',
      imageFile: 'bg3.png',
      text: `Byte carefully scanned the area.

"This fortress used to build the kingdom's technology."

Aeris walked closer to a frozen motherboard the size of a wall.

"But now… everything's broken."`,
    },
    {
      speaker: 'Aeris',
      imageFile: 'bg4.png',
      text: `The lights above them flickered.

Somewhere inside the fortress, a machine groaned like it was waking from a long sleep.

Aeris looked at Byte and waited for the next warning.`,
    },
    {
      speaker: 'Aeris',
      imageFile: 'bg1.png',
      text: `Suddenly, screens lit up around the room.

ERROR. SYSTEM FAILURE. COMPONENTS MISSING.

The fortress began shaking violently.

"If we can restore the systems," Byte said, "the next path may open."`,
    },
    {
      speaker: 'Byte',
      imageFile: 'bg2.png',
      text: `Aeris looked at the scattered parts.

Each missing component seemed to belong somewhere important.

Byte pointed toward the frozen workbench. "Start there."`,
    },
    {
      speaker: 'Byte',
      imageFile: 'bg3.png',
      text: `Aeris placed their hand on the frozen machine.

The ancient technology slowly responded.

Somewhere inside the darkness…

something awakened.`,
    },
    {
      speaker: 'Byte',
      imageFile: 'bg4.png',
      text: `The fortress doors unlocked one by one.

To move forward, Aeris would need to rebuild the system piece by piece.

The first challenge was about to begin.`,
    },
  ],

  GAME_THREE: [
    {
      speaker: 'Byte',
      text: `The next world was silent.

Too silent.

Snow covered an endless library filled with floating cards and shattered photographs.

Whenever Aeris tried reading the books, the pages were blank.`,
    },
    {
      speaker: 'Byte',
      text: `Byte looked around sadly.

"This is the Memory Veil…"

"The place where people's knowledge and memories were stored."

Aeris picked up a frozen card showing an old classroom.

"But why are they disappearing?"

Byte lowered his head.

"Null began erasing them."`,
    },
    {
      speaker: 'Aeris',
      text: `The floating cards suddenly scattered through the air.

Whispers echoed everywhere.

Forgotten voices.

Forgotten names.

Forgotten lessons.`,
    },
    {
      speaker: 'Byte',
      text: `"If the memories vanish completely," Byte whispered, "the kingdom will never recover."

The cards drifted silently through the frozen library.

And somewhere in the dark shelves…

something was waiting.`,
    },
  ],

  GAME_FOUR: [
    {
      speaker: 'Byte',
      text: `Snowflakes drifted endlessly inside the ancient temple.

Lines of glowing syntax floated through the cold air like magic.

Each piece of code disappeared if not caught in time.`,
    },
    {
      speaker: 'Byte',
      text: `Byte looked amazed.

"This temple controls the logic flow of Cryonix."

Aeris reached toward a floating syntax fragment.

The moment they touched it, glowing symbols filled the room.`,
    },
    {
      speaker: 'Byte',
      text: `"If the syntax becomes unstable," Byte warned, "the entire system could collapse."

Suddenly, corrupted code rained from the ceiling.

ERRORS spread across the walls.`,
    },
    {
      speaker: 'Aeris',
      text: `And somewhere deep within the temple…

a voice whispered through the storm.

"Fix the code… before the world freezes forever."`,
    },
  ],

  GAME_FIVE: [
    {
      speaker: 'Aeris',
      text: `Aeris and Byte arrived in a peaceful snow village.

Or at least… what remained of it.

The houses were frozen solid.

No voices. No laughter. Only cold wind.`,
    },
    {
      speaker: 'Byte',
      text: `At the center of the village sat a small snowman wearing a cracked scarf.

Unlike the others, it was still alive.

The snowman looked weakly at Aeris.

"My name… I can't remember it anymore…"`,
    },
    {
      speaker: 'Byte',
      text: `Byte frowned.

"The blizzard is stealing words now."

The snowman's body slowly began crumbling.

"If forgotten completely," Byte whispered, "he may disappear forever."`,
    },
    {
      speaker: 'Sol',
      text: `The snowman looked up at Aeris with fading hope.

"Please… help me remember who I am…"

The wind grew colder.

And the village grew quieter still.`,
    },
  ],

  GAME_SIX: [
    {
      speaker: 'Byte',
      text: `The final world was hidden above the clouds.

A giant frozen terminal floated in the middle of the storm.

Every snowflake carried glowing letters and words.`,
    },
    {
      speaker: 'Byte',
      text: `Byte stared upward nervously.

"This is where the Core Crystal once controlled all communication."

Aeris watched thousands of words flying through the air.

"But everything's moving too fast…"`,
    },
    {
      speaker: 'Byte',
      text: `"The blizzard is rewriting the system," Byte answered.

"If we cannot stabilize the words…"

He looked toward the dark sky.

"…Cryonix will be erased permanently."`,
    },
    {
      speaker: 'Aeris',
      text: `Suddenly, warning messages filled the air.

FINAL SYSTEM FAILURE IMMINENT.

And the storm became louder than ever before.`,
    },
  ],
});

const OUTRO_PAGES = Object.freeze({
  GAME_ONE: [
    {
      speaker: 'Null',
      text: `Aeris finally reached the top of the abandoned clock tower overlooking the frozen kingdom.

The storm had grown violent.

Snow and corrupted data spiraled through the sky like a tornado.

Byte stared silently at the glowing shard floating ahead.

"The first crystal fragment…"

Before Aeris could touch it, the air distorted.

A tall figure appeared from the darkness. Half human. Half corrupted machine.

Its glowing red eyes locked onto Aeris.

"So… the system found a replacement."`,
    },
    {
      speaker: 'Null',
      text: `Aeris stepped back.

"You're Null?"

The figure laughed coldly.

"No. I was once like you."

The figure raised its hand, revealing corrupted code spreading across its arm.

"I tried to save this world too."

Lightning flashed across the sky.

"But knowledge only brought pain."`,
    },
    {
      speaker: 'Null',
      text: `The crystal fragment suddenly shattered into light and disappeared into Aeris' system.

WARNING messages flashed everywhere.

Null's voice echoed across the tower.

"Keep searching for the fragments if you want…"

"But every answer comes with a price."`,
    },
  ],

  GAME_TWO: [
    {
      speaker: 'Byte',
      text: `The final chamber of the fortress was unlike the others.

The room glowed blue from frozen energy cores.

Thousands of dismantled machines covered the floor.

At the center stood a giant frozen robot.

Byte's voice trembled.

"That machine protected the kingdom during the First Collapse…"

Aeris noticed strange carvings beneath the ice.

"Why was it abandoned?"`,
    },
    {
      speaker: 'Byte',
      text: `Before Byte could answer, the robot's eyes suddenly glowed red.

SYSTEM CORRUPTED.

Its frozen body slowly moved.

The ground cracked beneath Aeris' feet.

Byte looked terrified.

"Null infected the guardian…"

The robot pointed toward Aeris.

"UNAUTHORIZED USER DETECTED."

Snow exploded through the chamber as the ancient machine awakened from its icy prison.`,
    },
  ],

  GAME_THREE: [
    {
      speaker: 'Byte',
      text: `At the center of the library stood a giant frozen mirror.

Inside it, Aeris could see flashes of their own memories.

A classroom. A computer lab. Late nights studying code.

Byte stared at the reflection.

"The veil is reacting to you…"

Suddenly, the mirror glitched violently.

Another version of Aeris appeared inside it. But its eyes glowed red.`,
    },
    {
      speaker: 'Aeris',
      text: `"You still don't understand, do you?" the reflection said.

Aeris froze.

"What are you talking about?"

The reflection touched the glass.

"You were connected to Null long before this journey began."

The entire library began shaking.

Cards flew everywhere like a snowstorm.

And the mirror slowly cracked.`,
    },
  ],

  GAME_FOUR: [
    {
      speaker: 'Byte',
      text: `The heart of the temple pulsed like a living computer.

Frozen syntax floated around a massive glowing core.

But something was wrong. The code patterns had become unstable. Broken. Corrupted.

Byte's expression darkened.

"Null has infected the system language itself…"`,
    },
    {
      speaker: 'Byte',
      text: `Aeris slowly walked toward the core.

Then the temple suddenly spoke.

"INPUT DETECTED."

A giant holographic face appeared above them.

"I once protected the knowledge of this kingdom."

Its voice became distorted.

"But now… I can no longer tell which code is correct."

Snowstorms burst through the temple.

Syntax fragments scattered violently through the air.

And the core began breaking apart.`,
    },
  ],

  GAME_FIVE: [
    {
      speaker: 'Sol',
      text: `The village was nearly gone.

The storm had consumed almost everything.

Only the snowman remained.

But now half of his body had become corrupted ice.

Aeris ran toward him.

"We found the final memory word!"

The snowman smiled weakly.

"I remember now…"

Snow began glowing around the village.

"My name is Sol…"

Byte's eyes widened.

"Sol was one of the Core Guardians."`,
    },
    {
      speaker: 'Null',
      text: `Suddenly, dark ice spread across the ground.

A deep voice echoed through the storm.

"You should have left him forgotten."

Null appeared from the blizzard itself.

The snowman protected Aeris despite barely standing.

"You… will not erase them again…"

The storm exploded around them.`,
    },
  ],

  GAME_SIX: [
    {
      speaker: 'Null',
      text: `At the top of the Blizzard Terminal stood the final crystal fragment.

The entire sky flickered like a broken screen.

Null finally appeared before Aeris completely.

Not as a monster.

But as a former student wearing the same academy uniform.

Snow fell silently between them.

"You know what the cruelest part is?" Null asked quietly.

"We only wanted knowledge to help people."`,
    },
    {
      speaker: 'Null',
      text: `Aeris tightened their grip.

"Then why destroy everything?"

Null looked at the frozen kingdom below.

"Because humans destroyed themselves with it first."

The final fragment slowly floated toward Aeris.

Byte whispered softly: "This is the end of the journey…"

Null raised his hand.

"Then prove to me this world deserves to be saved."

The storm exploded into a blinding white light.

And the final battle began.`,
    },
  ],
});

const characterForSpeaker = (speaker) => {
  if (speaker === 'Null') return 'null.png';
  if (speaker === 'Aeris') return 'aeris.png';
  if (speaker === 'Sol') return 'byte.png';
  return 'byte.png';
};

const buildPages = (gameType, mode) => {
  const key = String(gameType || '').toUpperCase();
  const meta = WORLD_META[key] || WORLD_META.DEFAULT;
  let sources = mode === 'intro'
    ? (INTRO_PAGES[key] || INTRO_PAGES.GAME_ONE)
    : (OUTRO_PAGES[key] || OUTRO_PAGES.GAME_ONE);
  const zipOutroWorlds = new Set(['GAME_ONE', 'GAME_FOUR', 'GAME_FIVE', 'GAME_SIX']);
  const legacyComicIntroFrames = {
    GAME_ONE: ['w1(1).png', 'w2.png', 'w3.png', 'w4.png', 'w5.png', 'w6.png', 'w7.png', 'w8(1).png'],
    GAME_FIVE: ['r1.png', 'r2.png', 'r3.png', 'r4.png', 'r5.png', 'r6.png', 'r7.png', 'r8.png'],
    GAME_SIX: ['l1.png', 'l2.png', 'l3.png', 'l4.png', 'l5.png', 'l6.png', 'l7.png', 'l8.png'],
  };
  const legacyIntroFrames = legacyComicIntroFrames[key];

  if ((key === 'GAME_TWO' || key === 'GAME_THREE') && mode === 'intro') {
    sources = Array.from({ length: 8 }, (_, index) => ({
      imageFile: `${index + 1}.png`,
      imageOnly: true,
    }));
  }

  if (legacyIntroFrames && mode === 'intro') {
    sources = legacyIntroFrames.map((imageFile) => ({
      imageFile,
      imageOnly: true,
      useLegacyStoryAsset: true,
    }));
  }

  if (key === 'GAME_FOUR' && mode === 'intro') {
    sources = Array.from({ length: 8 }, (_, index) => `${index + 1}.png`).map((imageFile) => ({
      imageFile,
      imageOnly: true,
    }));
  }

  if (zipOutroWorlds.has(key) && mode === 'outro') {
    sources = [
      {
        imageFile: 'outro.png',
        imageOnly: true,
      },
    ];
  }

  const totalPages = Math.max(1, sources.length);

  return sources.map((source, index) => {
    const speaker = source?.speaker || 'Byte';
    const backgroundFile = source?.imageFile || (mode === 'intro'
      ? `bg${(index % 4) + 1}.png`
      : 'bg2.png');
    const imageUrl = source?.useLegacyStoryAsset
      ? ((key === 'GAME_ONE' || key === 'GAME_FIVE') ? legacySrcStoryAsset(backgroundFile) : legacyStoryAsset(backgroundFile))
      : storyAsset(meta.world, backgroundFile);
    const text = source?.text || '';

    return {
      id: `${key}-${mode}-${index + 1}`,
      world: meta.world,
      worldTitle: meta.title,
      gameName: meta.gameName,
      mode,
      page: index + 1,
      totalPages,
      background: imageUrl,
      character: storyAsset(meta.world, characterForSpeaker(speaker)),
      speaker,
      kicker: mode === 'intro'
        ? `${meta.title} — Intro`
        : `${meta.title} — Ending`,
      title: mode === 'intro' ? meta.title : `${meta.title} Finale`,
      text,
      body: text,
      image: imageUrl,
      imageOnly: Boolean(source?.imageOnly),
      useLegacyStoryAsset: Boolean(source?.useLegacyStoryAsset),
      suppressStageBackground: Boolean(source?.useLegacyStoryAsset),
      showPortal: false,
      chip: String(index + 1),
    };
  });
};

export const getIntroStoryPages = (gameType) => buildPages(gameType, 'intro');

export const getOutroStoryPages = (gameType) => buildPages(gameType, 'outro');

export const getStoryForGame = (gameType) => {
  const key = String(gameType || '').toUpperCase();
  const meta = WORLD_META[key] || WORLD_META.DEFAULT;
  const introPages = getIntroStoryPages(gameType);
  const outroPages = getOutroStoryPages(gameType);
  return {
    missionName: meta.title,
    arcLabel: meta.gameName,
    image: meta.oldImage,
    menuSummary: meta.title,
    missionBrief: introPages.map((p) => p.text).join('\n\n'),
    levelAction: 'Begin mission',
    shardName: 'Crystal fragment',
    completionLine: 'The next path opens.',
    completionTitle: `${meta.title} Complete`,
    completionBody: outroPages.map((p) => p.text).join('\n\n'),
    nextProblem: 'Continue the journey.',
    completionButton: 'Continue',
    completionChip: '+',
    showPortal: false,
  };
};

export const getLevelStoryBriefing = (gameType, levelNumber, level = {}) => {
  const safeLevelNumber = Number(levelNumber || level?.levelNumber || 1);

  if (safeLevelNumber !== 1) {
    return null;
  }

  const pages = getIntroStoryPages(gameType);
  const [firstPage] = pages;

  return {
    ...firstPage,
    pages,
    totalPages: pages.length,
    kicker: `Mission ${String(safeLevelNumber).padStart(2, '0')} — ${firstPage?.worldTitle || 'Core Quest'}`,
    reward: 'Crystal fragment recovery in progress',
    chip: String(safeLevelNumber),
  };
};

export const getLevelStoryCompletion = (gameType, levelNumber, level = {}) => {
  const safeLevelNumber = Number(levelNumber || level?.levelNumber || 1);

  if (safeLevelNumber !== 5) {
    return null;
  }

  const pages = getOutroStoryPages(gameType);
  const [firstPage] = pages;

  return {
    ...firstPage,
    pages,
    totalPages: pages.length,
    kicker: `Mission Complete — ${firstPage?.worldTitle || 'Core Quest'}`,
    buttonLabel: 'Continue',
    nextProblem: 'The path ahead is ready.',
    reward: `Crystal fragment secured from Level ${String(safeLevelNumber).padStart(2, '0')}`,
  };
};
