import type { CommandDefinition } from '../types';
import { colorize } from '../cli';

export const ls: CommandDefinition = {
  name: 'ls',
  description: 'List directory contents',
  usage: 'ls [OPTION]... [FILE]...',
  execute({ vfs, args, flags, output }) {
    const path = args[0] || '.';
    const showAll = flags.has('a') || flags.has('all');
    const longFormat = flags.has('l');
    const humanReadable = flags.has('h') || flags.has('human-readable');

    const entries = vfs.ls(path);
    if (entries === null) {
      output.error(`ls: cannot access '${path}': No such file or directory`);
      return 2;
    }

    // 排序: 目录在前，然后按名称排序
    const sorted = entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // 始终显示 . 和 .. 当使用 -a 时
    const displayEntries = showAll
      ? sorted
      : sorted.filter((e) => !e.name.startsWith('.'));

    if (longFormat) {
      // 长格式输出
      for (const entry of displayEntries) {
        const date = entry.modifiedAt.toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        const size = humanReadable
          ? formatSize(entry.content?.length || 0)
          : (entry.content?.length || 0).toString();

        const name =
          entry.type === 'directory'
            ? colorize(entry.name, 'blue')
            : entry.name;

        output.println(
          `${entry.permissions} ${entry.owner.padStart(4)} ${entry.group.padStart(4)} ${size.padStart(6)} ${date} ${name}`
        );
      }
    } else {
      // 短格式输出
      const names = displayEntries.map((entry) => {
        if (entry.type === 'directory') {
          return colorize(entry.name, 'blue');
        }
        if (entry.name.endsWith('.sh') || entry.permissions.includes('x')) {
          return colorize(entry.name, 'green');
        }
        return entry.name;
      });

      output.println(names.join('  '));
    }

    return 0;
  },
  complete(partial, { vfs }) {
    const entries = vfs.ls('.') || [];
    return entries
      .filter((e) => e.name.startsWith(partial))
      .map((e) => e.name + (e.type === 'directory' ? '/' : ''));
  },
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'K', 'M', 'G'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}
