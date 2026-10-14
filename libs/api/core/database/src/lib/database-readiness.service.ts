import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';

const readinessTimeoutMilliseconds = 1000;

@Injectable()
export class DatabaseReadinessService {
  constructor(private readonly config: ConfigService) {}

  async isReady(): Promise<boolean> {
    const client = new Client({
      connectionString: this.config.getOrThrow<string>('runtime.databaseUrl'),
      connectionTimeoutMillis: readinessTimeoutMilliseconds,
      query_timeout: readinessTimeoutMilliseconds,
      statement_timeout: readinessTimeoutMilliseconds,
    });
    try {
      await this.probeWithinDeadline(client);
      return true;
    } catch {
      return false;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private async probeWithinDeadline(client: Client): Promise<void> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.runProbe(client),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Database readiness probe timed out')),
            readinessTimeoutMilliseconds,
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async runProbe(client: Client): Promise<void> {
    await client.connect();
    await client.query('SELECT 1');
  }
}
