import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { KindeService } from './kinde.service';
import { UserId } from '../position/domain/value-objects/user-id';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly kindeService: KindeService) {
    super();
  }

  async validate(req: any): Promise<any> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const user = await this.kindeService.verifyToken(token);

      if (!user || !user.id) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return {
        userId: UserId.of(user.id),
        email: user.email,
        givenName: user.given_name,
        familyName: user.family_name,
      };
    } catch (error) {
      throw new UnauthorizedException('Token verification failed');
    }
  }
}
