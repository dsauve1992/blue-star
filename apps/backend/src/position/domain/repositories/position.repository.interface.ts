import { Position } from '../domain/entities/position';
import { PositionId } from '../domain/value-objects/position-id';
import { PortfolioId } from '../domain/value-objects/portfolio-id';

export interface PositionRepository {
  save(position: Position): Promise<Position>;
  findById(positionId: PositionId): Promise<Position | null>;
  findByPortfolioId(portfolioId: PortfolioId): Promise<Position[]>;
}
