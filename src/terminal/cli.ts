import type {
  CommandDefinition,
  CommandContext,
  EnvironmentVariables,
  VirtualFileSystem,
  OutputHandler,
  AnsiColor,
} from './types';

/**
 * CLI 管理器
 * 提供命令注册和执行功能
 */
export class CLI {
  private commands: Map<string, CommandDefinition> = new Map();
  private vfs: VirtualFileSystem;
  private env: EnvironmentVariables;
  private output: OutputHandler;

  constructor(vfs: VirtualFileSystem, env: EnvironmentVariables, output: OutputHandler) {
    this.vfs = vfs;
    this.env = env;
    this.output = output;
  }

  /**
   * 注册命令
   */
  registerCommand(command: CommandDefinition): void {
    this.commands.set(command.name, command);
  }

  /**
   * 批量注册命令
   */
  registerCommands(commands: CommandDefinition[]): void {
    for (const cmd of commands) {
      this.registerCommand(cmd);
    }
  }

  /**
   * 注销命令
   */
  unregisterCommand(name: string): boolean {
    return this.commands.delete(name);
  }

  /**
   * 获取所有已注册命令
   */
  getCommands(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * 获取命令定义
   */
  getCommand(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  /**
   * 检查命令是否存在
   */
  hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * 解析命令行输入
   */
  parseInput(input: string): { command: string; args: string[]; flags: Set<string> } {
    const tokens = this.tokenize(input);
    const command = tokens[0] || '';
    const args: string[] = [];
    const flags = new Set<string>();

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.startsWith('--')) {
        flags.add(token.substring(2));
      } else if (token.startsWith('-') && token.length > 1) {
        // 处理短选项如 -la
        for (let j = 1; j < token.length; j++) {
          flags.add(token[j]);
        }
      } else {
        args.push(token);
      }
    }

    return { command, args, flags };
  }

  /**
   * 分词处理
   */
  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuote: string | null = null;
    let escaped = false;

    for (const char of input) {
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"' || char === "'") {
        if (inQuote === null) {
          inQuote = char;
        } else if (inQuote === char) {
          inQuote = null;
        } else {
          current += char;
        }
        continue;
      }

      if (char === ' ' && inQuote === null) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * 执行命令
   */
  async execute(input: string): Promise<number> {
    const trimmed = input.trim();
    if (!trimmed) {
      return 0;
    }

    // 处理变量赋值 (VAR=value command)
    let commandLine = trimmed;
    const localEnv: Record<string, string> = {};
    const assignmentMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(\S+)\s+(.+)$/);
    if (assignmentMatch) {
      localEnv[assignmentMatch[1]] = assignmentMatch[2];
      commandLine = assignmentMatch[3];
    }

    const { command, args, flags } = this.parseInput(commandLine);

    if (!command) {
      return 0;
    }

    // 处理环境变量赋值命令
    if (trimmed.includes('=') && !trimmed.match(/^[A-Za-z_]/)) {
      const [varName, ...rest] = trimmed.split('=');
      if (rest.length > 0 && varName.match(/^[A-Za-z_][A-Za-z0-9_]*$/)) {
        this.env[varName] = rest.join('=').replace(/["']/g, '');
        return 0;
      }
    }

    // 查找命令
    const cmd = this.commands.get(command);
    if (!cmd) {
      this.output.error(`${command}: command not found`);
      return 127;
    }

    // 创建命令上下文
    const context: CommandContext = {
      vfs: this.vfs,
      env: { ...this.env, ...localEnv },
      output: this.output,
      cwd: this.vfs.pwd(),
      args,
      flags,
    };

    try {
      return await cmd.execute(context);
    } catch (error) {
      this.output.error(`${command}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 1;
    }
  }

  /**
   * 命令自动补全
   */
  complete(input: string): string[] {
    const { command, args } = this.parseInput(input);

    // 如果没有参数，补全命令名
    if (args.length === 0 && !input.endsWith(' ')) {
      return Array.from(this.commands.keys()).filter((cmd) =>
        cmd.startsWith(command)
      );
    }

    // 如果有命令，调用命令的补全函数
    const cmd = this.commands.get(command);
    if (cmd?.complete) {
      const lastArg = args[args.length - 1] || '';
      return cmd.complete(lastArg, {
        vfs: this.vfs,
        env: this.env,
        output: this.output,
        cwd: this.vfs.pwd(),
        args,
        flags: new Set(),
      });
    }

    // 默认文件补全
    const lastArg = args[args.length - 1] || '';
    const path = lastArg.includes('/')
      ? lastArg.substring(0, lastArg.lastIndexOf('/') + 1)
      : '.';
    const prefix = lastArg.includes('/')
      ? lastArg.substring(lastArg.lastIndexOf('/') + 1)
      : lastArg;

    const entries = this.vfs.ls(path) || [];
    return entries
      .filter((entry) => entry.name.startsWith(prefix))
      .map((entry) =>
        lastArg.includes('/')
          ? path + entry.name + (entry.type === 'directory' ? '/' : '')
          : entry.name + (entry.type === 'directory' ? '/' : '')
      );
  }
}

/**
 * ANSI 颜色工具
 */
export const AnsiColors: Record<AnsiColor, string> = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

export const AnsiReset = '\x1b[0m';

/**
 * 创建带颜色的文本
 */
export function colorize(text: string, color: AnsiColor): string {
  return `${AnsiColors[color]}${text}${AnsiReset}`;
}
