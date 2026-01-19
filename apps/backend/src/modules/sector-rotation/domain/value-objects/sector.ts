export class Sector {
  private constructor(
    public readonly name: string,
    public readonly etfSymbol: string,
  ) {}

  static readonly TECHNOLOGY = new Sector('Technology', 'XLK');
  static readonly ENERGY = new Sector('Energy', 'XLE');
  static readonly INDUSTRIAL = new Sector('Industrial', 'XLI');
  static readonly CONSUMER_DISCRETIONARY = new Sector(
    'Consumer Discretionary',
    'XLY',
  );
  static readonly CONSUMER_STAPLES = new Sector('Consumer Staples', 'XLP');
  static readonly HEALTHCARE = new Sector('Healthcare', 'XLV');
  static readonly FINANCIAL = new Sector('Financial', 'XLF');
  static readonly MATERIALS = new Sector('Materials', 'XLB');
  static readonly UTILITIES = new Sector('Utilities', 'XLU');
  static readonly REAL_ESTATE = new Sector('Real Estate', 'XLRE');
  static readonly COMMUNICATION_SERVICES = new Sector(
    'Communication Services',
    'XLC',
  );

  static readonly ALL_SECTORS: Sector[] = [
    Sector.TECHNOLOGY,
    Sector.ENERGY,
    Sector.INDUSTRIAL,
    Sector.CONSUMER_DISCRETIONARY,
    Sector.CONSUMER_STAPLES,
    Sector.HEALTHCARE,
    Sector.FINANCIAL,
    Sector.MATERIALS,
    Sector.UTILITIES,
    Sector.REAL_ESTATE,
    Sector.COMMUNICATION_SERVICES,
  ];

  private static readonly YFINANCE_MAP: Record<string, Sector> = {
    Technology: Sector.TECHNOLOGY,
    Energy: Sector.ENERGY,
    Industrials: Sector.INDUSTRIAL,
    'Consumer Cyclical': Sector.CONSUMER_DISCRETIONARY,
    'Consumer Defensive': Sector.CONSUMER_STAPLES,
    Healthcare: Sector.HEALTHCARE,
    'Financial Services': Sector.FINANCIAL,
    'Basic Materials': Sector.MATERIALS,
    Utilities: Sector.UTILITIES,
    'Real Estate': Sector.REAL_ESTATE,
    'Communication Services': Sector.COMMUNICATION_SERVICES,
  };

  private static readonly NAME_MAP: Record<string, Sector> = Object.fromEntries(
    Sector.ALL_SECTORS.map((s) => [s.name, s]),
  );

  private static readonly ETF_MAP: Record<string, Sector> = Object.fromEntries(
    Sector.ALL_SECTORS.map((s) => [s.etfSymbol, s]),
  );

  static of(name: string): Sector {
    if (!name || name.trim().length === 0) {
      throw new Error('Sector name cannot be empty');
    }
    const sector = Sector.NAME_MAP[name.trim()];
    if (!sector) {
      throw new Error(`Unknown sector name: ${name}`);
    }
    return sector;
  }

  static fromYFinance(yfinanceSector: string): Sector | null {
    if (!yfinanceSector || yfinanceSector.trim().length === 0) {
      return null;
    }
    return Sector.YFINANCE_MAP[yfinanceSector.trim()] ?? null;
  }

  static fromEtfSymbol(etfSymbol: string): Sector | null {
    if (!etfSymbol || etfSymbol.trim().length === 0) {
      return null;
    }
    return Sector.ETF_MAP[etfSymbol.trim().toUpperCase()] ?? null;
  }

  static fromName(name: string): Sector | null {
    if (!name || name.trim().length === 0) {
      return null;
    }
    return Sector.NAME_MAP[name.trim()] ?? null;
  }

  equals(other: Sector): boolean {
    return this.name === other.name;
  }

  toString(): string {
    return this.name;
  }
}
