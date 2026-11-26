import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from potent_scan_service import is_liquid, map_entry, select_potent, tier
from screener_service import RawScreenerEntry


def row(symbol, change, value_traded=20e6, avg_value_traded_30d=20e6):
    return {
        "symbol": symbol,
        "change": change,
        "value_traded": value_traded,
        "avg_value_traded_30d": avg_value_traded_30d,
    }


class TestTier:
    def test_lead_when_short_above_mid_above_long(self):
        assert tier(12.0, 11.0, 10.0) == "Lead"

    def test_lag_when_short_below_mid_below_long(self):
        assert tier(10.0, 11.0, 12.0) == "Lag"

    @pytest.mark.parametrize("emas", [(11.0, 12.0, 10.0), (12.0, 10.0, 11.0), (11.0, 11.0, 10.0)])
    def test_mediocre_when_not_stacked(self, emas):
        assert tier(*emas) == "Mediocre"

    def test_none_when_an_ema_is_missing(self):
        assert tier(12.0, 11.0, None) is None


class TestIsLiquid:
    def test_passes_on_thirty_day_average_alone(self):
        assert is_liquid(row("A", 1.0, value_traded=1e6, avg_value_traded_30d=5e6))

    def test_passes_on_session_value_alone(self):
        assert is_liquid(row("A", 1.0, value_traded=10e6, avg_value_traded_30d=1e6))

    def test_fails_when_both_below_threshold(self):
        assert not is_liquid(row("A", 1.0, value_traded=9.9e6, avg_value_traded_30d=4.9e6))

    def test_treats_missing_values_as_zero(self):
        assert not is_liquid(row("A", 1.0, value_traded=None, avg_value_traded_30d=None))
        assert is_liquid(row("A", 1.0, value_traded=None, avg_value_traded_30d=6e6))


class TestMapEntry:
    def entry(self, change=5.0, close=10.0, adr=0.5, ema50=9.0):
        return RawScreenerEntry(
            data_fields=["X", change, close, adr, 2.1, 1e9, "Tech", "Software",
                         11.0, 10.0, ema50, 12e6, 3e6],
            symbol_full="NASDAQ:X",
        )

    def test_maps_columns(self):
        mapped = map_entry(self.entry())
        assert mapped["symbol"] == "X"
        assert mapped["exchange"] == "NASDAQ"
        assert mapped["adr_pct"] == 5.0
        assert mapped["tier"] == "Lead"
        assert mapped["value_traded"] == 12e6
        assert mapped["avg_value_traded_30d"] == 3e6

    def test_drops_row_without_change(self):
        assert map_entry(self.entry(change=None)) is None

    def test_keeps_row_with_missing_adr_and_ema(self):
        mapped = map_entry(self.entry(adr=None, ema50=None))
        assert mapped["adr_pct"] is None
        assert mapped["tier"] is None


class TestSelectPotent:
    def test_keeps_top_two_percent_of_liquid_universe(self):
        rows = [row(f"T{i}", float(i)) for i in range(100)]
        result = select_potent(rows)
        assert result["universe_size"] == 100
        assert [r["symbol"] for r in result["hits"]] == ["T99", "T98"]

    def test_hits_omit_traded_values(self):
        hit = select_potent([row("A", 1.0)])["hits"][0]
        assert "value_traded" not in hit and "avg_value_traded_30d" not in hit

    def test_session_value_admits_a_stock_that_fails_the_average(self):
        rows = [row(f"T{i}", float(i)) for i in range(99)]
        rows.append(row("WAKE", 50.0 + 100, value_traded=15e6, avg_value_traded_30d=1e6))
        result = select_potent(rows)
        assert result["universe_size"] == 100
        assert result["hits"][0]["symbol"] == "WAKE"

    def test_illiquid_gainer_above_cutoff_is_a_near_miss(self):
        rows = [row(f"T{i}", float(i)) for i in range(100)]
        rows.append(row("THIN", 200.0, value_traded=1e6, avg_value_traded_30d=1e6))
        rows.append(row("SLOW", 1.0, value_traded=1e6, avg_value_traded_30d=1e6))
        result = select_potent(rows)
        assert result["universe_size"] == 100
        assert "THIN" not in [r["symbol"] for r in result["hits"]]
        assert [r["symbol"] for r in result["near_misses"]] == ["THIN"]
        assert result["near_misses"][0]["value_traded"] == 1e6

    def test_only_gainers_are_hits(self):
        rows = [row("UP", 1.0)] + [row(f"D{i}", -float(i + 1)) for i in range(99)]
        assert [r["symbol"] for r in select_potent(rows)["hits"]] == ["UP"]

    def test_fails_when_no_gainers(self):
        with pytest.raises(Exception, match="No gainers"):
            select_potent([row("D", -1.0)])

    def test_fails_when_universe_empty(self):
        with pytest.raises(Exception, match="Empty universe"):
            select_potent([row("THIN", 5.0, value_traded=1e6, avg_value_traded_30d=1e6)])
