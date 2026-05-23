import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { RotationMember } from '../../domain/value-objects/rotation-member';
import { RotationUniverse } from '../../domain/value-objects/rotation-universe';
import { SectorRotationDataPoint } from '../../domain/value-objects/sector-rotation-data-point';
import { Quadrant } from '../../domain/value-objects/quadrant';
import { SectorRotationResult } from '../../domain/value-objects/sector-rotation-result';
import {
  SectorRotationCalculationService,
  SectorRotationCalculationParams,
} from '../../domain/services/sector-rotation-calculation.service';
import { SectorRotationDataReadRepository } from '../../domain/repositories/sector-rotation-data-read.repository.interface';
import { SectorRotationDataWriteRepository } from '../../domain/repositories/sector-rotation-data-write.repository.interface';
import { SectorRotationPersistenceServiceImpl } from './sector-rotation-persistence.service';
import { WeekUtils } from '../utils/week-utils';
import { RRG_PARAMETERS } from '../../constants/rrg-parameters';

const UNIVERSE_ID = 'gics-sector';

const TECHNOLOGY_UNIVERSE = RotationUniverse.of({
  id: UNIVERSE_ID,
  label: 'GICS Sectors',
  members: [RotationMember.of('Technology', 'XLK')],
  benchmarkSymbol: 'SPY',
});

const TECH_AND_FIN_UNIVERSE = RotationUniverse.of({
  id: UNIVERSE_ID,
  label: 'GICS Sectors',
  members: [
    RotationMember.of('Technology', 'XLK'),
    RotationMember.of('Financial', 'XLF'),
  ],
  benchmarkSymbol: 'SPY',
});

function makePoint(
  date: string,
  sector: string,
  x = 105,
  y = 105,
): SectorRotationDataPoint {
  return SectorRotationDataPoint.of(
    new Date(date),
    sector,
    100,
    102,
    x,
    y,
    Quadrant.fromCoordinates(x, y),
  );
}

describe('SectorRotationPersistenceServiceImpl', () => {
  let service: SectorRotationPersistenceServiceImpl;
  let calculation: jest.Mocked<SectorRotationCalculationService>;
  let readRepo: jest.Mocked<SectorRotationDataReadRepository>;
  let writeRepo: jest.Mocked<SectorRotationDataWriteRepository>;

  beforeEach(() => {
    calculation = {
      calculate: jest.fn(),
    };
    readRepo = {
      findByDateRange: jest.fn(),
      findBySectorAndDateRange: jest.fn(),
      findLatestDate: jest.fn(),
      findLatestDateBySector: jest.fn(),
      findExistingDates: jest.fn(),
    };
    writeRepo = {
      save: jest.fn(),
      saveMany: jest.fn(),
      deleteByDateRange: jest.fn(),
    };
    service = new SectorRotationPersistenceServiceImpl(
      calculation,
      readRepo,
      writeRepo,
    );
  });

  describe('initializeLast52Weeks', () => {
    it('asks the calculation service for the most-recent 52 weeks and saves all returned data points under the universe id', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z')); // Friday
      try {
        const expectedEnd = WeekUtils.getMostRecentFriday(new Date());
        const expectedStart = new Date(expectedEnd);
        expectedStart.setDate(expectedStart.getDate() - 52 * 7);

        const dataPoints = [
          makePoint('2024-08-19T00:00:00.000Z', 'XLK'),
          makePoint('2024-08-19T00:00:00.000Z', 'XLF', 95, 95),
        ];
        calculation.calculate.mockResolvedValue(
          SectorRotationResult.of(expectedStart, expectedEnd, dataPoints, [
            'XLK',
            'XLF',
          ]),
        );

        await service.initializeLast52Weeks(TECH_AND_FIN_UNIVERSE);

        expect(calculation.calculate).toHaveBeenCalledTimes(1);
        const [universe, dateRange, params] =
          calculation.calculate.mock.calls[0];
        expect(universe).toBe(TECH_AND_FIN_UNIVERSE);
        expect(dateRange.endDate.getTime()).toBe(expectedEnd.getTime());
        expect(dateRange.startDate.getTime()).toBe(expectedStart.getTime());
        expect(params).toEqual<SectorRotationCalculationParams>({
          momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
          normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
        });
        expect(writeRepo.saveMany).toHaveBeenCalledWith(
          UNIVERSE_ID,
          dataPoints,
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('computeAndSaveIncremental', () => {
    it('queries findLatestDate scoped to the universe id', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z'));
      try {
        readRepo.findLatestDate.mockResolvedValue(
          new Date('2024-08-22T00:00:00.000Z'), // fresh — early-exit path
        );

        await service.computeAndSaveIncremental(TECHNOLOGY_UNIVERSE);

        expect(readRepo.findLatestDate).toHaveBeenCalledWith(UNIVERSE_ID);
      } finally {
        jest.useRealTimers();
      }
    });

    it('falls back to initializeLast52Weeks when no data exists yet', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z'));
      try {
        readRepo.findLatestDate.mockResolvedValue(null);

        const expectedEnd = WeekUtils.getMostRecentFriday(new Date());
        const expectedStart = new Date(expectedEnd);
        expectedStart.setDate(expectedStart.getDate() - 52 * 7);

        const dataPoints = [makePoint('2024-08-19T00:00:00.000Z', 'XLK')];
        calculation.calculate.mockResolvedValue(
          SectorRotationResult.of(expectedStart, expectedEnd, dataPoints, [
            'XLK',
          ]),
        );

        await service.computeAndSaveIncremental(TECHNOLOGY_UNIVERSE);

        const [, dateRange] = calculation.calculate.mock.calls[0];
        expect(dateRange.startDate.getTime()).toBe(expectedStart.getTime());
        expect(writeRepo.saveMany).toHaveBeenCalledWith(
          UNIVERSE_ID,
          dataPoints,
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('no-ops when the latest persisted data is fresher than 5 days', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z')); // Friday
      try {
        readRepo.findLatestDate.mockResolvedValue(
          new Date('2024-08-22T00:00:00.000Z'),
        );

        await service.computeAndSaveIncremental(TECHNOLOGY_UNIVERSE);

        expect(calculation.calculate).not.toHaveBeenCalled();
        expect(writeRepo.saveMany).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('computes a fresh range and saves only NEW data points when data is stale', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z'));
      try {
        const staleLatest = new Date('2024-08-09T00:00:00.000Z');
        readRepo.findLatestDate.mockResolvedValue(staleLatest);

        const olderPoint = makePoint('2024-08-09T00:00:00.000Z', 'XLK');
        const newerPoint = makePoint('2024-08-16T00:00:00.000Z', 'XLK');

        calculation.calculate.mockResolvedValue(
          SectorRotationResult.of(
            new Date('2024-07-01T00:00:00.000Z'),
            new Date('2024-08-23T00:00:00.000Z'),
            [olderPoint, newerPoint],
            ['XLK'],
          ),
        );

        await service.computeAndSaveIncremental(TECHNOLOGY_UNIVERSE);

        expect(writeRepo.saveMany).toHaveBeenCalledWith(UNIVERSE_ID, [
          newerPoint,
        ]);
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not call saveMany when no new data points are produced', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z'));
      try {
        const staleLatest = new Date('2024-08-09T00:00:00.000Z');
        readRepo.findLatestDate.mockResolvedValue(staleLatest);

        calculation.calculate.mockResolvedValue(
          SectorRotationResult.of(
            new Date('2024-07-01T00:00:00.000Z'),
            new Date('2024-08-23T00:00:00.000Z'),
            [makePoint('2024-08-09T00:00:00.000Z', 'XLK')],
            ['XLK'],
          ),
        );

        await service.computeAndSaveIncremental(TECHNOLOGY_UNIVERSE);

        expect(writeRepo.saveMany).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getOrCompute', () => {
    it('queries findByDateRange scoped to the universe id', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z'));
      try {
        const dr = DateRange.of(
          new Date('2024-08-12T00:00:00.000Z'),
          new Date('2024-08-19T00:00:00.000Z'),
        );

        const cached = [
          makePoint('2024-08-12T00:00:00.000Z', 'XLK'),
          makePoint('2024-08-19T00:00:00.000Z', 'XLK'),
        ];
        readRepo.findByDateRange.mockResolvedValue(cached);

        await service.getOrCompute(TECHNOLOGY_UNIVERSE, dr);

        expect(readRepo.findByDateRange).toHaveBeenCalledWith(
          UNIVERSE_ID,
          dr.startDate,
          dr.endDate,
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('returns cached data without invoking calculation when all weeks are present', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z'));
      try {
        const startDate = new Date('2024-08-12T00:00:00.000Z');
        const endDate = new Date('2024-08-19T00:00:00.000Z');
        const dr = DateRange.of(startDate, endDate);

        const cached = [
          makePoint('2024-08-12T00:00:00.000Z', 'XLK'),
          makePoint('2024-08-19T00:00:00.000Z', 'XLK'),
        ];
        readRepo.findByDateRange.mockResolvedValue(cached);

        const result = await service.getOrCompute(TECHNOLOGY_UNIVERSE, dr);

        expect(calculation.calculate).not.toHaveBeenCalled();
        expect(result.dataPoints).toEqual(cached);
        expect(result.sectorSymbols).toEqual(['XLK']);
      } finally {
        jest.useRealTimers();
      }
    });

    it('only returns data points whose sectorSymbol is in the requested universe', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z'));
      try {
        const startDate = new Date('2024-08-12T00:00:00.000Z');
        const endDate = new Date('2024-08-19T00:00:00.000Z');
        const dr = DateRange.of(startDate, endDate);

        const cached = [
          makePoint('2024-08-12T00:00:00.000Z', 'XLK'),
          makePoint('2024-08-12T00:00:00.000Z', 'XLF', 95, 95),
          makePoint('2024-08-19T00:00:00.000Z', 'XLK'),
          makePoint('2024-08-19T00:00:00.000Z', 'XLF', 95, 95),
        ];
        readRepo.findByDateRange.mockResolvedValue(cached);

        // Ask for the Technology-only universe — XLF rows should be filtered.
        const result = await service.getOrCompute(TECHNOLOGY_UNIVERSE, dr);

        expect(result.dataPoints.every((p) => p.sectorSymbol === 'XLK')).toBe(
          true,
        );
        expect(result.dataPoints).toHaveLength(2);
      } finally {
        jest.useRealTimers();
      }
    });

    it('computes and saves missing weeks when cache is partial', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z'));
      try {
        const startDate = new Date('2024-07-22T00:00:00.000Z');
        const endDate = new Date('2024-08-19T00:00:00.000Z');
        const dr = DateRange.of(startDate, endDate);

        const cachedPoint = makePoint('2024-07-22T00:00:00.000Z', 'XLK');
        readRepo.findByDateRange.mockResolvedValue([cachedPoint]);

        const computedPoint = makePoint('2024-08-19T00:00:00.000Z', 'XLK');
        calculation.calculate.mockResolvedValue(
          SectorRotationResult.of(
            new Date('2024-06-01T00:00:00.000Z'),
            new Date('2024-08-19T00:00:00.000Z'),
            [cachedPoint, computedPoint],
            ['XLK'],
          ),
        );

        const result = await service.getOrCompute(TECHNOLOGY_UNIVERSE, dr);

        expect(calculation.calculate).toHaveBeenCalledTimes(1);
        // saveMany invoked with the universe id and the new point.
        expect(writeRepo.saveMany).toHaveBeenCalledTimes(1);
        const [universeIdArg, savedArg] = writeRepo.saveMany.mock.calls[0];
        expect(universeIdArg).toBe(UNIVERSE_ID);
        expect(savedArg.some((p) => p.equals(computedPoint))).toBe(true);

        const isoDates = result.dataPoints.map(
          (p) => p.date.toISOString().split('T')[0],
        );
        expect(isoDates).toContain('2024-07-22');
        expect(isoDates).toContain('2024-08-19');
      } finally {
        jest.useRealTimers();
      }
    });

    it('caps endDate at the most recent Friday', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-08-23T18:00:00.000Z'));
      try {
        const startDate = new Date('2024-08-12T00:00:00.000Z');
        const futureEnd = new Date('2024-08-22T00:00:00.000Z');
        const dr = DateRange.of(startDate, futureEnd);

        const cached = [makePoint('2024-08-12T00:00:00.000Z', 'XLK')];
        readRepo.findByDateRange.mockResolvedValue(cached);
        calculation.calculate.mockResolvedValue(
          SectorRotationResult.of(
            new Date('2024-06-01T00:00:00.000Z'),
            new Date('2024-08-23T00:00:00.000Z'),
            cached,
            ['XLK'],
          ),
        );

        const result = await service.getOrCompute(TECHNOLOGY_UNIVERSE, dr);

        const mostRecentFriday = WeekUtils.getMostRecentFriday(new Date());
        expect(result.endDate.getTime()).toBeLessThanOrEqual(
          mostRecentFriday.getTime() > futureEnd.getTime()
            ? futureEnd.getTime()
            : mostRecentFriday.getTime(),
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
