import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [PassportModule],
  controllers: [],
  providers: [JwtStrategy, AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}

export type { AuthContext } from './auth-context.interface';
export type { AuthenticatedRequest } from './types/request.interface';
export { Public } from './public.decorator';
