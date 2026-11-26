import { Test } from '@nestjs/testing';
import { UuidGeneratorService } from '../../../shared/services/uuid-generator.service';
import { Symbol } from '../../../shared/value-objects/symbol';
import {
  CLUSTER_REPOSITORY,
  POTENT_SCAN_REPOSITORY,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import { PotentScan } from '../domain/entities/potent-scan';
import { SessionDate } from '../domain/value-objects/session-date';
import { InvariantError, NotFoundError } from '../domain/domain-errors';
import {
  CLUSTER_ID,
  cluster,
  clusterMember,
  memberId,
  hit,
  nearMiss,
} from '../test/fixtures';
import { CreateClusterUseCase } from './create-cluster.use-case';

describe('CreateClusterUseCase', () => {
  const NOW = new Date('2026-11-26T22:00:00.000Z');
  let useCase: CreateClusterUseCase;
  let clusterRepository: jest.Mocked<ClusterRepository>;
  let scanRepository: jest.Mocked<PotentScanRepository>;

  const scan = PotentScan.of({
    sessionDate: SessionDate.of('2026-11-25'),
    universeSize: 2400,
    hits: [hit('AAA'), hit('BBB'), hit('CCC')],
    nearMisses: [nearMiss('NMX')],
  });

  const request = (tickers: string[]) => ({
    name: 'Nuclear',
    description: 'SMR names',
    tickers: tickers.map((t) => Symbol.of(t)),
    sourceScanDate: SessionDate.of('2026-11-25'),
  });

  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW });
    jest
      .spyOn(UuidGeneratorService, 'generate')
      .mockReset()
      .mockReturnValueOnce(CLUSTER_ID)
      .mockReturnValueOnce(memberId('AAA'))
      .mockReturnValueOnce(memberId('BBB'))
      .mockReturnValueOnce(memberId('CCC'));
    clusterRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    scanRepository = {
      replace: jest.fn(),
      exists: jest.fn(),
      findBySessionDate: jest.fn().mockResolvedValue(scan),
      findLatest: jest.fn(),
      listSessionDates: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CreateClusterUseCase,
        { provide: CLUSTER_REPOSITORY, useValue: clusterRepository },
        { provide: POTENT_SCAN_REPOSITORY, useValue: scanRepository },
      ],
    }).compile();

    useCase = module.get(CreateClusterUseCase);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should save a manual tracking cluster from hits of the scan', async () => {
    await useCase.execute(request(['AAA', 'BBB', 'CCC']));

    expect(scanRepository.findBySessionDate).toHaveBeenNthCalledWith(
      1,
      SessionDate.of('2026-11-25'),
    );
    expect(clusterRepository.save).toHaveBeenNthCalledWith(
      1,
      cluster({
        createdAt: NOW,
        members: [
          clusterMember('AAA'),
          clusterMember('BBB'),
          clusterMember('CCC'),
        ],
      }),
    );
  });

  it('should reject tickers that are not hits of the scan, near misses included', async () => {
    await expect(
      useCase.execute(request(['AAA', 'NMX', 'ZZZ'])),
    ).rejects.toThrow(
      new InvariantError('Not hits of the 2026-11-25 scan: NMX, ZZZ'),
    );
    expect(clusterRepository.save).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when the scan date has no scan', async () => {
    scanRepository.findBySessionDate.mockResolvedValue(null);

    await expect(useCase.execute(request(['AAA']))).rejects.toThrow(
      new NotFoundError('No potent scan for session 2026-11-25'),
    );
    expect(clusterRepository.save).not.toHaveBeenCalled();
  });
});
