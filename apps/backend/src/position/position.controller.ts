import { Controller, Get } from '@nestjs/common';

@Controller('positions')
export class PositionController {
  constructor() {}

  @Get()
  getHello(): string {
    return 'hello world from position controller';
  }
}
