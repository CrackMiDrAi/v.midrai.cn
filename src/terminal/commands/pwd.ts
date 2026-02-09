import type { CommandDefinition } from '../types';

export const pwd: CommandDefinition = {
  name: 'pwd',
  description: 'Print the current working directory',
  usage: 'pwd',
  execute({ vfs, output }) {
    output.println(vfs.pwd());
    return 0;
  },
};
