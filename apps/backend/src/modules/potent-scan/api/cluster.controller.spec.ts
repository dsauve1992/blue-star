import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Symbol } from '../../../shared/value-objects/symbol';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { SessionDate } from '../domain/value-objects/session-date';
import { CLUSTER_ID } from '../test/fixtures';
import { CreateClusterUseCase } from '../use-cases/create-cluster.use-case';
import { ListClustersUseCase } from '../use-cases/list-clusters.use-case';
import { GetClusterUseCase } from '../use-cases/get-cluster.use-case';
import { AddClusterMemberUseCase } from '../use-cases/add-cluster-member.use-case';
import { RemoveClusterMemberUseCase } from '../use-cases/remove-cluster-member.use-case';
import { CloseClusterUseCase } from '../use-cases/close-cluster.use-case';
import { UpdateClusterUseCase } from '../use-cases/update-cluster.use-case';
import { ClusterController } from './cluster.controller';

describe('ClusterController', () => {
  let controller: ClusterController;
  let create: { execute: jest.Mock };
  let list: { execute: jest.Mock };
  let addMember: { execute: jest.Mock };
  let removeMember: { execute: jest.Mock };
  let update: { execute: jest.Mock };

  beforeEach(async () => {
    create = {
      execute: jest
        .fn()
        .mockResolvedValue({ clusterId: ClusterId.of(CLUSTER_ID) }),
    };
    list = { execute: jest.fn().mockResolvedValue({ clusters: [] }) };
    addMember = { execute: jest.fn() };
    removeMember = { execute: jest.fn() };
    update = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [ClusterController],
      providers: [
        { provide: CreateClusterUseCase, useValue: create },
        { provide: ListClustersUseCase, useValue: list },
        { provide: GetClusterUseCase, useValue: { execute: jest.fn() } },
        { provide: AddClusterMemberUseCase, useValue: addMember },
        { provide: RemoveClusterMemberUseCase, useValue: removeMember },
        { provide: CloseClusterUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateClusterUseCase, useValue: update },
      ],
    }).compile();

    controller = module.get(ClusterController);
  });

  it('should parse the create body into value objects', async () => {
    const result = await controller.create({
      name: 'Nuclear',
      description: 'SMR names',
      tickers: ['aaa', 'BBB'],
      sourceScanDate: '2026-11-25',
    });

    expect(create.execute).toHaveBeenNthCalledWith(1, {
      name: 'Nuclear',
      description: 'SMR names',
      tickers: [Symbol.of('AAA'), Symbol.of('BBB')],
      sourceScanDate: SessionDate.of('2026-11-25'),
    });
    expect(result).toEqual({ clusterId: CLUSTER_ID });
  });

  it.each([
    [
      {
        name: 'N',
        description: '',
        tickers: 'AAA',
        sourceScanDate: '2026-11-25',
      },
    ],
    [{ description: '', tickers: ['AAA'], sourceScanDate: '2026-11-25' }],
    [
      {
        name: 'N',
        description: '',
        tickers: ['A A'],
        sourceScanDate: '2026-11-25',
      },
    ],
  ])('should reject a malformed create body with 400: %j', async (body) => {
    await expect(controller.create(body)).rejects.toThrow(BadRequestException);
    expect(create.execute).not.toHaveBeenCalled();
  });

  it('should pass a valid status filter and reject an unknown one', async () => {
    await controller.list('closed');
    expect(list.execute).toHaveBeenNthCalledWith(1, { status: 'closed' });

    await expect(controller.list('open')).rejects.toThrow(BadRequestException);
  });

  it('should parse the member ticker from body and path', async () => {
    await controller.addMember(CLUSTER_ID, { ticker: 'ccc' });
    await controller.removeMember(CLUSTER_ID, 'aaa');

    expect(addMember.execute).toHaveBeenNthCalledWith(1, {
      clusterId: ClusterId.of(CLUSTER_ID),
      ticker: Symbol.of('CCC'),
    });
    expect(removeMember.execute).toHaveBeenNthCalledWith(1, {
      clusterId: ClusterId.of(CLUSTER_ID),
      ticker: Symbol.of('AAA'),
    });
  });

  it('should pass only the fields present on update', async () => {
    await controller.update(CLUSTER_ID, { description: 'New' });

    expect(update.execute).toHaveBeenNthCalledWith(1, {
      clusterId: ClusterId.of(CLUSTER_ID),
      name: undefined,
      description: 'New',
    });
  });
});
