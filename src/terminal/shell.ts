import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { XTerm } from './class';
import { VFS } from './vfs';
import { CLI, AnsiColors, AnsiReset } from './cli';
import { PromptManager } from './prompt';
import { getBuiltInCommands } from './commands';
import type {
  ShellOptions,
  EnvironmentVariables,
  OutputHandler,
  AnsiColor,
  CommandDefinition,
} from './types';

/**
 * Shell 控制器
 * 整合 VFS、CLI、Prompt 管理器，并与 xterm.js 集成
 */
export class FakeShell {
  private vfs: VFS;
  private cli: CLI;
  private prompt: PromptManager;
  private env: EnvironmentVariables;
  private terminal: XTerm | null = null;
  private fitAddon: FitAddon | null = null;
  private inputBuffer: string = '';
  private cursorPosition: number = 0;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  private isProcessing: boolean = false;
  private options: ShellOptions;

  constructor(options: ShellOptions = {}) {
    this.options = options;

    // 初始化环境变量
    this.env = {
      USER: options.env?.USER || 'guest',
      HOSTNAME: options.env?.HOSTNAME || 'midrai',
      HOME: options.env?.HOME || '/home/guest',
      PATH: options.env?.PATH || '/usr/local/bin:/usr/bin:/bin',
      PWD: options.initialPath || '/home/guest',
      ...options.env,
    };

    // 初始化虚拟文件系统
    this.vfs = new VFS();
    if (options.initialPath) {
      this.vfs.cd(options.initialPath);
    }

    // 创建输出处理器
    const output = this.createOutputHandler();

    // 初始化 CLI
    this.cli = new CLI(this.vfs, this.env, output);

    // 注册内置命令
    this.cli.registerCommands(getBuiltInCommands());

    // 初始化 Prompt 管理器
    this.prompt = new PromptManager(this.vfs, this.env);

    // 设置自定义 prompt 格式
    if (typeof options.promptFormat === 'function') {
      this.prompt.setFormatter(options.promptFormat);
    } else if (typeof options.promptFormat === 'string') {
      this.prompt.setFormat(options.promptFormat);
    }
  }

  /**
   * 创建输出处理器
   */
  private createOutputHandler(): OutputHandler {
    const self = this;

    return {
      print(text: string): void {
        self.terminal?.write(text);
      },

      println(text: string = ''): void {
        self.terminal?.writeln(text);
      },

      error(text: string): void {
        self.terminal?.writeln(`${AnsiColors.red}${text}${AnsiReset}`);
      },

      warn(text: string): void {
        self.terminal?.writeln(`${AnsiColors.yellow}${text}${AnsiReset}`);
      },

      success(text: string): void {
        self.terminal?.writeln(`${AnsiColors.green}${text}${AnsiReset}`);
      },

      color(text: string, color: AnsiColor): string {
        return `${AnsiColors[color]}${text}${AnsiReset}`;
      },

      clear(): void {
        self.terminal?.clear();
      },
    };
  }

  /**
   * 连接到 xterm.js 终端
   */
  attach(terminal: XTerm): void {
    this.terminal = terminal;

    // 添加插件
    this.fitAddon = new FitAddon();
    terminal.loadAddon(this.fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    // 设置事件监听
    terminal.onData(this.handleInput.bind(this));
    terminal.onResize(() => {
      this.fitAddon?.fit();
    });

    // 显示欢迎消息
    if (this.options.welcomeMessage) {
      terminal.writeln(this.options.welcomeMessage);
      terminal.writeln('');
    }

    // 显示初始提示符
    this.showPrompt();
  }

  /**
   * 调整终端大小
   */
  fit(): void {
    this.fitAddon?.fit();
  }

  /**
   * 获取虚拟文件系统实例
   */
  getVFS(): VFS {
    return this.vfs;
  }

  /**
   * 获取 CLI 实例
   */
  getCLI(): CLI {
    return this.cli;
  }

  /**
   * 获取 Prompt 管理器
   */
  getPrompt(): PromptManager {
    return this.prompt;
  }

  /**
   * 注册自定义命令
   */
  registerCommand(command: CommandDefinition): void {
    this.cli.registerCommand(command);
  }

  /**
   * 设置环境变量
   */
  setEnv(key: string, value: string): void {
    this.env[key] = value;
  }

  /**
   * 获取环境变量
   */
  getEnv(key: string): string | undefined {
    return this.env[key];
  }

  /**
   * 获取命令历史
   */
  getHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * 显示提示符
   */
  private showPrompt(): void {
    const prompt = this.prompt.generate();
    this.terminal?.write(prompt);
  }

  /**
   * 处理输入
   */
  private handleInput(data: string): void {
    if (this.isProcessing) return;

    const code = data.charCodeAt(0);

    // 处理特殊控制序列
    if (data === '\r') {
      // Enter - 执行命令
      this.executeCommand();
    } else if (data === '\x7F' || data === '\b') {
      // Backspace
      this.handleBackspace();
    } else if (data === '\x1B[3~') {
      // Delete key
      this.handleDelete();
    } else if (data === '\x1B[A') {
      // Up arrow - 历史记录上一条
      this.handleHistoryUp();
    } else if (data === '\x1B[B') {
      // Down arrow - 历史记录下一条
      this.handleHistoryDown();
    } else if (data === '\x1B[C') {
      // Right arrow
      this.handleCursorRight();
    } else if (data === '\x1B[D') {
      // Left arrow
      this.handleCursorLeft();
    } else if (data === '\x1B[H' || data === '\x01') {
      // Home / Ctrl+A - 光标移到行首
      this.handleHome();
    } else if (data === '\x1B[F' || data === '\x05') {
      // End / Ctrl+E - 光标移到行尾
      this.handleEnd();
    } else if (data === '\x0C') {
      // Ctrl+L - 清屏
      this.terminal?.clear();
      this.showPrompt();
      this.terminal?.write(this.inputBuffer);
    } else if (data === '\t') {
      // Tab - 自动补全
      this.handleTab();
    } else if (data === '\x15') {
      // Ctrl+U - 清除整行
      this.clearLine();
    } else if (code >= 32 || data.length > 1) {
      // 可打印字符（包括 ASCII 和 Unicode 字符如中文）
      // data.length > 1 用于处理多字节的 Unicode 字符（如中文）
      this.insertChar(data);
    }
  }

  /**
   * 插入字符
   */
  private insertChar(char: string): void {
    const before = this.inputBuffer.slice(0, this.cursorPosition);
    const after = this.inputBuffer.slice(this.cursorPosition);
    this.inputBuffer = before + char + after;
    this.cursorPosition++;

    // 重新显示当前行
    this.redrawLine();
  }

  /**
   * 处理退格键
   */
  private handleBackspace(): void {
    if (this.cursorPosition > 0) {
      const before = this.inputBuffer.slice(0, this.cursorPosition - 1);
      const after = this.inputBuffer.slice(this.cursorPosition);
      this.inputBuffer = before + after;
      this.cursorPosition--;
      this.redrawLine();
    }
  }

  /**
   * 处理删除键
   */
  private handleDelete(): void {
    if (this.cursorPosition < this.inputBuffer.length) {
      const before = this.inputBuffer.slice(0, this.cursorPosition);
      const after = this.inputBuffer.slice(this.cursorPosition + 1);
      this.inputBuffer = before + after;
      this.redrawLine();
    }
  }

  /**
   * 判断字符是否为宽字符（中文等）
   */
  private isWideChar(char: string): boolean {
    const code = char.charCodeAt(0);
    return (code >= 0x4e00 && code <= 0x9fff) ||
           (code >= 0x3400 && code <= 0x4dbf) ||
           (code >= 0xf900 && code <= 0xfaff);
  }

  /**
   * 处理光标左移
   */
  private handleCursorLeft(): void {
    if (this.cursorPosition > 0) {
      this.cursorPosition--;
      const char = this.inputBuffer[this.cursorPosition];
      const moveCols = this.isWideChar(char) ? 2 : 1;
      this.terminal?.write(`\x1B[${moveCols}D`);
    }
  }

  /**
   * 处理光标右移
   */
  private handleCursorRight(): void {
    if (this.cursorPosition < this.inputBuffer.length) {
      const char = this.inputBuffer[this.cursorPosition];
      const moveCols = this.isWideChar(char) ? 2 : 1;
      this.cursorPosition++;
      this.terminal?.write(`\x1B[${moveCols}C`);
    }
  }

  /**
   * 处理 Home 键
   */
  private handleHome(): void {
    this.redrawLine();
    this.cursorPosition = 0;
  }

  /**
   * 处理 End 键
   */
  private handleEnd(): void {
    this.redrawLine();
    this.cursorPosition = this.inputBuffer.length;
  }

  /**
   * 处理历史记录上翻
   */
  private handleHistoryUp(): void {
    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
      this.inputBuffer = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
      this.cursorPosition = this.inputBuffer.length;
      this.redrawLine();
    }
  }

  /**
   * 处理历史记录下翻
   */
  private handleHistoryDown(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.inputBuffer = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
      this.cursorPosition = this.inputBuffer.length;
      this.redrawLine();
    } else if (this.historyIndex === 0) {
      this.historyIndex = -1;
      this.inputBuffer = '';
      this.cursorPosition = 0;
      this.redrawLine();
    }
  }

  /**
   * 处理 Tab 补全
   */
  private handleTab(): void {
    const completions = this.cli.complete(this.inputBuffer);
    if (completions.length === 1) {
      // 唯一补全
      const lastSpace = this.inputBuffer.lastIndexOf(' ');
      if (lastSpace === -1) {
        this.inputBuffer = completions[0] + ' ';
      } else {
        this.inputBuffer = this.inputBuffer.slice(0, lastSpace + 1) + completions[0];
      }
      this.cursorPosition = this.inputBuffer.length;
      this.redrawLine();
    } else if (completions.length > 1) {
      // 多个可能的补全
      this.terminal?.writeln('');
      this.terminal?.writeln(completions.join('  '));
      this.showPrompt();
      this.terminal?.write(this.inputBuffer);
    }
  }

  /**
   * 清除当前行
   */
  private clearLine(): void {
    this.inputBuffer = '';
    this.cursorPosition = 0;
    this.redrawLine();
  }

  /**
   * 计算字符串的显示宽度（中文字符占 2 列，ASCII 占 1 列）
   */
  private getDisplayWidth(str: string): number {
    let width = 0;
    for (const char of str) {
      const code = char.charCodeAt(0);
      // CJK 统一表意文字范围（基本区和扩展区 A）
      if ((code >= 0x4e00 && code <= 0x9fff) ||
          (code >= 0x3400 && code <= 0x4dbf) ||
          (code >= 0xf900 && code <= 0xfaff)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }

  /**
   * 重新绘制当前行
   */
  private redrawLine(): void {
    // 移到行首
    this.terminal?.write('\r');
    // 清除到行尾
    this.terminal?.write('\x1B[K');
    // 重新显示提示符和输入
    this.showPrompt();
    this.terminal?.write(this.inputBuffer);

    // 调整光标位置（使用显示宽度计算）
    const promptText = this.prompt.generate();
    const promptWidth = this.getDisplayWidth(promptText);
    const bufferWidth = this.getDisplayWidth(this.inputBuffer);
    const beforeCursor = this.inputBuffer.slice(0, this.cursorPosition);
    const cursorWidth = this.getDisplayWidth(beforeCursor);
    const currentPos = promptWidth + bufferWidth;
    const targetPos = promptWidth + cursorWidth;
    if (targetPos < currentPos) {
      this.terminal?.write(`\x1B[${currentPos - targetPos}D`);
    }
  }

  /**
   * 执行命令
   */
  private async executeCommand(): Promise<void> {
    const command = this.inputBuffer.trim();

    this.terminal?.writeln('');

    if (command) {
      // 添加到历史记录
      this.commandHistory.push(command);
      this.historyIndex = -1;

      // 处理 exit 命令
      if (command === 'exit') {
        this.terminal?.writeln('logout');
        return;
      }

      // 执行命令
      this.isProcessing = true;
      try {
        await this.cli.execute(command);
      } catch (error) {
        this.terminal?.writeln(`${AnsiColors.red}Error: ${error}${AnsiReset}`);
      }
      this.isProcessing = false;
    }

    // 重置输入缓冲区
    this.inputBuffer = '';
    this.cursorPosition = 0;

    // 显示新提示符
    this.showPrompt();
  }

  /**
   * 写入文本到终端
   */
  write(text: string): void {
    this.terminal?.write(text);
  }

  /**
   * 写入一行文本到终端
   */
  writeln(text: string): void {
    this.terminal?.writeln(text);
  }
}
