import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  INestApplication,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  HTTP_ERROR_CODES,
  requiredTextSchema,
} from '@daylo/shared/schemas';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiHttpModule } from './api-http.module';

class TestRequestDto extends createZodDto(
  z.object({ title: requiredTextSchema }),
) {}

class TestResponseDto extends createZodDto(
  z.object({ id: z.string().uuid(), title: requiredTextSchema }),
) {}

@Controller('contracts')
class ContractTestController {
  @Post()
  accept(@Body() body: TestRequestDto): TestRequestDto {
    return body;
  }

  @Get('response')
  @ZodSerializerDto(TestResponseDto)
  response(): object {
    return {
      id: '3eac11b0-884a-4f50-a593-28bd8663387a',
      title: 'Visible title',
      internalTokenHash: 'must-not-leak',
    };
  }

  @Get('invalid-response')
  @ZodSerializerDto(TestResponseDto)
  invalidResponse(): object {
    return { id: 'not-a-uuid', title: 'Invalid response' };
  }

  @Get('unauthorized')
  unauthorized(): never {
    throw new UnauthorizedException();
  }

  @Get('forbidden')
  forbidden(): never {
    throw new ForbiddenException();
  }

  @Get('conflict')
  conflict(): never {
    throw new ConflictException();
  }

  @Get('unavailable')
  unavailable(): never {
    throw new ServiceUnavailableException();
  }
}

describe('API HTTP contract boundary', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ApiHttpModule],
      controllers: [ContractTestController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects invalid input with stable validation details', async () => {
    const response = await fetch(`${baseUrl}/api/contracts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '   ' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      statusCode: 400,
      code: HTTP_ERROR_CODES.validationError,
      message: 'Request validation failed',
      details: [{ path: ['title'], code: 'too_small' }],
    });
  });

  it('strips fields not declared by the response schema', async () => {
    const response = await fetch(`${baseUrl}/api/contracts/response`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: '3eac11b0-884a-4f50-a593-28bd8663387a',
      title: 'Visible title',
    });
  });

  it('does not expose response serialization details', async () => {
    const response = await fetch(`${baseUrl}/api/contracts/invalid-response`);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      statusCode: 500,
      code: HTTP_ERROR_CODES.internalServerError,
      message: 'Internal server error',
    });
  });

  it.each([
    [
      '/api/contracts/unauthorized',
      401,
      HTTP_ERROR_CODES.authenticationRequired,
    ],
    ['/api/contracts/forbidden', 403, HTTP_ERROR_CODES.accessForbidden],
    ['/api/missing-resource', 404, HTTP_ERROR_CODES.resourceNotFound],
    ['/api/contracts/conflict', 409, HTTP_ERROR_CODES.versionConflict],
    [
      '/api/contracts/unavailable',
      503,
      HTTP_ERROR_CODES.serviceUnavailable,
    ],
  ])(
    'maps %s to the stable status code contract',
    async (path, statusCode, code) => {
      const response = await fetch(`${baseUrl}${path}`);

      expect(response.status).toBe(statusCode);
      await expect(response.json()).resolves.toMatchObject({
        statusCode,
        code,
      });
    },
  );
});
