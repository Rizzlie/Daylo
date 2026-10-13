import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import {
  createZodValidationPipe,
  ZodSerializerInterceptor,
} from 'nestjs-zod';
import { ApiHttpExceptionFilter } from './api-http-exception.filter';

const DayloZodValidationPipe = createZodValidationPipe({
  strictSchemaDeclaration: true,
});

@Module({
  providers: [
    ApiHttpExceptionFilter,
    {
      provide: APP_PIPE,
      useClass: DayloZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useExisting: ApiHttpExceptionFilter,
    },
  ],
  exports: [ApiHttpExceptionFilter],
})
export class ApiHttpModule {}
