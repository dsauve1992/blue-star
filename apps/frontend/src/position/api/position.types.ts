export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePositionRequest {
  symbol: string;
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
}

export interface UpdatePositionRequest {
  stopLoss?: number;
}
