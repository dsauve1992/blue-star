import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { ProposalRepository } from '../../domain/repositories/proposal.repository.interface';
import {
  Proposal,
  ProposalContent,
  ProposalStatus,
} from '../../domain/entities/proposal';
import {
  ProposalRun,
  UnclusteredHit,
} from '../../domain/value-objects/cluster-proposal';
import { ClusterId } from '../../domain/value-objects/cluster-id';
import { ProposalId } from '../../domain/value-objects/proposal-id';
import { SessionDate } from '../../domain/value-objects/session-date';

interface ProposalRow {
  id: string;
  scan_date: string;
  content: ProposalContent;
  status: ProposalStatus;
  applied_alternative: number | null;
  cluster_ids: string[];
  created_at: Date;
  decided_at: Date | null;
}

interface RunRow {
  scan_date: string;
  status: ProposalRun['status'];
  model: string;
  proposal_count: number;
  unclustered: UnclusteredHit[];
  dropped: string[];
  input_tokens: number;
  output_tokens: number;
  cost_usd: string;
  error: string | null;
  started_at: Date;
  finished_at: Date;
}

const PROPOSAL_COLUMNS = `id, scan_date::text AS scan_date, content, status, applied_alternative,
  cluster_ids, created_at, decided_at`;

@Injectable()
export class ProposalRepositoryImpl implements ProposalRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async replacePending(proposals: Proposal[], run: ProposalRun): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `DELETE FROM potent_proposals WHERE scan_date = $1 AND status = 'pending'`,
        [run.scanDate.value],
      );
      for (const proposal of proposals) {
        await client.query(
          `INSERT INTO potent_proposals
           (id, scan_date, kind, status, content, applied_alternative, cluster_ids,
            created_at, decided_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            proposal.id.value,
            proposal.scanDate.value,
            proposal.content.kind,
            proposal.status,
            JSON.stringify(proposal.content),
            proposal.appliedAlternative,
            proposal.clusterIds.map((id) => id.value),
            proposal.createdAt,
            proposal.decidedAt,
          ],
        );
      }
      await this.insertRun(client, run);
    });
  }

  async recordRun(run: ProposalRun): Promise<void> {
    await this.insertRun(this.databaseService, run);
  }

  async saveDecision(proposal: Proposal): Promise<boolean> {
    const result = await this.databaseService.query(
      `UPDATE potent_proposals
       SET status = $2, applied_alternative = $3, cluster_ids = $4, decided_at = $5
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [
        proposal.id.value,
        proposal.status,
        proposal.appliedAlternative,
        proposal.clusterIds.map((id) => id.value),
        proposal.decidedAt,
      ],
    );
    return result.rows.length === 1;
  }

  async findById(id: ProposalId): Promise<Proposal | null> {
    const result = (await this.databaseService.query(
      `SELECT ${PROPOSAL_COLUMNS} FROM potent_proposals WHERE id = $1`,
      [id.value],
    )) as { rows: ProposalRow[] };
    return result.rows[0] ? this.toProposal(result.rows[0]) : null;
  }

  async findByScanDate(scanDate: SessionDate): Promise<Proposal[]> {
    const result = (await this.databaseService.query(
      `SELECT ${PROPOSAL_COLUMNS} FROM potent_proposals
       WHERE scan_date = $1 ORDER BY created_at, id`,
      [scanDate.value],
    )) as { rows: ProposalRow[] };
    return result.rows.map((row) => this.toProposal(row));
  }

  async findLatestSucceededRun(
    scanDate: SessionDate,
  ): Promise<ProposalRun | null> {
    const result = (await this.databaseService.query(
      `SELECT scan_date::text AS scan_date, status, model, proposal_count, unclustered,
              dropped, input_tokens, output_tokens, cost_usd, error, started_at, finished_at
       FROM potent_proposal_runs
       WHERE scan_date = $1 AND status = 'succeeded'
       ORDER BY finished_at DESC LIMIT 1`,
      [scanDate.value],
    )) as { rows: RunRow[] };
    const row = result.rows[0];
    if (!row) return null;
    return {
      scanDate: SessionDate.of(row.scan_date),
      status: row.status,
      model: row.model,
      proposalCount: row.proposal_count,
      unclustered: row.unclustered,
      dropped: row.dropped,
      usage: {
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        webSearchRequests: 0,
        costUsd: Number(row.cost_usd),
      },
      error: row.error,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    };
  }

  private async insertRun(
    client: { query: DatabaseService['query'] },
    run: ProposalRun,
  ): Promise<void> {
    await client.query(
      `INSERT INTO potent_proposal_runs
       (scan_date, status, model, proposal_count, unclustered, dropped, input_tokens,
        output_tokens, cost_usd, error, started_at, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        run.scanDate.value,
        run.status,
        run.model,
        run.proposalCount,
        JSON.stringify(run.unclustered),
        run.dropped,
        run.usage.inputTokens,
        run.usage.outputTokens,
        run.usage.costUsd,
        run.error,
        run.startedAt,
        run.finishedAt,
      ],
    );
  }

  private toProposal(row: ProposalRow): Proposal {
    return Proposal.fromData({
      id: ProposalId.of(row.id),
      scanDate: SessionDate.of(row.scan_date),
      content: row.content,
      status: row.status,
      appliedAlternative: row.applied_alternative,
      clusterIds: row.cluster_ids.map((id) => ClusterId.of(id)),
      createdAt: row.created_at,
      decidedAt: row.decided_at,
    });
  }
}
