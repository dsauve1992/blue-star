import { Symbol } from '../../../shared/value-objects/symbol';
import { EarningsExpectationsService } from '../domain/services/earnings-expectations.service';
import { EarningsExpectations } from '../domain/value-objects/earnings-expectations';
import { EarningsSurprise } from '../domain/value-objects/earnings-surprise';
import { GetEarningsExpectationsUseCase } from './get-earnings-expectations.use-case';

const surprise = (quarterEnd: string) =>
  EarningsSurprise.of({ quarterEnd, epsActual: 1, epsEstimate: 1 });

describe('GetEarningsExpectationsUseCase', () => {
  it('returns the four most recent surprises, newest first', async () => {
    const getEarningsExpectations = jest.fn().mockResolvedValue(
      EarningsExpectations.of({
        symbol: 'IOVA',
        surprises: [
          surprise('2025-06-30'),
          surprise('2026-06-30'),
          surprise('2025-09-30'),
          surprise('2026-03-31'),
          surprise('2025-12-31'),
        ],
        estimateTrends: [],
      }),
    );
    const useCase = new GetEarningsExpectationsUseCase({
      getEarningsExpectations,
    } as EarningsExpectationsService);

    const { expectations } = await useCase.execute({
      symbol: Symbol.of('IOVA'),
    });

    expect(expectations.surprises.map((s) => s.quarterEnd)).toEqual([
      '2026-06-30',
      '2026-03-31',
      '2025-12-31',
      '2025-09-30',
    ]);
    expect(getEarningsExpectations).toHaveBeenCalledWith(Symbol.of('IOVA'));
  });
});
