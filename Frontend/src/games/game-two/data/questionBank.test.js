import { describe, expect, it } from 'vitest';
import { preserveConfiguredAssemblyTasks } from './questionBank';
import levelOne from './levels/level-01.json';

describe('Game 2 task generation', () => {
  it('preserves the configured assembly task at its intended task number', () => {
    const configuredTasks = [
      { id: 'configured-1', type: 'complete', title: 'Configured repair' },
      {
        id: 'configured-2',
        type: 'reorder',
        title: 'Build A Tiny Program',
        blocks: [{ id: 'a', code: 'String name = "Ada";' }],
        correctOrder: ['a'],
      },
    ];
    const generatedTasks = [
      { id: 'generated-1', type: 'debug', title: 'Generated repair' },
      { id: 'generated-2', type: 'debug', title: 'Generated replacement' },
    ];

    const tasks = preserveConfiguredAssemblyTasks(configuredTasks, generatedTasks);

    expect(tasks[0]).toBe(generatedTasks[0]);
    expect(tasks[1]).toEqual(configuredTasks[1]);
    expect(tasks[1]).not.toBe(configuredTasks[1]);
  });

  it('keeps Level 1 Task 5 as the expected three-block tiny program', () => {
    const taskFive = levelOne.tasks[4];

    expect(taskFive.title).toBe('Build A Tiny Program');
    expect(taskFive.type).toBe('reorder');
    expect(taskFive.blocks.map((block) => block.code)).toEqual([
      'let name = "Ada";',
      'console.log(name);',
      'let ready = true;',
    ]);
    expect(taskFive.correctOrder).toEqual(['a', 'c', 'b']);
  });
});
