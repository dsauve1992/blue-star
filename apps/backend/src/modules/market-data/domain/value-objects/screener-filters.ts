export class ScreenerFilters {
  private constructor(
    public readonly marketCapMin?: number,
    public readonly marketCapMax?: number,
    public readonly priceMin?: number,
    public readonly priceMax?: number,
    public readonly volumeMin?: number,
    public readonly volumeMax?: number,
    public readonly betaMin?: number,
    public readonly betaMax?: number,
    public readonly sector?: string,
    public readonly country?: string,
    public readonly exchange?: string,
    public readonly limit?: number,
  ) {}

  static of(filters: {
    marketCapMin?: number;
    marketCapMax?: number;
    priceMin?: number;
    priceMax?: number;
    volumeMin?: number;
    volumeMax?: number;
    betaMin?: number;
    betaMax?: number;
    sector?: string;
    country?: string;
    exchange?: string;
    limit?: number;
  }): ScreenerFilters {
    return new ScreenerFilters(
      filters.marketCapMin,
      filters.marketCapMax,
      filters.priceMin,
      filters.priceMax,
      filters.volumeMin,
      filters.volumeMax,
      filters.betaMin,
      filters.betaMax,
      filters.sector,
      filters.country,
      filters.exchange,
      filters.limit,
    );
  }

  toQueryParams(): Record<string, string> {
    const params: Record<string, string> = {};

    if (this.marketCapMin !== undefined) {
      params.marketCapMoreThan = this.marketCapMin.toString();
    }
    if (this.marketCapMax !== undefined) {
      params.marketCapLowerThan = this.marketCapMax.toString();
    }
    if (this.priceMin !== undefined) {
      params.priceMoreThan = this.priceMin.toString();
    }
    if (this.priceMax !== undefined) {
      params.priceLowerThan = this.priceMax.toString();
    }
    if (this.volumeMin !== undefined) {
      params.volumeMoreThan = this.volumeMin.toString();
    }
    if (this.volumeMax !== undefined) {
      params.volumeLowerThan = this.volumeMax.toString();
    }
    if (this.betaMin !== undefined) {
      params.betaMoreThan = this.betaMin.toString();
    }
    if (this.betaMax !== undefined) {
      params.betaLowerThan = this.betaMax.toString();
    }
    if (this.sector) {
      params.sector = this.sector;
    }
    if (this.country) {
      params.country = this.country;
    }
    if (this.exchange) {
      params.exchange = this.exchange;
    }
    if (this.limit !== undefined) {
      params.limit = this.limit.toString();
    }

    return params;
  }
}
