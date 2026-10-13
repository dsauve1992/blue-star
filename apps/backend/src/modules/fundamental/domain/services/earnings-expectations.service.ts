import { Symbol } from '../../../../shared/value-objects/symbol';
import { EarningsExpectations } from '../value-objects/earnings-expectations';

export interface EarningsExpectationsService {
  getEarningsExpectations(symbol: Symbol): Promise<EarningsExpectations>;
}
