import { Injectable, Logger } from '@nestjs/common';

interface TradingViewSymbol {
  symbol: string;
  description: string;
  exchange: string;
}

interface TradingViewSearchResponse {
  symbols?: TradingViewSymbol[];
}

export interface SymbolSearchResult {
  symbol: string;
  description: string;
  exchange: string;
  fullSymbol: string;
}

@Injectable()
export class TradingViewSymbolSearchService {
  private readonly logger = new Logger(TradingViewSymbolSearchService.name);
  private readonly baseUrl =
    'https://symbol-search.tradingview.com/symbol_search/v3/';

  async search(query: string): Promise<SymbolSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];

    const params = new URLSearchParams({
      text: trimmed,
      hl: '1',
      exchange: '',
      lang: 'en',
      search_type: 'stocks',
      domain: 'production',
      sort_by_country: 'US',
      promo: 'true',
    });

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      // TradingView's public search rejects requests without a browser-like
      // Origin/Referer pair (returns 403). Spoofing tradingview.com is the
      // standard workaround used by community wrappers.
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept: 'application/json',
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
      },
    });

    if (!response.ok) {
      this.logger.warn(
        `TradingView symbol search failed for "${trimmed}": HTTP ${response.status}`,
      );
      throw new Error(`Symbol search failed: HTTP ${response.status}`);
    }

    const json = (await response.json()) as TradingViewSearchResponse;
    return (json.symbols ?? []).map((s) => this.format(s));
  }

  private format(s: TradingViewSymbol): SymbolSearchResult {
    const cleanSymbol = this.stripHtmlTags(s.symbol);
    return {
      symbol: cleanSymbol,
      description: s.description ?? '',
      exchange: s.exchange ?? '',
      fullSymbol: s.exchange ? `${s.exchange}:${cleanSymbol}` : cleanSymbol,
    };
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}
