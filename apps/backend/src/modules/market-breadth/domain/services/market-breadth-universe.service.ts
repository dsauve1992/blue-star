export interface MarketBreadthUniversePayload {
  scan_date: string;
  universe_size: number;
  symbols: string[];
}

export interface MarketBreadthUniverseService {
  fetchUniverse(): Promise<MarketBreadthUniversePayload>;
}
