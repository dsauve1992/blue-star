import { Inject, Injectable } from '@nestjs/common';
import { PositionId } from '../domain/value-objects/position-id';
import { StopPrice } from '../domain/value-objects/stop-price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';
import type { PositionWriteRepository } from '../domain/repositories/position-write.repository.interface';
import type { AuthContext } from '../domain/auth/auth-context.interface';
import { POSITION_WRITE_REPOSITORY } from '../position.module';

export interface SetStopLossRequestDto {
  positionId: PositionId;
  stopPrice: StopPrice;
  timestamp: IsoTimestamp;
  note?: string;
}

export interface SetStopLossResponseDto {
  positionId: PositionId;
}

@Injectable()
export class SetStopLossUseCase {
  constructor(
    @Inject(POSITION_WRITE_REPOSITORY)
    private readonly positionWriteRepository: PositionWriteRepository,
  ) {}

  async execute(
    request: SetStopLossRequestDto,
    authContext: AuthContext,
  ): Promise<SetStopLossResponseDto> {
    const position = await this.positionWriteRepository.getById(
      request.positionId,
    );

    if (position.userId.value !== authContext.userId.value) {
      throw new Error('User does not own this position');
    }

    position.setStop({
      stop: request.stopPrice,
      ts: request.timestamp,
      note: request.note,
    });

    await this.positionWriteRepository.save(position);

    return {
      positionId: position.id,
    };
  }
}
