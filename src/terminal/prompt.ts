import type { PromptContext, PromptFormatter, EnvironmentVariables, VirtualFileSystem } from './types';

/**
 * Prompt 管理器
 * 支持自定义提示符格式
 */
export class PromptManager {
  private formatter: PromptFormatter;
  private vfs: VirtualFileSystem;
  private env: EnvironmentVariables;

  constructor(vfs: VirtualFileSystem, env: EnvironmentVariables) {
    this.vfs = vfs;
    this.env = env;
    // 默认格式: user@host:path$
    this.formatter = this.createDefaultFormatter();
  }

  /**
   * 设置提示符格式字符串
   * 支持的占位符:
   * - ${user} 或 \u: 用户名
   * - ${host} 或 \h: 主机名
   * - ${path} 或 \w: 当前路径
   * - ${shortPath} 或 \W: 当前路径的最后一个目录名
   * - $ 或 \$: 普通用户显示 $, root 显示 #
   */
  setFormat(format: string): void {
    this.formatter = (ctx) => {
      let result = format;

      // 替换占位符
      result = result.replace(/\\u|\${user}/g, ctx.user);
      result = result.replace(/\\h|\${host}/g, ctx.host);
      result = result.replace(/\\w|\${path}/g, ctx.path);
      result = result.replace(/\\W|\${shortPath}/g, this.getShortPath(ctx.path));
      result = result.replace(/\\\$|\${promptSymbol}/g, ctx.isRoot ? '#' : '$');

      return result;
    };
  }

  /**
   * 设置自定义格式化函数
   */
  setFormatter(formatter: PromptFormatter): void {
    this.formatter = formatter;
  }

  /**
   * 生成当前提示符
   */
  generate(): string {
    const ctx: PromptContext = {
      user: this.env.USER,
      host: this.env.HOSTNAME,
      path: this.formatPath(this.vfs.pwd()),
      isRoot: this.env.USER === 'root',
    };

    return this.formatter(ctx);
  }

  /**
   * 创建默认格式化器
   */
  private createDefaultFormatter(): PromptFormatter {
    return (ctx) => {
      const shortPath = this.getShortPath(ctx.path);
      const symbol = ctx.isRoot ? '#' : '$';
      return `${ctx.user}@${ctx.host}:${shortPath}${symbol} `;
    };
  }

  /**
   * 格式化路径（将 /home/user 替换为 ~）
   */
  private formatPath(path: string): string {
    const home = `/home/${this.env.USER}`;
    if (path === home) {
      return '~';
    }
    if (path.startsWith(home + '/')) {
      return '~' + path.substring(home.length);
    }
    return path;
  }

  /**
   * 获取短路径名（最后一个目录名）
   */
  private getShortPath(path: string): string {
    const formatted = this.formatPath(path);
    if (formatted === '~' || formatted === '/') {
      return formatted;
    }
    const parts = formatted.split('/');
    return parts[parts.length - 1] || '/';
  }
}
