import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import SwaggerParser from '@apidevtools/swagger-parser';
import { ApiAuthFeatureModule } from '@daylo/api/auth/feature';
import { DatabaseReadinessService } from '@daylo/api/core/database';
import {
  currentSessionResponseSchema,
  httpErrorResponseSchema,
} from '@daylo/shared/schemas';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { ApiHttpModule } from './api-http.module';
import { DatabaseReadinessController } from './database-readiness.controller';
import { createOpenApiDocument, setupOpenApi } from './openapi';

class SessionFixtureDto extends createZodDto(currentSessionResponseSchema.meta({ id: undefined })) {}

const syntheticUser = {
  id: '3eac11b0-884a-4f50-a593-28bd8663387a',
  email: 'session@example.test',
  displayName: 'Synthetic User',
};

// These routes exist only in the test module, never in the runtime application.
@Controller('session-fixtures')
class SessionFixtureController {
  @Get('pending')
  @ZodResponse({ type: SessionFixtureDto })
  pending() {
    return {
      status: 'pending' as const,
      user: { ...syntheticUser, googleSubject: 'private-subject' },
      tokenHash: 'private-hash',
    };
  }

  @Get('active')
  @ZodResponse({ type: SessionFixtureDto })
  active() {
    return { status: 'active' as const, user: syntheticUser };
  }

  @Get('invalid')
  @ZodResponse({ type: SessionFixtureDto })
  invalid() {
    return { status: 'active' as const, user: { ...syntheticUser, id: 'invalid' } };
  }
}

describe('session contract and OpenAPI', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ApiHttpModule, ApiAuthFeatureModule],
      controllers: [DatabaseReadinessController, SessionFixtureController],
      providers: [
        { provide: DatabaseReadinessService, useValue: { isReady: async () => true } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    setupOpenApi(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([undefined, 'synthetic-cookie=untrusted'])('returns the safe 401 envelope with cookie %s', async (cookie) => {
    const response = await fetch(`${baseUrl}/api/auth/session`, {
      headers: cookie ? { cookie } : {},
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(httpErrorResponseSchema.parse(await response.json())).toEqual({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required',
    });
  });

  it.each(['pending', 'active'])('serializes the %s contract without exposing internal fields', async (status) => {
    const response = await fetch(`${baseUrl}/api/session-fixtures/${status}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status, user: syntheticUser });
  });

  it('rejects an invalid session response without leaking validation details', async () => {
    const response = await fetch(`${baseUrl}/api/session-fixtures/invalid`);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
  });

  it('serves a valid OpenAPI 3.0 document with stable operations and shared schemas', async () => {
    const response = await fetch(`${baseUrl}/api/openapi.json`);
    expect(response.status).toBe(200);
    const document = await response.json();
    expect(document.openapi).toBe('3.0.0');
    await SwaggerParser.validate(JSON.parse(JSON.stringify(document)));
    const session = document.paths['/api/auth/session'].get;
    expect(session.operationId).toBe('getCurrentSession');
    expect(session.tags).toEqual(['Authentication']);
    expect(Object.keys(session.responses).sort()).toEqual(['200', '401', '500']);
    expect(session.responses['200'].content['application/json'].schema.$ref).toBe(
      '#/components/schemas/CurrentSessionResponseDto_Output',
    );
    expect(session.responses['401'].content['application/json'].schema.$ref).toBe(
      '#/components/schemas/SessionErrorResponseDto_Output',
    );
    expect(httpErrorResponseSchema.parse(session.responses['401'].content['application/json'].example)).toEqual({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required',
    });
    expect(document.components.schemas.CurrentSessionResponse_Output.properties.status.enum).toEqual(['pending', 'active']);
    expect(document.components.schemas.SessionUser_Output.required).toEqual(['id', 'email', 'displayName']);
    expect(document.paths['/api/health/ready'].get.operationId).toBe('getReadiness');
    expect(document.paths['/api/health/ready'].get.responses['503'].content['application/json'].schema.$ref).toBe('#/components/schemas/ReadinessErrorResponseDto_Output');
    expect(document).toEqual(createOpenApiDocument(app));
  });

  it('serves Swagger UI and its script assets', async () => {
    const response = await fetch(`${baseUrl}/api/docs`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('swagger-ui');
    const script = await fetch(`${baseUrl}/api/docs/swagger-ui-init.js`);
    expect(script.status).toBe(200);
    expect(await script.text()).toContain('getCurrentSession');
  });
});
