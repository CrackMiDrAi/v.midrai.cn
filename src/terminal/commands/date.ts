import type { CommandDefinition } from '../types';

export const date: CommandDefinition = {
  name: 'date',
  description: 'Print the current date and time',
  usage: 'date',
  execute({ output }) {
    const now = new Date();
    output.println(now.toString());
    return 0;
  },
};
