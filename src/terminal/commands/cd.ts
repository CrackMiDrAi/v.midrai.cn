import type { CommandDefinition } from '../types';

export const cd: CommandDefinition = {
  name: 'cd',
  description: 'Change the current directory',
  usage: 'cd [DIRECTORY]',
  execute({ vfs, args, output, env }) {
    const path = args[0] || env.HOME;

    if (!vfs.cd(path)) {
      output.error(`cd: ${path}: No such file or directory`);
      return 1;
    }

    return 0;
  },
  complete(partial, { vfs }) {
    const entries = vfs.ls('.') || [];
    return entries
      .filter((e) => e.type === 'directory' && e.name.startsWith(partial))
      .map((e) => e.name + '/');
  },
};
