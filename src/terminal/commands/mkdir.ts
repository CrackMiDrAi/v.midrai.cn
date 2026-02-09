import type { CommandDefinition } from '../types';

export const mkdir: CommandDefinition = {
  name: 'mkdir',
  description: 'Create directories',
  usage: 'mkdir [OPTION]... DIRECTORY...',
  execute({ vfs, args, output }) {
    if (args.length === 0) {
      output.error('mkdir: missing operand');
      return 1;
    }

    let exitCode = 0;
    for (const path of args) {
      if (!vfs.mkdir(path)) {
        output.error(`mkdir: cannot create directory '${path}': File exists`);
        exitCode = 1;
      }
    }

    return exitCode;
  },
};
