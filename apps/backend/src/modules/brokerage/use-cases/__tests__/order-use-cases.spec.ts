import { Symbol } from '../../../../shared/value-objects/symbol';
import { UserId } from '../../../../shared/value-objects/user-id';
import { InvariantError, NotFoundError } from '../../domain/domain-errors';
import type {
  BracketOrder,
  BrokerageService,
  BrokerOrder,
} from '../../domain/services/brokerage.service';
import { BrokerAccountId } from '../../domain/value-objects/broker-account-id';
import { BrokerOrderId } from '../../domain/value-objects/broker-order-id';
import { OrderPrice } from '../../domain/value-objects/order-price';
import { OrderQuantity } from '../../domain/value-objects/order-quantity';
import type { BrokerageAccess } from '../brokerage-access';
import { CancelOrderUseCase } from '../cancel-order.use-case';
import { ModifyOrderUseCase } from '../modify-order.use-case';
import { PlaceBracketOrderUseCase } from '../place-bracket-order.use-case';

const AUTH = { userId: UserId.of('owner-user') };
const ACCOUNT = BrokerAccountId.of('DU1234567');

const STOP_ORDER: BrokerOrder = {
  accountId: ACCOUNT,
  orderId: BrokerOrderId.of('101'),
  ticker: 'KOD',
  instrumentId: '4815',
  side: 'SELL',
  type: 'STOP',
  quantity: 6,
  remainingQuantity: 6,
  limitPrice: null,
  stopPrice: 97.51,
  timeInForce: 'GTC',
  status: 'PreSubmitted',
  isWorking: true,
  ocaGroupId: null,
};

let brokerageAccess: jest.Mocked<BrokerageAccess>;
let brokerageService: jest.Mocked<BrokerageService>;

beforeEach(() => {
  brokerageAccess = {
    assertOwner: jest.fn(),
    assertOwnerOfAccount: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<BrokerageAccess>;
  brokerageService = {
    getWorkingOrders: jest.fn().mockResolvedValue([STOP_ORDER]),
    placeBracketOrder: jest
      .fn()
      .mockResolvedValue({ status: 'SUBMITTED', orderIds: [] }),
    modifyOrder: jest
      .fn()
      .mockResolvedValue({ status: 'SUBMITTED', orderIds: [] }),
    cancelOrder: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<BrokerageService>;
});

describe('PlaceBracketOrderUseCase', () => {
  const longBracket: BracketOrder = {
    accountId: ACCOUNT,
    ticker: Symbol.of('KOD'),
    side: 'BUY',
    quantity: OrderQuantity.of(6),
    entryType: 'LIMIT',
    entryPrice: OrderPrice.of(100),
    stopLossPrice: OrderPrice.of(95),
    takeProfitPrice: OrderPrice.of(120),
    timeInForce: 'GTC',
  };

  it('should check ownership of the account, then place the order', async () => {
    const useCase = new PlaceBracketOrderUseCase(
      brokerageAccess,
      brokerageService,
    );

    await useCase.execute(longBracket, AUTH);

    expect(brokerageAccess.assertOwnerOfAccount).toHaveBeenNthCalledWith(
      1,
      AUTH,
      ACCOUNT,
    );
    expect(brokerageService.placeBracketOrder).toHaveBeenNthCalledWith(
      1,
      longBracket,
    );
  });

  it.each([
    ['a long stop-loss above the entry', { stopLossPrice: OrderPrice.of(101) }],
    [
      'a long take-profit below the entry',
      { takeProfitPrice: OrderPrice.of(99) },
    ],
    ['a limit entry without a price', { entryPrice: null }],
    ['a market entry with a price', { entryType: 'MARKET' as const }],
  ])('should refuse %s without calling the broker', async (_, override) => {
    const useCase = new PlaceBracketOrderUseCase(
      brokerageAccess,
      brokerageService,
    );

    await expect(
      useCase.execute({ ...longBracket, ...override }, AUTH),
    ).rejects.toThrow(InvariantError);
    expect(brokerageService.placeBracketOrder).not.toHaveBeenCalled();
  });
});

describe('ModifyOrderUseCase', () => {
  it('should modify the working order with the new price', async () => {
    const useCase = new ModifyOrderUseCase(brokerageAccess, brokerageService);
    const changes = { price: OrderPrice.of(99) };

    await useCase.execute(
      { accountId: ACCOUNT, orderId: BrokerOrderId.of('101'), changes },
      AUTH,
    );

    expect(brokerageService.modifyOrder).toHaveBeenNthCalledWith(
      1,
      STOP_ORDER,
      changes,
    );
  });

  it('should refuse an order that is not working', async () => {
    const useCase = new ModifyOrderUseCase(brokerageAccess, brokerageService);

    await expect(
      useCase.execute(
        {
          accountId: ACCOUNT,
          orderId: BrokerOrderId.of('999'),
          changes: { price: OrderPrice.of(99) },
        },
        AUTH,
      ),
    ).rejects.toThrow(NotFoundError);
    expect(brokerageService.modifyOrder).not.toHaveBeenCalled();
  });
});

describe('CancelOrderUseCase', () => {
  it('should cancel a working order', async () => {
    const useCase = new CancelOrderUseCase(brokerageAccess, brokerageService);

    await useCase.execute(
      { accountId: ACCOUNT, orderId: BrokerOrderId.of('101') },
      AUTH,
    );

    expect(brokerageService.cancelOrder).toHaveBeenNthCalledWith(
      1,
      ACCOUNT,
      BrokerOrderId.of('101'),
    );
  });

  it('should refuse an order that is not working', async () => {
    const useCase = new CancelOrderUseCase(brokerageAccess, brokerageService);

    await expect(
      useCase.execute(
        { accountId: ACCOUNT, orderId: BrokerOrderId.of('999') },
        AUTH,
      ),
    ).rejects.toThrow(NotFoundError);
    expect(brokerageService.cancelOrder).not.toHaveBeenCalled();
  });
});
