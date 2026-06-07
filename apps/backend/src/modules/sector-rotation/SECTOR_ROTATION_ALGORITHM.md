# Sector Rotation Calculation Algorithm

> **This document describes what the code actually computes.** It was reconciled
> against the implementation on 2026-06-06. The canonical source of truth is
> `infrastructure/services/sector-rotation-calculation.service.ts`
> (`SectorRotationCalculationServiceImpl`). Where the algorithm has quirks or
> divergences from "textbook" RRG, they are called out explicitly rather than
> hidden — see **Known divergences from standard RRG** at the end.

## Overview

The Sector Rotation algorithm implements a Relative Rotation Graph (RRG)-style
methodology to visualize how each member of a universe (sector ETFs, or a GICS
industry-group universe) is performing relative to a single benchmark symbol
(e.g. SPY). Each member is plotted as a point in a four-quadrant chart whose
axes are **RS-Ratio** (X) and **RS-Momentum** (Y), both centered at 100.

The four quadrants are **Leading**, **Weakening**, **Lagging**, and
**Improving** (see Quadrant Assignment).

## Parameters

All live callers pass the constants in `constants/rrg-parameters.ts`. There is
no separate "lookbackWeeks" parameter in the code.

| Constant | Value | Meaning |
|---|---|---|
| `NORMALIZATION_WINDOW_WEEKS` | **14** | Rolling-window size (in weekly bars) for the Z-score normalization of both X and Y. |
| `MOMENTUM_WEEKS` | **5** | See the warning below — this does **not** set the momentum horizon. It only widens the historical fetch window. |
| `RS_SMOOTHING_PERIOD` | **6** | EMA period applied to RS before normalizing into X, and to the 1-week RS-Ratio difference before normalizing into Y. |

The `SectorRotationCalculationParams` interface carries `momentumWeeks` and
`normalizationWindowWeeks`. `validateParams` requires each to be `>= 1`.

> ⚠️ **`momentumWeeks` is not used as a momentum horizon.** It is consumed in
> exactly one place: `requiredLookbackWeeks = max(normalizationWindowWeeks,
> momentumWeeks, RS_SMOOTHING_PERIOD)`, which widens how far back data is
> fetched. The Y-axis (RS-Momentum) is always derived from the **1-week** first
> difference of the RS-Ratio, regardless of `momentumWeeks`. With the current
> constants (`max(14, 5, 6) = 14`), `momentumWeeks` has no effect on output at
> all. See Known divergences.

## Step-by-step

### Step 1 — Data preparation

**1.1 Extend the date range** to give the rolling/smoothing windows enough
warm-up:

```
requiredLookbackWeeks = max(normalizationWindowWeeks, momentumWeeks, RS_SMOOTHING_PERIOD)
extendedStartDate     = requestedStartDate − (requiredLookbackWeeks × 7 days)
```

**1.2 Fetch weekly data** (`1wk` interval) for each member and for the
benchmark symbol over the extended range.

**1.3 Aggregate to one price per ISO week.** Price points are grouped by ISO
week key (`YYYY-Www`); the bar dated to the Monday of the week is preferred
(`WeekUtils`). Each weekly series is sorted chronologically. Both member series
and the benchmark series use the same weekly-aggregation logic.

**1.4 Drop members with insufficient history.** A member is skipped (with a
warning, not a failure) if it has fewer than
`requiredLookbackWeeks + 2` weekly bars. The whole universe only fails if no
member survives. This tolerates GICS sub-indices that Yahoo only recently began
publishing.

### Step 2 — Benchmark

The benchmark is the **weekly close of a single configured benchmark symbol**
(e.g. SPY), aggregated to weekly the same way member prices are. It is **not**
an equal-weighted average of the universe members.

`validateBenchmark` rejects the result if it is empty or contains any
non-finite or non-positive price.

```
Benchmark(t) = weeklyClose(benchmarkSymbol, t)
```

### Step 3 — Relative Strength (RS)

For each member and each week where a benchmark price exists:

```
RS(member, t) = 100 × ( Price(member, t) / Benchmark(t) )
```

RS is a simple price ratio (×100), **not** a log return. Values are only kept
when finite and `> 0`. Above 100 ⇒ the member is priced higher relative to the
benchmark than the 1:1 line; the absolute level is arbitrary (it depends on the
two price scales) — only the *normalized* X/Y below carry quadrant meaning.

### Step 4 — X-axis (RS-Ratio)

**4.1 Smooth RS** with a `RS_SMOOTHING_PERIOD`-period EMA (`EMACalculator`,
seeded on the first available value, then `ema += (value − ema) × 2/(period+1)`).

**4.2 Rolling Z-score → center 100.** Over a trailing window of
`normalizationWindowWeeks` weekly bars (indices `max(0, i − windowWeeks + 1)`
through `i`, inclusive), compute the mean and **population** variance of the
smoothed RS, then:

```
z          = (smoothedRS(t) − μ_window) / σ_window
RS-Ratio(t) = Z_SCORE_CENTER + z × Z_SCORE_MULTIPLIER
            = 100 + z × 3
```

A value is emitted only when the window has `count > 0` **and**
`variance > 0`. A perfectly flat (zero-variance) window produces no X value, so
that week is dropped for that member rather than defaulting to center.

> The scale multiplier in the live path is **3** (`Z_SCORE_MULTIPLIER`, a local
> constant in the calc service), not 10. See Known divergences.

### Step 5 — Y-axis (RS-Momentum)

**5.1 First difference of RS-Ratio (1 week).** For consecutive RS-Ratio points:

```
RSRatioDiff(t) = RS-Ratio(t) − RS-Ratio(t−1)
```

This is a simple difference between adjacent weekly RS-Ratio values, kept only
when both exist and the difference is finite. It is **not** a percentage
rate-of-change, and its horizon is fixed at 1 week.

**5.2 Smooth the difference** with the same `RS_SMOOTHING_PERIOD`-period EMA.

**5.3 Rolling Z-score → center 100** (identical machinery to Step 4.2, applied
to the smoothed difference series):

```
z              = (smoothedDiff(t) − μ_window) / σ_window
RS-Momentum(t) = 100 + z × 3
```

> RS-Momentum is centered at **100**, the same as the X-axis — not 101.

### Step 6 — Data-point creation & quadrant assignment

A data point is created for a (member, week) only when RS, X, and Y are all
present, finite, and non-NaN. The quadrant is assigned from `Quadrant.fromCoordinates(x, y)`:

```
if (x > 100 && y > 100)  → Leading
else if (x > 100 && y < 100) → Weakening
else if (x < 100 && y < 100) → Lagging
else                          → Improving
```

> The final `else` is a catch-all: it covers the true "Improving" case
> (`x < 100 && y > 100`) **and** any point sitting exactly on a boundary
> (`x === 100` or `y === 100`). Such boundary points are labeled Improving. See
> Known divergences.

| Quadrant | Condition | Reading |
|---|---|---|
| **Leading** | X > 100, Y > 100 | Strong relative strength, still accelerating |
| **Weakening** | X > 100, Y < 100 | Strong relative strength, losing momentum |
| **Lagging** | X < 100, Y < 100 | Weak relative strength, deteriorating |
| **Improving** | X < 100, Y > 100 (or on a boundary) | Weak relative strength, gaining momentum |

### Step 7 — Filter to the requested range

After computing on the extended (warm-up) range, only data points whose date
falls within the originally requested `[startDate, endDate]` are returned. If
none survive, the calculation throws ("Insufficient historical data").

## Formula summary

```
Benchmark(t)     = weeklyClose(benchmarkSymbol, t)
RS(member, t)    = 100 × Price(member, t) / Benchmark(t)

smoothedRS       = EMA(RS, period = 6)
z_x              = (smoothedRS(t) − μ_win) / σ_win       # window = 14 weeks, population variance
RS-Ratio(t)      = 100 + z_x × 3

RSRatioDiff(t)   = RS-Ratio(t) − RS-Ratio(t−1)           # 1-week first difference
smoothedDiff     = EMA(RSRatioDiff, period = 6)
z_y              = (smoothedDiff(t) − μ_win) / σ_win     # window = 14 weeks, population variance
RS-Momentum(t)   = 100 + z_y × 3

μ_win            = (1/n) Σ values
σ²_win           = (1/n) Σ (value − μ)²                  # population (÷ n)
σ_win            = √σ²_win
```

## Data flow

```
Input: Universe (members + benchmarkSymbol), Date Range, Params
    ↓
[1] Extend date range by requiredLookbackWeeks
    ↓
[2] Fetch weekly prices for members and benchmark; aggregate to ISO weeks
    ↓
[3] Benchmark = weekly close of the single benchmark symbol
    ↓
[4] RS(member,t) = 100 × price / benchmark
    ↓
[5] X (RS-Ratio): EMA(RS, 6) → rolling 14-week Z-score → 100 + z×3
    ↓
[6] Y (RS-Momentum): 1-week diff of RS-Ratio → EMA(·, 6) → rolling 14-week Z-score → 100 + z×3
    ↓
[7] Create data points (RS, X, Y all finite) + assign quadrant
    ↓
[8] Filter to requested date range
    ↓
Output: SectorRotationResult
```

## Default universe

Sector-ETF universe (11 SPDR sectors), benchmark typically SPY:

XLK (Technology), XLE (Energy), XLI (Industrial), XLY (Consumer Discretionary),
XLP (Consumer Staples), XLV (Healthcare), XLF (Financial), XLB (Materials),
XLU (Utilities), XLRE (Real Estate), XLC (Communication Services).

The universe is configurable; a GICS-25 industry-group universe is also
supported (`RotationUniverse`).

## Edge cases handled

- **Zero/negative benchmark price** — rejected by `validateBenchmark`.
- **Zero-variance window** — produces no normalized value; the week is dropped
  for that member (not centered).
- **NaN / non-finite X or Y** — excluded from output in `createDataPoints`.
- **Sparse members** — dropped with a warning if under
  `requiredLookbackWeeks + 2` weekly bars; the universe only fails when none
  remain.
- **No points in requested range** — throws.

## Known divergences from standard RRG (and from this doc's earlier versions)

These are intentional-or-incidental properties of the current implementation.
They are documented here so the doc matches the code; changing any of them is a
behavior change to the RRG output, not a doc fix.

1. **Scale multiplier is 3, not 10.** The live normalization (`calculateRSRatio`
   / `calculateRSMomentum`) uses `Z_SCORE_MULTIPLIER = 3`. Standard
   StockCharts/RRGPy-style scaling is ~10. The lower multiplier compresses
   points toward 100 (a 1σ move is ±3, not ±10), so the cloud is tighter and
   quadrant crossings are less dramatic than a textbook RRG.

2. **`ZScoreNormalizer` is dead code.** The service
   `infrastructure/services/z-score-normalizer.service.ts` (which *does* use
   `CENTER = 100, SCALE = 10`) is injected into the calc service and registered
   in the module, but its `normalizeWithRollingWindow` method is never called —
   the calc service has its own inline normalization. Do not assume the `10` in
   that file is what runs.

3. **Y-axis is centered at 100, not 101.** Both axes share `Z_SCORE_CENTER =
   100`. RRGPy nudges momentum to 101 for visual separation; this code does not.
   A point with exactly-average momentum sits on the X/Y boundary.

4. **`momentumWeeks` is inert.** It only feeds `requiredLookbackWeeks`; the
   RS-Momentum horizon is hard-wired to a 1-week first difference plus a 6-EMA.
   With current constants it changes nothing.

5. **RS-Momentum is a difference, not a ROC.** Y is built from the *first
   difference* of RS-Ratio (`RS-Ratio(t) − RS-Ratio(t−1)`), not a percentage
   rate-of-change.

6. **Benchmark is a single symbol, not an equal-weighted basket.** RS is
   measured against the configured benchmark symbol's price (e.g. SPY), which is
   arguably the more meaningful benchmark, but differs from an
   average-of-members benchmark.

7. **Quadrant boundary bias.** `Quadrant.fromCoordinates` routes any point with
   `x === 100` or `y === 100` to **Improving** via the `else` branch.

8. **Prices are not split/dividend adjusted in this path.** The market-data
   service feeds raw weekly closes; long windows can show split discontinuities.
   This is shared with the market-health module and noted in the algorithm
   audit.
