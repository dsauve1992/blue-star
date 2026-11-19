import { UuidGeneratorService } from '../../../../shared/services/uuid-generator.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
import {
  BrokerRejectedError,
  BrokerUnavailableError,
  InvariantError,
} from '../../domain/domain-errors';
import type { WorkingOrder } from '../../domain/services/brokerage.service';
import { BrokerAccountId } from '../../domain/value-objects/broker-account-id';
import { BrokerOrderId } from '../../domain/value-objects/broker-order-id';
import { OrderPrice } from '../../domain/value-objects/order-price';
import { OrderQuantity } from '../../domain/value-objects/order-quantity';
import { OrderReplyId } from '../../domain/value-objects/order-reply-id';
import { IbkrClientPortalBrokerageService } from './ibkr-client-portal-brokerage.service';
import type { HttpMethod, IbkrGatewayClient } from './ibkr-gateway.client';

type Route = (body?: object) => unknown;

const ACCOUNT = BrokerAccountId.of('DU1234567');

function gatewayWith(routes: Record<string, Route>) {
  const request = jest.fn(
    (method: HttpMethod, path: string, body?: object): Promise<unknown> => {
      const route = routes[`${method} ${path}`];
      if (!route) {
        return Promise.reject(new Error(`Unexpected call ${method} ${path}`));
      }
      return Promise.resolve(route(body));
    },
  );
  return { request } as unknown as jest.Mocked<IbkrGatewayClient> & {
    request: typeof request;
  };
}

const authenticated: Record<string, Route> = {
  'POST /iserver/auth/status': () => ({ authenticated: true }),
};

describe('IbkrClientPortalBrokerageService', () => {
  describe('listAccounts', () => {
    it('should drop the All pseudo-account', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'GET /iserver/accounts': () => ({ accounts: ['All', 'DU1234567'] }),
      });

      const accounts = await new IbkrClientPortalBrokerageService(
        gateway,
      ).listAccounts();

      expect(accounts).toEqual([ACCOUNT]);
    });

    it('should open the brokerage session when it is not authenticated yet', async () => {
      let statusCalls = 0;
      const gateway = gatewayWith({
        'POST /iserver/auth/status': () => ({
          authenticated: ++statusCalls > 1,
        }),
        'POST /iserver/auth/ssodh/init': () => ({}),
        'GET /iserver/accounts': () => ({ accounts: ['DU1234567'] }),
      });

      await new IbkrClientPortalBrokerageService(gateway).listAccounts();

      expect(gateway.request).toHaveBeenNthCalledWith(
        2,
        'POST',
        '/iserver/auth/ssodh/init',
        { publish: true, compete: true },
      );
    });

    it('should fail when the brokerage session cannot be opened', async () => {
      const gateway = gatewayWith({
        'POST /iserver/auth/status': () => ({ authenticated: false }),
        'POST /iserver/auth/ssodh/init': () => ({}),
      });

      await expect(
        new IbkrClientPortalBrokerageService(gateway).listAccounts(),
      ).rejects.toThrow(BrokerUnavailableError);
    });
  });

  describe('getWorkingOrders', () => {
    it('should map the stop price from auxPrice and the limit price from price', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'GET /iserver/account/orders': () => ({
          snapshot: true,
          orders: [
            {
              acct: 'DU1234567',
              orderId: 101,
              conid: 4815,
              ticker: 'KOD',
              side: 'SELL',
              orderType: 'Stop',
              totalSize: '6.0',
              remainingQuantity: '6.0',
              price: '',
              auxPrice: '97.51',
              timeInForce: 'GTC',
              status: 'PreSubmitted',
              ocaGroupId: '777',
            },
            {
              acct: 'DU1234567',
              orderId: 102,
              conid: 4815,
              ticker: 'KOD',
              side: 'SELL',
              orderType: 'Limit',
              totalSize: '6.0',
              remainingQuantity: '6.0',
              price: '155.68',
              timeInForce: 'GTC',
              status: 'PreSubmitted',
              ocaGroupId: '777',
            },
            {
              acct: 'DU1234567',
              orderId: 103,
              conid: 4815,
              ticker: 'KOD',
              side: 'BUY',
              orderType: 'Limit',
              totalSize: '6.0',
              remainingQuantity: '0.0',
              price: '90',
              timeInForce: 'DAY',
              status: 'Filled',
            },
            {
              acct: 'U9999999',
              orderId: 104,
              conid: 1,
              ticker: 'AAPL',
              side: 'BUY',
              orderType: 'Limit',
              totalSize: 1,
              remainingQuantity: 1,
              price: 100,
              timeInForce: 'DAY',
              status: 'Submitted',
            },
          ],
        }),
      });

      const orders = await new IbkrClientPortalBrokerageService(
        gateway,
      ).getWorkingOrders(ACCOUNT);

      const common = {
        accountId: ACCOUNT,
        ticker: 'KOD',
        instrumentId: '4815',
        side: 'SELL',
        quantity: 6,
        remainingQuantity: 6,
        timeInForce: 'GTC',
        status: 'PreSubmitted',
        ocaGroupId: '777',
      };
      expect(orders).toEqual([
        {
          ...common,
          orderId: BrokerOrderId.of('101'),
          type: 'STOP',
          limitPrice: null,
          stopPrice: 97.51,
        },
        {
          ...common,
          orderId: BrokerOrderId.of('102'),
          type: 'LIMIT',
          limitPrice: 155.68,
          stopPrice: null,
        },
      ]);
    });
    it('should read the CLOSE time in force of a day order as DAY', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'GET /iserver/account/orders': () => ({
          snapshot: true,
          orders: [
            {
              acct: 'DU1234567',
              orderId: 230865530,
              conid: 265598,
              ticker: 'AAPL',
              side: 'SELL',
              orderType: 'Stop',
              totalSize: 1,
              remainingQuantity: 1,
              price: '',
              auxPrice: '45',
              timeInForce: 'CLOSE',
              status: 'PreSubmitted',
            },
          ],
        }),
      });

      const [order] = await new IbkrClientPortalBrokerageService(
        gateway,
      ).getWorkingOrders(ACCOUNT);

      expect(order.timeInForce).toEqual('DAY');
    });

    it('should refuse to answer while IBKR is still loading the orders', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'GET /iserver/account/orders': () => ({ orders: [] }),
      });

      await expect(
        new IbkrClientPortalBrokerageService(gateway).getWorkingOrders(ACCOUNT),
      ).rejects.toThrow(BrokerUnavailableError);
    });
  });

  describe('getExecutions', () => {
    it('should map trades of the account', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'GET /iserver/account/trades?days=7': () => [
          {
            execution_id: 'exec-1',
            order_id: 55,
            account: 'DU1234567',
            symbol: 'KOD',
            conid: 4815,
            side: 'B',
            size: 6,
            price: '91.25',
            commission: '1.00',
            trade_time_r: 1763400000000,
          },
          {
            execution_id: 'exec-2',
            account: 'U9999999',
            symbol: 'AAPL',
            conid: 1,
            side: 'S',
            size: 1,
            price: 1,
            trade_time_r: 1763400000000,
          },
        ],
      });

      const executions = await new IbkrClientPortalBrokerageService(
        gateway,
      ).getExecutions(ACCOUNT);

      expect(executions).toEqual([
        {
          accountId: ACCOUNT,
          executionId: 'exec-1',
          orderId: '55',
          ticker: 'KOD',
          instrumentId: '4815',
          side: 'BUY',
          quantity: 6,
          price: 91.25,
          commission: 1,
          executedAt: new Date(1763400000000),
        },
      ]);
    });
  });

  describe('placeBracketOrder', () => {
    const bracket = {
      accountId: ACCOUNT,
      ticker: Symbol.of('KOD'),
      side: 'BUY' as const,
      quantity: OrderQuantity.of(6),
      entryType: 'STOP' as const,
      entryPrice: OrderPrice.of(100),
      stopLossPrice: OrderPrice.of(95),
      takeProfitPrice: OrderPrice.of(120),
      timeInForce: 'GTC' as const,
    };

    const stocks = {
      'GET /trsrv/stocks?symbols=KOD': () => ({
        KOD: [
          {
            contracts: [
              { conid: 4815, isUS: true },
              { conid: 9999, isUS: false },
            ],
          },
        ],
      }),
    };

    beforeEach(() => {
      jest.spyOn(UuidGeneratorService, 'generate').mockReturnValue('uuid-1');
    });

    it('should send the entry with stop-loss and take-profit children', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        ...stocks,
        'POST /iserver/account/DU1234567/orders': () => [
          { order_id: 1 },
          { order_id: 2 },
          { order_id: 3 },
        ],
      });

      const submission = await new IbkrClientPortalBrokerageService(
        gateway,
      ).placeBracketOrder(bracket);

      const common = {
        acctId: 'DU1234567',
        conid: 4815,
        quantity: 6,
        tif: 'GTC',
      };
      expect(gateway.request).toHaveBeenLastCalledWith(
        'POST',
        '/iserver/account/DU1234567/orders',
        {
          orders: [
            {
              ...common,
              cOID: 'bs-uuid-1',
              orderType: 'STP',
              side: 'BUY',
              price: 100,
            },
            {
              ...common,
              parentId: 'bs-uuid-1',
              orderType: 'STP',
              side: 'SELL',
              price: 95,
            },
            {
              ...common,
              parentId: 'bs-uuid-1',
              orderType: 'LMT',
              side: 'SELL',
              price: 120,
            },
          ],
        },
      );
      expect(submission).toEqual({
        status: 'SUBMITTED',
        orderIds: ['1', '2', '3'].map((id) => BrokerOrderId.of(id)),
      });
    });

    it('should return the prompts IBKR asks to confirm', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        ...stocks,
        'POST /iserver/account/DU1234567/orders': () => [
          { id: 'abc-123', message: ['Price exceeds the 3% constraint'] },
        ],
      });

      const submission = await new IbkrClientPortalBrokerageService(
        gateway,
      ).placeBracketOrder(bracket);

      expect(submission).toEqual({
        status: 'CONFIRMATION_REQUIRED',
        replyId: OrderReplyId.of('abc-123'),
        messages: ['Price exceeds the 3% constraint'],
      });
    });

    it('should reject a ticker without exactly one US stock', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'GET /trsrv/stocks?symbols=KOD': () => ({ KOD: [] }),
      });

      await expect(
        new IbkrClientPortalBrokerageService(gateway).placeBracketOrder(
          bracket,
        ),
      ).rejects.toThrow(InvariantError);
    });

    it('should surface an IBKR rejection', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        ...stocks,
        'POST /iserver/account/DU1234567/orders': () => ({
          error: 'Insufficient funds',
        }),
      });

      await expect(
        new IbkrClientPortalBrokerageService(gateway).placeBracketOrder(
          bracket,
        ),
      ).rejects.toThrow(BrokerRejectedError);
    });
  });

  describe('confirmOrder', () => {
    it('should answer yes to the prompt', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'POST /iserver/reply/abc-123': () => [{ order_id: 7 }],
      });

      const submission = await new IbkrClientPortalBrokerageService(
        gateway,
      ).confirmOrder(OrderReplyId.of('abc-123'));

      expect(gateway.request).toHaveBeenLastCalledWith(
        'POST',
        '/iserver/reply/abc-123',
        { confirmed: true },
      );
      expect(submission).toEqual({
        status: 'SUBMITTED',
        orderIds: [BrokerOrderId.of('7')],
      });
    });
  });

  describe('modifyOrder', () => {
    const stopOrder: WorkingOrder = {
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
      ocaGroupId: '777',
    };

    it('should resend the full stop order with the new stop price', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'POST /iserver/account/DU1234567/order/101': () => [{ order_id: 101 }],
      });

      await new IbkrClientPortalBrokerageService(gateway).modifyOrder(
        stopOrder,
        { price: OrderPrice.of(99) },
      );

      expect(gateway.request).toHaveBeenLastCalledWith(
        'POST',
        '/iserver/account/DU1234567/order/101',
        {
          acctId: 'DU1234567',
          conid: 4815,
          orderType: 'STP',
          side: 'SELL',
          quantity: 6,
          tif: 'GTC',
          price: 99,
        },
      );
    });

    it('should keep the total size of a partially filled order', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'POST /iserver/account/DU1234567/order/101': () => [{ order_id: 101 }],
      });

      await new IbkrClientPortalBrokerageService(gateway).modifyOrder(
        { ...stopOrder, remainingQuantity: 2 },
        { price: OrderPrice.of(99) },
      );

      expect(gateway.request).toHaveBeenLastCalledWith(
        'POST',
        '/iserver/account/DU1234567/order/101',
        {
          acctId: 'DU1234567',
          conid: 4815,
          orderType: 'STP',
          side: 'SELL',
          quantity: 6,
          tif: 'GTC',
          price: 99,
        },
      );
    });

    it('should refuse to modify a stop-limit order', async () => {
      const gateway = gatewayWith(authenticated);

      await expect(
        new IbkrClientPortalBrokerageService(gateway).modifyOrder(
          { ...stopOrder, type: 'STOP_LIMIT' },
          { price: OrderPrice.of(99) },
        ),
      ).rejects.toThrow(InvariantError);
    });
  });

  describe('cancelOrder', () => {
    it('should surface an IBKR rejection', async () => {
      const gateway = gatewayWith({
        ...authenticated,
        'DELETE /iserver/account/DU1234567/order/101': () => ({
          error: 'Order already filled',
        }),
      });

      await expect(
        new IbkrClientPortalBrokerageService(gateway).cancelOrder(
          ACCOUNT,
          BrokerOrderId.of('101'),
        ),
      ).rejects.toThrow(BrokerRejectedError);
    });
  });
});
