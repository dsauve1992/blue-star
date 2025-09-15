import { Inject, Injectable } from '@nestjs/common';
import { Position } from '../domain/entities/position';
import { UserId } from '../domain/value-objects/user-id';
import type { PositionReadRepository } from '../domain/repositories/position-read.repository.interface';
import type { AuthContext } from '../domain/auth/auth-context.interface';
import { POSITION_READ_REPOSITORY } from '../constants/tokens';

export interface GetPositionsResponseDto {
  positions: Position[];
}

@Injectable()
export class GetPositionsUseCase {
  constructor(
    @Inject(POSITION_READ_REPOSITORY)
    private readonly positionReadRepository: PositionReadRepository,
  ) {}

  async execute(authContext: AuthContext): Promise<GetPositionsResponseDto> {
    const positions = await this.positionReadRepository.findByUserId(
      authContext.userId,
    );

    return {
      positions,
    };
  }
}
