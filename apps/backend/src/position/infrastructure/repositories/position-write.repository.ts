import { Injectable } from '@nestjs/common';
import { Position } from '../../domain/entities/position';
import { PositionId } from '../../domain/value-objects/position-id';
import { PositionWriteRepository } from '../../domain/repositories/position-write.repository.interface';
import { InvariantError } from '../../domain/domain-errors';

@Injectable()
export class InMemoryPositionWriteRepository
  implements PositionWriteRepository
{
  private positions: Map<string, Position> = new Map();

  save(position: Position): Promise<Position> {
    this.positions.set(position.id.value, position);
    return Promise.resolve(position);
  }

  getById(positionId: PositionId): Promise<Position> {
    const position = this.positions.get(positionId.value);
    if (!position) {
      throw new InvariantError(
        `Position with ID ${positionId.value} not found`,
      );
    }
    return Promise.resolve(position);
  }
}
