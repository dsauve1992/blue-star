export class ScreenerResult {
  private constructor(
    public readonly symbol: string,
    public readonly companyName: string,
    public readonly marketCap: number,
    public readonly sector: string,
    public readonly industry: string,
    public readonly beta: number,
    public readonly price: number,
    public readonly lastAnnualDividend: number,
    public readonly volume: number,
    public readonly exchange: string,
    public readonly exchangeShortName: string,
    public readonly country: string,
    public readonly isEtf: boolean,
    public readonly isFund: boolean,
    public readonly isActivelyTrading: boolean,
  ) {}

  static of(data: {
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
  }): ScreenerResult {
    return new ScreenerResult(
      data.symbol,
      data.companyName,
      data.marketCap,
      data.sector,
      data.industry,
      data.beta,
      data.price,
      data.lastAnnualDividend,
      data.volume,
      data.exchange,
      data.exchangeShortName,
      data.country,
      data.isEtf,
      data.isFund,
      data.isActivelyTrading,
    );
  }
}
