import type { CommandDefinition } from '../types';

export const touch: CommandDefinition = {
  name: 'touch',
  description: 'Create empty files or update timestamps',
  usage: 'touch [OPTION]... FILE...',
  execute({ vfs, args, output }) {
    if (args.length === 0) {
      output.error('touch: missing file operand');
      return 1;
    }

    for (const path of args) {
      // 如果文件已存在，更新时间戳（这里只是简单地重写内容）
      const existing = vfs.readFile(path);
      if (existing !== null) {
        vfs.writeFile(path, existing);
      } else {
        vfs.writeFile(path, '');
      }
    }

    return 0;
  },
  complete(partial, { vfs }) {
    const entries = vfs.ls('.') || [];
    return entries
      .filter((e) => e.name.startsWith(partial))
      .map((e) => e.name);
  },
};
