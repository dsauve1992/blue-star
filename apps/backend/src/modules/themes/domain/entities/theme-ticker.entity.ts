export class ThemeTickerEntity {
  private constructor(
    public readonly id: string,
    public readonly themeId: string,
    public readonly ticker: string,
    public readonly createdAt: Date,
  ) {}

  static of(data: {
    id: string;
    themeId: string;
    ticker: string;
    createdAt: Date;
  }): ThemeTickerEntity {
    return new ThemeTickerEntity(
      data.id,
      data.themeId,
      data.ticker,
      data.createdAt,
    );
  }

  static fromData(data: {
    id: string;
    theme_id: string;
    ticker: string;
    created_at: string;
  }): ThemeTickerEntity {
    return new ThemeTickerEntity(
      data.id,
      data.theme_id,
      data.ticker,
      new Date(data.created_at),
    );
  }
}
