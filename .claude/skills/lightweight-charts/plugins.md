# Plugins — Watermarks, Markers, Price Lines, Custom Series

## Watermarks (v5 Plugin)

```typescript
import { createTextWatermark, createImageWatermark } from 'lightweight-charts';

const wm = createTextWatermark(chart.panes()[0], {
  horzAlign: 'center',
  vertAlign: 'center',
  lines: [
    { text: 'AAPL', color: 'rgba(255,255,255,0.1)', fontSize: 48, fontFamily: "'JetBrains Mono'" },
  ],
});
wm.applyOptions({ ... }); // update
wm.detach();               // remove
```

---

## Series Markers (v5 Plugin)

```typescript
import { createSeriesMarkers } from 'lightweight-charts';

const markers = createSeriesMarkers(candleSeries, [
  { time: '2024-01-15', position: 'belowBar', shape: 'arrowUp', color: '#3b82f6', text: 'Buy' },
  { time: '2024-02-20', position: 'aboveBar', shape: 'arrowDown', color: '#ef4444', text: 'Sell' },
]);
markers.setMarkers([...]); // replace all
markers.markers();          // read
```

**SeriesMarkerBarPosition:** `"aboveBar" | "belowBar" | "inBar"`
**SeriesMarkerShape:** `"circle" | "square" | "arrowUp" | "arrowDown"`

---

## Price Lines

```typescript
const line = series.createPriceLine({
  price: 150.0,
  color: '#ef4444',
  lineWidth: 1,
  lineStyle: LineStyle.Dashed,
  axisLabelVisible: true,
  title: 'Stop Loss',
});
line.applyOptions({ price: 155.0 }); // update
series.removePriceLine(line);          // remove
```

**PriceLineOptions:** `id?`, `price` (required), `color`, `lineWidth`, `lineStyle`, `lineVisible`, `axisLabelVisible`, `title`, `axisLabelColor`, `axisLabelTextColor`

---

## Custom Series Plugin

```typescript
import { ICustomSeriesPaneView, ICustomSeriesPaneRenderer } from 'lightweight-charts';

class MyCustomSeries implements ICustomSeriesPaneView<Time, TData, TOptions> {
  renderer(): ICustomSeriesPaneRenderer { /* return renderer */ }
  update(data: PaneRendererCustomData<Time, TData>, options: TOptions): void { /* cache data */ }
  priceValueBuilder(plotRow: TData): CustomSeriesPricePlotValues { return [plotRow.value]; }
  isWhitespace(data: TData): boolean { return !(data as any).value; }
  defaultOptions(): TOptions { return { /* defaults */ } as TOptions; }
}

const series = chart.addCustomSeries(new MyCustomSeries(), { /* options */ });
```

Three plugin types:
1. **Custom Series** — `ICustomSeriesPaneView` → register via `chart.addCustomSeries()`
2. **Series Primitives** — `ISeriesPrimitive` → attach via `series.attachPrimitive()`
3. **Pane Primitives** — `IPanePrimitive` → attach via `pane.attachPrimitive()`

Scaffolding tool: `create-lwc-plugin` npm package.
