// 导出核心类
export { VFS, VirtualFileSystem } from './vfs';
export { CLI } from './cli';
export { PromptManager } from './prompt';
export { FakeShell } from './shell';

// 导出类型
export type {
  FileType,
  FileNode,
  FileStat,
  CommandContext,
  EnvironmentVariables,
  OutputHandler,
  AnsiColor,
  PromptContext,
  PromptFormatter,
  ShellOptions,
} from './types';

// 导出命令
export { getBuiltInCommands } from './commands';
export type { CommandDefinition } from './types';

// 导出颜色工具
export { AnsiColors, AnsiReset, colorize } from './cli';
