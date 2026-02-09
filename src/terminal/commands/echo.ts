import type { CommandDefinition } from '../types';

export const echo: CommandDefinition = {
  name: 'echo',
  description: 'Display a line of text',
  usage: 'echo [OPTION]... [STRING]...',
  execute({ args, flags, output, env }) {
    const noNewline = flags.has('n');
    const enableEscape = flags.has('e');

    let text = args.join(' ');

    // 替换环境变量
    text = text.replace(/\$([A-Za-z_][A-Za-z0-9_]*)|\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, var1, var2) => {
      const varName = var1 || var2;
      return env[varName] || '';
    });

    // 处理转义字符
    if (enableEscape) {
      text = text
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }

    if (noNewline) {
      output.print(text);
    } else {
      output.println(text);
    }

    return 0;
  },
};
