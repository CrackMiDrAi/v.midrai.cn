import type { CommandDefinition, CommandContext } from '../types';
import { colorize } from '../cli';

export const help: CommandDefinition = {
  name: 'help',
  description: 'Display help information',
  usage: 'help [COMMAND]',
  execute({ args, output }) {
    const commands: Record<string, { desc: string; usage: string }> = {
      ls: { desc: 'List directory contents', usage: 'ls [OPTION]... [FILE]...' },
      cd: { desc: 'Change the current directory', usage: 'cd [DIRECTORY]' },
      pwd: { desc: 'Print the current working directory', usage: 'pwd' },
      cat: { desc: 'Concatenate and print files', usage: 'cat [FILE]...' },
      echo: { desc: 'Display a line of text', usage: 'echo [STRING]...' },
      mkdir: { desc: 'Create directories', usage: 'mkdir DIRECTORY...' },
      touch: { desc: 'Create empty files', usage: 'touch FILE...' },
      rm: { desc: 'Remove files or directories', usage: 'rm [OPTION]... FILE...' },
      clear: { desc: 'Clear the terminal screen', usage: 'clear' },
      help: { desc: 'Display help information', usage: 'help [COMMAND]' },
      whoami: { desc: 'Print the current user', usage: 'whoami' },
      date: { desc: 'Print the current date and time', usage: 'date' },
      history: { desc: 'Show command history', usage: 'history' },
    };

    if (args.length > 0) {
      const cmd = args[0];
      const info = commands[cmd];
      if (info) {
        output.println(colorize(`\n${cmd}`, 'green') + ` - ${info.desc}`);
        output.println(`\nUsage: ${colorize(info.usage, 'yellow')}`);
        output.println();
      } else {
        output.error(`help: no help topics match '${cmd}'.`);
        return 1;
      }
    } else {
      output.println(colorize('\nAvailable commands:', 'cyan'));
      output.println(colorize('─'.repeat(50), 'brightBlack'));

      const maxNameLen = Math.max(...Object.keys(commands).map((c) => c.length));

      for (const [name, info] of Object.entries(commands).sort()) {
        const paddedName = name.padEnd(maxNameLen);
        output.println(`  ${colorize(paddedName, 'green')}  ${info.desc}`);
      }

      output.println(colorize('─'.repeat(50), 'brightBlack'));
      output.println(`Type ${colorize('help COMMAND', 'yellow')} for more details.\n`);
    }

    return 0;
  },
};
