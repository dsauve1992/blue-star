import { Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from './public.decorator';
import type { AuthenticatedUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  @Get('profile')
  getProfile(@Req() req: any) {
    const user: AuthenticatedUser = req.user;
    return {
      userId: user.userId.value,
      email: user.email,
      givenName: user.givenName,
      familyName: user.familyName,
    };
  }

  @Get('test')
  @Public()
  testPublic() {
    return { message: 'This is a public endpoint' };
  }

  @Post('test')
  testProtected(@Req() req: any) {
    const user: AuthenticatedUser = req.user;
    return {
      message: 'This is a protected endpoint',
      user: {
        userId: user.userId.value,
        email: user.email,
      },
    };
  }
}
