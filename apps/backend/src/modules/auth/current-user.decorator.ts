import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserId } from '../position/domain/value-objects/user-id';
import type { AuthenticatedRequest } from './types/request.interface';

export interface AuthenticatedUser {
  userId: UserId;
  email?: string;
  givenName?: string;
  familyName?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
