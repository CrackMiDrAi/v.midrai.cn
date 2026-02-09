/**
 * 虚假仿真终端类型定义
 */

/** 文件类型 */
export type FileType = 'file' | 'directory';

/** 文件节点 */
export interface FileNode {
  type: FileType;
  name: string;
  content: string;
  children: Map<string, FileNode>;
  parent: FileNode | null;
  createdAt: Date;
  modifiedAt: Date;
  permissions: string;
  owner: string;
  group: string;
}

/** 文件状态信息 */
export interface FileStat {
  type: FileType;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  permissions: string;
  owner: string;
  group: string;
}

/** 命令上下文 */
export interface CommandContext {
  /** 虚拟文件系统实例 */
  vfs: VirtualFileSystem;
  /** 环境变量 */
  env: EnvironmentVariables;
  /** 输出接口 */
  output: OutputHandler;
  /** 当前工作目录 */
  cwd: string;
  /** 命令参数 */
  args: string[];
  /** 选项/标志 */
  flags: Set<string>;
}

/** 命令定义 */
export interface CommandDefinition {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description: string;
  /** 使用说明 */
  usage: string;
  /** 命令执行函数 */
  execute: (context: CommandContext) => number | Promise<number>;
  /** 自动补全函数 */
  complete?: (partial: string, context: CommandContext) => string[];
}

/** 环境变量 */
export interface EnvironmentVariables {
  [key: string]: string;
  USER: string;
  HOSTNAME: string;
  HOME: string;
  PATH: string;
  PWD: string;
}

/** 输出处理器 */
export interface OutputHandler {
  /** 打印文本（带换行） */
  println: (text?: string) => void;
  /** 打印文本（不换行） */
  print: (text: string) => void;
  /** 打印错误信息 */
  error: (text: string) => void;
  /** 打印警告信息 */
  warn: (text: string) => void;
  /** 打印成功信息 */
  success: (text: string) => void;
  /** 打印带颜色的文本 */
  color: (text: string, color: AnsiColor) => string;
  /** 清屏 */
  clear: () => void;
}

/** ANSI 颜色码 */
export type AnsiColor =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite';

/** Prompt 上下文 */
export interface PromptContext {
  user: string;
  host: string;
  path: string;
  isRoot: boolean;
}

/** Prompt 格式化函数 */
export type PromptFormatter = (ctx: PromptContext) => string;

/** Shell 配置选项 */
export interface ShellOptions {
  /** 初始工作目录 */
  initialPath?: string;
  /** 初始环境变量 */
  env?: Partial<EnvironmentVariables>;
  /** 欢迎消息 */
  welcomeMessage?: string;
  /** 提示符格式 */
  promptFormat?: string | PromptFormatter;
}

/** 虚拟文件系统类接口（用于类型引用） */
export interface VirtualFileSystem {
  get currentPath(): string;
  mkdir(path: string): boolean;
  writeFile(path: string, content: string): boolean;
  readFile(path: string): string | null;
  ls(path?: string): FileNode[] | null;
  cd(path: string): boolean;
  pwd(): string;
  exists(path: string): boolean;
  stat(path: string): FileStat | null;
  rm(path: string, recursive?: boolean): boolean;
  resolvePath(path: string): string;
  getNode(path: string): FileNode | null;
}
