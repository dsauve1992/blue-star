import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { Public } from './public.decorator';

class PlainController {
  handler() {}
}

class PublicHandlerController {
  @Public()
  handler() {}
}

@Public()
class PublicClassController {
  handler() {}
}

type Controller = { prototype: { handler(): void } };

const contextFor = (controller: Controller): ExecutionContext =>
  ({
    getHandler: () => controller.prototype.handler,
    getClass: () => controller,
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  const guard = new AuthGuard(new Reflector());
  const parentPrototype = Object.getPrototypeOf(AuthGuard.prototype) as {
    canActivate(context: ExecutionContext): unknown;
  };
  let parentCanActivate: jest.SpyInstance<unknown, [ExecutionContext]>;

  beforeEach(() => {
    parentCanActivate = jest
      .spyOn(parentPrototype, 'canActivate')
      .mockReturnValue('delegated');
  });

  afterEach(() => {
    parentCanActivate.mockRestore();
  });

  it('allows a handler decorated with @Public() without authenticating', () => {
    expect(guard.canActivate(contextFor(PublicHandlerController))).toBe(true);
    expect(parentCanActivate).not.toHaveBeenCalled();
  });

  it('allows a plain handler on a class decorated with @Public()', () => {
    expect(guard.canActivate(contextFor(PublicClassController))).toBe(true);
    expect(parentCanActivate).not.toHaveBeenCalled();
  });

  it('delegates to passport when nothing is public', () => {
    const context = contextFor(PlainController);

    expect(guard.canActivate(context)).toBe('delegated');
    expect(parentCanActivate).toHaveBeenCalledTimes(1);
    expect(parentCanActivate).toHaveBeenCalledWith(context);
  });
});
