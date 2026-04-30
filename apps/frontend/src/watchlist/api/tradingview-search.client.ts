import { apiClient } from '../../global/api/api-instance';

export interface TradingViewSearchResult {
  symbol: string;
  displaySymbol: string;
  description: string;
  exchange: string;
  fullSymbol: string;
}

interface BackendSymbolSearchResult {
  symbol: string;
  description: string;
  exchange: string;
  fullSymbol: string;
}

interface BackendSymbolSearchResponse {
  results: BackendSymbolSearchResult[];
}

export class TradingViewSearchClient {
  async search(query: string): Promise<TradingViewSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const response = await apiClient.get<BackendSymbolSearchResponse>(
      '/watchlists/symbol-search',
      { params: { q: query.trim() } },
    );

    return response.data.results.map((r) => ({
      symbol: r.symbol,
      displaySymbol: r.symbol,
      description: r.description,
      exchange: r.exchange,
      fullSymbol: r.fullSymbol,
    }));
  }
}
