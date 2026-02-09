import { useEffect, useRef } from 'preact/hooks';
import { XTerm } from './class';
import { FakeShell } from './shell';
import type { ShellOptions, CommandDefinition } from './types';
import 'xterm/css/xterm.css';

export interface TerminalProps {
  /** 容器类名 */
  className?: string;
  /** 容器样式 */
  style?: preact.CSSProperties;
  /** 初始工作目录 */
  initialPath?: string;
  /** 初始环境变量 */
  env?: Partial<ShellOptions['env']>;
  /** 欢迎消息 */
  welcomeMessage?: string;
  /** 提示符格式 */
  promptFormat?: string | ((ctx: { user: string; host: string; path: string; isRoot: boolean }) => string);
  /** 自定义命令 */
  customCommands?: CommandDefinition[];
  /** 命令执行回调 */
  onCommand?: (command: string) => void;
  /** 终端初始化完成回调 */
  onReady?: (shell: FakeShell) => void;
}

/**
 * 终端 React 组件
 * 封装 FakeShell 和 xterm.js
 */
export function Terminal({
  className = '',
  style = {},
  initialPath = '/home/guest',
  env = {},
  welcomeMessage = 'Welcome to Midrai Terminal v1.0\nType "help" to see available commands.',
  promptFormat,
  customCommands = [],
  onReady,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<FakeShell | null>(null);
  const terminalRef = useRef<XTerm | null>(null);

  // 初始化终端
  useEffect(() => {
    if (!containerRef.current) return;

    // 创建 xterm.js 实例
    const terminal = new XTerm({
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'block',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
    });

    terminalRef.current = terminal;

    // 创建 FakeShell 实例
    const shell = new FakeShell({
      initialPath,
      env,
      welcomeMessage,
      promptFormat,
    });

    shellRef.current = shell;

    // 注册自定义命令
    for (const cmd of customCommands) {
      shell.registerCommand(cmd);
    }

    // 打开终端并连接
    terminal.open(containerRef.current);
    shell.attach(terminal);

    // 调整大小
    const resizeObserver = new ResizeObserver(() => {
      shell.fit();
    });
    resizeObserver.observe(containerRef.current);

    // 通知就绪
    onReady?.(shell);

    // 清理
    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      shellRef.current = null;
      terminalRef.current = null;
    };
  }, []);

  // 处理属性变化
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    // 更新环境变量
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        shell.setEnv(key, value);
      }
    }
  }, [env]);

  return (
    <div
      ref={containerRef}
      className={`terminal-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '300px',
        backgroundColor: '#1e1e1e',
        padding: '8px',
        borderRadius: '4px',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}
