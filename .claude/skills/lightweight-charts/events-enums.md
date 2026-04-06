# Events & Enumerations

## MouseEventParams (Crosshair/Click)

```typescript
chart.subscribeCrosshairMove((param: MouseEventParams) => {
  param.time;           // HorzScaleItem | undefined
  param.logical;        // Logical | undefined
  param.point;          // { x, y } pixel coords | undefined
  param.paneIndex;      // which pane
  param.seriesData;     // Map<ISeriesApi, data> — get values for each series
  param.hoveredSeries;  // ISeriesApi | undefined
  param.sourceEvent;    // TouchMouseEventData | undefined

  // Get OHLC for a candlestick series:
  const ohlc = param.seriesData.get(candleSeries) as CandlestickData;
});
```

---

## Enumerations

```typescript
import { ColorType, CrosshairMode, LineStyle, LineType, PriceScaleMode } from 'lightweight-charts';
```

### ColorType
| Value | Constant |
|-------|----------|
| `"solid"` | `ColorType.Solid` |
| `"gradient"` | `ColorType.VerticalGradient` |

### CrosshairMode
| Value | Constant | Description |
|-------|----------|-------------|
| 0 | `CrosshairMode.Normal` | Free crosshair |
| 1 | `CrosshairMode.Magnet` | Snaps to close price |
| 2 | `CrosshairMode.Hidden` | No crosshair |
| 3 | `CrosshairMode.MagnetOHLC` | Snaps to nearest OHLC |

### LineStyle
| Value | Constant |
|-------|----------|
| 0 | `LineStyle.Solid` |
| 1 | `LineStyle.Dotted` |
| 2 | `LineStyle.Dashed` |
| 3 | `LineStyle.LargeDashed` |
| 4 | `LineStyle.SparseDotted` |

### LineType
| Value | Constant |
|-------|----------|
| 0 | `LineType.Simple` |
| 1 | `LineType.WithSteps` |
| 2 | `LineType.Curved` |

### PriceScaleMode
| Value | Constant |
|-------|----------|
| 0 | `PriceScaleMode.Normal` |
| 1 | `PriceScaleMode.Logarithmic` |
| 2 | `PriceScaleMode.Percentage` |
| 3 | `PriceScaleMode.IndexedTo100` |

### LastPriceAnimationMode
| Value | Constant |
|-------|----------|
| 0 | `LastPriceAnimationMode.Disabled` |
| 1 | `LastPriceAnimationMode.Continuous` |
| 2 | `LastPriceAnimationMode.OnDataUpdate` |

### PriceLineSource
| Value | Constant |
|-------|----------|
| 0 | `PriceLineSource.LastBar` |
| 1 | `PriceLineSource.LastVisible` |
