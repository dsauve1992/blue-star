import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.service';
import { Position } from '../../domain/entities/position';
import { PositionId } from '../../domain/value-objects/position-id';
import { UserId } from '../../domain/value-objects/user-id';
import { PositionReadRepository as IPositionReadRepository } from '../../domain/repositories/position-read.repository.interface';
import { Action } from '../../domain/entities/position';
import { IsoTimestamp } from '../../domain/value-objects/iso-timestamp';
import { PortfolioId } from '../../domain/value-objects/portfolio-id';
import { Ticker } from '../../domain/value-objects/ticker';
import { Quantity } from '../../domain/value-objects/quantity';
import { Price } from '../../domain/value-objects/price';
import { StopPrice } from '../../domain/value-objects/stop-price';
import {
  BuyEvent,
  PositionEvent,
  SellEvent,
  StopLossEvent,
} from '../../domain/value-objects/position-event';

interface DatabaseRow {
  id: string;
  user_id: string;
  portfolio_id: string;
  instrument: string;
  current_qty: number;
  closed: boolean;
  created_at: string;
  updated_at: string;
  events: EventRow[];
}

interface EventRow {
  id: string;
  position_id: string;
  action: string;
  timestamp: string;
  portfolio_id: string;
  instrument: string;
  quantity: number | null;
  price: number | null;
  stop_price: number | null;
  note: string | null;
  created_at: string;
}

@Injectable()
export class PositionReadRepository implements IPositionReadRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(positionId: PositionId): Promise<Position | null> {
    const query = `
      SELECT 
        p.id,
        p.user_id,
        p.portfolio_id,
        p.instrument,
        p.current_qty,
        p.closed,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pe.id,
              'position_id', pe.position_id,
              'action', pe.action,
              'timestamp', pe.timestamp,
              'portfolio_id', pe.portfolio_id,
              'instrument', pe.instrument,
              'quantity', pe.quantity,
              'price', pe.price,
              'stop_price', pe.stop_price,
              'note', pe.note,
              'created_at', pe.created_at
            ) ORDER BY pe.timestamp
          ) FILTER (WHERE pe.id IS NOT NULL),
          '[]'::json
        ) as events
      FROM positions p
      LEFT JOIN position_events pe ON p.id = pe.position_id
      WHERE p.id = $1
      GROUP BY p.id, p.user_id, p.portfolio_id, p.instrument, p.current_qty, p.closed, p.created_at, p.updated_at
    `;

    const result = await this.databaseService.query(query, [positionId.value]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPosition(result.rows[0] as DatabaseRow);
  }

  async findByUserId(userId: UserId): Promise<Position[]> {
    const query = `
      SELECT 
        p.id,
        p.user_id,
        p.portfolio_id,
        p.instrument,
        p.current_qty,
        p.closed,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pe.id,
              'position_id', pe.position_id,
              'action', pe.action,
              'timestamp', pe.timestamp,
              'portfolio_id', pe.portfolio_id,
              'instrument', pe.instrument,
              'quantity', pe.quantity,
              'price', pe.price,
              'stop_price', pe.stop_price,
              'note', pe.note,
              'created_at', pe.created_at
            ) ORDER BY pe.timestamp
          ) FILTER (WHERE pe.id IS NOT NULL),
          '[]'::json
        ) as events
      FROM positions p
      LEFT JOIN position_events pe ON p.id = pe.position_id
      WHERE p.user_id = $1
      GROUP BY p.id, p.user_id, p.portfolio_id, p.instrument, p.current_qty, p.closed, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `;

    const result = await this.databaseService.query(query, [userId.value]);
    return result.rows.map((row) => this.mapRowToPosition(row as DatabaseRow));
  }

  async findAll(): Promise<Position[]> {
    const query = `
      SELECT 
        p.id,
        p.user_id,
        p.portfolio_id,
        p.instrument,
        p.current_qty,
        p.closed,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pe.id,
              'position_id', pe.position_id,
              'action', pe.action,
              'timestamp', pe.timestamp,
              'portfolio_id', pe.portfolio_id,
              'instrument', pe.instrument,
              'quantity', pe.quantity,
              'price', pe.price,
              'stop_price', pe.stop_price,
              'note', pe.note,
              'created_at', pe.created_at
            ) ORDER BY pe.timestamp
          ) FILTER (WHERE pe.id IS NOT NULL),
          '[]'::json
        ) as events
      FROM positions p
      LEFT JOIN position_events pe ON p.id = pe.position_id
      GROUP BY p.id, p.user_id, p.portfolio_id, p.instrument, p.current_qty, p.closed, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `;

    const result = await this.databaseService.query(query);
    return result.rows.map((row) => this.mapRowToPosition(row as DatabaseRow));
  }

  private mapRowToPosition(row: DatabaseRow): Position {
    const events: PositionEvent[] = row.events.map((eventRow) => {
      const action = eventRow.action as Action;
      const baseEvent = {
        action,
        ts: IsoTimestamp.of(new Date(eventRow.timestamp).toISOString()),
        portfolioId: PortfolioId.of(eventRow.portfolio_id),
        instrument: Ticker.of(eventRow.instrument),
        note: eventRow.note,
      };

      if (action === Action.BUY || action === Action.SELL) {
        return {
          ...baseEvent,
          qty: Quantity.of(eventRow.quantity!),
          price: Price.of(eventRow.price!),
        } as BuyEvent | SellEvent;
      } else if (action === Action.STOP_LOSS) {
        return {
          ...baseEvent,
          stop: StopPrice.of(eventRow.stop_price!),
        } as StopLossEvent;
      }

      throw new Error(`Unknown event action: ${eventRow.action}`);
    });

    return Position.fromEvents(
      PositionId.of(row.id),
      UserId.of(row.user_id),
      events,
    );
  }
}
