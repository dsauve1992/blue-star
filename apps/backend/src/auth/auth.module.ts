import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-for-development',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [],
  providers: [JwtStrategy, AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
