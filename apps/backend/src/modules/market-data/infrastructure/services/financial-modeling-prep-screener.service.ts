import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScreenerService } from '../../domain/services/screener.service';
import { ScreenerFilters } from '../../domain/value-objects/screener-filters';
import { ScreenerResult } from '../../domain/value-objects/screener-result';

interface FinancialModelingPrepResponse {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  beta: number;
  price: number;
  lastAnnualDividend: number;
  volume: number;
  exchange: string;
  exchangeShortName: string;
  country: string;
  isEtf: boolean;
  isFund: boolean;
  isActivelyTrading: boolean;
}

@Injectable()
export class FinancialModelingPrepScreenerService implements ScreenerService {
  private readonly baseUrl = 'https://financialmodelingprep.com/api/v3';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(
      'FINANCIAL_MODELING_PREP_API_KEY',
    );
    if (!apiKey) {
      throw new Error('FINANCIAL_MODELING_PREP_API_KEY is required');
    }

    this.apiKey = apiKey;
  }

  async screenStocks(filters: ScreenerFilters): Promise<ScreenerResult[]> {
    const queryParams = filters.toQueryParams();
    queryParams.apikey = this.apiKey;

    const url = new URL(`${this.baseUrl}/stock-screener`);
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FinancialModelingPrepResponse[] =
        (await response.json()) as FinancialModelingPrepResponse[];

      return data.map((item) =>
        ScreenerResult.of({
          symbol: item.symbol,
          companyName: item.companyName,
          marketCap: item.marketCap,
          sector: item.sector,
          industry: item.industry,
          beta: item.beta,
          price: item.price,
          lastAnnualDividend: item.lastAnnualDividend,
          volume: item.volume,
          exchange: item.exchange,
          exchangeShortName: item.exchangeShortName,
          country: item.country,
          isEtf: item.isEtf,
          isFund: item.isFund,
          isActivelyTrading: item.isActivelyTrading,
        }),
      );
    } catch (error) {
      throw new Error(`Failed to fetch screener data: ${error}`);
    }
  }
}
