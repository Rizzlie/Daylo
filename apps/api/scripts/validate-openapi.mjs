import SwaggerParser from '@apidevtools/swagger-parser';
import { resolve } from 'node:path';

await SwaggerParser.validate(resolve(process.argv[2] ?? 'docs/api/openapi.json'));
console.log('OpenAPI document is valid.');
