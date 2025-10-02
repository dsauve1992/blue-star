import { Position } from '../entities/position';
import { PositionId } from '../value-objects/position-id';
import { UserId } from '../value-objects/user-id';

export interface PositionReadRepository {
  findById(positionId: PositionId): Promise<Position | null>;
  findByUserId(userId: UserId): Promise<Position[]>;
  findAll(): Promise<Position[]>;
}
