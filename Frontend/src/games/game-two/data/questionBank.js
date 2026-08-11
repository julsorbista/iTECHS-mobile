const JAVA_NAMES = Object.freeze({
  variables: ['score', 'level', 'coins', 'health', 'attempts', 'bonus', 'total', 'age', 'speed', 'damage'],
  strings: ['status', 'name', 'rank', 'message', 'title', 'badge'],
  methods: ['calculateBonus', 'printStatus', 'getLevel', 'applyDamage', 'loadProfile', 'validateScore', 'showResult'],
  classes: ['Player', 'Student', 'Hero', 'Account', 'QuizSession', 'GameProfile', 'Badge'],
  children: ['PremiumPlayer', 'AdminStudent', 'MageHero', 'SavingsAccount', 'TimedQuizSession', 'RankedProfile'],
  exceptions: ['IllegalArgumentException', 'ArithmeticException', 'NullPointerException', 'IOException'],
  diagrams: ['Login', 'SubmitQuiz', 'ReviewScore', 'ResetPassword', 'EnrollCourse', 'UnlockLevel'],
});

export const GAME_TWO_QUESTION_SET_VERSION = '2026-05-29-scenario-randomized-v1';

export const GAME_TWO_LEVEL_TOPICS = Object.freeze({
  1: {
    title: 'Java Foundations, Inheritance, and Exceptions',
    topics: ['Apply basics of Java language', 'Work with inheritance', 'Handle exceptions'],
  },
  2: {
    title: 'Inheritance, Exception Handling, and OOP Terms',
    topics: ['Work with inheritance and handling exceptions', 'Examine object-oriented concepts and terminology'],
  },
  3: {
    title: 'Modeling and Use Case Analysis',
    topics: ['Explain modeling and the software development process', 'Create Use Case diagrams and Use Case scenarios'],
  },
  4: {
    title: 'Use Cases to Interaction Design',
    topics: ['Create Use Case diagrams and Use Case scenarios', 'Transition from analysis to design using interaction diagrams'],
  },
  5: {
    title: 'Architecture, Methods, and Encapsulation',
    topics: ['Introduce architectural concepts and architecture tier diagrams', 'Work with methods and encapsulation'],
  },
});

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const randomNumber = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

const FOUNDATIONS_CONTEXTS = Object.freeze([
  'a score tracker for a coding challenge',
  'a health system for a platform game',
  'a coin counter for an arcade level',
  'a speed meter for a racing simulator',
  'an attempts counter for a quiz app',
]);

const OOP_CONTEXTS = Object.freeze([
  'a school portal',
  'a role-playing game',
  'a banking dashboard',
  'a quiz engine',
  'a badge rewards system',
]);

const MODELING_CONTEXTS = Object.freeze([
  'student login',
  'quiz submission',
  'level unlocking',
  'course enrollment',
  'password reset',
]);

const ARCHITECTURE_CONTEXTS = Object.freeze([
  'a leaderboard service',
  'a profile manager',
  'an inventory system',
  'a progress tracker',
  'a rewards module',
]);

const shuffle = (items) => {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
};

const normalizeCodeAnswer = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const buildSnippetChoices = (task) => {
  if (Array.isArray(task.options) && task.options.length > 0) {
    return task.options;
  }

  const answer = String(task.answer || '').trim();
  const acceptedAnswers = Array.isArray(task.acceptedAnswers) && task.acceptedAnswers.length > 0
    ? task.acceptedAnswers
    : [answer];
  const normalizedAccepted = new Set(acceptedAnswers.map(normalizeCodeAnswer));
  const candidates = [
    answer,
    answer.endsWith(';') ? answer.slice(0, -1) : `${answer};`,
    answer.includes('==') ? answer.replace('==', '=') : answer.replace('=', '=='),
    answer.includes('&&') ? answer.replace('&&', '||') : answer.replace('||', '&&'),
    answer.includes('println') ? answer.replace('println', 'print') : answer.replace('print', 'println'),
    answer.includes('"') ? answer.replace(/"/g, '') : `"${answer}"`,
    task.snippet,
    'missing;',
    answer.replace(/\bint\b/g, 'double'),
    answer.replace(/\bpublic\b/g, 'private'),
    answer.replace(/[{}]/g, ''),
  ]
    .map((candidate) => String(candidate || '').trim())
    .filter(Boolean);

  const uniqueWrong = [];
  candidates.forEach((candidate) => {
    const normalized = normalizeCodeAnswer(candidate);
    if (!normalizedAccepted.has(normalized) && !uniqueWrong.some((wrong) => normalizeCodeAnswer(wrong) === normalized)) {
      uniqueWrong.push(candidate);
    }
  });

  return shuffle([
    { id: 'a', label: answer },
    ...uniqueWrong.slice(0, 5).map((label, index) => ({
      id: String.fromCharCode(98 + index),
      label,
    })),
  ]).map((option, index) => ({
    ...option,
    id: String.fromCharCode(97 + index),
  }));
};

const normalizeTaskForSnippetDrop = (task) => {
  if (!task || task.type === 'choice' || task.type === 'reorder') {
    return task;
  }

  const nextTask = {
    ...task,
    questionType: String(task.questionType || 'Snippet drag').replace(/typing/gi, 'snippet drag'),
    prompt: String(task.prompt || '')
      .replace(/^Type\b/i, 'Drag')
      .replace(/\bType the\b/gi, 'Drag the')
      .replace(/\btype the\b/g, 'drag the')
      .replace(/\bRewrite\b/gi, 'Drag the repaired snippet for')
      .replace(/\brewrite\b/g, 'drag the repaired snippet for'),
    options: buildSnippetChoices(task),
  };

  if (task.type === 'typing') {
    nextTask.type = 'complete';
    nextTask.snippet = task.snippet || '____';
  }

  if (task.type === 'debug' && !String(task.snippet || '').includes('____')) {
    nextTask.snippet = `${task.snippet}\n\n____`;
  }

  return nextTask;
};

const makeTask = (index, level, task) => ({
  id: `g2l${level}-run-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  level,
  points: 120 + (level * 20) + (index * 8),
  coinReward: index % 3 === 0 ? 2 : 1,
  ...normalizeTaskForSnippetDrop(task),
});

const javaBasicsTasks = [
  () => {
    const variable = randomItem(JAVA_NAMES.variables);
    const value = randomNumber(4, 90);
    const context = randomItem(FOUNDATIONS_CONTEXTS);

    return {
      type: 'typing',
      questionType: 'Scenario-based typing',
      title: 'Declare An Integer',
      prompt: `Scenario: You are building ${context}. Type the Java statement that declares int ${variable} with value ${value}.`,
      answer: `int ${variable} = ${value};`,
      acceptedAnswers: [`int ${variable}=${value};`, `int ${variable} = ${value};`],
      coach: 'Java variable declarations need a type, a name, an assignment, and a semicolon.',
      hints: ['Start with int.', `Use the variable name ${variable}.`, 'End Java statements with a semicolon.'],
      feedback: {
        correct: 'The integer declaration compiles.',
        wrong: 'Check the type, one equals sign, and semicolon.',
      },
    };
  },

  () => {
    const variable = randomItem(JAVA_NAMES.strings);
    const value = randomItem(['Ready', 'Bronze', 'Active', 'Complete', 'Passed']);
    const context = randomItem(FOUNDATIONS_CONTEXTS);

    return {
      type: 'complete',
      questionType: 'Scenario-based typing',
      title: 'Complete A String',
      prompt: `Scenario: In ${context}, fill the blank so ${variable} stores the text "${value}".`,
      snippet: `String ${variable} = ____;`,
      answer: `"${value}"`,
      acceptedAnswers: [`"${value}"`],
      coach: 'Java String values use double quotes.',
      hints: ['This is text, not a number.', 'Use double quotes in Java String literals.'],
    };
  },

  () => {
    const variable = randomItem(JAVA_NAMES.variables);
    const value = randomNumber(5, 30);
    const context = randomItem(FOUNDATIONS_CONTEXTS);

    return {
      type: 'debug',
      questionType: 'Scenario-based debugging',
      title: 'Repair Assignment',
      prompt: `Scenario: ${context} is failing to compile. Rewrite the broken Java line correctly.`,
      snippet: `int ${variable} == ${value}`,
      answer: `int ${variable} = ${value};`,
      acceptedAnswers: [`int ${variable}=${value};`, `int ${variable} = ${value};`],
      coach: 'Assignment uses one equals sign. Java statements need semicolons.',
      hints: ['Use one equals sign.', 'Add the semicolon.'],
    };
  },
  () => {
    const variable = randomItem(JAVA_NAMES.variables);
    const threshold = randomNumber(10, 100);
    const context = randomItem(FOUNDATIONS_CONTEXTS);

    return {
      type: 'debug',
      questionType: 'Scenario-based debugging',
      title: 'Repair An If Condition',
      prompt: `Scenario: ${context} should check whether ${variable} reached ${threshold}. Fix the broken Java condition.`,
      snippet: `if ${variable} >= ${threshold}) {`,
      answer: `if (${variable} >= ${threshold}) {`,
      acceptedAnswers: [`if (${variable} >= ${threshold}) {`],
      coach: 'Java conditions need parentheses around the comparison.',
      hints: ['Place the comparison inside parentheses.', 'Keep the opening brace.'],
    };
  },
];

const inheritanceTasks = [
  () => {
    const parent = randomItem(JAVA_NAMES.classes);
    const child = randomItem(JAVA_NAMES.children);
    const context = randomItem(OOP_CONTEXTS);

    return {
      type: 'typing',
      questionType: 'Scenario-based typing',
      title: 'Write Inheritance Header',
      prompt: `Scenario: In ${context}, ${child} should inherit behavior from ${parent}. Type the Java class header.`,
      answer: `class ${child} extends ${parent} {`,
      acceptedAnswers: [
        `class ${child} extends ${parent} {`,
        `public class ${child} extends ${parent} {`,
      ],
      coach: 'A subclass uses extends to inherit from one superclass.',
      hints: ['Use the keyword extends.', 'The child class name comes before extends.'],
    };
  },

  () => ({
    type: 'debug',
    questionType: 'Scenario-based debugging',
    title: 'Fix Override Syntax',
    prompt: 'Scenario: A subclass method should override a parent method. Repair the broken override annotation.',
    snippet: 'Override\npublic void move() {',
    answer: '@Override\npublic void move() {',
    acceptedAnswers: ['@Override\npublic void move() {'],
    coach: 'Override annotations must begin with @.',
    hints: ['Annotations start with @.', 'Keep the method declaration unchanged.'],
  }),

  () => {
    const parent = randomItem(JAVA_NAMES.classes);
    const child = randomItem(JAVA_NAMES.children);
    const context = randomItem(OOP_CONTEXTS);

    return {
      type: 'debug',
      questionType: 'Scenario-based debugging',
      title: 'Fix Extends Syntax',
      prompt: `Scenario: In ${context}, ${child} should extend ${parent}. Repair the broken class declaration.`,
      snippet: `class ${child} extend ${parent} {`,
      answer: `class ${child} extends ${parent} {`,
      acceptedAnswers: [`class ${child} extends ${parent} {`],
      coach: 'Java inheritance uses the extends keyword.',
      hints: ['The keyword is extends, not extend.', 'Keep the class names in the same order.'],
    };
  },
];

const exceptionTasks = [
  () => {
    const ex = randomItem(JAVA_NAMES.exceptions);
    const context = randomItem(OOP_CONTEXTS);

    return {
      type: 'complete',
      questionType: 'Scenario-based typing',
      title: 'Complete Catch Block',
      prompt: `Scenario: ${context} may throw ${ex}. Fill the missing exception type to catch it.`,
      snippet: `try {\n  runLevel();\n} catch (____ error) {\n  System.out.println(error.getMessage());\n}`,
      answer: ex,
      acceptedAnswers: [ex],
      coach: 'A catch parameter starts with the exception class, then a variable name.',
      hints: ['Use the exact exception class named in the prompt.'],
    };
  },

  () => ({
    type: 'debug',
    questionType: 'Scenario-based debugging',
    title: 'Repair Try Catch Syntax',
    prompt: 'Scenario: The error handler is malformed. Rewrite the broken catch line correctly.',
    snippet: 'catch Exception e) {',
    answer: 'catch (Exception e) {',
    acceptedAnswers: ['catch (Exception e) {'],
    coach: 'The catch parameter must be wrapped in parentheses.',
    hints: ['Add the opening parenthesis after catch.', 'Keep the brace at the end.'],
  }),

  () => {
    const ex = randomItem(JAVA_NAMES.exceptions);
    const context = randomItem(OOP_CONTEXTS);

    return {
      type: 'debug',
      questionType: 'Scenario-based debugging',
      title: 'Fix Throw Statement',
      prompt: `Scenario: In ${context}, invalid input should throw ${ex}. Repair the broken Java statement.`,
      snippet: `throw new ${ex}("Invalid data")`,
      answer: `throw new ${ex}("Invalid data");`,
      acceptedAnswers: [`throw new ${ex}("Invalid data");`],
      coach: 'Thrown exceptions are regular Java statements and need semicolons.',
      hints: ['Keep new before the exception type.', 'End the line with a semicolon.'],
    };
  },
];

const oopConceptTasks = [
  () => {
    const method = randomItem(JAVA_NAMES.methods);
    const context = randomItem(OOP_CONTEXTS);

    return {
      type: 'typing',
      questionType: 'Scenario-based typing',
      title: 'Write A Getter',
      prompt: `Scenario: In ${context}, type a Java method header named ${method} that returns int.`,
      answer: `public int ${method}() {`,
      acceptedAnswers: [`public int ${method}() {`],
      coach: 'A method header includes access modifier, return type, method name, parentheses, and brace.',
      hints: ['Start with public int.', 'The method has empty parentheses.'],
    };
  },

  () => {
    const className = randomItem(JAVA_NAMES.classes);
    const context = randomItem(OOP_CONTEXTS);

    return {
      type: 'complete',
      questionType: 'Scenario-based typing',
      title: 'Complete An Object Creation',
      prompt: `Scenario: ${context} needs a new ${className} object. Fill the missing constructor call.`,
      snippet: `${className} player = ____;`,
      answer: `new ${className}()`,
      acceptedAnswers: [`new ${className}()`],
      coach: 'Object creation uses the new keyword and the class constructor.',
      hints: ['Start with new.', 'Call the constructor with parentheses.'],
    };
  },
];

const modelingTasks = [
  () => {
    const useCase = randomItem(MODELING_CONTEXTS);

    return {
      type: 'debug',
      questionType: 'Scenario-based debugging',
      title: 'Fix UML Class Syntax',
      prompt: `Scenario: While modeling ${useCase}, repair the Java class declaration.`,
      snippet: 'public class StudentAccount extends {',
      answer: 'public class StudentAccount extends Account {',
      acceptedAnswers: ['public class StudentAccount extends Account {'],
      coach: 'A subclass must specify the parent class after extends.',
      hints: ['Add the missing parent class.', 'Keep the opening brace.'],
    };
  },

  () => {
    const useCase = randomItem(JAVA_NAMES.diagrams);

    return {
      type: 'typing',
      questionType: 'Scenario-based typing',
      title: 'Name A Use Case',
      prompt: `Scenario: You are documenting a use-case diagram. Type the use-case name exactly as "${useCase}".`,
      answer: useCase,
      acceptedAnswers: [useCase],
      coach: 'Use-case names are action-focused labels in requirements models.',
      hints: ['Match the capitalization from the prompt.', 'Type only the use-case name.'],
    };
  },
];

const interactionTasks = [
  () => ({
    type: 'debug',
    questionType: 'Scenario-based debugging',
    title: 'Fix Method Call',
    prompt: 'Scenario: An interaction step should validate a login request. Repair the broken Java method call.',
    snippet: 'authService validate(username, password);',
    answer: 'authService.validate(username, password);',
    acceptedAnswers: ['authService.validate(username, password);'],
    coach: 'Java object method calls use dot notation.',
    hints: ['Use a period between the object and method.', 'Keep the parameters unchanged.'],
  }),

  () => {
    const useCase = randomItem(JAVA_NAMES.diagrams);

    return {
      type: 'typing',
      questionType: 'Scenario-based typing',
      title: 'Write Interaction Log',
      prompt: `Scenario: A sequence step should log "${useCase}". Type the Java output statement.`,
      answer: `System.out.println("${useCase}");`,
      acceptedAnswers: [`System.out.println("${useCase}");`],
      coach: 'Printing a message in Java uses System.out.println with double quotes.',
      hints: ['Use System.out.println.', 'Put the use-case name inside double quotes.'],
    };
  },
];

const architectureTasks = [
  () => {
    const field = randomItem(['balance', 'score', 'health', 'level']);
    const context = randomItem(ARCHITECTURE_CONTEXTS);

    return {
      type: 'typing',
      questionType: 'Scenario-based typing',
      title: 'Encapsulate A Field',
      prompt: `Scenario: In ${context}, protect internal state. Type a private int field declaration named ${field}.`,
      answer: `private int ${field};`,
      acceptedAnswers: [`private int ${field};`],
      coach: 'Encapsulation often starts by making fields private.',
      hints: ['Use the private access modifier.', 'This is a field declaration, not a method.'],
    };
  },

  () => {
    const method = randomItem(JAVA_NAMES.methods);
    const context = randomItem(ARCHITECTURE_CONTEXTS);

    return {
      type: 'debug',
      questionType: 'Scenario-based debugging',
      title: 'Repair Method Header',
      prompt: `Scenario: In ${context}, rewrite this Java method header correctly.`,
      snippet: `public int ${method} {`,
      answer: `public int ${method}() {`,
      acceptedAnswers: [`public int ${method}() {`],
      coach: 'Method headers need parentheses, even when there are no parameters.',
      hints: ['Add empty parentheses before the brace.', 'Keep the return type int.'],
    };
  },

  () => {
    const field = randomItem(['score', 'health', 'level', 'coins']);
    const context = randomItem(ARCHITECTURE_CONTEXTS);

    return {
      type: 'typing',
      questionType: 'Scenario-based typing',
      title: 'Write A Setter Header',
      prompt: `Scenario: ${context} needs controlled updates. Type a setter header for int ${field}.`,
      answer: `public void set${field.charAt(0).toUpperCase()}${field.slice(1)}(int ${field}) {`,
      acceptedAnswers: [`public void set${field.charAt(0).toUpperCase()}${field.slice(1)}(int ${field}) {`],
      coach: 'Setter headers use public void, a method name, a typed parameter, and an opening brace.',
      hints: ['Start with public void.', 'Use the field name as the int parameter.'],
    };
  },
];

const LEVEL_POOLS = Object.freeze({
  1: [...javaBasicsTasks],
  2: [...inheritanceTasks, ...exceptionTasks, ...oopConceptTasks],
  3: [...modelingTasks, ...oopConceptTasks],
  4: [...modelingTasks, ...interactionTasks],
  5: [...architectureTasks, ...oopConceptTasks],
});

const DEFAULT_TASK_COUNT_BY_LEVEL = Object.freeze({
  1: 3,
  2: 4,
  3: 5,
  4: 5,
  5: 5,
});

export const getGameTwoTaskCountForLevel = (levelNumber) => {
  const level = Math.max(1, Math.min(5, Number(levelNumber || 1)));
  return DEFAULT_TASK_COUNT_BY_LEVEL[level] || 3;
};

export const preserveConfiguredAssemblyTasks = (configuredTasks = [], generatedTasks = []) => {
  const safeConfiguredTasks = Array.isArray(configuredTasks) ? configuredTasks : [];
  const safeGeneratedTasks = Array.isArray(generatedTasks) ? generatedTasks : [];

  return safeGeneratedTasks.map((generatedTask, index) => {
    const configuredTask = safeConfiguredTasks[index];
    return configuredTask?.type === 'reorder' ? { ...configuredTask } : generatedTask;
  });
};

export const buildGameTwoRunTasks = (levelData, desiredCount = 0) => {
  const level = Math.max(1, Math.min(5, Number(levelData?.levelNumber || 1)));

  const pool = LEVEL_POOLS[level] || LEVEL_POOLS[1];

  const configuredCount = Number(desiredCount) > 0
    ? Number(desiredCount)
    : getGameTwoTaskCountForLevel(level);

  const count = Math.max(1, Math.min(configuredCount, pool.length + 3));

  const shuffledFactories = shuffle(pool);

  const tasks = [];

  for (let index = 0; index < count; index += 1) {
    const factory = shuffledFactories[index % shuffledFactories.length];

    tasks.push(
      makeTask(index + 1, level, factory())
    );
  }

  return tasks;
};
