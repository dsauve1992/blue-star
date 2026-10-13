import { EarningsSurprise } from './earnings-surprise';
import { EstimateTrend } from './estimate-trend';

export class EarningsExpectations {
  private constructor(
    public readonly symbol: string,
    public readonly surprises: EarningsSurprise[],
    public readonly estimateTrends: EstimateTrend[],
  ) {}

  static of(data: {
    symbol: string;
    surprises: EarningsSurprise[];
    estimateTrends: EstimateTrend[];
  }): EarningsExpectations {
    return new EarningsExpectations(
      data.symbol,
      data.surprises,
      data.estimateTrends,
    );
  }
}
