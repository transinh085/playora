import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthSession, OrgMembership } from './auth.types';

export const IS_PUBLIC = Symbol('IS_PUBLIC');

/** Opt a non-contract handler out of the session requirement (contract routes use `auth: 'public'`). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentSession = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthSession => {
    const session = ctx.switchToHttp().getRequest<Request>().session;
    if (!session) throw new UnauthorizedException();
    return session;
  },
);

export const CurrentMembership = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): OrgMembership => {
    const membership = ctx.switchToHttp().getRequest<Request>().membership;
    if (!membership) throw new Error('CurrentMembership requires a contract with `permission`');
    return membership;
  },
);
