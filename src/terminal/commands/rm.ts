import type { CommandDefinition } from '../types';

export const rm: CommandDefinition = {
  name: 'rm',
  description: 'Remove files or directories',
  usage: 'rm [OPTION]... FILE...',
  execute({ vfs, args, flags, output }) {
    const recursive = flags.has('r') || flags.has('R') || flags.has('recursive');
    const force = flags.has('f') || flags.has('force');

    if (args.length === 0) {
      if (!force) {
        output.error('rm: missing operand');
      }
      return 1;
    }

    let exitCode = 0;
    for (const path of args) {
      const stat = vfs.stat(path);
      if (!stat) {
        if (!force) {
          output.error(`rm: cannot remove '${path}': No such file or directory`);
          exitCode = 1;
        }
        continue;
      }

      if (stat.type === 'directory' && !recursive) {
        output.error(`rm: cannot remove '${path}': Is a directory`);
        exitCode = 1;
        continue;
      }

      if (!vfs.rm(path, recursive)) {
        if (!force) {
          output.error(`rm: cannot remove '${path}': Permission denied`);
        }
        exitCode = 1;
      }
    }

    return exitCode;
  },
  complete(partial, { vfs }) {
    const entries = vfs.ls('.') || [];
    return entries
      .filter((e) => e.name.startsWith(partial))
      .map((e) => e.name + (e.type === 'directory' ? '/' : ''));
  },
};
