import { ExposureBand } from './exposure-band';
import { RegimeState } from './regime-state';

describe('ExposureBand', () => {
  describe('forRegime', () => {
    it('returns full-size guidance for GREEN', () => {
      const band = ExposureBand.forRegime(RegimeState.green());

      expect(band.perTradeRiskPct).toBe(0.5);
      expect(band.maxPortfolioHeatPct).toBe(3);
      expect(band.maxSectorHeatPct).toBe(1.5);
      expect(band.maxPositions).toBe(8);
      expect(band.posture).toBe(
        'Full size — leadership expanding. Up to 1% risk on A+ setups.',
      );
    });

    it('returns half-exposure guidance for YELLOW', () => {
      const band = ExposureBand.forRegime(RegimeState.yellow());

      expect(band.perTradeRiskPct).toBe(0.5);
      expect(band.maxPortfolioHeatPct).toBe(1.5);
      expect(band.maxSectorHeatPct).toBe(1.0);
      expect(band.maxPositions).toBe(4);
      expect(band.posture).toBe(
        'Half exposure — manage existing trades, fewer new entries.',
      );
    });

    it('returns cash-biased guidance for RED', () => {
      const band = ExposureBand.forRegime(RegimeState.red());

      expect(band.perTradeRiskPct).toBe(0.25);
      expect(band.maxPortfolioHeatPct).toBe(0.75);
      expect(band.maxSectorHeatPct).toBe(0.5);
      expect(band.maxPositions).toBe(2);
      expect(band.posture).toBe(
        'Cash-biased — watchlist-prep mode, entries only on strong re-expansion.',
      );
    });
  });
});
