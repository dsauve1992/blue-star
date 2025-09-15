import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserId } from '../position/domain/value-objects/user-id';
import { kindeConfig } from '../config/kinde.config';
import { passportJwtSecret } from 'jwks-rsa';

interface JwtPayload {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  aud?: string;
  iss?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwksUri = `https://${kindeConfig.domain}/.well-known/jwks`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        jwksUri,
        cache: true,
        cacheMaxAge: 600000, // 10 minutes
        rateLimit: true,
        jwksRequestsPerMinute: 5,
      }),
      // Note: Kinde tokens often have empty audience arrays, so we rely on issuer validation
      issuer: `https://${kindeConfig.domain}`,
    });
  }

  validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new Error('Invalid token payload');
    }

    // Validate issuer (audience validation removed for Kinde compatibility)
    if (payload.iss !== `https://${kindeConfig.domain}`) {
      throw new Error('Invalid token issuer');
    }

    return {
      userId: UserId.of(payload.sub),
      email: payload.email,
      givenName: payload.given_name,
      familyName: payload.family_name,
    };
  }
}
