import { Terminal } from 'xterm';
import type { ITerminalInitOnlyOptions, ITerminalOptions } from 'xterm';

const LineBreakReg = /[\r\n]+/;

export class XTerm extends Terminal {
  private _writeln: Terminal['writeln'];

  constructor(options?: (ITerminalOptions & ITerminalInitOnlyOptions)) {
    super(options);

    this._writeln = this.writeln.bind(this);

    this.writeln = function (data: string | Uint8Array, callback?: () => void) {
      if (typeof data !== 'string') return this._writeln(data, callback);

      const lines = data.split(LineBreakReg);
      for (const line of lines) {
        this._writeln(line);
      }

      callback && callback();
    }
  }
}
