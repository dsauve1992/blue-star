import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Symbol } from '../../../shared/value-objects/symbol';
import { ProposalController } from './proposal.controller';
import { GetProposalsUseCase } from '../use-cases/get-proposals.use-case';
import { ProposeClustersUseCase } from '../use-cases/propose-clusters.use-case';
import { AcceptProposalUseCase } from '../use-cases/accept-proposal.use-case';
import { RejectProposalUseCase } from '../use-cases/reject-proposal.use-case';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { ProposalId } from '../domain/value-objects/proposal-id';
import { SessionDate } from '../domain/value-objects/session-date';
import { InvariantError } from '../domain/domain-errors';
import { CLUSTER_ID, PROPOSAL_ID } from '../test/fixtures';

describe('ProposalController', () => {
  let controller: ProposalController;
  let getProposals: { execute: jest.Mock };
  let propose: { execute: jest.Mock };
  let accept: { execute: jest.Mock };
  let reject: { execute: jest.Mock };

  beforeEach(async () => {
    getProposals = { execute: jest.fn().mockResolvedValue({}) };
    propose = {
      execute: jest.fn().mockResolvedValue({
        sessionDate: SessionDate.of('2026-11-25'),
        newClusterCount: 2,
        additionCount: 1,
        unclusteredCount: 9,
        droppedCount: 1,
        usage: {
          inputTokens: 20000,
          outputTokens: 3000,
          webSearchRequests: 0,
          costUsd: 0.07,
        },
      }),
    };
    accept = {
      execute: jest
        .fn()
        .mockResolvedValue({ clusterIds: [ClusterId.of(CLUSTER_ID)] }),
    };
    reject = { execute: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      controllers: [ProposalController],
      providers: [
        { provide: GetProposalsUseCase, useValue: getProposals },
        { provide: ProposeClustersUseCase, useValue: propose },
        { provide: AcceptProposalUseCase, useValue: accept },
        { provide: RejectProposalUseCase, useValue: reject },
      ],
    }).compile();
    controller = module.get(ProposalController);
  });

  it('should list the proposals of a session', async () => {
    await controller.list('2026-11-25');

    expect(getProposals.execute).toHaveBeenNthCalledWith(1, {
      sessionDate: SessionDate.of('2026-11-25'),
    });
  });

  it('should run clustering for a session and return counts and cost', async () => {
    const result = await controller.run('2026-11-25');

    expect(propose.execute).toHaveBeenNthCalledWith(1, {
      sessionDate: SessionDate.of('2026-11-25'),
    });
    expect(result).toEqual({
      scanDate: '2026-11-25',
      newClusterCount: 2,
      additionCount: 1,
      unclusteredCount: 9,
      droppedCount: 1,
      costUsd: 0.07,
    });
  });

  it('should accept a proposal as is', async () => {
    const result = await controller.accept(PROPOSAL_ID, {});

    expect(accept.execute).toHaveBeenNthCalledWith(1, {
      proposalId: ProposalId.of(PROPOSAL_ID),
      edit: undefined,
      alternativeIndex: undefined,
    });
    expect(result).toEqual({ clusterIds: [CLUSTER_ID] });
  });

  it('should parse an edit into value objects', async () => {
    await controller.accept(PROPOSAL_ID, {
      edit: { name: 'Renamed', addTickers: ['DDD'], removeTickers: ['BBB'] },
    });

    expect(accept.execute).toHaveBeenNthCalledWith(1, {
      proposalId: ProposalId.of(PROPOSAL_ID),
      edit: {
        name: 'Renamed',
        description: undefined,
        addTickers: [Symbol.of('DDD')],
        removeTickers: [Symbol.of('BBB')],
      },
      alternativeIndex: undefined,
    });
  });

  it('should pass a chosen alternative', async () => {
    await controller.accept(PROPOSAL_ID, { alternativeIndex: 1 });

    expect(accept.execute).toHaveBeenNthCalledWith(1, {
      proposalId: ProposalId.of(PROPOSAL_ID),
      edit: undefined,
      alternativeIndex: 1,
    });
  });

  it.each([
    { alternativeIndex: -1 },
    { alternativeIndex: '0' },
    { edit: 'rename' },
    { edit: { addTickers: 'DDD' } },
    { edit: { name: 3 } },
  ])('should reject the invalid body %j', async (body) => {
    await expect(controller.accept(PROPOSAL_ID, body)).rejects.toThrow(
      BadRequestException,
    );
    expect(accept.execute).not.toHaveBeenCalled();
  });

  it('should reject an invalid proposal id', async () => {
    await expect(controller.reject('nope')).rejects.toThrow(InvariantError);
    expect(reject.execute).not.toHaveBeenCalled();
  });

  it('should reject a proposal', async () => {
    await controller.reject(PROPOSAL_ID);

    expect(reject.execute).toHaveBeenNthCalledWith(1, {
      proposalId: ProposalId.of(PROPOSAL_ID),
    });
  });
});
