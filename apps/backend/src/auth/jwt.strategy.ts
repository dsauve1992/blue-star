import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserId } from '../position/domain/value-objects/user-id';

interface JwtPayload {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret-for-development',
    });
  }

  validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: UserId.of(payload.sub),
      email: payload.email,
      givenName: payload.given_name,
      familyName: payload.family_name,
    };
  }
}
