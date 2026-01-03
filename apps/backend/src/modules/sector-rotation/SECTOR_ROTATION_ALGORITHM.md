# Sector Rotation Calculation Algorithm

## Overview

The Sector Rotation Calculation algorithm implements a Relative Strength Graph (RSG) or Relative Rotation Graph (RRG) methodology to analyze and visualize sector performance relative to a benchmark. This technique helps identify which sectors are leading, weakening, lagging, or improving in their relative performance over time.

The algorithm transforms sector price data into normalized coordinates (X, Y) that can be plotted on a four-quadrant chart, where each quadrant represents a different phase of sector performance relative to the market.

## Core Concepts

### Relative Strength
Relative Strength (RS) measures how a sector is performing compared to a benchmark (typically the average of all sectors). It's calculated using logarithmic returns to ensure proper scaling across different price levels.

### X-Axis (Relative Strength Momentum)
The X-axis represents the rate of change in relative strength over a lookback period. Positive X values indicate improving relative strength, while negative values indicate deteriorating relative strength.

### Y-Axis (Momentum of X)
The Y-axis represents the momentum (rate of change) of the X-axis value. This creates a second derivative effect, showing whether the rate of change in relative strength is accelerating or decelerating.

### Quadrants
The four quadrants categorize sectors based on their X and Y coordinates:

- **Leading** (X > 0, Y > 0): Strong relative strength that's accelerating
- **Weakening** (X > 0, Y < 0): Strong relative strength but losing momentum
- **Lagging** (X < 0, Y < 0): Weak relative strength that's deteriorating
- **Improving** (X < 0, Y > 0): Weak relative strength but gaining momentum

## Algorithm Parameters

### Default Values
- **lookbackWeeks**: 12 weeks (default)
- **momentumWeeks**: 5 weeks (default)
- **normalizationWindowWeeks**: 52 weeks (default in API, 5 weeks in use case)

**Note**: The API controller uses 52 weeks as the default for `normalizationWindowWeeks`, while the use case has a default of 5 weeks. When calling the API endpoint, 52 weeks is used unless explicitly specified.

### Parameter Descriptions

#### `lookbackWeeks`
The number of weeks to look back when calculating the X-axis value. This determines how far back we compare the current relative strength to calculate the rate of change.

**Default**: 12 weeks

#### `momentumWeeks`
The number of weeks to look back when calculating the Y-axis value. This determines the period over which we measure the momentum (rate of change) of the X-axis.

**Default**: 5 weeks

#### `normalizationWindowWeeks`
The rolling window size (in weeks) used for Z-score normalization of both X and Y values. This ensures that values are normalized relative to their recent historical distribution.

**Default**: 52 weeks

## Step-by-Step Algorithm

### Step 1: Data Preparation

#### 1.1 Extend Date Range
The algorithm extends the requested date range backward to accommodate the required lookback period:

```typescript
requiredLookbackWeeks = max(
  normalizationWindowWeeks,
  lookbackWeeks,
  momentumWeeks
)

extendedStartDate = requestedStartDate - (requiredLookbackWeeks × 7 days)
```

This ensures sufficient historical data for all calculations.

#### 1.2 Fetch Sector Data
For each sector, fetch weekly historical price data (closing prices) for the extended date range:

- Data interval: Weekly (`1wk`)
- Price points are aggregated by week (ISO week number)
- If multiple price points exist for the same week, the latest one is used

#### 1.3 Convert to Weekly Prices
Price data is converted to weekly granularity:
- Group price points by ISO week (year-week format: `YYYY-Www`)
- For each week, use the latest available price point
- Sort chronologically

### Step 2: Benchmark Calculation

The benchmark is calculated as the **equal-weighted average** of all sector prices at each date:

```
Benchmark(t) = (1/N) × Σ(Sector_i(t))
```

Where:
- `N` = number of sectors
- `Sector_i(t)` = price of sector i at time t

**Implementation Notes**:
- Only dates where at least one sector has data are included
- The benchmark is the arithmetic mean of available sector prices at each date
- Missing sector data for a specific date is excluded from the average

### Step 3: Relative Strength Calculation

For each sector and each date, calculate the relative strength using logarithmic returns:

```
RS(sector, t) = ln(Price(sector, t)) - ln(Benchmark(t))
```

Where:
- `ln` = natural logarithm
- `Price(sector, t)` = sector price at time t
- `Benchmark(t)` = benchmark price at time t

**Why Logarithmic Returns?**
- Logarithmic returns are symmetric and additive over time
- They provide proper scaling across different price levels
- They ensure that a 10% gain followed by a 10% loss returns to the original value

### Step 4: X-Axis Calculation (Relative Strength Momentum)

The X-axis measures the rate of change in relative strength over the lookback period.

#### 4.1 Raw X-Value Calculation

For each date where sufficient historical data exists:

```
X_raw(sector, t) = RS(sector, t) / RS(sector, t - lookbackWeeks) - 1
```

Where:
- `RS(sector, t)` = current relative strength
- `RS(sector, t - lookbackWeeks)` = relative strength `lookbackWeeks` ago

**Implementation Note**: The formula is calculated as `currentRS / lookbackRS - 1`, which is equivalent to `(currentRS / lookbackRS) - 1`.

**Note**: X-values are only calculated when at least `lookbackWeeks` of historical data is available.

#### 4.2 X-Value Normalization (Z-Score)

Raw X-values are normalized using a rolling Z-score with a window of `normalizationWindowWeeks`:

```
X_normalized(sector, t) = (X_raw(sector, t) - μ_window) / σ_window
```

Where:
- `μ_window` = mean of X_raw values over the normalization window
- `σ_window` = standard deviation of X_raw values over the normalization window

**Z-Score Formula**:
```
μ = (1/n) × Σ(values)  where n = windowValues.length
σ² = (1/n) × Σ((value - μ)²)
σ = √σ²
z = (rawValue - μ) / σ
```

**Implementation Details**:
- Window includes indices from `max(0, i - windowWeeks + 1)` to `i` (inclusive)
- Window size is exactly `windowWeeks` values when sufficient data exists
- Only includes dates where raw values exist (filters undefined values)
- Uses population variance (divides by n, not n-1)

**Normalization Window**:
- Uses a rolling window ending at the current date
- Window size: `normalizationWindowWeeks`
- Only includes dates where X_raw values exist

### Step 5: Y-Axis Calculation (Momentum of X)

The Y-axis measures the momentum (rate of change) of the X-axis value.

#### 5.1 Raw Y-Value Calculation

For each date where sufficient historical data exists:

```
Y_raw(sector, t) = X_normalized(sector, t) - X_normalized(sector, t - momentumWeeks)
```

Where:
- `X_normalized(sector, t)` = current normalized X-value
- `X_normalized(sector, t - momentumWeeks)` = normalized X-value `momentumWeeks` ago

**Note**: Y-values are only calculated when at least `momentumWeeks` of normalized X-values are available.

#### 5.2 Y-Value Normalization (Z-Score)

Raw Y-values are normalized using the same Z-score method as X-values:

```
Y_normalized(sector, t) = (Y_raw(sector, t) - μ_window) / σ_window
```

Where:
- `μ_window` = mean of Y_raw values over the normalization window
- `σ_window` = standard deviation of Y_raw values over the normalization window

### Step 6: Data Point Creation

For each sector and each date, create a data point if all required values are available:

**Required Values**:
- Relative Strength (RS)
- Normalized X-value
- Normalized Y-value
- Valid price data

**Quadrant Assignment**:
```
if (X > 0 && Y > 0) → Leading
if (X > 0 && Y < 0) → Weakening
if (X < 0 && Y < 0) → Lagging
if (X < 0 && Y > 0) → Improving
```

**Data Point Structure**:
- `date`: Date of the data point
- `sectorSymbol`: Sector identifier
- `price`: Sector price at this date
- `relativeStrength`: RS value
- `x`: Normalized X-coordinate
- `y`: Normalized Y-coordinate
- `quadrant`: Quadrant classification

### Step 7: Filtering and Output

Filter data points to include only those within the requested date range:

```
outputDataPoints = allDataPoints.filter(
  point.date >= requestedStartDate && point.date <= requestedEndDate
)
```

## Mathematical Formulas Summary

### Benchmark
```
Benchmark(t) = (1/N) × Σ(Sector_i(t))
```

### Relative Strength
```
RS(sector, t) = ln(Price(sector, t)) - ln(Benchmark(t))
```

### X-Axis (Raw)
```
X_raw(sector, t) = RS(sector, t) / RS(sector, t - L) - 1
```
Where `L = lookbackWeeks`

**Implementation**: `currentRS / lookbackRS - 1`

### X-Axis (Normalized)
```
X_norm(sector, t) = (X_raw(sector, t) - μ_X) / σ_X
```
Where `μ_X` and `σ_X` are calculated over a rolling window of `normalizationWindowWeeks`

### Y-Axis (Raw)
```
Y_raw(sector, t) = X_norm(sector, t) - X_norm(sector, t - M)
```
Where `M = momentumWeeks`

### Y-Axis (Normalized)
```
Y_norm(sector, t) = (Y_raw(sector, t) - μ_Y) / σ_Y
```
Where `μ_Y` and `σ_Y` are calculated over a rolling window of `normalizationWindowWeeks`

### Z-Score Normalization (General)
```
z = (value - mean) / stdDev

mean = (1/n) × Σ(values)
variance = (1/n) × Σ((value - mean)²)
stdDev = √variance
```

## Quadrant Interpretation

### Leading (X > 0, Y > 0)
- **Characteristics**: Strong relative strength that's accelerating
- **Investment Implication**: Sectors showing strong momentum and improving performance
- **Typical Action**: Consider for growth-oriented portfolios

### Weakening (X > 0, Y < 0)
- **Characteristics**: Strong relative strength but losing momentum
- **Investment Implication**: Sectors that have performed well but may be peaking
- **Typical Action**: Monitor for potential rotation, consider taking profits

### Lagging (X < 0, Y < 0)
- **Characteristics**: Weak relative strength that's deteriorating
- **Investment Implication**: Sectors underperforming and losing momentum
- **Typical Action**: Avoid or reduce exposure, consider defensive positioning

### Improving (X < 0, Y > 0)
- **Characteristics**: Weak relative strength but gaining momentum
- **Investment Implication**: Sectors that have been weak but are showing signs of recovery
- **Typical Action**: Monitor for potential turnaround, consider early entry

## Data Flow Diagram

```
Input: Sectors, Date Range, Parameters
    ↓
[1] Extend Date Range for Lookback
    ↓
[2] Fetch Weekly Price Data for All Sectors
    ↓
[3] Calculate Benchmark (Equal-Weighted Average)
    ↓
[4] Calculate Relative Strength (Log Returns)
    ↓
[5] Calculate X-Values (RS Momentum)
    ├─→ Raw X: (RS(t) / RS(t-L)) - 1
    └─→ Normalized X: Z-Score over window
    ↓
[6] Calculate Y-Values (X Momentum)
    ├─→ Raw Y: X_norm(t) - X_norm(t-M)
    └─→ Normalized Y: Z-Score over window
    ↓
[7] Create Data Points with Quadrant Classification
    ↓
[8] Filter to Requested Date Range
    ↓
Output: SectorRotationResult with Data Points
```

## Example Calculation

### Input
- **Sectors**: XLK (Technology), XLE (Energy)
- **Date Range**: 2024-01-01 to 2024-12-31
- **Parameters**:
  - `lookbackWeeks`: 12
  - `momentumWeeks`: 5
  - `normalizationWindowWeeks`: 52

### Step-by-Step Example (Single Date)

Assume we're calculating for date `2024-06-15`:

1. **Prices**:
   - XLK: $200.00
   - XLE: $80.00

2. **Benchmark**:
   ```
   Benchmark = (200.00 + 80.00) / 2 = $140.00
   ```

3. **Relative Strength**:
   ```
   RS_XLK = ln(200) - ln(140) = 5.2983 - 4.9416 = 0.3567
   RS_XLE = ln(80) - ln(140) = 4.3820 - 4.9416 = -0.5596
   ```

4. **X-Value (Raw)**:
   - Assume RS_XLK 12 weeks ago was 0.3000
   ```
   X_raw_XLK = 0.3567 / 0.3000 - 1 = 1.1890 - 1 = 0.1890
   ```

5. **X-Value (Normalized)**:
   - Calculate mean and stdDev of X_raw over last 52 weeks
   - Assume μ = 0.05, σ = 0.15
   ```
   X_norm_XLK = (0.1890 - 0.05) / 0.15 = 0.9267
   ```

6. **Y-Value (Raw)**:
   - Assume X_norm_XLK 5 weeks ago was 0.8000
   ```
   Y_raw_XLK = 0.9267 - 0.8000 = 0.1267
   ```

7. **Y-Value (Normalized)**:
   - Calculate mean and stdDev of Y_raw over last 52 weeks
   - Assume μ = 0.00, σ = 0.20
   ```
   Y_norm_XLK = (0.1267 - 0.00) / 0.20 = 0.6335
   ```

8. **Quadrant**:
   ```
   X = 0.9267 > 0, Y = 0.6335 > 0 → Leading
   ```

## Implementation Notes

### Data Requirements
- Weekly price data is required (daily data is aggregated to weekly)
- Sufficient historical data must be available for the lookback periods
- Missing data for a sector on a specific date excludes that sector from the benchmark calculation for that date

### Edge Cases
- **Insufficient Historical Data**: If a sector doesn't have enough historical data, X and Y values cannot be calculated for early dates
- **Zero or Negative Prices**: The algorithm assumes all prices are positive (validated in domain layer)
- **Division by Zero**: The algorithm checks for zero standard deviation before normalization
- **NaN Values**: Data points with NaN X or Y values are excluded from the output

### Performance Considerations
- The algorithm processes data sequentially by date
- Normalization calculations use rolling windows, which can be computationally intensive for large datasets
- Weekly aggregation reduces the number of data points compared to daily data

## Default Sectors

The algorithm supports 11 default sector ETFs:

1. **XLK** - Technology
2. **XLE** - Energy
3. **XLI** - Industrial
4. **XLY** - Consumer Discretionary
5. **XLP** - Consumer Staples
6. **XLV** - Healthcare
7. **XLF** - Financial
8. **XLB** - Materials
9. **XLU** - Utilities
10. **XLRE** - Real Estate
11. **XLC** - Communication Services

## References

This algorithm implements a Relative Strength Graph (RSG) / Relative Rotation Graph (RRG) methodology, which is commonly used in technical analysis to identify sector rotation patterns in financial markets. The approach combines:

- **Relative Strength Analysis**: Comparing sector performance to a benchmark
- **Momentum Analysis**: Measuring rates of change in relative strength
- **Normalization**: Using Z-scores to standardize values across different sectors and time periods
- **Quadrant Classification**: Categorizing sectors into four performance phases

The methodology helps investors identify:
- Which sectors are outperforming or underperforming
- Whether sector performance is accelerating or decelerating
- Potential sector rotation opportunities
- Market leadership changes over time

