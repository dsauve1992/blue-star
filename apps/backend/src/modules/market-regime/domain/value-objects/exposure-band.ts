import { RegimeState, RegimeStateValue } from './regime-state';

/**
 * Display-only sizing guidance derived from the composite RegimeState.
 *
 * These numbers anchor to the documented risk rules (0.5% baseline risk,
 * 3% total portfolio heat, 1.5%/sector, max 8 positions) and are scaled down
 * as the regime deteriorates. This value object carries NO behaviour beyond
 * the mapping — it is purely advisory for the UI.
 */
export interface ExposureBandFields {
  perTradeRiskPct: number;
  maxPortfolioHeatPct: number;
  maxSectorHeatPct: number;
  maxPositions: number;
  posture: string;
}

export class ExposureBand {
  readonly perTradeRiskPct: number;
  readonly maxPortfolioHeatPct: number;
  readonly maxSectorHeatPct: number;
  readonly maxPositions: number;
  readonly posture: string;

  private constructor(fields: ExposureBandFields) {
    this.perTradeRiskPct = fields.perTradeRiskPct;
    this.maxPortfolioHeatPct = fields.maxPortfolioHeatPct;
    this.maxSectorHeatPct = fields.maxSectorHeatPct;
    this.maxPositions = fields.maxPositions;
    this.posture = fields.posture;
  }

  static forRegime(state: RegimeState): ExposureBand {
    switch (state.value) {
      case RegimeStateValue.GREEN:
        return new ExposureBand({
          perTradeRiskPct: 0.5,
          maxPortfolioHeatPct: 3,
          maxSectorHeatPct: 1.5,
          maxPositions: 8,
          posture:
            'Full size — leadership expanding. Up to 1% risk on A+ setups.',
        });
      case RegimeStateValue.YELLOW:
        return new ExposureBand({
          perTradeRiskPct: 0.5,
          maxPortfolioHeatPct: 1.5,
          maxSectorHeatPct: 1.0,
          maxPositions: 4,
          posture: 'Half exposure — manage existing trades, fewer new entries.',
        });
      case RegimeStateValue.RED:
        return new ExposureBand({
          perTradeRiskPct: 0.25,
          maxPortfolioHeatPct: 0.75,
          maxSectorHeatPct: 0.5,
          maxPositions: 2,
          posture:
            'Cash-biased — watchlist-prep mode, entries only on strong re-expansion.',
        });
    }
  }
}
