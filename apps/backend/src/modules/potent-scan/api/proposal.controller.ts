import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Public } from '../../auth/auth.module';
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

interface EditBody {
  name?: unknown;
  description?: unknown;
  addTickers?: unknown;
  removeTickers?: unknown;
}

function parseOptionalText(raw: unknown, field: string): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }
  return raw;
}

function parseTickers(raw: unknown, field: string): Symbol[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new BadRequestException(`${field} must be an array`);
  }
  return raw.map((ticker) => {
    if (typeof ticker !== 'string') {
      throw new BadRequestException(`${field} must contain strings`);
    }
    try {
      return Symbol.of(ticker);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid ticker',
      );
    }
  });
}

function parseEdit(raw: unknown): ProposalEditDto | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || typeof raw !== 'object') {
    throw new BadRequestException('edit must be an object');
  }
  const edit = raw as EditBody;
  return {
    name: parseOptionalText(edit.name, 'edit.name'),
    description: parseOptionalText(edit.description, 'edit.description'),
    addTickers: parseTickers(edit.addTickers, 'edit.addTickers'),
    removeTickers: parseTickers(edit.removeTickers, 'edit.removeTickers'),
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
  async run(@Param('date') date: string): Promise<{
    scanDate: string;
    newClusterCount: number;
    additionCount: number;
    unclusteredCount: number;
    droppedCount: number;
    costUsd: number;
  }> {
    const { sessionDate, usage, ...counts } =
      await this.proposeClustersUseCase.execute({
        sessionDate: SessionDate.of(date),
      });
    return { scanDate: sessionDate.value, ...counts, costUsd: usage.costUsd };
  }

  @Post('proposals/:id/accept')
  async accept(
    @Param('id') id: string,
    @Body() body: { edit?: unknown; alternativeIndex?: unknown } = {},
  ): Promise<{ clusterIds: string[] }> {
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
