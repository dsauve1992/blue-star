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
score = perf / (bad_days + 1)

perf     = last_close / first_close - 1        (close-to-close, split/dividend adjusted)
bad_days = days in the window where EMA10 > EMA20 > SMA50 was NOT true
```

The `+1` is Laplace smoothing. A flawless window has `bad_days == 0`, which would otherwise divide
by zero; with the `+1` it scores exactly `perf` and still outranks any window with the same
performance and more bad days. Zero-bad-day windows turn out to be common among genuine leaders, so
this is load-bearing rather than a rare edge case — the very top of the ranking is effectively "the
biggest gain among flawless windows."

Each ticker contributes **one row**: its single highest-scoring window.

`alignment_pct` and `longest_bad_streak` are diagnostics only — they never affect ranking. The
streak separates "12 scattered noise days" from "one ugly 12-day breakdown", which the ratio alone
cannot see. `dollar_volume` is not a diagnostic: it gates which windows are eligible at all (see
below).

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

# Ignore the Parquet cache and refetch
python main.py --refresh

python -m pytest tests/ -v
```

Progress goes to stderr, results to the `--out` CSV. Downloaded bars are cached as Parquet under
`data/` (gitignored), so re-running after a change to the scoring math costs seconds.

## Caveats

**Survivorship bias.** The universe comes from a TradingView screener, which returns _today's_
listed stocks. Names that ran hard and later delisted are absent. So the output means "the best
smooth 6-month windows among stocks still trading today" — not "of all stocks that existed." No free
data source fixes this.

**Overlapping windows are collapsed.** Reporting one window per ticker means a stock with two
distinct great runs only shows its better one.

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
_tradeable_ window instead of dropping out.

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

**Known limitation:** the window cap bounds the damage rather than eliminating it. `RGC` and `BRTX`
still appear around rank 50 with inflated (but sub-cap) returns of ~+8,000-9,400%. They no longer
dominate the ranking, but they are not real. **Treat anything above roughly +2,000% in a 6-month
window as suspect and verify it against a second data source before acting on it.** Every name in
the top 25 has been eyeballed and is genuine.

**The daily threshold is a judgment call, not a natural boundary.** Worst-single-day moves across the
universe form a continuous distribution — median 35%, p90 188%, p95 318%, p99 1548% — with no clean
gap. `MAX_DAILY_MOVE` sits at **+900%**: a 3–5x day is a genuine biotech binary event, a 10x day is
not something a security does. An earlier attempt at +100% rejected 899 of ~3,700 tickers including
legitimate names (`MDGL` +268% on trial data, `ENLT` +583%, `INSM` +120%). Raise or lower it in
`smoothness_service.py` if your tolerance differs.
