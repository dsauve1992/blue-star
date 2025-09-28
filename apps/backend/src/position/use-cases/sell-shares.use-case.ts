import { Inject, Injectable } from '@nestjs/common';
import { PositionId } from '../domain/value-objects/position-id';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';
import type { PositionWriteRepository } from '../domain/repositories/position-write.repository.interface';
import type { AuthContext } from '../../auth/auth-context.interface';
import { POSITION_WRITE_REPOSITORY } from '../constants/tokens';

export interface SellSharesRequestDto {
  positionId: PositionId;
  quantity: Quantity;
  price: Price;
  timestamp: IsoTimestamp;
  note?: string;
}

export interface SellSharesResponseDto {
  positionId: PositionId;
  remainingQuantity: number;
  isClosed: boolean;
}

@Injectable()
export class SellSharesUseCase {
  constructor(
    @Inject(POSITION_WRITE_REPOSITORY)
    private readonly positionWriteRepository: PositionWriteRepository,
  ) {}

  async execute(
    request: SellSharesRequestDto,
    authContext: AuthContext,
  ): Promise<SellSharesResponseDto> {
    const position = await this.positionWriteRepository.getById(
      request.positionId,
    );

    if (position.userId.value !== authContext.userId.value) {
      throw new Error('User does not own this position');
    }

    position.sell({
      qty: request.quantity,
      price: request.price,
      ts: request.timestamp,
      note: request.note,
    });

    await this.positionWriteRepository.save(position);

    return {
      positionId: position.id,
      remainingQuantity: position.currentQty,
      isClosed: position.isClosed,
    };
  }
}
