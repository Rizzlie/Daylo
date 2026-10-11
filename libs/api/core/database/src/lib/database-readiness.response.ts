export interface DatabaseReadinessResponse {
  checks: {
    database: 'up' | 'down';
  };
  status: 'ok' | 'error';
}

export const databaseReadyResponse: DatabaseReadinessResponse = {
  status: 'ok',
  checks: {
    database: 'up',
  },
};

export const databaseUnavailableResponse: DatabaseReadinessResponse = {
  status: 'error',
  checks: {
    database: 'down',
  },
};
