/**
 * 考试系统核心类
 * 完全独立的模块，通过组合方式与 Terminal 集成
 */

import type { FakeShell } from '../terminal/shell';
import type { CommandDefinition, OutputHandler } from '../terminal/types';
import type {
  ExamConfig,
  ExamResult,
  ExamSystemOptions,
  GradingContext,
  ExamStatus,
} from './types';

export class ExamSystem {
  private exams: Map<string, ExamConfig> = new Map();
  private activeExam: ExamConfig | null = null;
  private examHistory: string[] = [];
  private isInExam: boolean = false;
  private shell: FakeShell | null = null;
  private output: OutputHandler | null = null;
  private options: ExamSystemOptions;

  constructor(options: ExamSystemOptions) {
    this.options = options;

    // 注册所有考试
    for (const exam of options.exams) {
      this.exams.set(exam.id, exam);
    }
  }

  /**
   * 绑定到 Shell
   * 在 Terminal 的 onReady 回调中调用
   */
  attach(shell: FakeShell): void {
    this.shell = shell;
    this.output = this.createOutputHandler(shell);
    
    // 设置命令监听
    shell.setOnCommand((command) => {
      this.onCommand(command);
    });
  }

  /**
   * 获取考试专用命令列表
   * 通过 Terminal 的 customCommands 属性传入
   */
  getExamCommands(): CommandDefinition[] {
    return [
      this.createTriggerCommand(),
      this.createSubmitCommand(),
      this.createStatusCommand(),
    ];
  }

  /**
   * 处理命令执行前事件
   * 通过 Terminal 的 onCommand 回调调用
   */
  onCommand(input: string): void {
    if (!this.shell) return;

    const { command, args, flags } = this.parseInput(input);

    // 1. 检查是否触发考试
    if (!this.isInExam) {
      const exam = this.findMatchingExam(command, args, flags, input);
      if (exam) {
        this.startExam(exam);
      }
      return;
    }

    // 2. 检查是否为提交命令
    if (this.isSubmitCommand(command, args, flags)) {
      this.submitExam(args, flags);
      return;
    }

    // 3. 记录考试期间的命令
    this.examHistory.push(input.trim());
  }

  /**
   * 手动开始指定考试
   */
  startExam(exam: ExamConfig): void {
    if (this.isInExam) {
      this.output?.warn('已有正在进行的考试');
      return;
    }

    this.activeExam = exam;
    this.isInExam = true;
    this.examHistory = [];

    // 设置初始环境
    this.setupEnvironment(exam);

    // 显示考试信息
    this.showExamInfo(exam);

    // 触发回调
    this.options.onExamStarted?.(exam);
  }

  /**
   * 提交考试并评分
   */
  submitExam(args: string[], flags: Set<string>): void {
    if (!this.isInExam || !this.activeExam) {
      this.output?.error('没有正在进行的考试');
      return;
    }

    const exam = this.activeExam;

    this.output?.println('');
    this.output?.println('📊 正在评分...');
    this.output?.println('');

    // 执行评分
    const result = this.grade(args, flags);

    // 显示结果
    this.showResult(result, exam);

    // 触发回调
    this.options.onGraded?.(result, exam);

    // 结束考试
    this.endExam();
  }

  /**
   * 结束当前考试
   */
  endExam(): void {
    this.activeExam = null;
    this.isInExam = false;
    this.examHistory = [];
  }

  /**
   * 获取当前状态
   */
  getStatus(): ExamStatus {
    return {
      isInExam: this.isInExam,
      exam: this.activeExam,
      historyCount: this.examHistory.length,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 查找匹配的考试配置
   */
  private findMatchingExam(
    command: string,
    args: string[],
    flags: Set<string>,
    input: string
  ): ExamConfig | null {
    for (const exam of this.exams.values()) {
      if (this.matchesTrigger(exam.trigger, command, args, flags, input)) {
        return exam;
      }
    }
    return null;
  }

  /**
   * 检查是否匹配触发条件
   */
  private matchesTrigger(
    trigger: ExamConfig['trigger'],
    command: string,
    args: string[],
    flags: Set<string>,
    input: string
  ): boolean {
    if (trigger.matcher) {
      return trigger.matcher(input, args, flags);
    }

    if (command !== trigger.command) return false;

    if (trigger.subCommand) {
      const firstArg = args[0];
      if (firstArg !== trigger.subCommand) return false;
    }

    if (trigger.argsCount !== undefined) {
      const effectiveArgs = trigger.subCommand ? args.slice(1) : args;
      if (effectiveArgs.length !== trigger.argsCount) return false;
    }

    return true;
  }

  /**
   * 检查是否为提交命令
   */
  private isSubmitCommand(
    command: string,
    args: string[],
    flags: Set<string>
  ): boolean {
    if (!this.activeExam) return false;

    const submit = this.activeExam.submit;
    if (command !== submit.command) return false;

    if (submit.subCommand) {
      const firstArg = args[0];
      if (firstArg !== submit.subCommand) return false;
    }

    return true;
  }

  /**
   * 执行评分
   */
  private grade(args: string[], flags: Set<string>): ExamResult {
    const exam = this.activeExam!;
    const context: GradingContext = {
      commandHistory: [...this.examHistory],
      submitArgs: args,
      submitFlags: flags,
      vfs: this.shell!.getVFS(),
      cwd: this.shell!.getVFS().pwd(),
    };

    const failures: string[] = [];

    // 1. 检查命令历史
    let commandCheck = true;
    if (exam.gradingRules.commandHistory) {
      const result = this.checkCommandHistory(context, exam.gradingRules.commandHistory);
      if (result !== true) {
        commandCheck = false;
        failures.push(...(Array.isArray(result) ? result : [result]));
      }
    }

    // 2. 检查文件状态
    let fileCheck = true;
    if (exam.gradingRules.fileChecks) {
      for (const check of exam.gradingRules.fileChecks) {
        const result = this.checkFile(context, check);
        if (result !== true) {
          fileCheck = false;
          failures.push(result);
        }
      }
    }

    // 3. 检查 submit 参数
    if (exam.submit.validation) {
      const result = this.checkSubmitValidation(args, flags, exam.submit.validation);
      if (result !== true) {
        failures.push(result);
      }
    }

    const passed = commandCheck && fileCheck && failures.length === 0;

    return {
      passed,
      details: { commandCheck, fileCheck },
      failures,
    };
  }

  /**
   * 检查命令历史
   */
  private checkCommandHistory(
    context: GradingContext,
    rule: ExamConfig['gradingRules']['commandHistory']
  ): true | string[] {
    const failures: string[] = [];
    const history = context.commandHistory;

    if (rule?.requiredCommands) {
      for (const required of rule.requiredCommands) {
        const executed = history.some((cmd) => cmd.includes(required));
        if (!executed) {
          failures.push(`未执行必需的命令: ${required}`);
        }
      }
    }

    if (rule?.forbiddenCommands) {
      for (const forbidden of rule.forbiddenCommands) {
        const executed = history.some((cmd) => cmd.includes(forbidden));
        if (executed) {
          failures.push(`执行了禁止的命令: ${forbidden}`);
        }
      }
    }

    if (rule?.order && rule.order.length > 1) {
      let lastIndex = -1;
      for (const cmd of rule.order) {
        const index = history.findIndex((h) => h.includes(cmd));
        if (index === -1) {
          failures.push(`未按顺序执行命令: ${cmd}`);
        } else if (index <= lastIndex) {
          failures.push(`命令顺序错误: ${cmd}`);
        }
        lastIndex = index;
      }
    }

    return failures.length === 0 ? true : failures;
  }

  /**
   * 检查文件
   */
  private checkFile(
    context: GradingContext,
    rule: NonNullable<ExamConfig['gradingRules']['fileChecks']>[number]
  ): true | string {
    const vfs = context.vfs;
    const exists = vfs.exists(rule.path);

    if (rule.shouldExist && !exists) {
      return `文件不存在: ${rule.path}`;
    }

    if (!rule.shouldExist && exists) {
      return `不应存在的文件存在: ${rule.path}`;
    }

    if (exists) {
      const content = vfs.readFile(rule.path) || '';

      if (rule.contentShouldContain) {
        for (const str of rule.contentShouldContain) {
          if (!content.includes(str)) {
            return `文件 ${rule.path} 未包含: ${str}`;
          }
        }
      }

      if (rule.contentShouldNotContain) {
        for (const str of rule.contentShouldNotContain) {
          if (content.includes(str)) {
            return `文件 ${rule.path} 不应包含: ${str}`;
          }
        }
      }
    }

    return true;
  }

  /**
   * 检查 submit 参数
   */
  private checkSubmitValidation(
    args: string[],
    flags: Set<string>,
    validation: ExamConfig['submit']['validation']
  ): true | string {
    if (!validation) return true;

    if (validation.argsCount !== undefined && args.length !== validation.argsCount) {
      return `参数数量错误，期望 ${validation.argsCount} 个，实际 ${args.length} 个`;
    }

    if (validation.orArgs && validation.orArgs.length > 0) {
      const valid = validation.orArgs.some((expected) => args.includes(expected));
      if (!valid) {
        return `参数错误，期望包含以下之一: ${validation.orArgs.join(', ')}`;
      }
    }

    if (validation.andArgs && validation.andArgs.length > 0) {
      for (const expected of validation.andArgs) {
        if (!args.includes(expected)) {
          return `缺少必需参数: ${expected}`;
        }
      }
    }

    return true;
  }

  /**
   * 设置初始环境
   */
  private setupEnvironment(exam: ExamConfig): void {
    const vfs = this.shell!.getVFS();
    const setup = exam.initialSetup;

    for (const dir of setup.directories || []) {
      vfs.mkdir(dir);
    }

    for (const file of setup.files || []) {
      vfs.writeFile(file.path, file.content || '');
    }

    for (const [key, value] of Object.entries(setup.env || {})) {
      this.shell!.setEnv(key, value);
    }

    if (setup.initialPath) {
      vfs.cd(setup.initialPath);
    }
  }

  /**
   * 显示考试信息
   */
  private showExamInfo(exam: ExamConfig): void {
    this.output?.println('');
    this.output?.println('╔════════════════════════════════════════════════════════╗');
    this.output?.println(`║  📝 ${exam.title.padEnd(50)}║`);
    this.output?.println('╠════════════════════════════════════════════════════════╣');
    this.output?.println(`║  任务: ${this.truncate(exam.description, 45).padEnd(45)}║`);
    this.output?.println('╠════════════════════════════════════════════════════════╣');
    if (exam.messages?.triggered) {
      this.output?.println(`║  💡 ${exam.messages.triggered.padEnd(50)}║`);
    }
    this.output?.println(
      `║  🎯 完成后执行: ${exam.submit.command} ${exam.submit.subCommand || ''}`.padEnd(53) + '║'
    );
    this.output?.println('╚════════════════════════════════════════════════════════╝');
    this.output?.println('');
  }

  /**
   * 显示评分结果
   */
  private showResult(result: ExamResult, exam: ExamConfig): void {
    if (result.passed) {
      this.output?.println('╔════════════════════════════════════════════════════════╗');
      this.output?.println('║                   🎉 考试通过！🎉                       ║');
      this.output?.println('╚════════════════════════════════════════════════════════╝');
      this.output?.println('');
      this.output?.success(exam.messages?.success || '恭喜你完成了考试！');

      if (exam.showDetails) {
        this.output?.println('');
        this.output?.println('评分详情:');
        this.output?.println(`  ✓ 命令历史检查`);
        this.output?.println(`  ✓ 文件状态检查`);
      }
    } else {
      this.output?.println('╔════════════════════════════════════════════════════════╗');
      this.output?.println('║                   ❌ 考试未通过                        ║');
      this.output?.println('╚════════════════════════════════════════════════════════╝');
      this.output?.println('');
      this.output?.error(exam.messages?.failure || '考试未通过');
      this.output?.println('');
      this.output?.println('失败原因:');
      for (const failure of result.failures) {
        this.output?.println(`  • ${failure}`);
      }
    }
    this.output?.println('');
  }

  /**
   * 创建 trigger 命令（手动触发）
   */
  private createTriggerCommand(): CommandDefinition {
    return {
      name: 'exam-start',
      description: 'Manually start an exam by ID',
      usage: 'exam-start <exam-id>',
      execute: ({ args, output }) => {
        const examId = args[0];
        if (!examId) {
          output.error('Usage: exam-start <exam-id>');
          output.println('Available exams:');
          for (const [id, exam] of this.exams) {
            output.println(`  ${id}: ${exam.title}`);
          }
          return 1;
        }

        const exam = this.exams.get(examId);
        if (!exam) {
          output.error(`Exam not found: ${examId}`);
          return 1;
        }

        this.startExam(exam);
        return 0;
      },
    };
  }

  /**
   * 创建 submit 命令（手动提交）
   */
  private createSubmitCommand(): CommandDefinition {
    return {
      name: 'exam-submit',
      description: 'Submit current exam',
      usage: 'exam-submit',
      execute: () => {
        this.submitExam([], new Set());
        return 0;
      },
    };
  }

  /**
   * 创建 status 命令
   */
  private createStatusCommand(): CommandDefinition {
    return {
      name: 'exam-status',
      description: 'Show exam status',
      usage: 'exam-status',
      execute: ({ output }) => {
        const status = this.getStatus();
        if (status.isInExam && status.exam) {
          output.println(`Current exam: ${status.exam.title}`);
          output.println(`Commands executed: ${status.historyCount}`);
        } else {
          output.println('No exam in progress');
        }
        return 0;
      },
    };
  }

  /**
   * 创建输出处理器
   */
  private createOutputHandler(shell: FakeShell): OutputHandler {
    return {
      print: (text: string) => shell.write(text),
      println: (text: string = '') => shell.writeln(text),
      error: (text: string) => shell.writeln(`\x1b[31m${text}\x1b[0m`),
      warn: (text: string) => shell.writeln(`\x1b[33m${text}\x1b[0m`),
      success: (text: string) => shell.writeln(`\x1b[32m${text}\x1b[0m`),
      color: (text: string, color: string) =>
        `\x1b[${this.getColorCode(color)}m${text}\x1b[0m`,
      clear: () => {},
    };
  }

  /**
   * 获取颜色代码
   */
  private getColorCode(color: string): string {
    const codes: Record<string, string> = {
      red: '31',
      green: '32',
      yellow: '33',
      blue: '34',
      magenta: '35',
      cyan: '36',
      white: '37',
    };
    return codes[color] || '37';
  }

  /**
   * 解析命令输入
   */
  private parseInput(input: string): { command: string; args: string[]; flags: Set<string> } {
    const tokens = input.trim().split(/\s+/);
    const command = tokens[0] || '';
    const args: string[] = [];
    const flags = new Set<string>();

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.startsWith('--')) {
        flags.add(token.substring(2));
      } else if (token.startsWith('-') && token.length > 1) {
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
   * 截断文本
   */
  private truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
  }
}
