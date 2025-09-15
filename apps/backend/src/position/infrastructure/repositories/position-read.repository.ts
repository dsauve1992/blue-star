import { Injectable } from '@nestjs/common';
import { Position } from '../../domain/entities/position';
import { PositionId } from '../../domain/value-objects/position-id';
import { UserId } from '../../domain/value-objects/user-id';
import { PositionReadRepository } from '../../domain/repositories/position-read.repository.interface';

@Injectable()
export class InMemoryPositionReadRepository implements PositionReadRepository {
  private positions: Map<string, Position> = new Map();

  findById(positionId: PositionId): Promise<Position | null> {
    const position = this.positions.get(positionId.value);
    return Promise.resolve(position || null);
  }

  findByUserId(userId: UserId): Promise<Position[]> {
    const userPositions = Array.from(this.positions.values()).filter(
      (position) => position.userId.value === userId.value,
    );
    return Promise.resolve(userPositions);
  }

  findAll(): Promise<Position[]> {
    const allPositions = Array.from(this.positions.values());
    return Promise.resolve(allPositions);
  }

  // Helper method to sync with write repository
  syncPosition(position: Position): void {
    this.positions.set(position.id.value, position);
  }
}
