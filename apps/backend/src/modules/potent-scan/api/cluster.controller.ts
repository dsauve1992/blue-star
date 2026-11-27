import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../auth/auth.module';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { SessionDate } from '../domain/value-objects/session-date';
import {
  CLUSTER_STATUSES,
  ClusterStatus,
  isClusterStatus,
} from '../domain/entities/cluster';
import { ClusterDetailDto } from '../use-cases/cluster.dto';
import { CreateClusterUseCase } from '../use-cases/create-cluster.use-case';
import {
  ListClustersResponseDto,
  ListClustersUseCase,
} from '../use-cases/list-clusters.use-case';
import { GetClusterUseCase } from '../use-cases/get-cluster.use-case';
import { AddClusterMemberUseCase } from '../use-cases/add-cluster-member.use-case';
import { RemoveClusterMemberUseCase } from '../use-cases/remove-cluster-member.use-case';
import { CloseClusterUseCase } from '../use-cases/close-cluster.use-case';
import { UpdateClusterUseCase } from '../use-cases/update-cluster.use-case';
import {
  parseOptionalText,
  parseText,
  parseTicker,
  parseTickers,
} from './request-parsers';

interface CreateClusterApiRequestDto {
  name?: unknown;
  description?: unknown;
  tickers?: unknown;
  sourceScanDate?: unknown;
}

interface UpdateClusterApiRequestDto {
  name?: unknown;
  description?: unknown;
}

interface AddClusterMemberApiRequestDto {
  ticker?: unknown;
}

interface CreateClusterApiResponseDto {
  clusterId: string;
}

function parseStatus(raw: string | undefined): ClusterStatus | undefined {
  if (raw === undefined || isClusterStatus(raw)) return raw;
  throw new BadRequestException(
    `status must be one of ${CLUSTER_STATUSES.join(', ')}`,
  );
}

@Controller('potent-scan/clusters')
export class ClusterController {
  constructor(
    private readonly createClusterUseCase: CreateClusterUseCase,
    private readonly listClustersUseCase: ListClustersUseCase,
    private readonly getClusterUseCase: GetClusterUseCase,
    private readonly addClusterMemberUseCase: AddClusterMemberUseCase,
    private readonly removeClusterMemberUseCase: RemoveClusterMemberUseCase,
    private readonly closeClusterUseCase: CloseClusterUseCase,
    private readonly updateClusterUseCase: UpdateClusterUseCase,
  ) {}

  @Post()
  async create(
    @Body() body: CreateClusterApiRequestDto,
  ): Promise<CreateClusterApiResponseDto> {
    const { clusterId } = await this.createClusterUseCase.execute({
      name: parseText(body.name, 'name'),
      description: parseText(body.description, 'description'),
      tickers: parseTickers(body.tickers, 'tickers'),
      sourceScanDate: SessionDate.of(
        parseText(body.sourceScanDate, 'sourceScanDate'),
      ),
    });
    return { clusterId: clusterId.value };
  }

  @Get()
  @Public()
  async list(
    @Query('status') status?: string,
  ): Promise<ListClustersResponseDto> {
    return this.listClustersUseCase.execute({ status: parseStatus(status) });
  }

  @Get(':id')
  @Public()
  async get(@Param('id') id: string): Promise<ClusterDetailDto> {
    return this.getClusterUseCase.execute({ clusterId: ClusterId.of(id) });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClusterApiRequestDto,
  ): Promise<void> {
    await this.updateClusterUseCase.execute({
      clusterId: ClusterId.of(id),
      name: parseOptionalText(body.name, 'name'),
      description: parseOptionalText(body.description, 'description'),
    });
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() body: AddClusterMemberApiRequestDto,
  ): Promise<void> {
    await this.addClusterMemberUseCase.execute({
      clusterId: ClusterId.of(id),
      ticker: parseTicker(body.ticker),
    });
  }

  @Delete(':id/members/:ticker')
  async removeMember(
    @Param('id') id: string,
    @Param('ticker') ticker: string,
  ): Promise<void> {
    await this.removeClusterMemberUseCase.execute({
      clusterId: ClusterId.of(id),
      ticker: parseTicker(ticker),
    });
  }

  @Post(':id/close')
  async close(@Param('id') id: string): Promise<void> {
    await this.closeClusterUseCase.execute({ clusterId: ClusterId.of(id) });
  }
}
