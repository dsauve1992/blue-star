# Time Scale, Price Scale & Pane API

## Time Scale API (ITimeScaleApi)

```typescript
const ts = chart.timeScale();
```

| Method | Description |
|--------|-------------|
| `fitContent()` | Fit all data in view |
| `scrollToRealTime()` | Scroll to latest |
| `scrollToPosition(pos, animated)` | Scroll to offset |
| `getVisibleRange()` | Get visible { from, to } time range |
| `setVisibleRange(range)` | Set visible time range |
| `getVisibleLogicalRange()` | Get visible { from, to } logical indices |
| `setVisibleLogicalRange(range)` | Set visible logical range |
| `resetTimeScale()` | Reset zoom/scroll |
| `timeToCoordinate(time)` | Time → pixel X |
| `coordinateToTime(x)` | Pixel X → time |
| `logicalToCoordinate(logical)` | Logical index → pixel X |
| `coordinateToLogical(x)` | Pixel X → logical index |
| `subscribeVisibleLogicalRangeChange(handler)` | Watch scroll/zoom |
| `subscribeVisibleTimeRangeChange(handler)` | Watch visible time |
| `subscribeSizeChange(handler)` | Watch resize |
| `applyOptions(options)` | Update time scale options |
| `width()` / `height()` | Dimensions |

**HorzScaleOptions (key):**
`rightOffset` (0), `barSpacing` (6), `minBarSpacing` (0.5), `fixLeftEdge`, `fixRightEdge`, `lockVisibleTimeRangeOnResize`, `borderVisible`, `borderColor`, `visible`, `timeVisible`, `secondsVisible`, `shiftVisibleRangeOnNewBar`, `ticksVisible`, `minimumHeight`

---

## Price Scale API (IPriceScaleApi)

```typescript
const ps = chart.priceScale('right');
// or: chart.priceScale('volume', 0); // custom scale on pane 0
```

| Method | Description |
|--------|-------------|
| `applyOptions(options)` | Update options |
| `options()` | Get current options |
| `width()` | Scale width in pixels |
| `setVisibleRange(range)` | Set { from, to } price range |
| `getVisibleRange()` | Get visible price range |
| `setAutoScale(on)` | Toggle auto-scaling |

**PriceScaleOptions:**
`autoScale` (true), `mode` (Normal/Logarithmic/Percentage/IndexedTo100), `invertScale`, `alignLabels`, `scaleMargins: { top, bottom }`, `borderVisible`, `borderColor`, `textColor`, `visible`, `ticksVisible`, `minimumWidth`

**PriceFormat:**
```typescript
priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
priceFormat: { type: 'volume' }  // auto K/M/B formatting
priceFormat: { type: 'percent' }
priceFormat: { type: 'custom', formatter: (price: BarPrice) => string }
```

---

## Pane API (IPaneApi) — v5 Multi-Pane

```typescript
const pane = chart.addPane();
const mainPane = chart.panes()[0];
```

| Method | Description |
|--------|-------------|
| `addSeries(definition, options?)` | Add series to this pane |
| `addCustomSeries(view, options?)` | Add custom series to pane |
| `getSeries()` | Get all series in pane |
| `getHeight()` / `setHeight(h)` | Pane height |
| `getStretchFactor()` / `setStretchFactor(f)` | Relative pane sizing |
| `paneIndex()` | Get pane index |
| `moveTo(index)` | Move pane |
| `getHTMLElement()` | Get DOM element |
| `attachPrimitive(primitive)` | Attach pane-level drawing |
| `detachPrimitive(primitive)` | Detach drawing |
| `priceScale(id)` | Get price scale in pane |
