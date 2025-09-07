import { Body, Controller, Post } from '@nestjs/common';
import {
  OpenPositionRequestDto,
  OpenPositionResponseDto,
  OpenPositionUseCase,
} from '../use-cases/open-position.use-case';
import { PortfolioId } from '../domain/value-objects/portfolio-id';
import { Ticker } from '../domain/value-objects/ticker';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';

@Controller('positions')
export class PositionController {
  constructor(private readonly openPositionUseCase: OpenPositionUseCase) {}

  @Post()
  async openPosition(
    @Body()
    body: {
      portfolioId: string;
      instrument: string;
      quantity: number;
      price: number;
      timestamp: string;
      note?: string;
    },
  ): Promise<OpenPositionResponseDto> {
    const request: OpenPositionRequestDto = {
      portfolioId: PortfolioId.of(body.portfolioId),
      instrument: Ticker.of(body.instrument),
      quantity: Quantity.of(body.quantity),
      price: Price.of(body.price),
      timestamp: IsoTimestamp.of(body.timestamp),
      note: body.note,
    };

    return this.openPositionUseCase.execute(request);
  }
}
