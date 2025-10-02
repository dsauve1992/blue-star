import { Position } from '../entities/position';
import { PositionId } from '../value-objects/position-id';

export interface PositionWriteRepository {
  save(position: Position): Promise<void>;
  getById(positionId: PositionId): Promise<Position>;
}
