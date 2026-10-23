import { z } from 'zod';
import type { RouteDef } from './route';

type JsonSchema = Record<string, unknown>;

function toSchema(schema: z.ZodType, io: 'input' | 'output'): JsonSchema {
  return z.toJSONSchema(schema, { io, unrepresentable: 'any' }) as JsonSchema;
}

function objectParams(schema: z.ZodType | undefined, location: 'path' | 'query') {
  if (!schema) return [];
  const json = toSchema(schema, 'input') as {
    properties?: Record<string, JsonSchema>;
    required?: string[];
  };
  return Object.entries(json.properties ?? {}).map(([name, prop]) => ({
    name,
    in: location,
    required: location === 'path' || (json.required ?? []).includes(name),
    schema: prop,
  }));
}

/** OpenAPI 3.1 document generated from the zod route contracts (served at /v1/openapi.json). */
export function buildOpenApiDocument(
  routes: readonly RouteDef[],
  info: { title: string; version: string; serverUrl: string },
) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of routes) {
    const path = route.path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
    paths[path] ??= {};
    paths[path][route.method.toLowerCase()] = {
      summary: route.summary,
      tags: route.tags,
      security: route.auth === 'public' ? [] : [{ [route.auth]: [] }],
      parameters: [...objectParams(route.params, 'path'), ...objectParams(route.query, 'query')],
      ...(route.body && {
        requestBody: {
          required: true,
          content: { 'application/json': { schema: toSchema(route.body, 'input') } },
        },
      }),
      responses: {
        [String(route.status ?? 200)]: {
          description: 'OK',
          content: { 'application/json': { schema: toSchema(route.response, 'output') } },
        },
        default: {
          description: 'Error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    };
  }
  return {
    openapi: '3.1.0',
    info: { title: info.title, version: info.version },
    servers: [{ url: info.serverUrl }],
    paths,
    components: {
      securitySchemes: {
        session: { type: 'apiKey', in: 'cookie', name: 'better-auth.session_token' },
        player: { type: 'http', scheme: 'bearer' },
      },
      schemas: {
        ApiError: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {},
                requestId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  };
}
