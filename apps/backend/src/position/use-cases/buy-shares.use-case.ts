import { Inject, Injectable } from '@nestjs/common';
import { PositionId } from '../domain/value-objects/position-id';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';
import type { PositionWriteRepository } from '../domain/repositories/position-write.repository.interface';
import type { AuthContext } from '../domain/auth/auth-context.interface';
import { POSITION_WRITE_REPOSITORY } from '../position.module';

export interface BuySharesRequestDto {
  positionId: PositionId;
  quantity: Quantity;
  price: Price;
  timestamp: IsoTimestamp;
  note?: string;
}

export interface BuySharesResponseDto {
  positionId: PositionId;
  totalQuantity: number;
}

@Injectable()
export class BuySharesUseCase {
  constructor(
    @Inject(POSITION_WRITE_REPOSITORY)
    private readonly positionWriteRepository: PositionWriteRepository,
  ) {}

  async execute(
    request: BuySharesRequestDto,
    authContext: AuthContext,
  ): Promise<BuySharesResponseDto> {
    const position = await this.positionWriteRepository.getById(
      request.positionId,
    );

    if (position.userId.value !== authContext.userId.value) {
      throw new Error('User does not own this position');
    }

    position.buy({
      qty: request.quantity,
      price: request.price,
      ts: request.timestamp,
      note: request.note,
    });

    await this.positionWriteRepository.save(position);

    return {
      positionId: position.id,
      totalQuantity: position.currentQty,
    };
  }
}
