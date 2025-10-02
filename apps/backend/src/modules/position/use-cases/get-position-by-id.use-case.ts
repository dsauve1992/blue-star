import { Injectable, Inject } from '@nestjs/common';
import { PositionId } from '../domain/value-objects/position-id';
import { Position } from '../domain/entities/position';
import { PositionReadRepository } from '../domain/repositories/position-read.repository.interface';
import { POSITION_READ_REPOSITORY } from '../constants/tokens';
import type { AuthContext } from '../../auth/auth-context.interface';

export interface GetPositionByIdRequestDto {
  positionId: PositionId;
}

export interface GetPositionByIdResponseDto {
  position: Position;
}

@Injectable()
export class GetPositionByIdUseCase {
  constructor(
    @Inject(POSITION_READ_REPOSITORY)
    private readonly positionReadRepository: PositionReadRepository,
  ) {}

  async execute(
    request: GetPositionByIdRequestDto,
    authContext: AuthContext,
  ): Promise<GetPositionByIdResponseDto> {
    const position = await this.positionReadRepository.findById(
      request.positionId,
    );

    if (!position) {
      throw new Error(`Position with ID ${request.positionId.value} not found`);
    }

    // Validate user owns the position
    if (position.userId.value !== authContext.userId.value) {
      throw new Error('User does not own this position');
    }

    return { position };
  }
}
