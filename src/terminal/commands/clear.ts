import type { CommandDefinition } from '../types';

export const clear: CommandDefinition = {
  name: 'clear',
  description: 'Clear the terminal screen',
  usage: 'clear',
  execute({ output }) {
    // 使用 ANSI 序列清屏并将光标移到左上角
    output.print('\x1B[2J\x1B[H');
    return 0;
  },
};
