import SwaggerParser from '@apidevtools/swagger-parser';
import { PrismaService } from '@daylo/api/core/database';
import { Server } from 'node:net';
import { Client } from 'pg';
import { exportOpenApiDocument, serializeOpenApiDocument } from './openapi-export';

describe('offline OpenAPI export', () => {
  it('exports the real operations without a listener or database lifecycle', async () => {
    const listen = vi.spyOn(Server.prototype, 'listen');
    const connect = vi.spyOn(Client.prototype, 'connect');
    const initialize = vi.spyOn(PrismaService.prototype, 'onModuleInit');
    const destroy = vi.spyOn(PrismaService.prototype, 'onModuleDestroy');
    try {
      const document = await exportOpenApiDocument();
      expect(document.openapi).toBe('3.0.0');
      expect(Object.keys(document.paths).sort()).toEqual([
        '/api/auth/csrf',
        '/api/auth/google',
        '/api/auth/google/callback',
        '/api/auth/session',
        '/api/auth/sign-out',
        '/api/configuration',
        '/api/health/ready',
        '/api/tasks/personal',
        '/api/tasks/personal/{id}',
        '/api/tasks/personal/{id}/complete',
        '/api/tasks/personal/{id}/reopen',
      ]);
      expect(document.paths['/api/auth/session'].get?.operationId).toBe('getCurrentSession');
      expect(document.paths['/api/health/ready'].get?.operationId).toBe('getReadiness');
      await SwaggerParser.validate(JSON.parse(JSON.stringify(document)));
      expect(listen).not.toHaveBeenCalled();
      expect(connect).not.toHaveBeenCalled();
      expect(initialize).not.toHaveBeenCalled();
      expect(destroy).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('produces identical complete documents across two exports', async () => {
    expect(serializeOpenApiDocument(await exportOpenApiDocument())).toBe(
      serializeOpenApiDocument(await exportOpenApiDocument()),
    );
  });

  it('sorts object keys while preserving semantic array order', () => {
    expect(serializeOpenApiDocument({ z: [{ b: 2, a: 1 }], a: ['z', 'a'] })).toBe(
      '{\n  "a": [\n    "z",\n    "a"\n  ],\n  "z": [\n    {\n      "a": 1,\n      "b": 2\n    }\n  ]\n}\n',
    );
  });
});
