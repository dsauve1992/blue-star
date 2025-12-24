import axios from 'axios';

export interface TradingViewSymbol {
  symbol: string;
  description: string;
  type: string;
  exchange: string;
  found_by_isin: boolean;
  found_by_cusip: boolean;
  cusip?: string;
  isin?: string;
  cik_code?: string;
  currency_code: string;
  country: string;
  is_primary_listing?: boolean;
  source2?: {
    id: string;
    name: string;
    description: string;
  };
  source_id: string;
  typespecs?: string[];
}

export interface TradingViewSearchResponse {
  symbols_remaining: number;
  symbols: TradingViewSymbol[];
}

export interface TradingViewSearchResult {
  symbol: string;
  displaySymbol: string;
  description: string;
  exchange: string;
  fullSymbol: string;
}

export class TradingViewSearchClient {
  private readonly baseUrl =
    'https://symbol-search.tradingview.com/symbol_search/v3/';

  async search(query: string): Promise<TradingViewSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      text: query.trim(),
      hl: '1',
      exchange: '',
      lang: 'en',
      search_type: 'stocks',
      domain: 'production',
      sort_by_country: 'US',
      promo: 'true',
    });

    try {
      const response = await axios.get<TradingViewSearchResponse>(
        `${this.baseUrl}?${params.toString()}`,
        {
          timeout: 5000,
        },
      );

      return this.formatResults(response.data.symbols);
    } catch (error) {
      console.error('TradingView search error:', error);
      throw new Error('Failed to search symbols');
    }
  }

  private formatResults(symbols: TradingViewSymbol[]): TradingViewSearchResult[] {
    return symbols.map((symbol) => {
      const cleanSymbol = this.stripHtmlTags(symbol.symbol);
      const displaySymbol = cleanSymbol;
      const fullSymbol = symbol.exchange
        ? `${symbol.exchange}:${cleanSymbol}`
        : cleanSymbol;

      return {
        symbol: cleanSymbol,
        displaySymbol,
        description: symbol.description,
        exchange: symbol.exchange,
        fullSymbol,
      };
    });
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}

