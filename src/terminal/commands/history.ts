import type { CommandDefinition } from '../types';

export const history: CommandDefinition = {
  name: 'history',
  description: 'Show command history',
  usage: 'history',
  execute({ output }) {
    // 历史记录由 Shell 维护，这里只是一个占位符
    // 实际实现会在 Shell 中处理
    output.println('Command history is managed by the shell.');
    return 0;
  },
};
