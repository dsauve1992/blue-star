import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Public } from '../../auth/auth.module';
import { ManualTrigger } from '../../../shared/decorators/manual-trigger.decorator';
import { Symbol } from '../../../shared/value-objects/symbol';
import { ProposalId } from '../domain/value-objects/proposal-id';
import { SessionDate } from '../domain/value-objects/session-date';
import {
  GetProposalsResponseDto,
  GetProposalsUseCase,
} from '../use-cases/get-proposals.use-case';
import {
  AcceptProposalUseCase,
  ProposalEditDto,
} from '../use-cases/accept-proposal.use-case';
import { RejectProposalUseCase } from '../use-cases/reject-proposal.use-case';
import { ProposeClustersUseCase } from '../use-cases/propose-clusters.use-case';
import { parseOptionalText, parseTickers } from './request-parsers';

interface ProposalEditApiRequestDto {
  name?: unknown;
  description?: unknown;
  addTickers?: unknown;
  removeTickers?: unknown;
}

interface AcceptProposalApiRequestDto {
  edit?: unknown;
  alternativeIndex?: unknown;
}

interface AcceptProposalApiResponseDto {
  clusterIds: string[];
}

interface RunProposalsApiResponseDto {
  scanDate: string;
  newClusterCount: number;
  additionCount: number;
  unclusteredCount: number;
  droppedCount: number;
  costUsd: number;
}

function parseOptionalTickers(raw: unknown, field: string): Symbol[] {
  return raw === undefined ? [] : parseTickers(raw, field);
}

function parseEdit(raw: unknown): ProposalEditDto | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || typeof raw !== 'object') {
    throw new BadRequestException('edit must be an object');
  }
  const edit: ProposalEditApiRequestDto = raw;
  return {
    name: parseOptionalText(edit.name, 'edit.name'),
    description: parseOptionalText(edit.description, 'edit.description'),
    addTickers: parseOptionalTickers(edit.addTickers, 'edit.addTickers'),
    removeTickers: parseOptionalTickers(
      edit.removeTickers,
      'edit.removeTickers',
    ),
  };
}

function parseAlternativeIndex(raw: unknown): number | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
    throw new BadRequestException(
      'alternativeIndex must be a non-negative integer',
    );
  }
  return raw;
}

@Controller('potent-scan')
export class ProposalController {
  constructor(
    private readonly getProposalsUseCase: GetProposalsUseCase,
    private readonly proposeClustersUseCase: ProposeClustersUseCase,
    private readonly acceptProposalUseCase: AcceptProposalUseCase,
    private readonly rejectProposalUseCase: RejectProposalUseCase,
  ) {}

  @Get('scans/:date/proposals')
  @Public()
  async list(@Param('date') date: string): Promise<GetProposalsResponseDto> {
    return this.getProposalsUseCase.execute({
      sessionDate: SessionDate.of(date),
    });
  }

  @Post('scans/:date/proposals/run')
  @ManualTrigger()
  async run(@Param('date') date: string): Promise<RunProposalsApiResponseDto> {
    const { sessionDate, usage, ...counts } =
      await this.proposeClustersUseCase.execute({
        sessionDate: SessionDate.of(date),
      });
    return { scanDate: sessionDate.value, ...counts, costUsd: usage.costUsd };
  }

  @Post('proposals/:id/accept')
  async accept(
    @Param('id') id: string,
    @Body() body: AcceptProposalApiRequestDto = {},
  ): Promise<AcceptProposalApiResponseDto> {
    const { clusterIds } = await this.acceptProposalUseCase.execute({
      proposalId: ProposalId.of(id),
      edit: parseEdit(body.edit),
      alternativeIndex: parseAlternativeIndex(body.alternativeIndex),
    });
    return { clusterIds: clusterIds.map((clusterId) => clusterId.value) };
  }

  @Post('proposals/:id/reject')
  async reject(@Param('id') id: string): Promise<void> {
    await this.rejectProposalUseCase.execute({
      proposalId: ProposalId.of(id),
    });
  }
}
