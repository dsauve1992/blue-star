import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.service';
import { Position } from '../../domain/entities/position';
import { PositionId } from '../../domain/value-objects/position-id';
import { UserId } from '../../domain/value-objects/user-id';
import { PositionWriteRepository as IPositionWriteRepository } from '../../domain/repositories/position-write.repository.interface';
import { InvariantError } from '../../domain/domain-errors';
import { Action } from '../../domain/entities/position';
import { IsoTimestamp } from '../../domain/value-objects/iso-timestamp';
import { Ticker } from '../../domain/value-objects/ticker';
import { Quantity } from '../../domain/value-objects/quantity';
import { Price } from '../../domain/value-objects/price';
import { StopPrice } from '../../domain/value-objects/stop-price';
import { UuidGeneratorService } from '../../../shared/services/uuid-generator.service';
import { PositionEvent } from '../../domain/value-objects/position-event';

interface DatabaseRow {
  id: string;
  user_id: string;
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
  instrument: string;
  quantity: number | null;
  price: number | null;
  stop_price: number | null;
  note: string | null;
  created_at: string;
}

@Injectable()
export class PositionWriteRepository implements IPositionWriteRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async save(position: Position): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      const positionQuery = `
        INSERT INTO positions (id, user_id, instrument, current_qty, closed, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          instrument = EXCLUDED.instrument,
          current_qty = EXCLUDED.current_qty,
          closed = EXCLUDED.closed,
          updated_at = NOW()
      `;

      await client.query(positionQuery, [
        position.id.value,
        position.userId.value,
        position.instrument.value,
        position.currentQty,
        position.isClosed,
      ]);

      await client.query('DELETE FROM position_events WHERE position_id = $1', [
        position.id.value,
      ]);

      for (const event of position.events) {
        const eventQuery = `
          INSERT INTO position_events (
            id, position_id, action, timestamp, instrument,
            quantity, price, stop_price, note, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `;

        const eventId = UuidGeneratorService.generate();
        const quantity =
          event.action === Action.BUY || event.action === Action.SELL
            ? event.qty.value
            : null;
        const price =
          event.action === Action.BUY || event.action === Action.SELL
            ? event.price.value
            : null;
        const stopPrice =
          event.action === Action.STOP_LOSS ? event.stop.value : null;

        try {
          await client.query(eventQuery, [
            eventId,
            position.id.value,
            event.action,
            event.ts.value,
            event.instrument.value,
            quantity,
            price,
            stopPrice,
            event.note,
          ]);
        } catch (error) {
          console.error('Error inserting event:', error);
          console.error('Event data:', {
            eventId,
            positionId: position.id.value,
            action: event.action,
          });
          throw error;
        }
      }
    });
  }

  async getById(positionId: PositionId): Promise<Position> {
    const query = `
      SELECT 
        p.id,
        p.user_id,
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
      GROUP BY p.id, p.user_id, p.instrument, p.current_qty, p.closed, p.created_at, p.updated_at
    `;

    const result = await this.databaseService.query(query, [positionId.value]);

    if (result.rows.length === 0) {
      throw new InvariantError(
        `Position with ID ${positionId.value} not found`,
      );
    }

    return this.mapRowToPosition(result.rows[0] as DatabaseRow);
  }

  private mapRowToPosition(row: DatabaseRow): Position {
    const events: PositionEvent[] = row.events.map((eventRow: EventRow) => {
      const action = eventRow.action as Action;
      const baseEvent = {
        action,
        ts: IsoTimestamp.of(new Date(eventRow.timestamp).toISOString()),
        instrument: Ticker.of(eventRow.instrument),
        note: eventRow.note,
      };

      if (action === Action.BUY || action === Action.SELL) {
        return {
          ...baseEvent,
          qty: Quantity.of(eventRow.quantity!),
          price: Price.of(eventRow.price!),
        } as PositionEvent;
      } else if (action === Action.STOP_LOSS) {
        return {
          ...baseEvent,
          stop: StopPrice.of(eventRow.stop_price!),
        } as PositionEvent;
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
