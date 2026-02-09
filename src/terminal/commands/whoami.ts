import type { CommandDefinition } from '../types';

export const whoami: CommandDefinition = {
  name: 'whoami',
  description: 'Print the current user',
  usage: 'whoami',
  execute({ env, output }) {
    output.println(env.USER);
    return 0;
  },
};
