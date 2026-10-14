import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Writable } from 'node:stream';

export const SECURITY_EVENT_OUTPUT = Symbol('SECURITY_EVENT_OUTPUT');
export type SecurityEventOutput = Pick<Writable,
  'write' | 'on' | 'removeListener' | 'writableNeedDrain' | 'destroyed' | 'writable'>;

/** Best-effort stdout sink: no retry queue and no recursive error logging. */
@Injectable()
export class SecurityEventWriter implements OnModuleInit, OnModuleDestroy {
  private failed = false;
  private readonly onError = () => { this.failed = true; };
  private readonly onWrite = (error?: Error | null) => { if (error) this.failed = true; };

  constructor(@Inject(SECURITY_EVENT_OUTPUT) private readonly output: SecurityEventOutput) {}

  onModuleInit(): void { this.output.on('error', this.onError); }
  onModuleDestroy(): void { this.output.removeListener('error', this.onError); }

  write(line: string): boolean {
    try {
      if (!this.canWrite()) return false;
      // A false return means this line was accepted, but future writes must wait
      // for drain. The callback and listener cover asynchronous stream errors.
      this.output.write(line, this.onWrite);
      return !this.failed;
    } catch {
      this.failed = true;
      return false;
    }
  }

  private canWrite(): boolean {
    return !this.failed && !this.output.destroyed
      && this.output.writable && !this.output.writableNeedDrain;
  }
}
