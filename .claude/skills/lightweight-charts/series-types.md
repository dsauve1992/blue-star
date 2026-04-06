# Series Types & Style Options

All created via `chart.addSeries(Definition, options?)`:

```typescript
import {
  CandlestickSeries, LineSeries, AreaSeries,
  BarSeries, HistogramSeries, BaselineSeries,
} from 'lightweight-charts';

const candles = chart.addSeries(CandlestickSeries, { upColor: '#3b82f6' });
const line = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2 });
const volume = chart.addSeries(HistogramSeries, { priceScaleId: 'volume' });
```

## Data Formats

```typescript
// OHLC (Candlestick, Bar)
interface OhlcData { time: Time; open: number; high: number; low: number; close: number; }

// Single value (Line, Area, Histogram, Baseline)
interface SingleValueData { time: Time; value: number; }

// Histogram per-bar color override
interface HistogramData { time: Time; value: number; color?: string; }

// Time can be: UTCTimestamp (number) | BusinessDay | ISO string ('2024-01-15')
type Time = UTCTimestamp | BusinessDay | string;
```

## ISeriesApi Methods

| Method | Description |
|--------|-------------|
| `setData(data[])` | Replace all data |
| `update(bar, historicalUpdate?)` | Add/update last bar |
| `pop(count)` | Remove items from end |
| `data()` | Get all data (readonly) |
| `dataByIndex(index, mismatchDir?)` | Get bar by logical index |
| `applyOptions(options)` | Update series options |
| `options()` | Get current options |
| `createPriceLine(options)` | Add horizontal reference line |
| `removePriceLine(line)` | Remove price line |
| `priceLines()` | Get all price lines |
| `priceToCoordinate(price)` | Price → pixel Y |
| `coordinateToPrice(y)` | Pixel Y → price |
| `priceScale()` | Get associated IPriceScaleApi |
| `attachPrimitive(primitive)` | Attach custom drawing |
| `detachPrimitive(primitive)` | Detach custom drawing |
| `moveToPane(paneIndex)` | Move to different pane |
| `getPane()` | Get containing IPaneApi |
| `subscribeDataChanged(handler)` | Watch data changes |

## Style Options by Series Type

### CandlestickStyleOptions
`upColor`, `downColor`, `wickVisible`, `borderVisible`, `borderColor`, `borderUpColor`, `borderDownColor`, `wickColor`, `wickUpColor`, `wickDownColor`

### LineStyleOptions
`color`, `lineStyle` (LineStyle enum), `lineWidth`, `lineType` (Simple/WithSteps/Curved), `lineVisible`, `pointMarkersVisible`, `pointMarkersRadius`, `crosshairMarkerVisible`, `crosshairMarkerRadius`, `lastPriceAnimation`

### AreaStyleOptions
`topColor`, `bottomColor`, `lineColor`, `lineStyle`, `lineWidth`, `lineType`, `lineVisible`, `relativeGradient`, `invertFilledArea`, `pointMarkersVisible`

### HistogramStyleOptions
`color`, `base` (baseline value, default 0)

### BaselineStyleOptions
`baseValue: { type: 'price', price: number }`, `topFillColor1`, `topFillColor2`, `topLineColor`, `bottomFillColor1`, `bottomFillColor2`, `bottomLineColor`, `lineWidth`, `lineStyle`, `lineType`

### BarStyleOptions
`upColor`, `downColor`, `openVisible`, `thinBars`

### Common Options (all series)
`lastValueVisible`, `title`, `priceScaleId` ('right' default), `visible`, `priceLineVisible`, `priceLineSource`, `priceLineWidth`, `priceLineColor`, `priceLineStyle`, `priceFormat`, `baseLineVisible`, `baseLineColor`, `autoscaleInfoProvider`
