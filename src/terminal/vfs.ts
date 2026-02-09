import type { FileNode, FileStat, FileType, VirtualFileSystem } from './types';

/**
 * 虚拟文件系统实现
 * 提供类似 Linux 文件系统的 API
 */
export class VFS implements VirtualFileSystem {
  private root: FileNode;
  private _currentPath: string;

  constructor() {
    this.root = this.createNode('directory', '', null);
    this._currentPath = '/';
    this.initDefaultStructure();
  }

  /** 获取当前工作目录 */
  get currentPath(): string {
    return this._currentPath;
  }

  /** 创建文件节点 */
  private createNode(
    type: FileType,
    name: string,
    parent: FileNode | null,
    content: string = ''
  ): FileNode {
    const now = new Date();
    return {
      type,
      name,
      content,
      children: type === 'directory' ? new Map() : new Map(),
      parent,
      createdAt: now,
      modifiedAt: now,
      permissions: type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--',
      owner: 'root',
      group: 'root',
    };
  }

  /** 初始化默认目录结构 */
  private initDefaultStructure(): void {
    // 创建标准 Linux 目录结构
    this.mkdir('/bin');
    this.mkdir('/etc');
    this.mkdir('/home');
    this.mkdir('/tmp');
    this.mkdir('/usr');
    this.mkdir('/var');
    this.mkdir('/root');
    this.mkdir('/proc');

    // 创建默认用户目录
    this.mkdir('/home/guest');
    this._currentPath = '/home/guest';

    // 添加一些示例文件
    this.writeFile(
      '/etc/hostname',
      'midrai\n'
    );
    this.writeFile(
      '/etc/motd',
      'Welcome to Midrai Terminal!\n'
    );
    this.writeFile(
      '/home/guest/.bashrc',
      '# .bashrc\nexport PS1="\\u@\\h:\\w\\$ "\n'
    );
    this.writeFile(
      '/home/guest/readme.txt',
      'Welcome to the fake terminal!\n\nTry typing some commands like:\n  ls, cd, pwd, cat, echo, mkdir, touch, rm\n'
    );
  }

  /**
   * 解析路径（处理 . 和 ..）
   */
  resolvePath(path: string): string {
    if (!path || path === '~') {
      return '/home/guest';
    }

    // 绝对路径
    if (path.startsWith('/')) {
      return this.normalizePath(path);
    }

    // 相对路径
    return this.normalizePath(`${this._currentPath}/${path}`);
  }

  /**
   * 规范化路径（处理 . 和 ..）
   */
  private normalizePath(path: string): string {
    const parts = path.split('/').filter(p => p && p !== '.');
    const result: string[] = [];

    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else {
        result.push(part);
      }
    }

    return '/' + result.join('/');
  }

  /**
   * 获取路径对应的节点
   */
  getNode(path: string): FileNode | null {
    const resolvedPath = this.resolvePath(path);
    if (resolvedPath === '/') {
      return this.root;
    }

    const parts = resolvedPath.split('/').filter(Boolean);
    let current: FileNode = this.root;

    for (const part of parts) {
      if (!current.children.has(part)) {
        return null;
      }
      current = current.children.get(part)!;
    }

    return current;
  }

  /**
   * 创建目录
   */
  mkdir(path: string): boolean {
    const resolvedPath = this.resolvePath(path);
    const parentPath = resolvedPath.substring(0, resolvedPath.lastIndexOf('/')) || '/';
    const dirName = resolvedPath.substring(resolvedPath.lastIndexOf('/') + 1);

    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'directory') {
      return false;
    }

    if (parent.children.has(dirName)) {
      return false; // 已存在
    }

    const newDir = this.createNode('directory', dirName, parent);
    parent.children.set(dirName, newDir);
    parent.modifiedAt = new Date();

    return true;
  }

  /**
   * 创建文件
   */
  writeFile(path: string, content: string): boolean {
    const resolvedPath = this.resolvePath(path);
    const parentPath = resolvedPath.substring(0, resolvedPath.lastIndexOf('/')) || '/';
    const fileName = resolvedPath.substring(resolvedPath.lastIndexOf('/') + 1);

    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'directory') {
      return false;
    }

    if (parent.children.has(fileName)) {
      // 更新现有文件
      const existing = parent.children.get(fileName)!;
      if (existing.type !== 'file') {
        return false;
      }
      existing.content = content;
      existing.modifiedAt = new Date();
    } else {
      // 创建新文件
      const newFile = this.createNode('file', fileName, parent, content);
      parent.children.set(fileName, newFile);
    }

    parent.modifiedAt = new Date();
    return true;
  }

  /**
   * 读取文件内容
   */
  readFile(path: string): string | null {
    const node = this.getNode(path);
    if (!node || node.type !== 'file') {
      return null;
    }
    return node.content;
  }

  /**
   * 列出目录内容
   */
  ls(path?: string): FileNode[] | null {
    const targetPath = path ? this.resolvePath(path) : this._currentPath;
    const node = this.getNode(targetPath);

    if (!node || node.type !== 'directory') {
      return null;
    }

    return Array.from(node.children.values());
  }

  /**
   * 切换目录
   */
  cd(path: string): boolean {
    const resolvedPath = this.resolvePath(path);
    const node = this.getNode(resolvedPath);

    if (!node || node.type !== 'directory') {
      return false;
    }

    this._currentPath = resolvedPath;
    return true;
  }

  /**
   * 获取当前目录路径
   */
  pwd(): string {
    return this._currentPath;
  }

  /**
   * 检查路径是否存在
   */
  exists(path: string): boolean {
    return this.getNode(path) !== null;
  }

  /**
   * 获取文件/目录状态
   */
  stat(path: string): FileStat | null {
    const node = this.getNode(path);
    if (!node) {
      return null;
    }

    return {
      type: node.type,
      size: node.type === 'file' ? node.content.length : 0,
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt,
      permissions: node.permissions,
      owner: node.owner,
      group: node.group,
    };
  }

  /**
   * 删除文件或目录
   */
  rm(path: string, recursive: boolean = false): boolean {
    const resolvedPath = this.resolvePath(path);
    const parentPath = resolvedPath.substring(0, resolvedPath.lastIndexOf('/')) || '/';
    const name = resolvedPath.substring(resolvedPath.lastIndexOf('/') + 1);

    const parent = this.getNode(parentPath);
    const node = this.getNode(resolvedPath);

    if (!parent || !node) {
      return false;
    }

    if (node.type === 'directory' && node.children.size > 0 && !recursive) {
      return false; // 非空目录需要 recursive 标志
    }

    parent.children.delete(name);
    parent.modifiedAt = new Date();
    return true;
  }

  /**
   * 复制文件或目录
   */
  cp(src: string, dest: string, recursive: boolean = false): boolean {
    const srcNode = this.getNode(src);
    if (!srcNode) {
      return false;
    }

    if (srcNode.type === 'directory' && !recursive) {
      return false;
    }

    const destPath = this.resolvePath(dest);
    const destParentPath = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
    const destName = destPath.substring(destPath.lastIndexOf('/') + 1);

    const destParent = this.getNode(destParentPath);
    if (!destParent || destParent.type !== 'directory') {
      return false;
    }

    // 如果是目录，递归复制
    if (srcNode.type === 'directory') {
      this.mkdir(destPath);
      for (const [name, child] of srcNode.children) {
        this.cp(
          `${src}/${name}`,
          `${dest}/${name}`,
          true
        );
      }
    } else {
      // 复制文件
      this.writeFile(destPath, srcNode.content);
    }

    return true;
  }

  /**
   * 移动/重命名文件或目录
   */
  mv(src: string, dest: string): boolean {
    const srcPath = this.resolvePath(src);
    const destPath = this.resolvePath(dest);

    if (!this.cp(src, dest, true)) {
      return false;
    }

    return this.rm(src, true);
  }
}

// 导出别名
export { VFS as VirtualFileSystem };
