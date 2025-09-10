import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserId } from '../position/domain/value-objects/user-id';

export interface AuthenticatedUser {
  userId: UserId;
  email?: string;
  givenName?: string;
  familyName?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
