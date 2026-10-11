import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { DatabaseReadinessService } from './database-readiness.service';

vi.mock('pg', () => ({
  Client: vi.fn(),
}));

describe('DatabaseReadinessService', () => {
  const databaseUrl = 'postgresql://daylo:secret@localhost:5433/daylo';
  const client = {
    connect: vi.fn(),
    end: vi.fn(),
    query: vi.fn(),
  };
  let service: DatabaseReadinessService;

  beforeEach(() => {
    vi.clearAllMocks();
    client.connect.mockResolvedValue(undefined);
    client.end.mockResolvedValue(undefined);
    client.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    vi.mocked(Client).mockImplementation(function mockClientConstructor() {
      return client as unknown as Client;
    });

    const config = {
      getOrThrow: vi.fn().mockReturnValue(databaseUrl),
    } as unknown as ConfigService;
    service = new DatabaseReadinessService(config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports ready after a successful query', async () => {
    await expect(service.isReady()).resolves.toBe(true);
    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 1000,
        query_timeout: 1000,
        statement_timeout: 1000,
      }),
    );
    expect(client.query).toHaveBeenCalledWith('SELECT 1');
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('reports unavailable and closes the client when the query fails', async () => {
    client.query.mockRejectedValue(new Error('connection failed'));

    await expect(service.isReady()).resolves.toBe(false);
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('reports unavailable when the probe exceeds 1000 milliseconds', async () => {
    vi.useFakeTimers();
    client.connect.mockImplementation(() => new Promise(() => undefined));

    const readiness = service.isReady();
    await vi.advanceTimersByTimeAsync(1000);

    await expect(readiness).resolves.toBe(false);
    expect(client.query).not.toHaveBeenCalled();
    expect(client.end).toHaveBeenCalledOnce();
  });
});
