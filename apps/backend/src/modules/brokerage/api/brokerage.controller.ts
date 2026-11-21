import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthContext, AuthenticatedRequest } from '../../auth/auth.module';
import { Symbol } from '../../../shared/value-objects/symbol';
import type {
  EntryOrderType,
  OrderSide,
  TimeInForce,
} from '../domain/services/brokerage.service';
import { InvariantError } from '../domain/domain-errors';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import { BrokerOrderId } from '../domain/value-objects/broker-order-id';
import { OrderPrice } from '../domain/value-objects/order-price';
import { OrderQuantity } from '../domain/value-objects/order-quantity';
import { OrderReplyId } from '../domain/value-objects/order-reply-id';
import { ListBrokerAccountsUseCase } from '../use-cases/list-broker-accounts.use-case';
import { GetBrokerPositionsUseCase } from '../use-cases/get-broker-positions.use-case';
import { GetWorkingOrdersUseCase } from '../use-cases/get-working-orders.use-case';
import { GetExecutionsUseCase } from '../use-cases/get-executions.use-case';
import { PlaceBracketOrderUseCase } from '../use-cases/place-bracket-order.use-case';
import { ConfirmOrderUseCase } from '../use-cases/confirm-order.use-case';
import { ModifyOrderUseCase } from '../use-cases/modify-order.use-case';
import { CancelOrderUseCase } from '../use-cases/cancel-order.use-case';
import { GetTradingJournalUseCase } from '../use-cases/get-trading-journal.use-case';
import { BrokerageApiMapper } from './brokerage-api.mapper';
import type {
  GetBrokerPositionsApiResponseDto,
  GetExecutionsApiResponseDto,
  GetTradingJournalApiResponseDto,
  GetWorkingOrdersApiResponseDto,
  ListBrokerAccountsApiResponseDto,
  ModifyOrderApiRequestDto,
  OrderSubmissionApiResponseDto,
  PlaceBracketOrderApiRequestDto,
} from './brokerage-api.dto';

const SIDES: readonly OrderSide[] = ['BUY', 'SELL'];
const ENTRY_TYPES: readonly EntryOrderType[] = ['MARKET', 'LIMIT', 'STOP'];
const TIMES_IN_FORCE: readonly TimeInForce[] = ['DAY', 'GTC'];

@Controller('brokerage')
export class BrokerageController {
  constructor(
    private readonly listBrokerAccountsUseCase: ListBrokerAccountsUseCase,
    private readonly getBrokerPositionsUseCase: GetBrokerPositionsUseCase,
    private readonly getWorkingOrdersUseCase: GetWorkingOrdersUseCase,
    private readonly getExecutionsUseCase: GetExecutionsUseCase,
    private readonly placeBracketOrderUseCase: PlaceBracketOrderUseCase,
    private readonly confirmOrderUseCase: ConfirmOrderUseCase,
    private readonly modifyOrderUseCase: ModifyOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly getTradingJournalUseCase: GetTradingJournalUseCase,
    private readonly mapper: BrokerageApiMapper,
  ) {}

  @Get('accounts')
  async listAccounts(
    @Req() req: AuthenticatedRequest,
  ): Promise<ListBrokerAccountsApiResponseDto> {
    const { accounts } = await this.listBrokerAccountsUseCase.execute(
      authContextOf(req),
    );
    return { accounts: this.mapper.mapAccounts(accounts) };
  }

  @Get('accounts/:accountId/positions')
  async getPositions(
    @Param('accountId') accountId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GetBrokerPositionsApiResponseDto> {
    const { positions } = await this.getBrokerPositionsUseCase.execute(
      { accountId: BrokerAccountId.of(accountId) },
      authContextOf(req),
    );
    return {
      positions: positions.map((position) => this.mapper.mapPosition(position)),
    };
  }

  @Get('accounts/:accountId/orders')
  async getWorkingOrders(
    @Param('accountId') accountId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GetWorkingOrdersApiResponseDto> {
    const { orders } = await this.getWorkingOrdersUseCase.execute(
      { accountId: BrokerAccountId.of(accountId) },
      authContextOf(req),
    );
    return {
      orders: orders.map((order) => this.mapper.mapWorkingOrder(order)),
    };
  }

  @Get('accounts/:accountId/executions')
  async getExecutions(
    @Param('accountId') accountId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GetExecutionsApiResponseDto> {
    const { executions } = await this.getExecutionsUseCase.execute(
      { accountId: BrokerAccountId.of(accountId) },
      authContextOf(req),
    );
    return {
      executions: executions.map((execution) =>
        this.mapper.mapExecution(execution),
      ),
    };
  }

  @Get('accounts/:accountId/journal')
  async getTradingJournal(
    @Param('accountId') accountId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GetTradingJournalApiResponseDto> {
    const journal = await this.getTradingJournalUseCase.execute(
      { accountId: BrokerAccountId.of(accountId) },
      authContextOf(req),
    );
    return this.mapper.mapTradingJournal(journal);
  }

  @Post('accounts/:accountId/orders/bracket')
  async placeBracketOrder(
    @Param('accountId') accountId: string,
    @Body() body: PlaceBracketOrderApiRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrderSubmissionApiResponseDto> {
    const submission = await this.placeBracketOrderUseCase.execute(
      {
        accountId: BrokerAccountId.of(accountId),
        ticker: parseTicker(body.ticker),
        side: parseChoice(body.side, SIDES, 'side'),
        quantity: OrderQuantity.of(body.quantity),
        entryType: parseChoice(body.entryType, ENTRY_TYPES, 'entryType'),
        entryPrice: optionalPrice(body.entryPrice),
        stopLossPrice: OrderPrice.of(body.stopLossPrice),
        takeProfitPrice: optionalPrice(body.takeProfitPrice),
        timeInForce: parseChoice(
          body.timeInForce,
          TIMES_IN_FORCE,
          'timeInForce',
        ),
      },
      authContextOf(req),
    );
    return this.mapper.mapSubmission(submission);
  }

  @Post('order-replies/:replyId/confirm')
  @HttpCode(200)
  async confirmOrder(
    @Param('replyId') replyId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrderSubmissionApiResponseDto> {
    const submission = await this.confirmOrderUseCase.execute(
      { replyId: OrderReplyId.of(replyId) },
      authContextOf(req),
    );
    return this.mapper.mapSubmission(submission);
  }

  @Patch('accounts/:accountId/orders/:orderId')
  async modifyOrder(
    @Param('accountId') accountId: string,
    @Param('orderId') orderId: string,
    @Body() body: ModifyOrderApiRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrderSubmissionApiResponseDto> {
    const submission = await this.modifyOrderUseCase.execute(
      {
        accountId: BrokerAccountId.of(accountId),
        orderId: BrokerOrderId.of(orderId),
        changes: {
          price: optionalPrice(body.price) ?? undefined,
          quantity:
            body.quantity === undefined
              ? undefined
              : OrderQuantity.of(body.quantity),
        },
      },
      authContextOf(req),
    );
    return this.mapper.mapSubmission(submission);
  }

  @Delete('accounts/:accountId/orders/:orderId')
  @HttpCode(204)
  async cancelOrder(
    @Param('accountId') accountId: string,
    @Param('orderId') orderId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.cancelOrderUseCase.execute(
      {
        accountId: BrokerAccountId.of(accountId),
        orderId: BrokerOrderId.of(orderId),
      },
      authContextOf(req),
    );
  }
}

function authContextOf(req: AuthenticatedRequest): AuthContext {
  return { userId: req.user.userId };
}

function parseTicker(raw: string): Symbol {
  try {
    return Symbol.of(raw);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Invalid ticker',
    );
  }
}

function parseChoice<T extends string>(
  raw: unknown,
  choices: readonly T[],
  field: string,
): T {
  if (!choices.includes(raw as T)) {
    throw new InvariantError(`${field} must be one of ${choices.join(', ')}`);
  }
  return raw as T;
}

function optionalPrice(raw: number | undefined): OrderPrice | null {
  return raw === undefined || raw === null ? null : OrderPrice.of(raw);
}
