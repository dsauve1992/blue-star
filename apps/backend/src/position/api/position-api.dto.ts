export interface PositionApiDto {
  id: string;
  portfolioId: string;
  instrument: string;
  currentQty: number;
  isClosed: boolean;
  initialBuyEvent: {
    action: string;
    timestamp: string;
    quantity: number;
    price: number;
    note?: string;
  };
  events: Array<{
    action: string;
    timestamp: string;
    quantity?: number;
    price?: number;
    stopPrice?: number;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface OpenPositionApiResponseDto {
  positionId: string;
}

export interface SetStopLossApiResponseDto {
  positionId: string;
}

export interface SellSharesApiResponseDto {
  positionId: string;
}

export interface BuySharesApiResponseDto {
  positionId: string;
}

export interface GetPositionsApiResponseDto {
  positions: PositionApiDto[];
}
