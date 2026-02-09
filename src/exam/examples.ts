/**
 * 示例考试配置
 * 展示各种考试场景
 */

import type { ExamConfig } from './types';

/**
 * Docker 基础操作考试
 * 触发: docker build
 * 提交: docker push
 */
export const dockerExam: ExamConfig = {
  id: 'docker-basic',
  title: 'Docker 基础操作考试',
  description: '请构建一个 Docker 镜像并推送到仓库',

  trigger: {
    command: 'docker',
    subCommand: 'build',
  },

  submit: {
    command: 'docker',
    subCommand: 'push',
    validation: {
      argsCount: 1,
    },
  },

  initialSetup: {
    directories: ['/home/guest/docker-project'],
    files: [
      {
        path: '/home/guest/docker-project/Dockerfile',
        content: 'FROM nginx\nCOPY . /usr/share/nginx/html',
      },
    ],
    initialPath: '/home/guest/docker-project',
  },

  gradingRules: {
    commandHistory: {
      requiredCommands: ['docker build'],
      forbiddenCommands: ['docker rmi', 'docker rm'],
    },
    fileChecks: [
      {
        path: '/home/guest/docker-project/Dockerfile',
        shouldExist: true,
      },
    ],
  },

  messages: {
    triggered: '🐳 Docker 考试开始！请构建镜像并 push',
    success: 'Docker 操作掌握良好！',
    failure: '请确保使用 docker build 构建镜像后再 push',
  },
  showDetails: true,
};

/**
 * Git 工作流程考试
 * 触发: git init
 * 提交: git commit
 */
export const gitExam: ExamConfig = {
  id: 'git-workflow',
  title: 'Git 工作流程考试',
  description: '初始化仓库，添加文件，然后提交',

  trigger: {
    command: 'git',
    subCommand: 'init',
  },

  submit: {
    command: 'git',
    subCommand: 'commit',
    validation: {
      argsCount: 2,
      andArgs: ['-m'],
    },
  },

  initialSetup: {
    directories: ['/home/guest/my-project'],
    files: [
      {
        path: '/home/guest/my-project/README.md',
        content: '# My Project',
      },
    ],
    initialPath: '/home/guest/my-project',
  },

  gradingRules: {
    commandHistory: {
      requiredCommands: ['git init', 'git add', 'git commit'],
      order: ['git init', 'git add', 'git commit'],
    },
    fileChecks: [
      {
        path: '/home/guest/my-project/.git',
        shouldExist: true,
      },
    ],
  },

  messages: {
    triggered: '📦 Git 考试开始！请完成 init → add → commit',
    success: 'Git 工作流掌握正确！',
    failure: '请按顺序执行: git init → git add → git commit -m "message"',
  },
};

/**
 * 文件操作基础考试
 * 触发: mkdir project
 * 提交: touch README.md
 */
export const fileOpsExam: ExamConfig = {
  id: 'file-ops',
  title: '文件操作基础考试',
  description: '创建 project 目录，并在其中创建 README.md 文件',

  trigger: {
    command: 'mkdir',
    argsCount: 1,
  },

  submit: {
    command: 'touch',
    subCommand: 'README.md',
  },

  initialSetup: {
    initialPath: '/home/guest',
  },

  gradingRules: {
    commandHistory: {
      requiredCommands: ['mkdir', 'cd', 'touch'],
    },
    fileChecks: [
      {
        path: '/home/guest/project',
        shouldExist: true,
      },
      {
        path: '/home/guest/project/README.md',
        shouldExist: true,
      },
    ],
  },

  messages: {
    triggered: '📁 文件操作考试开始！',
    success: '文件操作掌握正确！',
    failure: '请确保创建了 project 目录和 README.md 文件',
  },
};

/**
 * 编译运行考试
 * 触发: gcc main.c
 * 提交: ./a.out
 */
export const compileExam: ExamConfig = {
  id: 'c-compile',
  title: 'C 语言编译考试',
  description: '编译 main.c 并运行程序',

  trigger: {
    command: 'gcc',
  },

  submit: {
    command: './a.out',
  },

  initialSetup: {
    files: [
      {
        path: '/home/guest/main.c',
        content: '#include <stdio.h>\nint main() { printf("Hello"); return 0; }',
      },
    ],
    initialPath: '/home/guest',
  },

  gradingRules: {
    commandHistory: {
      requiredCommands: ['gcc', './a.out'],
    },
  },

  messages: {
    triggered: '🔧 编译考试开始！',
    success: '编译运行成功！',
    failure: '请先使用 gcc 编译，再运行 ./a.out',
  },
};

/**
 * 所有示例考试
 */
export const exampleExams: ExamConfig[] = [
  dockerExam,
  gitExam,
  fileOpsExam,
  compileExam,
];
