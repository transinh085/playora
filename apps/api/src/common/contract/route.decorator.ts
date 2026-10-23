import {
  applyDecorators,
  BadRequestException,
  createParamDecorator,
  type ExecutionContext,
  HttpCode,
  RequestMapping,
  RequestMethod,
  SetMetadata,
} from '@nestjs/common';
import { ErrorCode, type RouteArgs, type RouteDef } from '@playora/contracts';
import type { Request } from 'express';
import { z } from 'zod';

export const ROUTE_CONTRACT = Symbol('ROUTE_CONTRACT');

/**
 * Binds a handler to a route contract from @playora/contracts: method, path, status code,
 * auth mode and org permission all come from the contract, so server and client cannot drift.
 */
export function Route(route: RouteDef) {
  return applyDecorators(
    RequestMapping({ path: route.path, method: RequestMethod[route.method] }),
    HttpCode(route.status ?? 200),
    SetMetadata(ROUTE_CONTRACT, route),
  );
}

export function getRouteContract(ctx: ExecutionContext): RouteDef | undefined {
  return Reflect.getMetadata(ROUTE_CONTRACT, ctx.getHandler());
}

function parsePart(schema: z.ZodType | undefined, value: unknown, part: string) {
  if (!schema) return undefined;
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: `Invalid ${part}`,
      details: { [part]: z.flattenError(result.error) },
    });
  }
  return result.data;
}

/** Validated `{ params, query, body }` for the handler's contract: `@Args() args: RouteArgs<typeof eventsApi.create>`. */
export const Args = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RouteArgs<RouteDef> => {
    const route = getRouteContract(ctx);
    if (!route) throw new Error('@Args() requires @Route(contract) on the same handler');
    const req = ctx.switchToHttp().getRequest<Request>();
    return {
      params: parsePart(route.params, req.params, 'params'),
      query: parsePart(route.query, req.query, 'query'),
      body: parsePart(route.body, req.body, 'body'),
    } as RouteArgs<RouteDef>;
  },
);
