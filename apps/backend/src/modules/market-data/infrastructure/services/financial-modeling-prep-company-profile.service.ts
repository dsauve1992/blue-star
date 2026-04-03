import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CompanyProfile,
  CompanyProfileService,
} from '../../domain/services/company-profile.service';
import { Symbol } from '../../domain/value-objects/symbol';

interface FmpProfileResponse {
  symbol: string;
  sector: string;
  industry: string;
}

@Injectable()
export class FinancialModelingPrepCompanyProfileService
  implements CompanyProfileService
{
  private readonly baseUrl = 'https://financialmodelingprep.com/stable';
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

  async getCompanyProfile(symbol: Symbol): Promise<CompanyProfile> {
    // Strip exchange prefix (e.g., "NYSE:AAPL" → "AAPL")
    const rawSymbol = symbol.value;
    const tickerOnly = rawSymbol.includes(':')
      ? rawSymbol.split(':')[1]
      : rawSymbol;

    const url = `${this.baseUrl}/profile?symbol=${tickerOnly}&apikey=${this.apiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const data = Array.isArray(json)
        ? (json as FmpProfileResponse[])
        : [json as FmpProfileResponse];

      if (!data || data.length === 0 || !data[0].symbol) {
        throw new Error(`No profile data found for symbol: ${tickerOnly}`);
      }

      const profile = data[0];

      return {
        symbol: profile.symbol,
        sector: profile.sector,
        industry: profile.industry,
      };
    } catch (error) {
      throw new Error(`Failed to fetch company profile: ${error}`);
    }
  }
}
