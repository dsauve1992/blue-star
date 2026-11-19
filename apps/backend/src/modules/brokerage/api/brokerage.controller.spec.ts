import { Test } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../../auth/auth.module';
import { Symbol } from '../../../shared/value-objects/symbol';
import { UserId } from '../../../shared/value-objects/user-id';
import { InvariantError } from '../domain/domain-errors';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import { BrokerOrderId } from '../domain/value-objects/broker-order-id';
import { OrderPrice } from '../domain/value-objects/order-price';
import { OrderQuantity } from '../domain/value-objects/order-quantity';
import { ListBrokerAccountsUseCase } from '../use-cases/list-broker-accounts.use-case';
import { GetBrokerPositionsUseCase } from '../use-cases/get-broker-positions.use-case';
import { GetWorkingOrdersUseCase } from '../use-cases/get-working-orders.use-case';
import { GetExecutionsUseCase } from '../use-cases/get-executions.use-case';
import { PlaceBracketOrderUseCase } from '../use-cases/place-bracket-order.use-case';
import { ConfirmOrderUseCase } from '../use-cases/confirm-order.use-case';
import { ModifyOrderUseCase } from '../use-cases/modify-order.use-case';
import { CancelOrderUseCase } from '../use-cases/cancel-order.use-case';
import { BrokerageApiMapper } from './brokerage-api.mapper';
import { BrokerageController } from './brokerage.controller';

const REQ = {
  user: { userId: UserId.of('owner-user') },
} as AuthenticatedRequest;
const AUTH = { userId: UserId.of('owner-user') };

describe('BrokerageController', () => {
  let controller: BrokerageController;
  let placeBracketOrder: jest.Mocked<PlaceBracketOrderUseCase>;
  let modifyOrder: jest.Mocked<ModifyOrderUseCase>;

  beforeEach(async () => {
    const submitted = {
      status: 'SUBMITTED',
      orderIds: [BrokerOrderId.of('1')],
    };
    placeBracketOrder = {
      execute: jest.fn().mockResolvedValue(submitted),
    } as unknown as jest.Mocked<PlaceBracketOrderUseCase>;
    modifyOrder = {
      execute: jest.fn().mockResolvedValue(submitted),
    } as unknown as jest.Mocked<ModifyOrderUseCase>;
    const unused = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [BrokerageController],
      providers: [
        BrokerageApiMapper,
        { provide: ListBrokerAccountsUseCase, useValue: unused },
        { provide: GetBrokerPositionsUseCase, useValue: unused },
        { provide: GetWorkingOrdersUseCase, useValue: unused },
        { provide: GetExecutionsUseCase, useValue: unused },
        { provide: PlaceBracketOrderUseCase, useValue: placeBracketOrder },
        { provide: ConfirmOrderUseCase, useValue: unused },
        { provide: ModifyOrderUseCase, useValue: modifyOrder },
        { provide: CancelOrderUseCase, useValue: unused },
      ],
    }).compile();

    controller = module.get(BrokerageController);
  });

  it('should parse a bracket order into value objects and map the submission', async () => {
    const response = await controller.placeBracketOrder(
      'DU1234567',
      {
        ticker: 'kod',
        side: 'BUY',
        quantity: 6,
        entryType: 'STOP',
        entryPrice: 100,
        stopLossPrice: 95,
        timeInForce: 'GTC',
      },
      REQ,
    );

    expect(placeBracketOrder.execute).toHaveBeenNthCalledWith(
      1,
      {
        accountId: BrokerAccountId.of('DU1234567'),
        ticker: Symbol.of('KOD'),
        side: 'BUY',
        quantity: OrderQuantity.of(6),
        entryType: 'STOP',
        entryPrice: OrderPrice.of(100),
        stopLossPrice: OrderPrice.of(95),
        takeProfitPrice: null,
        timeInForce: 'GTC',
      },
      AUTH,
    );
    expect(response).toEqual({ status: 'SUBMITTED', orderIds: ['1'] });
  });

  it('should refuse an unknown order side', async () => {
    await expect(
      controller.placeBracketOrder(
        'DU1234567',
        {
          ticker: 'KOD',
          side: 'SHORT',
          quantity: 6,
          entryType: 'MARKET',
          stopLossPrice: 95,
          timeInForce: 'GTC',
        },
        REQ,
      ),
    ).rejects.toThrow(InvariantError);
    expect(placeBracketOrder.execute).not.toHaveBeenCalled();
  });

  it('should parse a stop change', async () => {
    await controller.modifyOrder('DU1234567', '101', { price: 99 }, REQ);

    expect(modifyOrder.execute).toHaveBeenNthCalledWith(
      1,
      {
        accountId: BrokerAccountId.of('DU1234567'),
        orderId: BrokerOrderId.of('101'),
        changes: { price: OrderPrice.of(99), quantity: undefined },
      },
      AUTH,
    );
  });
});
