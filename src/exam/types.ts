/**
 * 考试系统类型定义
 * 完全独立的模块，不依赖 Terminal 内部实现
 */

import type {
  VirtualFileSystem,
} from '../terminal/types';

/** 触发条件 */
export interface TriggerCondition {
  /** 命令名称 */
  command: string;
  /** 子命令/参数匹配 */
  subCommand?: string;
  /** 参数数量 */
  argsCount?: number;
  /** 自定义匹配器 */
  matcher?: (input: string, args: string[], flags: Set<string>) => boolean;
}

/** 提交条件 */
export interface SubmitCondition {
  /** 命令名称 */
  command: string;
  /** 子命令/参数匹配 */
  subCommand?: string;
  /** 参数验证 */
  validation?: {
    argsCount?: number;
    orArgs?: string[];
    andArgs?: string[];
  };
}

/** 文件检查规则 */
export interface FileCheckRule {
  path: string;
  shouldExist: boolean;
  contentShouldContain?: string[];
  contentShouldNotContain?: string[];
}

/** 命令历史检查规则 */
export interface CommandHistoryRule {
  requiredCommands?: string[];
  forbiddenCommands?: string[];
  order?: string[];
}

/** 评分规则 */
export interface GradingRules {
  commandHistory?: CommandHistoryRule;
  fileChecks?: FileCheckRule[];
}

/** 初始文件设置 */
export interface InitialFileSetup {
  path: string;
  content?: string;
  executable?: boolean;
}

/** 初始环境设置 */
export interface InitialSetup {
  directories?: string[];
  files?: InitialFileSetup[];
  env?: Record<string, string>;
  initialPath?: string;
}

/** 考试配置 */
export interface ExamConfig {
  id: string;
  title: string;
  description: string;
  trigger: TriggerCondition;
  submit: SubmitCondition;
  initialSetup: InitialSetup;
  gradingRules: GradingRules;
  messages?: {
    triggered?: string;
    success?: string;
    failure?: string;
  };
  showDetails?: boolean;
}

/** 考试结果 */
export interface ExamResult {
  passed: boolean;
  details: {
    commandCheck: boolean;
    fileCheck: boolean;
  };
  failures: string[];
}

/** 评分上下文 */
export interface GradingContext {
  commandHistory: string[];
  submitArgs: string[];
  submitFlags: Set<string>;
  vfs: VirtualFileSystem;
  cwd: string;
}

/** 考试系统配置 */
export interface ExamSystemOptions {
  /** 考试配置列表 */
  exams: ExamConfig[];
  /** 评分完成回调 */
  onGraded?: (result: ExamResult, exam: ExamConfig) => void;
  /** 考试开始回调 */
  onExamStarted?: (exam: ExamConfig) => void;
}

/** 考试状态 */
export interface ExamStatus {
  isInExam: boolean;
  exam: ExamConfig | null;
  historyCount: number;
}
