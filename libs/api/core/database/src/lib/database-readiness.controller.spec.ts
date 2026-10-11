import { ServiceUnavailableException } from '@nestjs/common';
import { DatabaseReadinessController } from './database-readiness.controller';
import {
  databaseReadyResponse,
  databaseUnavailableResponse,
} from './database-readiness.response';
import { DatabaseReadinessService } from './database-readiness.service';

describe('DatabaseReadinessController', () => {
  const database = {
    isReady: vi.fn(),
  };
  const controller = new DatabaseReadinessController(
    database as unknown as DatabaseReadinessService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the stable ready response when the database is available', async () => {
    database.isReady.mockResolvedValue(true);

    await expect(controller.getReadiness()).resolves.toEqual(
      databaseReadyResponse,
    );
  });

  it('throws a 503 with the stable unavailable response', async () => {
    database.isReady.mockResolvedValue(false);

    const readiness = controller.getReadiness();

    await expect(readiness).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(readiness).rejects.toMatchObject({
      status: 503,
      response: databaseUnavailableResponse,
    });
  });
});
