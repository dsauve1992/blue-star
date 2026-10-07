import { UnauthorizedException } from '@nestjs/common';
import { UserId } from '../../shared/value-objects/user-id';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy();

  it('maps a valid payload to the auth user', () => {
    expect(
      strategy.validate({
        sub: 'user-1',
        email: 'a@b.c',
        given_name: 'Ada',
        family_name: 'Lovelace',
      }),
    ).toEqual({
      userId: UserId.of('user-1'),
      email: 'a@b.c',
      givenName: 'Ada',
      familyName: 'Lovelace',
    });
  });

  it('rejects a payload without sub', () => {
    expect(() => strategy.validate({} as never)).toThrow(UnauthorizedException);
  });

  it('rejects a blank sub', () => {
    expect(() => strategy.validate({ sub: '   ' })).toThrow(
      UnauthorizedException,
    );
  });
});
