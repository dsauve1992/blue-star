export interface RawStockClassification {
  ticker: string;
  sector: string;
  industry: string;
  industryKey: string;
}

export interface StockClassifierService {
  classify(ticker: string): Promise<RawStockClassification>;
}
