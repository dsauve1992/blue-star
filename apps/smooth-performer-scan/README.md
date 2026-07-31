# Smooth Performer Scan

Finds the best 6-month advances of the last N years where the ascension was **smooth** — a large
gain earned while the trend stack `EMA10 > EMA20 > SMA50` stayed intact on most days, rather than
one achieved through violent chop.

A standalone analytical study. It has no `package.json`, so it is invisible to `npm ci`, the
Turborepo pipeline and the repo's quality-gate hook. It does not import from the other apps and does
not touch the Blue Star database.

## The score

For every rolling 6-month window (126 trading days, sliding one day at a time):

```
score = perf * alignment_pct

perf          = last_close / first_close - 1   (close-to-close, split/dividend adjusted)
bad_days      = days in the window where EMA10 > EMA20 > SMA50 was NOT true
alignment_pct = (126 - bad_days) / 126
```

Both terms are ratios, so the score is independent of `WINDOW_DAYS` and one bad day costs 0.8%.

Smoothness is enforced by a **gate**, not by the score: windows below `--min-alignment` (default
`0.90`, i.e. at most 12 bad days) are removed before ranking. That is deliberate — see below.

`longest_bad_streak` is a diagnostic only. It separates "12 scattered noise days" from "one ugly
12-day breakdown", which a day-count alone cannot see. `alignment_pct` and `dollar_volume` are not
diagnostics: both gate which windows are eligible at all.

### Why the score alone cannot police smoothness

The original formulation was `perf / (bad_days + 1)`, and it ranked badly. Dividing a ratio by a
count makes the penalty hyperbolic in the wrong place: 0 → 1 bad days _halves_ the score, while
10 → 11 costs 8%. So it was savagely sensitive where nothing meaningful happened and nearly
indifferent where real damage occurred. A +101% flawless window scored `1.01` and beat a +1000%
window with 10 bad days (`10.0 / 11 = 0.909`) — 92% alignment losing to a move a tenth the size. In
practice it behaved as a _perfection filter_: median `bad_days` in the output was 0.

Multiplying instead fixes the ordering but is too weak to gate on, because `perf` spans two orders of
magnitude across the universe while `alignment_pct` is bounded in `[0, 1]` — so the multiplier is
nearly a constant and the ranking becomes ~90% raw performance. Measured live: `OCGN` (+5,480%, 62
bad days, **50.8% aligned**) ranked second, above `NVAX` (+2,656%, 2 bad days, 98.4% aligned). Half
the window out of trend is exactly what this scan exists to exclude.

Hence the split: **`--min-alignment` decides what qualifies, `score` ranks what's left.** Among
qualifying windows the ranking is therefore close to raw `perf` by design. `ratio_score` is kept as a
CSV column for comparison — it sorts very differently, favouring flawless windows over large ones.

A useful side effect: the gate is a better reverse-split filter than the window cap, because smeared
splits are inherently choppy. At `0.90` both surviving artifacts (`RGC`, `BRTX`) drop out on their
own, and nothing above +2,700% remains.

## One row per ticker, or one per advance

By default each ticker contributes **one row**: its single highest-scoring qualifying window.

That collapses too far. Because windows slide a day at a time they overlap heavily — a single clean
8-month trend yields dozens of qualifying windows all describing the same advance shifted by a day or
two (`NVAX` 52, `SNDK` 117, `DAC` 141). Collapsing those is right, but the argmax also hides a
stock's genuinely _separate_ runs: `DAC` advanced cleanly in both 2021 and 2026, and only 2021
survived.

`--per-run` clusters qualifying windows by gap in `window_end` — a break longer than
`--run-gap-days` (default 45) starts a new run — and emits each cluster's best window. `DAC` then
yields 2 rows rather than 141 or 1.

Across the full universe that turns 1,657 tickers into **2,830 runs**, mean 1.71 each:

| Runs per ticker | 1   | 2   | 3   | 4   | 5   | 6   |
| --------------- | --- | --- | --- | --- | --- | --- |
| Tickers         | 871 | 493 | 215 | 63  | 14  | 1   |

The second run is usually far smaller than the first (`TNDM` +1,296% in 2018 then +57% in 2021), so
`--per-run` does not reshuffle the top of the leaderboard — it exposes the pattern underneath, and
occasionally inverts one: `APPS` ran +141% in 2019 _before_ +740% in 2020.

Note that `--run-gap-days 45` separates distinct _peaks_, not disjoint windows: two runs 45 days
apart still share about 65% of their bars. Use `126` to guarantee no shared bars.

## Usage

```bash
./setup.sh
source venv/bin/activate

# Full universe (~3,700 US common stocks). First run takes a while; later runs hit the cache.
python main.py --years 10 --top 200 --out results.csv

# A handful of names, for iterating on the scoring
python main.py --tickers NVDA,AAPL,MSFT --years 10 --out /tmp/sample.csv

# From a file of tickers, one per line
python main.py --universe-file my-tickers.txt

# Raise the liquidity floor, or drop it entirely (default $5M/day)
python main.py --min-dollar-volume 20000000
python main.py --min-dollar-volume 0

# Move the smoothness gate, or disable it (default 0.90)
python main.py --min-alignment 0.95
python main.py --min-alignment 0

# One row per distinct advance instead of one per ticker
python main.py --per-run --top 0 --out runs.csv
python main.py --per-run --run-gap-days 126

# Ignore the Parquet cache and refetch
python main.py --refresh

python -m pytest tests/ -v
```

Re-runs read the Parquet cache, so probing a different threshold costs seconds.

Progress goes to stderr, results to the `--out` CSV. Downloaded bars are cached as Parquet under
`data/` (gitignored), so re-running after a change to the scoring math costs seconds.

## Caveats

**Survivorship bias.** The universe comes from a TradingView screener, which returns _today's_
listed stocks. Names that ran hard and later delisted are absent. So the output means "the best
smooth 6-month windows among stocks still trading today" — not "of all stocks that existed." No free
data source fixes this.

**Overlapping windows are collapsed.** Reporting one window per ticker means a stock with two
distinct great runs only shows its better one. `--per-run` fixes this; the default does not.

**EMA convention differs from `apps/screener`.** This app uses `ewm(adjust=False)` — the standard
recursive EMA, matching TradingView's `EMA10`/`EMA20`. `apps/screener/technical_analysis.py` relies
on pandas' `adjust=True` default, under which the EMA emits a value from the first bar and early
EMA10/EMA20 are both near the running average, making their crossover meaningless during warm-up.
That is harmless for a spot check but would corrupt a day-count, so it is not reused here. The first
50 bars are discarded so SMA50 is fully seeded; warm-up bars count as _undefined_, not bad.

**Prices must be adjusted.** The client fetches with `auto_adjust=True`. On raw prices a 2:1 split
halves the close overnight and reads as a trend break, inflating the bad-day count.

**Ticker spelling differs between the two sources.** TradingView writes dual-class shares as `BF.A`,
Yahoo expects `BF-A`. `to_yahoo_symbol()` translates on the way out and maps back on the way in, so
the CSV keeps the TradingView spelling. Without it every dual-class name drops out silently.

**Some tickers legitimately have no data.** Recent IPOs are skipped for having fewer than 175 bars
(50 warm-up + 126 window), and a handful of symbols fail at Yahoo. Both counts are reported at the
end of a run.

## The liquidity filter

A smooth EMA stack on a barely-traded stock measures stale prices, not a tradeable advance. `GORO`
surfaced at rank 3 with +1,133% earned on a median **$30k/day** — three orders of magnitude below
anything tradeable.

Liquidity is judged **inside each scored window**, not from a present-day snapshot:
`dollar_volume` = median of `close * volume` over that window's own 126 days. This matters in both
directions — a thin name is not credited for a run nobody could have traded, and a stock that was
liquid in 2018 is not penalised for having dried up since. The median rather than the mean so a
single blow-off-volume day cannot carry an otherwise thin window over the line.

The floor defaults to `$5M/day` (matching `leader-scan`'s `DEFAULT_MIN_DOLLAR_VOLUME`) and is
adjustable with `--min-dollar-volume`; `0` disables it. The filter is applied **before** picking each
ticker's best window, so a stock whose all-time best window was illiquid still reports its best
_tradeable_ window instead of dropping out. `--min-alignment` works the same way, for the same
reason.

Attrition on a full 10-year run, reported at the end of every scan:

| Dropped by                   | Tickers   |
| ---------------------------- | --------- |
| Fewer than 175 bars          | 307       |
| Corrupt series               | 136       |
| No window over $5M/day       | 1,701     |
| No window over 90% alignment | 1,369     |
| **Scored**                   | **1,657** |

Most stocks never sustain a clean 6-month trend, which is the finding, not a bug.

## The data-quality screen

The first full run was **dominated by data artifacts**, not smooth performers. Yahoo's adjusted
closes do not reliably repair _reverse_ splits, so a 1-for-100 reverse leaves a 10,000% overnight
jump that reads as a spectacular flawless advance. Observed live:

| Ticker | Artifact                                                         |
| ------ | ---------------------------------------------------------------- |
| `PPCB` | price spanned `$0.01` to `$2.06e11`; one-day move of +6,249,900% |
| `NCPL` | +266,567% in a single session                                    |
| `HYFT` | +87,400%                                                         |
| `CHRD` | +25,733% (post-bankruptcy reorganisation)                        |
| `DEC`  | `perf = +inf` — a zero `first_close` divided by zero             |

`find_corruption()` screens these out and `main.py` reports each rejection with its reason, so
exclusions are visible rather than silent. Windows are also guarded against a non-positive base
price, which is what produced the `+inf`.

**A second, window-level cap is needed too.** A reverse split smeared across several sessions clears
the per-day check but still compounds to an impossible total — `RGC` scored +55,509% and `BRTX`
+33,400% (reaching a `$19,000` share price) with no single day above 410%. `MAX_WINDOW_PERF` drops
any window returning more than 10,000%.

**The window cap bounds this damage rather than eliminating it**, and on its own left `RGC` and
`BRTX` around rank 50 with inflated (but sub-cap) returns of ~+8,000-9,400%. What actually removes
them is the `--min-alignment` gate: a smeared split is choppy, so neither clears 90%. At the default
threshold the ranking tops out near +2,700% and every name in the top 25 has been eyeballed as
genuine.

**Lowering `--min-alignment` re-admits them**, since the gate is the only thing holding them out.
Whatever the threshold, treat anything above +2,000% in a 6-month window as suspect and verify it
against a second data source before acting on it.

**The daily threshold is a judgment call, not a natural boundary.** Worst-single-day moves across the
universe form a continuous distribution — median 35%, p90 188%, p95 318%, p99 1548% — with no clean
gap. `MAX_DAILY_MOVE` sits at **+900%**: a 3–5x day is a genuine biotech binary event, a 10x day is
not something a security does. An earlier attempt at +100% rejected 899 of ~3,700 tickers including
legitimate names (`MDGL` +268% on trial data, `ENLT` +583%, `INSM` +120%). Raise or lower it in
`smoothness_service.py` if your tolerance differs.
