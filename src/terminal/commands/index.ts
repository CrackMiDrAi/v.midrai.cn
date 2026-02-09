import type { CommandDefinition } from '../types';
import { ls } from './ls';
import { cd } from './cd';
import { pwd } from './pwd';
import { cat } from './cat';
import { echo } from './echo';
import { mkdir } from './mkdir';
import { touch } from './touch';
import { rm } from './rm';
import { clear } from './clear';
import { help } from './help';
import { whoami } from './whoami';
import { date } from './date';
import { history } from './history';

/**
 * 获取所有内置命令
 */
export function getBuiltInCommands(): CommandDefinition[] {
  return [
    ls,
    cd,
    pwd,
    cat,
    echo,
    mkdir,
    touch,
    rm,
    clear,
    help,
    whoami,
    date,
    history,
  ];
}

// 导出单个命令
export {
  ls,
  cd,
  pwd,
  cat,
  echo,
  mkdir,
  touch,
  rm,
  clear,
  help,
  whoami,
  date,
  history,
};
