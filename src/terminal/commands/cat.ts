import type { CommandDefinition } from '../types';

export const cat: CommandDefinition = {
  name: 'cat',
  description: 'Concatenate and print files',
  usage: 'cat [FILE]...',
  execute({ vfs, args, output }) {
    if (args.length === 0) {
      output.error('cat: missing file operand');
      return 1;
    }

    for (const path of args) {
      const content = vfs.readFile(path);
      if (content === null) {
        const stat = vfs.stat(path);
        if (stat?.type === 'directory') {
          output.error(`cat: ${path}: Is a directory`);
        } else {
          output.error(`cat: ${path}: No such file or directory`);
        }
        return 1;
      }
      output.print(content);
      if (!content.endsWith('\n')) {
        output.println();
      }
    }

    return 0;
  },
  complete(partial, { vfs }) {
    const entries = vfs.ls('.') || [];
    return entries
      .filter((e) => e.type === 'file' && e.name.startsWith(partial))
      .map((e) => e.name);
  },
};
