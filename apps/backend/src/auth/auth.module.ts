import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { KindeService } from './kinde.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthGuard } from './auth.guard';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      // JWT configuration will be handled by Kinde
      // This is just for the module structure
    }),
  ],
  controllers: [AuthController],
  providers: [KindeService, JwtStrategy, AuthGuard],
  exports: [KindeService, AuthGuard],
})
export class AuthModule {}
